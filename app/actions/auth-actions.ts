"use server"

import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { z } from "zod"

// In a real app, these would be stored securely in environment variables
// and the admin credentials would be in a database
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export async function loginAdmin(formData: unknown) {
  try {
    // Validate form data
    const { username, password } = loginSchema.parse(formData)

    // Check credentials (in a real app, this would check against a database)
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return { success: false, error: "Invalid username or password" }
    }

    // Create JWT token
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // Token expires in 2 hours
      .sign(JWT_SECRET)

    // Set cookie
    cookies().set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 2, // 2 hours
    })

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export async function logoutAdmin() {
  cookies().delete("auth_token")
}

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return !!payload.username
  } catch (error) {
    return false
  }
}
