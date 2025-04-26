export type SheetConfig = {
  id: string
  name: string
  headers: {
    name: string
    key: string
    enabled: boolean
  }[]
  isDefault?: boolean
}

export type Submission = {
  id: string
  sheetId: string
  data: Record<string, any>
  submittedAt: string
}
