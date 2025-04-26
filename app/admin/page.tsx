import { cookies } from "next/headers"
import AdminLogin from "@/components/admin-login"
import AdminDashboard from "@/components/admin-dashboard"
import { verifyAuthToken } from "@/lib/auth"

export default async function AdminPage() {
  // Check if user is authenticated
  const cookieStore = cookies()
  const authToken = cookieStore.get("auth_token")?.value

  const isAuthenticated = authToken ? await verifyAuthToken(authToken) : false

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AdminLogin />
        </div>
      </div>
    )
  }

  // If authenticated, show admin dashboard
  return <AdminDashboard />
}
