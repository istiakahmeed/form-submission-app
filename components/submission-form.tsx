"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { submitFormData, getSheetConfigs } from "@/app/actions/form-actions"
import { Toaster } from "@/components/ui/toaster"
import type { SheetConfig } from "@/lib/types"

// Update the component
export default function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null)
  const [formSchema, setFormSchema] = useState<z.ZodObject<any>>(z.object({}))

  // Fetch the default sheet configuration
  useEffect(() => {
    const fetchConfig = async () => {
      const configs = await getSheetConfigs()
      const defaultConfig = configs.find((config) => config.isDefault) || configs[0]
      setSheetConfig(defaultConfig)

      // Create dynamic schema based on the sheet config
      const schemaObj: Record<string, any> = {}
      defaultConfig.headers.forEach((header) => {
        if (header.enabled) {
          let fieldSchema: any = z.string()

          // Apply required validation
          if (header.required) {
            fieldSchema = fieldSchema.min(1, { message: `${header.name} is required` })
          } else {
            fieldSchema = fieldSchema.optional()
          }

          // Apply data type specific validation
          switch (header.dataType) {
            case "email":
              fieldSchema = fieldSchema.email({ message: `Please enter a valid email address` })
              break
            case "phone":
              fieldSchema = fieldSchema.regex(/^\+?[0-9]{10,15}$/, {
                message: `Please enter a valid phone number (10-15 digits)`,
              })
              break
            case "number":
              fieldSchema = z.preprocess(
                (val) => (val === "" ? undefined : Number(val)),
                z.number({ invalid_type_error: `${header.name} must be a number` }).optional(),
              )
              break
            case "date":
              fieldSchema = z.preprocess(
                (val) => (val === "" ? undefined : new Date(val as string)),
                z.date({ invalid_type_error: `${header.name} must be a valid date` }).optional(),
              )
              break
          }

          // Apply custom validation rules
          if (header.validationRules && header.validationRules.length > 0) {
            header.validationRules.forEach((rule) => {
              switch (rule.type) {
                case "min":
                  if (typeof rule.value === "number") {
                    fieldSchema = fieldSchema.min(rule.value, { message: rule.message })
                  }
                  break
                case "max":
                  if (typeof rule.value === "number") {
                    fieldSchema = fieldSchema.max(rule.value, { message: rule.message })
                  }
                  break
                case "regex":
                  if (typeof rule.value === "string") {
                    fieldSchema = fieldSchema.regex(new RegExp(rule.value), { message: rule.message })
                  }
                  break
              }
            })
          }

          schemaObj[header.key] = fieldSchema
        }
      })

      setFormSchema(z.object(schemaObj))
    }

    fetchConfig()
  }, [])

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: "onBlur",
  })

  // Reset form when schema changes
  useEffect(() => {
    if (sheetConfig) {
      const defaultValues: Record<string, any> = {}
      sheetConfig.headers.forEach((header) => {
        if (header.enabled) {
          defaultValues[header.key] = header.defaultValue || ""
        }
      })
      form.reset(defaultValues)
    }
  }, [formSchema, sheetConfig, form])

  async function onSubmit(data: any) {
    try {
      setIsSubmitting(true)
      const result = await submitFormData(data)

      if (result.success) {
        toast({
          title: "Submission successful!",
          description: "Thank you for your submission. We'll get back to you soon.",
        })
        form.reset()
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: result.error || "There was a problem with your submission. Please try again.",
        })

        // Display validation errors if available
        if (result.validationErrors) {
          result.validationErrors.forEach((error: any) => {
            form.setError(error.path[0], {
              type: "server",
              message: error.message,
            })
          })
        }
      }
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "There was a problem with your submission. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!sheetConfig) {
    return <div>Loading form...</div>
  }

  // Sort headers by order
  const sortedHeaders = [...sheetConfig.headers].filter((header) => header.enabled).sort((a, b) => a.order - b.order)

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {sortedHeaders.map((header) => (
            <FormField
              key={header.id}
              control={form.control}
              name={header.key}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {header.name}
                    {header.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>{renderFormControl(header, field)}</FormControl>
                  {header.description && <FormDescription>{header.description}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </Form>
      <Toaster />
    </>
  )
}

// Helper function to render the appropriate form control based on data type
function renderFormControl(header: SheetConfig["headers"][0], field: any) {
  switch (header.dataType) {
    case "textarea":
      return <Textarea placeholder={header.placeholder} className="min-h-[120px]" {...field} />

    case "select":
      return (
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger>
            <SelectValue placeholder={header.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {header.options?.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "checkbox":
      return <Checkbox checked={field.value} onCheckedChange={field.onChange} />

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value ? format(new Date(field.value), "PPP") : header.placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value ? new Date(field.value) : undefined}
              onSelect={field.onChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )

    case "number":
      return <Input type="number" placeholder={header.placeholder} {...field} />

    default:
      return (
        <Input
          type={header.dataType === "email" ? "email" : header.dataType === "phone" ? "tel" : "text"}
          placeholder={header.placeholder}
          {...field}
        />
      )
  }
}
