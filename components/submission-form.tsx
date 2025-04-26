"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
          switch (header.key) {
            case "email":
              schemaObj[header.key] = z.string().email({ message: `Please enter a valid email address.` })
              break
            case "phone":
              schemaObj[header.key] = z.string().regex(/^\+?[0-9]{10,15}$/, {
                message: `Please enter a valid phone number (10-15 digits).`,
              })
              break
            case "message":
              schemaObj[header.key] = z.string().min(10, { message: `${header.name} must be at least 10 characters.` })
              break
            default:
              schemaObj[header.key] = z.string().min(2, { message: `${header.name} must be at least 2 characters.` })
          }
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
      const defaultValues: Record<string, string> = {}
      sheetConfig.headers.forEach((header) => {
        if (header.enabled) {
          defaultValues[header.key] = ""
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

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {sheetConfig.headers.map((header) => {
            if (!header.enabled) return null

            return (
              <FormField
                key={header.key}
                control={form.control}
                name={header.key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{header.name}</FormLabel>
                    <FormControl>
                      {header.key === "message" ? (
                        <Textarea
                          placeholder={`Enter your ${header.name.toLowerCase()}...`}
                          className={header.key === "message" ? "min-h-[120px]" : ""}
                          {...field}
                        />
                      ) : (
                        <Input
                          type={header.key === "email" ? "email" : "text"}
                          placeholder={`Enter your ${header.name.toLowerCase()}...`}
                          {...field}
                        />
                      )}
                    </FormControl>
                    {header.key === "phone" && (
                      <FormDescription>Enter your phone number with country code (optional)</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )
          })}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </Form>
      <Toaster />
    </>
  )
}
