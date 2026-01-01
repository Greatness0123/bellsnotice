import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>Check your email to confirm your account</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              We&apos;ve sent a confirmation email to your inbox. Please verify your email address before signing in.
            </p>
            <Link href="/">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
