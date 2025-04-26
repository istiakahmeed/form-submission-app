import { jwtVerify } from "jose"

// In a real app, this would be stored securely in environment variables
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return !!payload.username
  } catch (error) {
    return false
  }
}
