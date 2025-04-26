import { Suspense } from "react"
import { getSubmissions } from "@/app/actions/form-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, LogOut } from "lucide-react"
import { logoutAdmin } from "@/app/actions/auth-actions"
import SubmissionsTable from "@/components/submissions-table"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <SubmissionStatsCard />
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

function DownloadExcelCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Export Data</CardTitle>
        <CardDescription>Download all submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <a href="/api/download-excel" download>
            <Download className="h-4 w-4 mr-2" />
            Download Excel File
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
