"use server";

import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import * as XLSX from "xlsx";
import { existsSync } from "fs";
import { z } from "zod";

// Define the submission type
export type Submission = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  submittedAt: string;
};

// In-memory storage for submissions
let submissions: Submission[] = [];

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  message: z.string().min(10),
});

// Path for storing Excel file
const DATA_DIR = join(process.cwd(), "data");
const EXCEL_FILE = join(DATA_DIR, "user-submissions.xlsx");

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
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
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Submission>(worksheet);

    return data;
  } catch (error) {
    console.error("Error loading submissions:", error);
    return [];
  }
}

// Save submissions to Excel file
async function saveSubmissionsToExcel(data: Submission[]) {
  try {
    await ensureDataDir();

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

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

// Initialize submissions from Excel file
async function initializeSubmissions() {
  if (submissions.length === 0) {
    submissions = await loadSubmissions();
  }
}

// Submit form data
export async function submitFormData(formData: unknown) {
  try {
    // Validate form data
    const validatedData = formSchema.parse(formData);

    // Initialize submissions if needed
    await initializeSubmissions();

    // Create new submission
    const newSubmission: Submission = {
      id: crypto.randomUUID(),
      ...validatedData,
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
export async function getSubmissions() {
  await initializeSubmissions();
  return submissions;
}

// Get Excel file path (for admin download)
export async function getExcelFilePath() {
  return EXCEL_FILE;
}
