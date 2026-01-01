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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEPARTMENTS = {
  COLNAS: [
    { label: "Biotechnology", value: "Biotechnology" },
    { label: "Applied Mathematics", value: "Applied Mathematics" },
    { label: "Statistics", value: "Statistics" },
    { label: "Microbiology", value: "Microbiology" },
    { label: "Physics with Electricity", value: "Physics with Electricity" },
    { label: "Industrial Chemistry", value: "Industrial Chemistry" },
    { label: "Biochemistry", value: "Biochemistry" },
    { label: "Computer Science", value: "Computer Science" },
    { label: "Information Technology", value: "Information Technology" },
  ],
  COLMANS: [
    { label: "Business Administration", value: "Business Administration" },
    { label: "Human Resource Management", value: "Human Resource Management" },
    { label: "Marketing", value: "Marketing" },
    { label: "Accounting", value: "Accounting" },
    { label: "Economics", value: "Economics" },
    { label: "Finance and Banking", value: "Finance and Banking" },
    { label: "Management Technology", value: "Management Technology" },
    { label: "Project Management", value: "Project Management" },
    { label: "Transport Management", value: "Transport Management" },
  ],
  COLFAST: [
    { label: "Agricultural and Agricultural technology", value: "Agric and Agric tech" },
    { label: "Food Technology", value: "Food Technology" },
    { label: "Agricbusiness", value: "Agricbusiness" },
    { label: "Agronomy", value: "Agronomy" },
    { label: "Fishery", value: "Fishery" },
    { label: "Animal sciences", value: "Animal sciences" },
    { label: "Nutrition and Dietetics", value: "Nutrition and Dietetics" },
  ],
  COLENG: [
    { label: "Civil Engineering", value: "Civil Engineering" },
    { label: "Mechanical Engineering", value: "Mechanical Engineering" },
    { label: "Electrical and Electronics Engineering", value: "Electrical and Electronics Engineering" },
    { label: "biomedical Engineering", value: "biomedical Engineering" },
    { label: "Mechatronics Engineering", value: "Mechatronics Engineering" },
    { label: "Agricultural and Biosystems Engineering", value: "Agricultural and Biosystems Engineering" },
    { label: "Telecommunication Engineering", value: "Telecommunication Engineering" },
    { label: "Computer Engineering", value: "Computer Engineering" },
  ],
  COLENVS: [
    { label: "Architecture", value: "Architecture" },
    { label: "Building Technology", value: "Geology" },
    { label: "Estate Management", value: "Estate Management" },
    { label: "Quantity Surveying", value: "Quantity Surveying" },
    { label: "Surveying and Geoinformatics", value: "Surveying and Geo." },
    { label: "Urban and Regional Planning", value: "Urban and Regional Planning" },
  ],
}

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [userType, setUserType] = useState("regular")
  const [level, setLevel] = useState("100")
  const [program, setProgram] = useState("undergraduate")
  const [college, setCollege] = useState("COLNAS")
  const [matricNumber, setMatricNumber] = useState("")
  const [department, setDepartment] = useState("Biotechnology")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateMatricNumber = (matric: string): boolean => {
    if (!matric) return true // optional field
    const matricPattern = /^\d{4}\/\d+$/
    return matricPattern.test(matric)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (matricNumber && !validateMatricNumber(matricNumber)) {
      setError("Matric number must be in format YYYY/number (e.g., 2024/13016)")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}`,
          data: {
            display_name: displayName || email,
            user_type: userType,
            level,
            program,
            college,
            matric_number: matricNumber,
            department,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>Join Bells Notice to stay connected</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="userType">Account Type</Label>
                  <Select value={userType} onValueChange={setUserType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular User</SelectItem>
                      <SelectItem value="rep">Rep (Can post notices)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="level">Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 Level</SelectItem>
                        <SelectItem value="200">200 Level</SelectItem>
                        <SelectItem value="300">300 Level</SelectItem>
                        <SelectItem value="400">400 Level</SelectItem>
                        <SelectItem value="500">500 Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="program">Program</Label>
                    <Select value={program} onValueChange={setProgram}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="postgraduate">Postgraduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="college">College</Label>
                  <Select value={college} onValueChange={setCollege}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COLNAS">College of Natural and Applied Sciences</SelectItem>
                      <SelectItem value="COLMANS">College of Management and Social Sciences</SelectItem>
                      <SelectItem value="COLFAST">College of Agriculture, Food and Sustainable Development</SelectItem>
                      <SelectItem value="COLENG">College of Engineering</SelectItem>
                      <SelectItem value="COLENVS">College of Environmental Sciences</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS[college as keyof typeof DEPARTMENTS]?.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matricNumber">Matric Number</Label>
                  <Input
                    id="matricNumber"
                    type="text"
                    placeholder="e.g., 2024/13016"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Format: YYYY/number (e.g., 2024/13016)</p>
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
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
