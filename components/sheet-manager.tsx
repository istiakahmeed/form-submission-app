"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Plus, Trash2, Save, Star, ArrowUp, ArrowDown, Settings } from "lucide-react"
import { getSheetConfigs, createSheetConfig, updateSheetConfig, deleteSheetConfig } from "@/app/actions/form-actions"
import type { SheetConfig, FieldDataType } from "@/lib/types"

export default function SheetManager() {
  const [sheets, setSheets] = useState<SheetConfig[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load sheet configurations
  useEffect(() => {
    const loadSheets = async () => {
      try {
        const configs = await getSheetConfigs()
        setSheets(configs)

        // Set active tab to the default sheet
        const defaultSheet = configs.find((sheet) => sheet.isDefault)
        if (defaultSheet) {
          setActiveTab(defaultSheet.id)
        } else if (configs.length > 0) {
          setActiveTab(configs[0].id)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading sheet configurations:", error)
        toast({
          variant: "destructive",
          title: "Failed to load sheet configurations",
          description: "Please try refreshing the page.",
        })
        setIsLoading(false)
      }
    }

    loadSheets()
  }, [])

  // Create a new sheet
  const handleCreateSheet = async (data: { name: string; description: string }) => {
    try {
      // Create default headers with ids
      const newSheet: Omit<SheetConfig, "id"> = {
        name: data.name,
        description: data.description || `Configuration for ${data.name}`,
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
            validationRules: [{ type: "min", value: 10, message: "Message must be at least 10 characters" }],
            order: 4,
          },
        ],
        isDefault: sheets.length === 0, // Make default if it's the first sheet
      }

      const result = await createSheetConfig(newSheet)

      setSheets((prev) => [...prev, result])
      setActiveTab(result.id)

      toast({
        title: "Sheet created",
        description: `Sheet "${data.name}" has been created successfully.`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error creating sheet:", error)
      toast({
        variant: "destructive",
        title: "Failed to create sheet",
        description: "Please try again.",
      })
    }
  }

  // Update a sheet
  const handleUpdateSheet = async (id: string, updates: Partial<SheetConfig>) => {
    try {
      const result = await updateSheetConfig(id, updates)

      if (result.success) {
        setSheets((prev) =>
          prev.map((sheet) =>
            sheet.id === id ? { ...sheet, ...updates } : updates.isDefault ? { ...sheet, isDefault: false } : sheet,
          ),
        )

        toast({
          title: "Sheet updated",
          description: "Sheet configuration has been updated successfully.",
        })

        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update sheet",
          description: result.error || "Please try again.",
        })
      }
    } catch (error) {
      console.error("Error updating sheet:", error)
      toast({
        variant: "destructive",
        title: "Failed to update sheet",
        description: "Please try again.",
      })
    }
  }

  // Delete a sheet
  const handleDeleteSheet = async (id: string) => {
    try {
      const result = await deleteSheetConfig(id)

      if (result.success) {
        const updatedSheets = sheets.filter((sheet) => sheet.id !== id)
        setSheets(updatedSheets)

        // Set active tab to another sheet
        if (activeTab === id && updatedSheets.length > 0) {
          setActiveTab(updatedSheets[0].id)
        }

        toast({
          title: "Sheet deleted",
          description: "Sheet has been deleted successfully.",
        })

        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Failed to delete sheet",
          description: result.error || "Please try again.",
        })
      }
    } catch (error) {
      console.error("Error deleting sheet:", error)
      toast({
        variant: "destructive",
        title: "Failed to delete sheet",
        description: "Please try again.",
      })
    }
  }

  if (isLoading) {
    return <div>Loading sheet configurations...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Sheets</h2>
        <NewSheetDialog onSubmit={handleCreateSheet} />
      </div>

      {sheets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No sheets configured yet.</p>
          <NewSheetDialog onSubmit={handleCreateSheet} />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full h-auto flex-wrap">
            {sheets.map((sheet) => (
              <TabsTrigger key={sheet.id} value={sheet.id} className="flex items-center gap-1">
                {sheet.name}
                {sheet.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {sheets.map((sheet) => (
            <TabsContent key={sheet.id} value={sheet.id}>
              <SheetEditor
                sheet={sheet}
                onUpdate={(updates) => handleUpdateSheet(sheet.id, updates)}
                onDelete={() => handleDeleteSheet(sheet.id)}
                isDefault={sheet.isDefault ?? false}
                canDelete={sheets.length > 1 && !sheet.isDefault}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Toaster />
    </div>
  )
}

// New Sheet Dialog
function NewSheetDialog({ onSubmit }: { onSubmit: (data: { name: string; description: string }) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name: name.trim(), description: description.trim() })
      setName("")
      setDescription("")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Sheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Sheet</DialogTitle>
          <DialogDescription>
            Create a new sheet to collect and organize different types of form submissions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-name">Sheet Name</Label>
            <Input
              id="sheet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contact Form, Event Registration"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sheet-description">Description</Label>
            <Textarea
              id="sheet-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this sheet"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Available field data types
const fieldDataTypes: { value: FieldDataType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Text Area" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
]

// Sheet Editor Component
function SheetEditor({
  sheet,
  onUpdate,
  onDelete,
  isDefault,
  canDelete,
}: {
  sheet: SheetConfig
  onUpdate: (updates: Partial<SheetConfig>) => void
  onDelete: () => void
  isDefault: boolean
  canDelete: boolean
}) {
  const [headers, setHeaders] = useState(sheet.headers)
  const [name, setName] = useState(sheet.name)
  const [description, setDescription] = useState(sheet.description || "")
  const [hasChanges, setHasChanges] = useState(false)

  // Reset state when sheet changes
  useEffect(() => {
    setHeaders(sheet.headers)
    setName(sheet.name)
    setDescription(sheet.description || "")
    setHasChanges(false)
  }, [sheet])

  // Update header name
  const updateHeaderName = (index: number, newName: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], name: newName }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Update header description
  const updateHeaderDescription = (index: number, newDescription: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], description: newDescription }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Update header data type
  const updateHeaderDataType = (index: number, newDataType: FieldDataType) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], dataType: newDataType }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Update header placeholder
  const updateHeaderPlaceholder = (index: number, newPlaceholder: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], placeholder: newPlaceholder }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Update header default value
  const updateHeaderDefaultValue = (index: number, newDefaultValue: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], defaultValue: newDefaultValue }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Toggle header required state
  const toggleHeaderRequired = (index: number) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], required: !newHeaders[index].required }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Toggle header enabled state
  const toggleHeaderEnabled = (index: number) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], enabled: !newHeaders[index].enabled }
    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Move header up in order
  const moveHeaderUp = (index: number) => {
    if (index === 0) return

    const newHeaders = [...headers]
    const currentOrder = newHeaders[index].order
    const prevOrder = newHeaders[index - 1].order

    newHeaders[index] = { ...newHeaders[index], order: prevOrder }
    newHeaders[index - 1] = { ...newHeaders[index - 1], order: currentOrder }

    // Sort by order
    newHeaders.sort((a, b) => a.order - b.order)

    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Move header down in order
  const moveHeaderDown = (index: number) => {
    if (index === headers.length - 1) return

    const newHeaders = [...headers]
    const currentOrder = newHeaders[index].order
    const nextOrder = newHeaders[index + 1].order

    newHeaders[index] = { ...newHeaders[index], order: nextOrder }
    newHeaders[index + 1] = { ...newHeaders[index + 1], order: currentOrder }

    // Sort by order
    newHeaders.sort((a, b) => a.order - b.order)

    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Add a new header
  const addNewHeader = () => {
    const newKey = `field_${Date.now()}`
    const newHeader = {
      id: crypto.randomUUID(),
      key: newKey,
      name: "New Field",
      description: "Description for the new field",
      dataType: "text" as FieldDataType,
      required: false,
      enabled: true,
      placeholder: "Enter value...",
      defaultValue: "",
      order: headers.length + 1,
    }

    setHeaders([...headers, newHeader])
    setHasChanges(true)
  }

  // Delete a header
  const deleteHeader = (index: number) => {
    if (headers.length <= 1) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "You must have at least one field in the form.",
      })
      return
    }

    const newHeaders = [...headers]
    newHeaders.splice(index, 1)

    // Reorder remaining headers
    newHeaders.forEach((header, idx) => {
      header.order = idx + 1
    })

    setHeaders(newHeaders)
    setHasChanges(true)
  }

  // Save changes
  const saveChanges = () => {
    onUpdate({ name, description, headers })
    setHasChanges(false)
  }

  // Set as default
  const setAsDefault = () => {
    onUpdate({ isDefault: true })
  }

  // Sort headers by order
  const sortedHeaders = [...headers].sort((a, b) => a.order - b.order)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-4 w-full max-w-md">
            <div className="space-y-2">
              <Label htmlFor="sheet-name">Sheet Name</Label>
              <Input
                id="sheet-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setHasChanges(true)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-description">Description</Label>
              <Textarea
                id="sheet-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setHasChanges(true)
                }}
                placeholder="Describe the purpose of this sheet"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {!isDefault && (
              <Button variant="outline" onClick={setAsDefault} size="sm">
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Sheet
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this sheet and all its submissions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Form Fields</h3>
            <Button onClick={addNewHeader} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Customize the fields that appear in your form and Excel sheet.
          </p>

          <div className="space-y-4">
            {sortedHeaders.map((header, index) => (
              <Accordion key={header.id} type="single" collapsible className="border rounded-md">
                <AccordionItem value="item-1">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`enabled-${header.id}`}
                        checked={header.enabled}
                        onCheckedChange={() => toggleHeaderEnabled(index)}
                      />
                      <span className={`font-medium ${!header.enabled ? "text-muted-foreground" : ""}`}>
                        {header.name}
                      </span>
                      {header.required && <span className="text-red-500 text-sm">*</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => moveHeaderUp(index)} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                        <span className="sr-only">Move Up</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveHeaderDown(index)}
                        disabled={index === sortedHeaders.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                        <span className="sr-only">Move Down</span>
                      </Button>
                      <AccordionTrigger>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Edit Field</span>
                      </AccordionTrigger>
                    </div>
                  </div>
                  <AccordionContent>
                    <div className="p-4 pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`field-name-${header.id}`}>Field Name</Label>
                          <Input
                            id={`field-name-${header.id}`}
                            value={header.name}
                            onChange={(e) => updateHeaderName(index, e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`field-key-${header.id}`}>Field Key</Label>
                          <Input id={`field-key-${header.id}`} value={header.key} disabled className="bg-muted" />
                          <p className="text-xs text-muted-foreground">Field key cannot be changed</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`field-desc-${header.id}`}>Description</Label>
                        <Textarea
                          id={`field-desc-${header.id}`}
                          value={header.description || ""}
                          onChange={(e) => updateHeaderDescription(index, e.target.value)}
                          placeholder="Describe this field"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`field-type-${header.id}`}>Field Type</Label>
                          <Select
                            value={header.dataType}
                            onValueChange={(value) => updateHeaderDataType(index, value as FieldDataType)}
                          >
                            <SelectTrigger id={`field-type-${header.id}`}>
                              <SelectValue placeholder="Select field type" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDataTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`field-placeholder-${header.id}`}>Placeholder</Label>
                          <Input
                            id={`field-placeholder-${header.id}`}
                            value={header.placeholder || ""}
                            onChange={(e) => updateHeaderPlaceholder(index, e.target.value)}
                            placeholder="Enter placeholder text"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`field-default-${header.id}`}>Default Value</Label>
                          <Input
                            id={`field-default-${header.id}`}
                            value={header.defaultValue || ""}
                            onChange={(e) => updateHeaderDefaultValue(index, e.target.value)}
                            placeholder="Default value (optional)"
                          />
                        </div>
                        <div className="flex items-center space-x-4 h-full pt-8">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`required-${header.id}`}
                              checked={header.required}
                              onCheckedChange={() => toggleHeaderRequired(index)}
                            />
                            <Label htmlFor={`required-${header.id}`}>Required Field</Label>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button variant="destructive" size="sm" onClick={() => deleteHeader(index)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Field
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={saveChanges} disabled={!hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}
