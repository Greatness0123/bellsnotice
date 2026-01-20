"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [credential, setCredential] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let email = credential


      if (credential.includes("/")) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .eq("matric_number", credential)
          .single()

        if (!profiles) {
          throw new Error("Matric number not found")
        }
        email = profiles.email || credential
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === "adminnotice") {

      sessionStorage.setItem("adminAuthenticated", "true")

      setTimeout(() => {
        router.push("/admin")
        router.refresh()
      }, 100)
    } else {
      setError("Incorrect admin password")
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center mb-6">
            <img
              src="/images/bells-20notice-20icon.jpg"
              alt="Bells Notice"
              className="w-20 h-20 mx-auto mb-4 rounded-lg"
            />
            <h1 className="text-3xl font-bold">Bells Notice</h1>
            <p className="text-muted-foreground">Stay connected and informed</p>
          </div>

          {!showAdminPassword ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Sign In</CardTitle>
                  <CardDescription>Use email or matric number to sign in</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="credential">Email or Matric Number</Label>
                      <Input
                        id="credential"
                        type="text"
                        placeholder="user@example.com or 2024/13016"
                        required
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  <div className="mt-4 text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/sign-up" className="underline underline-offset-4">
                      Sign up
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={() => setShowAdminPassword(true)} className="w-full">
                Sign in as Admin
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription>Enter admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full">
                    Access Admin Panel
                  </Button>
                </form>
                <Button variant="ghost" onClick={() => setShowAdminPassword(false)} className="w-full mt-4">
                  Back to User Login
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}