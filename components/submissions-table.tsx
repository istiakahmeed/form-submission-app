import { getSubmissions, getSheetConfigs } from "@/app/actions/form-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

export default async function SubmissionsTable() {
  const submissions = await getSubmissions()
  const sheetConfigs = await getSheetConfigs()

  if (submissions.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">No submissions yet</div>
  }

  // Get all unique headers from all sheets
  const allHeaders = new Set<string>()
  sheetConfigs.forEach((config) => {
    config.headers.forEach((header) => {
      if (header.enabled) {
        allHeaders.add(header.key)
      }
    })
  })

  // Get sheet name by ID
  const getSheetName = (sheetId: string) => {
    const sheet = sheetConfigs.find((config) => config.id === sheetId)
    return sheet ? sheet.name : "Unknown"
  }

  // Get header display name by key and sheet ID
  const getHeaderName = (key: string, sheetId: string) => {
    const sheet = sheetConfigs.find((config) => config.id === sheetId)
    if (!sheet) return key

    const header = sheet.headers.find((h) => h.key === key)
    return header ? header.name : key
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sheet</TableHead>
            <TableHead>Date</TableHead>
            {Array.from(allHeaders).map((key) => (
              <TableHead key={key}>{key}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell>{getSheetName(submission.sheetId)}</TableCell>
              <TableCell>{formatDate(submission.submittedAt)}</TableCell>
              {Array.from(allHeaders).map((key) => (
                <TableCell key={key} className="max-w-xs truncate">
                  {submission.data[key] || ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
