"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import HomePage from "@/components/pages/home-page"
import LoginPage from "@/components/pages/login-page"
import { NavigationMenu } from "@/components/navigation/navigation-menu"
import { TopNavbar } from "@/components/top-navbar"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => data?.subscription?.unsubscribe?.()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {user && <TopNavbar user={user} />}
      <NavigationMenu user={user} />
      <div className={user ? "pt-16" : ""}>{user ? <HomePage user={user} /> : <LoginPage />}</div>
    </div>
  )
}
