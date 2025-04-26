"use server";

import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";
import { existsSync } from "fs";
import { z } from "zod";
import type { SheetConfig, Submission, FieldDataType } from "@/lib/types";

// Path for storing data
const DATA_DIR = join(process.cwd(), "data");
const EXCEL_FILE = join(DATA_DIR, "user-submissions.xlsx");
const CONFIG_FILE = join(DATA_DIR, "sheet-configs.json");

// Default sheet configuration
const DEFAULT_SHEET_CONFIG: SheetConfig = {
  id: "default",
  name: "Contact Form",
  description: "Default contact form for collecting user information",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  headers: [
    {
      id: crypto.randomUUID(),
      key: "name",
      name: "Name",
      description: "Full name of the person submitting the form",
      dataType: "text" as FieldDataType,
      required: true,
      enabled: true,
      placeholder: "Enter your full name",
      defaultValue: "",
      order: 1,
    },
    {
      id: crypto.randomUUID(),
      key: "email",
      name: "Email",
      description: "Email address for contact purposes",
      dataType: "email" as FieldDataType,
      required: true,
      enabled: true,
      placeholder: "Enter your email address",
      defaultValue: "",
      validationRules: [
        {
          type: "regex",
          value: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
          message: "Please enter a valid email address",
        },
      ],
      order: 2,
    },
    {
      id: crypto.randomUUID(),
      key: "phone",
      name: "Phone",
      description: "Phone number with country code",
      dataType: "phone" as FieldDataType,
      required: false,
      enabled: true,
      placeholder: "Enter your phone number with country code",
      defaultValue: "",
      validationRules: [
        {
          type: "regex",
          value: "^\\+?[0-9]{10,15}$",
          message: "Please enter a valid phone number (10-15 digits)",
        },
      ],
      order: 3,
    },
    {
      id: crypto.randomUUID(),
      key: "message",
      name: "Message",
      description: "Detailed message or inquiry",
      dataType: "textarea" as FieldDataType,
      required: true,
      enabled: true,
      placeholder: "Enter your message or inquiry",
      defaultValue: "",
      validationRules: [
        {
          type: "min",
          value: 10,
          message: "Message must be at least 10 characters",
        },
      ],
      order: 4,
    },
  ],
  isDefault: true,
};

// In-memory storage
let submissions: Submission[] = [];
let sheetConfigs: SheetConfig[] = [DEFAULT_SHEET_CONFIG];

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// Load sheet configurations
async function loadSheetConfigs(): Promise<SheetConfig[]> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      await saveSheetConfigs([DEFAULT_SHEET_CONFIG]);
      return [DEFAULT_SHEET_CONFIG];
    }

    const fileContent = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error loading sheet configs:", error);
    return [DEFAULT_SHEET_CONFIG];
  }
}

// Save sheet configurations
async function saveSheetConfigs(configs: SheetConfig[]) {
  try {
    await ensureDataDir();
    await writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving sheet configs:", error);
    return false;
  }
}

// Load existing submissions from Excel file if it exists
async function loadSubmissions(): Promise<Submission[]> {
  try {
    if (!existsSync(EXCEL_FILE)) {
      return [];
    }

    const fileBuffer = await readFile(EXCEL_FILE);
    const workbook = XLSX.read(fileBuffer);

    const allSubmissions: Submission[] = [];

    // Load submissions from each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData =
        XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      // Find the sheet config for this sheet
      const sheetConfig =
        sheetConfigs.find((config) => config.name === sheetName) ||
        DEFAULT_SHEET_CONFIG;

      // Convert each row to a submission
      sheetData.forEach((row, index) => {
        // Create a data object with keys from the sheet config
        const data: Record<string, any> = {};

        // Map the Excel column names (which are header names) back to header keys
        sheetConfig.headers.forEach((header) => {
          if (header.enabled) {
            // The Excel column has the header name, but we need to store by key
            data[header.key] = row[header.name] || "";
          }
        });

        // Generate a unique ID for this submission if it doesn't have one
        // Since we're not storing IDs in Excel anymore, we need to generate them
        const submissionId = crypto.randomUUID();

        // Use the current timestamp for submissions without timestamps
        // We'll offset them slightly to maintain order
        const timestamp = new Date();
        timestamp.setMinutes(
          timestamp.getMinutes() - (sheetData.length - index)
        );

        allSubmissions.push({
          id: submissionId,
          sheetId: sheetConfig.id,
          data: data,
          submittedAt: timestamp.toISOString(),
          updatedAt: timestamp.toISOString(),
          status: "read", // Mark imported submissions as read
          notes: "",
        });
      });
    }

    return allSubmissions;
  } catch (error) {
    console.error("Error loading submissions:", error);
    return [];
  }
}

