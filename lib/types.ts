export type FieldDataType = "text" | "email" | "phone" | "number" | "textarea" | "date" | "select" | "checkbox"

export type ValidationRule = {
  type: "min" | "max" | "regex" | "custom"
  value: string | number
  message: string
}

export type FieldOption = {
  id: string
  label: string
  value: string
}

export type SheetConfig = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  headers: {
    id: string
    key: string
    name: string
    description: string
    dataType: FieldDataType
    required: boolean
    enabled: boolean
    placeholder: string
    defaultValue?: string
    validationRules?: ValidationRule[]
    options?: FieldOption[] // For select fields
    order: number
  }[]
  isDefault?: boolean
}

export type Submission = {
  id: string
  sheetId: string
  data: Record<string, any>
  submittedAt: string
  updatedAt?: string
  status: "new" | "read" | "archived"
  notes?: string
}
