import { Suspense } from "react";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SheetManager from "@/components/sheet-manager";

export default async function SheetsPage() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  const isAuthenticated = authToken ? await verifyAuthToken(authToken) : false;

  // If not authenticated, redirect to admin login
  if (!isAuthenticated) {
    redirect("/admin");
  }

  return (
    <div className='min-h-screen p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold'>Sheet Configuration</h1>
          <p className='text-muted-foreground'>
            Manage your form sheets and customize field headers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sheet Manager</CardTitle>
            <CardDescription>
              Create and configure different sheets for your form submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading sheet configurations...</div>}>
              <SheetManager />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
