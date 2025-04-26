"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, Star } from "lucide-react";
import {
  getSheetConfigs,
  createSheetConfig,
  updateSheetConfig,
  deleteSheetConfig,
} from "@/app/actions/form-actions";
import type { SheetConfig } from "@/lib/types";

export default function SheetManager() {
  const [sheets, setSheets] = useState<SheetConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load sheet configurations
  useEffect(() => {
    const loadSheets = async () => {
      try {
        const configs = await getSheetConfigs();
        setSheets(configs);

        // Set active tab to the default sheet
        const defaultSheet = configs.find((sheet) => sheet.isDefault);
        if (defaultSheet) {
          setActiveTab(defaultSheet.id);
        } else if (configs.length > 0) {
          setActiveTab(configs[0].id);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading sheet configurations:", error);
        toast({
          variant: "destructive",
          title: "Failed to load sheet configurations",
          description: "Please try refreshing the page.",
        });
        setIsLoading(false);
      }
    };

    loadSheets();
  }, []);

  // Create a new sheet
  const handleCreateSheet = async (data: { name: string }) => {
    try {
      // Create default headers
      const newSheet: Omit<SheetConfig, "id"> = {
        name: data.name,
        headers: [
          { key: "name", name: "Name", enabled: true },
          { key: "email", name: "Email", enabled: true },
          { key: "phone", name: "Phone", enabled: true },
          { key: "message", name: "Message", enabled: true },
        ],
        isDefault: sheets.length === 0, // Make default if it's the first sheet
      };

      const result = await createSheetConfig(newSheet);

      setSheets((prev) => [...prev, result]);
      setActiveTab(result.id);

      toast({
        title: "Sheet created",
        description: `Sheet "${data.name}" has been created successfully.`,
      });

      router.refresh();
    } catch (error) {
      console.error("Error creating sheet:", error);
      toast({
        variant: "destructive",
        title: "Failed to create sheet",
        description: "Please try again.",
      });
    }
  };

  // Update a sheet
  const handleUpdateSheet = async (
    id: string,
    updates: Partial<SheetConfig>
  ) => {
    try {
      const result = await updateSheetConfig(id, updates);

      if (result.success) {
        setSheets((prev) =>
          prev.map((sheet) =>
            sheet.id === id
              ? { ...sheet, ...updates }
              : updates.isDefault
              ? { ...sheet, isDefault: false }
              : sheet
          )
        );

        toast({
          title: "Sheet updated",
          description: "Sheet configuration has been updated successfully.",
        });

        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update sheet",
          description: result.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating sheet:", error);
      toast({
        variant: "destructive",
        title: "Failed to update sheet",
        description: "Please try again.",
      });
    }
  };

  // Delete a sheet
  const handleDeleteSheet = async (id: string) => {
    try {
      const result = await deleteSheetConfig(id);

      if (result.success) {
        const updatedSheets = sheets.filter((sheet) => sheet.id !== id);
        setSheets(updatedSheets);

        // Set active tab to another sheet
        if (activeTab === id && updatedSheets.length > 0) {
          setActiveTab(updatedSheets[0].id);
        }

        toast({
          title: "Sheet deleted",
          description: "Sheet has been deleted successfully.",
        });

        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to delete sheet",
          description: result.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting sheet:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete sheet",
        description: "Please try again.",
      });
    }
  };

  if (isLoading) {
    return <div>Loading sheet configurations...</div>;
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold'>Your Sheets</h2>
        <NewSheetDialog onSubmit={handleCreateSheet} />
      </div>

      {sheets.length === 0 ? (
        <div className='text-center py-8'>
          <p className='text-muted-foreground mb-4'>
            No sheets configured yet.
          </p>
          <NewSheetDialog onSubmit={handleCreateSheet} />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='mb-4 w-full h-auto flex-wrap'>
            {sheets.map((sheet) => (
              <TabsTrigger
                key={sheet.id}
                value={sheet.id}
                className='flex items-center gap-1'
              >
                {sheet.name}
                {sheet.isDefault && (
                  <Star className='h-3 w-3 text-yellow-500' />
                )}
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
  );
}

// New Sheet Dialog
function NewSheetDialog({
  onSubmit,
}: {
  onSubmit: (data: { name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name: name.trim() });
      setName("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className='h-4 w-4 mr-2' />
          New Sheet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Sheet</DialogTitle>
          <DialogDescription>
            Create a new sheet to collect and organize different types of form
            submissions.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <Label htmlFor='sheet-name'>Sheet Name</Label>
          <Input
            id='sheet-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g., Contact Form, Event Registration'
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sheet Editor Component
function SheetEditor({
  sheet,
  onUpdate,
  onDelete,
  isDefault,
  canDelete,
}: {
  sheet: SheetConfig;
  onUpdate: (updates: Partial<SheetConfig>) => void;
  onDelete: () => void;
  isDefault: boolean;
  canDelete: boolean;
}) {
  const [headers, setHeaders] = useState(sheet.headers);
  const [name, setName] = useState(sheet.name);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when sheet changes
  useEffect(() => {
    setHeaders(sheet.headers);
    setName(sheet.name);
    setHasChanges(false);
  }, [sheet]);

  // Update header name
  const updateHeaderName = (index: number, newName: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], name: newName };
    setHeaders(newHeaders);
    setHasChanges(true);
  };

  // Toggle header enabled state
  const toggleHeaderEnabled = (index: number) => {
    const newHeaders = [...headers];
    newHeaders[index] = {
      ...newHeaders[index],
      enabled: !newHeaders[index].enabled,
    };
    setHeaders(newHeaders);
    setHasChanges(true);
  };

  // Save changes
  const saveChanges = () => {
    onUpdate({ name, headers });
    setHasChanges(false);
  };

  // Set as default
  const setAsDefault = () => {
    onUpdate({ isDefault: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <div className='space-y-1'>
            <Label htmlFor='sheet-name'>Sheet Name</Label>
            <Input
              id='sheet-name'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              className='max-w-xs'
            />
          </div>
          <div className='flex gap-2'>
            {!isDefault && (
              <Button variant='outline' onClick={setAsDefault} size='sm'>
                <Star className='h-4 w-4 mr-2' />
                Set as Default
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='destructive' size='sm'>
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete Sheet
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this sheet and all its
                      submissions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Form Fields</h3>
          <p className='text-sm text-muted-foreground'>
            Customize the field names that appear in your form and Excel sheet.
          </p>

          <div className='space-y-4'>
            {headers.map((header, index) => (
              <div
                key={header.key}
                className='flex items-center justify-between gap-4 p-3 border rounded-md'
              >
                <div className='flex-1'>
                  <Label
                    htmlFor={`header-${index}`}
                    className='text-sm font-medium'
                  >
                    Field Key: {header.key}
                  </Label>
                  <Input
                    id={`header-${index}`}
                    value={header.name}
                    onChange={(e) => updateHeaderName(index, e.target.value)}
                    className='mt-1'
                    placeholder='Display Name'
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <Label htmlFor={`enabled-${index}`} className='text-sm'>
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${index}`}
                    checked={header.enabled}
                    onCheckedChange={() => toggleHeaderEnabled(index)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex justify-end'>
        <Button onClick={saveChanges} disabled={!hasChanges}>
          <Save className='h-4 w-4 mr-2' />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
