import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import RegisterSW from "@/components/RegisterSW"

import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Bells Notice - Stay Connected",
  description: "A modern notice board for staying informed",
  creator: "Greatness",
  manifest: "/manifest.json",
  themeColor: "#0f172a",

  icons: {
    icon: [
      {
        url: "/images/bells-20notice-20icon.jpg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/bells-20notice-20icon.jpg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/images/bells-20notice-20icon.jpg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
      
        <RegisterSW />

        {children}

        <Analytics />
      </body>
    </html>
  )
}
