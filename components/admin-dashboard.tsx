import Link from "next/link"
import { Suspense } from "react"
import { getSubmissions, getSheetConfigs } from "@/app/actions/form-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, FileSpreadsheet, Clock, CheckCircle, Archive } from "lucide-react"
import { logoutAdmin } from "@/app/actions/auth-actions"
import SubmissionsTable from "@/components/submissions-table"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sheets">
                <Settings className="h-4 w-4 mr-2" />
                Manage Sheets
              </Link>
            </Button>
            <form action={logoutAdmin}>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </form>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <SubmissionStatsCard />
          <SubmissionStatusCard />
          <SheetStatsCard />
          <DownloadExcelCard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>View all form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading submissions...</div>}>
              <SubmissionsTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function SubmissionStatsCard() {
  const submissions = await getSubmissions()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Total Submissions</CardTitle>
        <CardDescription>All-time form submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{submissions.length}</p>
      </CardContent>
    </Card>
  )
}

async function SubmissionStatusCard() {
  const submissions = await getSubmissions()

  const newCount = submissions.filter((sub) => sub.status === "new").length
  const readCount = submissions.filter((sub) => sub.status === "read").length
  const archivedCount = submissions.filter((sub) => sub.status === "archived").length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Submission Status</CardTitle>
        <CardDescription>Breakdown by status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>New</span>
            </div>
            <span className="font-medium">{newCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Read</span>
            </div>
            <span className="font-medium">{readCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-gray-500" />
              <span>Archived</span>
            </div>
            <span className="font-medium">{archivedCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DownloadExcelCard() {
  // Get current date for the filename
  const date = new Date()
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Export Data</CardTitle>
        <CardDescription>Download form field data only</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <a href="/api/download-excel" download={`form-submissions-${formattedDate}.xlsx`}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Excel File
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

async function SheetStatsCard() {
  const sheets = await getSheetConfigs()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Sheet Types</CardTitle>
        <CardDescription>Number of configured sheets</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{sheets.length}</p>
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Default: {sheets.find((s) => s.isDefault)?.name || "None"}</p>
        </div>
      </CardContent>
    </Card>
  )
}
