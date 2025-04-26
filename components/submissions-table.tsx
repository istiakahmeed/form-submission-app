import { getSubmissions, getSheetConfigs } from "@/app/actions/form-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Info, CheckCircle, Clock, Archive } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Submission } from "@/lib/types"

export default async function SubmissionsTable() {
  const submissions = await getSubmissions()
  const sheetConfigs = await getSheetConfigs()

  if (submissions.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">No submissions yet</div>
  }

  // Get all unique header keys from all sheets
  const allHeaderKeys = new Set<string>()
  sheetConfigs.forEach((config) => {
    config.headers.forEach((header) => {
      if (header.enabled) {
        allHeaderKeys.add(header.key)
      }
    })
  })

  // Get sheet name by ID
  const getSheetName = (sheetId: string) => {
    const sheet = sheetConfigs.find((config) => config.id === sheetId)
    return sheet ? sheet.name : "Unknown"
  }

  // Get header display name by key and sheet ID
  const getHeaderInfo = (key: string, sheetId: string) => {
    const sheet = sheetConfigs.find((config) => config.id === sheetId)
    if (!sheet) return { name: key, description: "" }

    const header = sheet.headers.find((h) => h.key === key)
    return header ? { name: header.name, description: header.description || "" } : { name: key, description: "" }
  }

  // Get status badge
  const getStatusBadge = (status: Submission["status"]) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>
      case "read":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Read
          </Badge>
        )
      case "archived":
        return <Badge variant="secondary">Archived</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get status icon
  const getStatusIcon = (status: Submission["status"]) => {
    switch (status) {
      case "new":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "read":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "archived":
        return <Archive className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  // Sort submissions by date (newest first)
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Sheet</TableHead>
            <TableHead>Date</TableHead>
            {Array.from(allHeaderKeys).map((key) => {
              // Find the most common name for this key across all sheets
              const nameCount: Record<string, number> = {}
              sheetConfigs.forEach((config) => {
                const header = config.headers.find((h) => h.key === key)
                if (header) {
                  nameCount[header.name] = (nameCount[header.name] || 0) + 1
                }
              })

              // Use the most common name or fallback to the key
              const mostCommonName = Object.entries(nameCount).sort((a, b) => b[1] - a[1])[0]?.[0] || key

              return (
                <TableHead key={key} className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {mostCommonName}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Field key: {key}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSubmissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getStatusIcon(submission.status)}
                  {getStatusBadge(submission.status)}
                </div>
              </TableCell>
              <TableCell>{getSheetName(submission.sheetId)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{formatDate(submission.submittedAt)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
                      {submission.updatedAt && submission.updatedAt !== submission.submittedAt && (
                        <p>Updated: {new Date(submission.updatedAt).toLocaleString()}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              {Array.from(allHeaderKeys).map((key) => {
                const headerInfo = getHeaderInfo(key, submission.sheetId)
                return (
                  <TableCell key={`${submission.id}-${key}`} className="max-w-xs truncate">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{submission.data[key] || ""}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{headerInfo.name}</p>
                          {headerInfo.description && <p className="text-xs">{headerInfo.description}</p>}
                          <p className="text-xs mt-1">Value: {submission.data[key] || "Not provided"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