// Save submissions to Excel file
async function saveSubmissionsToExcel(data: Submission[]) {
  try {
    await ensureDataDir();

    const workbook = XLSX.utils.book_new();

    // Group submissions by sheet ID
    const submissionsBySheet = data.reduce((acc, submission) => {
      const sheetId = submission.sheetId || "default";
      if (!acc[sheetId]) {
        acc[sheetId] = [];
      }
      acc[sheetId].push(submission);
      return acc;
    }, {} as Record<string, Submission[]>);

    // Create a worksheet for each sheet config
    for (const config of sheetConfigs) {
      const sheetSubmissions = submissionsBySheet[config.id] || [];

      // Transform submissions to match the sheet's headers
      const worksheetData = sheetSubmissions.map((submission) => {
        // Only include the actual form field data, no metadata
        const row: Record<string, any> = {};

        // Add data for each enabled header using the key for data lookup
        // but the current name for the column header
        config.headers.forEach((header) => {
          if (header.enabled) {
            // Use the header key to look up data, but use the header name for the column
            row[header.name] = submission.data[header.key] || "";
          }
        });

        return row;
      });

      if (worksheetData.length > 0 || config.isDefault) {
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, config.name);
      }
    }

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    await writeFile(EXCEL_FILE, excelBuffer);

    return true;
  } catch (error) {
    console.error("Error saving submissions to Excel:", error);
    return false;
  }
}

// Initialize data from files
async function initializeData() {
  if (sheetConfigs.length === 1) {
    sheetConfigs = await loadSheetConfigs();
  }

  if (submissions.length === 0) {
    submissions = await loadSubmissions();
  }
}

// Create validation schema based on field configuration
function createValidationForField(header: SheetConfig["headers"][0]) {
  let fieldSchema: any = z.string();

  // Apply required validation
  if (header.required) {
    fieldSchema = fieldSchema.min(1, { message: `${header.name} is required` });
  } else {
    fieldSchema = fieldSchema.optional();
  }

  // Apply data type specific validation
  switch (header.dataType) {
    case "email":
      fieldSchema = fieldSchema.email({
        message: `Please enter a valid email address`,
      });
      break;
    case "phone":
      fieldSchema = fieldSchema.regex(/^\+?[0-9]{10,15}$/, {
        message: `Please enter a valid phone number (10-15 digits)`,
      });
      break;
    case "number":
      fieldSchema = z.preprocess(
        (val) => (val === "" ? undefined : Number(val)),
        z
          .number({ invalid_type_error: `${header.name} must be a number` })
          .optional()
      );
      break;
    case "date":
      fieldSchema = z.preprocess(
        (val) => (val === "" ? undefined : new Date(val as string)),
        z
          .date({ invalid_type_error: `${header.name} must be a valid date` })
          .optional()
      );
      break;
  }

  // Apply custom validation rules
  if (header.validationRules && header.validationRules.length > 0) {
    header.validationRules.forEach((rule) => {
      switch (rule.type) {
        case "min":
          if (typeof rule.value === "number") {
            fieldSchema = fieldSchema.min(rule.value, {
              message: rule.message,
            });
          }
          break;
        case "max":
          if (typeof rule.value === "number") {
            fieldSchema = fieldSchema.max(rule.value, {
              message: rule.message,
            });
          }
          break;
        case "regex":
          if (typeof rule.value === "string") {
            fieldSchema = fieldSchema.regex(new RegExp(rule.value), {
              message: rule.message,
            });
          }
          break;
      }
    });
  }

  return fieldSchema;
}

// Form validation schema - dynamically created based on the default sheet
function createFormSchema() {
  const schemaObj: Record<string, any> = {};

  const defaultSheet =
    sheetConfigs.find((config) => config.isDefault) || DEFAULT_SHEET_CONFIG;

  defaultSheet.headers.forEach((header) => {
    if (header.enabled) {
      schemaObj[header.key] = createValidationForField(header);
    }
  });

  return z.object(schemaObj);
}

