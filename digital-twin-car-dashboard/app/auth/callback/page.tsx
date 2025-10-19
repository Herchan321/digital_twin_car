"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the auth code from the URL
        const code = searchParams.get('code')

        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Auth error:", error)
          throw error
        }
        
        if (session) {
          console.log("Session established:", session.user.email)
          // Use replace instead of push to prevent back navigation to callback
          window.location.replace("/dashboard")
        } else {
          console.log("No session found")
          window.location.replace("/login")
        }
      } catch (error) {
        console.error("Error during auth callback:", error)
        window.location.replace("/login")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Authentification en cours...</p>
    </div>
  )
}