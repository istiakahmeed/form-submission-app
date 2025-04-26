"use server";

import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";
import { existsSync } from "fs";
import { z } from "zod";
import type { SheetConfig, Submission } from "@/lib/types";

// Path for storing data
const DATA_DIR = join(process.cwd(), "data");
const EXCEL_FILE = join(DATA_DIR, "user-submissions.xlsx");
const CONFIG_FILE = join(DATA_DIR, "sheet-configs.json");

// Default sheet configuration
const DEFAULT_SHEET_CONFIG: SheetConfig = {
  id: "default",
  name: "Contact Form",
  headers: [
    { key: "name", name: "Name", enabled: true },
    { key: "email", name: "Email", enabled: true },
    { key: "phone", name: "Phone", enabled: true },
    { key: "message", name: "Message", enabled: true },
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
      sheetData.forEach((row) => {
        if (row.id && row.submittedAt) {
          allSubmissions.push({
            id: row.id,
            sheetId: sheetConfig.id,
            data: { ...row },
            submittedAt: row.submittedAt,
          });
        }
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
        const row: Record<string, any> = {
          id: submission.id,
          submittedAt: submission.submittedAt,
        };

        // Add data for each enabled header
        config.headers.forEach((header) => {
          if (header.enabled) {
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

// Form validation schema - dynamically created based on the default sheet
function createFormSchema() {
  const schemaObj: Record<string, any> = {};

  const defaultSheet =
    sheetConfigs.find((config) => config.isDefault) || DEFAULT_SHEET_CONFIG;

  defaultSheet.headers.forEach((header) => {
    if (header.enabled) {
      switch (header.key) {
        case "email":
          schemaObj[header.key] = z
            .string()
            .email({ message: `Please enter a valid email address.` });
          break;
        case "phone":
          schemaObj[header.key] = z.string().regex(/^\+?[0-9]{10,15}$/, {
            message: `Please enter a valid phone number (10-15 digits).`,
          });
          break;
        case "message":
          schemaObj[header.key] = z
            .string()
            .min(10, {
              message: `${header.name} must be at least 10 characters.`,
            });
          break;
        default:
          schemaObj[header.key] = z
            .string()
            .min(2, {
              message: `${header.name} must be at least 2 characters.`,
            });
      }
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

  const newConfig: SheetConfig = {
    ...config,
    id: crypto.randomUUID(),
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

  // Update the config
  sheetConfigs[configIndex] = {
    ...sheetConfigs[configIndex],
    ...updates,
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

// Get Excel file path (for admin download)
export async function getExcelFilePath() {
  return EXCEL_FILE;
}