// Submit form data
export async function submitFormData(formData: unknown) {
  try {
    await initializeData();

    // Get the default sheet
    const defaultSheet =
      sheetConfigs.find((config) => config.isDefault) || DEFAULT_SHEET_CONFIG;

    // Validate form data
    const formSchema = createFormSchema();
    const validatedData = formSchema.parse(formData);

    // Create new submission
    const newSubmission: Submission = {
      id: crypto.randomUUID(),
      sheetId: defaultSheet.id,
      data: validatedData,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "new",
      notes: "",
    };

    // Add to in-memory array
    submissions.push(newSubmission);

    // Save to Excel file asynchronously
    await saveSubmissionsToExcel(submissions);

    return { success: true };
  } catch (error) {
    console.error("Form submission error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed. Please check your input.",
        validationErrors: error.errors,
      };
    }
    return {
      success: false,
      error: "Failed to process your submission. Please try again.",
    };
  }
}

// Get all submissions (for admin panel)
export async function getSubmissions(sheetId?: string) {
  await initializeData();

  if (sheetId) {
    return submissions.filter((sub) => sub.sheetId === sheetId);
  }

  return submissions;
}

// Get all sheet configurations
export async function getSheetConfigs() {
  await initializeData();
  return sheetConfigs;
}

// Create a new sheet configuration
export async function createSheetConfig(config: Omit<SheetConfig, "id">) {
  await initializeData();

  // Ensure each header has an id and required fields
  const headersWithIds = config.headers.map((header, index) => ({
    ...header,
    id: header.id || crypto.randomUUID(),
    description: header.description || `Field for ${header.name}`,
    dataType: header.dataType || "text",
    required: header.required !== undefined ? header.required : false,
    placeholder: header.placeholder || `Enter ${header.name.toLowerCase()}...`,
    order: header.order || index + 1,
  }));

  const timestamp = new Date().toISOString();

  const newConfig: SheetConfig = {
    ...config,
    headers: headersWithIds,
    id: crypto.randomUUID(),
    description: config.description || `${config.name} configuration`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // If this is marked as default, update other sheets
  if (newConfig.isDefault) {
    sheetConfigs = sheetConfigs.map((config) => ({
      ...config,
      isDefault: false,
    }));
  }

  sheetConfigs.push(newConfig);
  await saveSheetConfigs(sheetConfigs);
  await saveSubmissionsToExcel(submissions); // Regenerate Excel with new sheet

  return newConfig;
}

// Update an existing sheet configuration
export async function updateSheetConfig(
  id: string,
  updates: Partial<SheetConfig>
) {
  await initializeData();

  // Find the config to update
  const configIndex = sheetConfigs.findIndex((config) => config.id === id);
  if (configIndex === -1) {
    return { success: false, error: "Sheet configuration not found" };
  }

  // If this is being set as default, update other sheets
  if (updates.isDefault) {
    sheetConfigs = sheetConfigs.map((config) => ({
      ...config,
      isDefault: false,
    }));
  }

  // Update the config with the current timestamp
  sheetConfigs[configIndex] = {
    ...sheetConfigs[configIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveSheetConfigs(sheetConfigs);
  await saveSubmissionsToExcel(submissions); // Regenerate Excel with updated config

  return { success: true, config: sheetConfigs[configIndex] };
}

// Delete a sheet configuration
export async function deleteSheetConfig(id: string) {
  await initializeData();

  // Find the config to delete
  const configIndex = sheetConfigs.findIndex((config) => config.id === id);
  if (configIndex === -1) {
    return { success: false, error: "Sheet configuration not found" };
  }

  // Cannot delete the default sheet
  if (sheetConfigs[configIndex].isDefault) {
    return { success: false, error: "Cannot delete the default sheet" };
  }

  if (sheetConfigs.length <= 1) {
    return { success: false, error: "Cannot delete the last remaining sheet" };
  }

  // Remove the config
  sheetConfigs.splice(configIndex, 1);

  // Remove submissions for this sheet
  submissions = submissions.filter((sub) => sub.sheetId !== id);

  await saveSheetConfigs(sheetConfigs);
  await saveSubmissionsToExcel(submissions); // Regenerate Excel without deleted sheet

  return { success: true };
}

// Update submission status
export async function updateSubmissionStatus(
  id: string,
  status: Submission["status"],
  notes?: string
) {
  await initializeData();

  const submissionIndex = submissions.findIndex((sub) => sub.id === id);
  if (submissionIndex === -1) {
    return { success: false, error: "Submission not found" };
  }

  submissions[submissionIndex] = {
    ...submissions[submissionIndex],
    status,
    notes: notes !== undefined ? notes : submissions[submissionIndex].notes,
    updatedAt: new Date().toISOString(),
  };

  await saveSubmissionsToExcel(submissions);

  return { success: true };
}

// Get Excel file path (for admin download)
export async function getExcelFilePath() {
  return EXCEL_FILE;
}
