import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { verifyAuthToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = request.cookies.get("auth_token")?.value

    if (!authToken || !(await verifyAuthToken(authToken))) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Path to Excel file
    const filePath = join(process.cwd(), "data", "user-submissions.xlsx")

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Generate a filename with the current date
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const filename = `form-submissions-${formattedDate}.xlsx`

    // Return file as response
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    })
  } catch (error) {
    console.error("Error downloading Excel file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
