"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Notice {
  id: string
  title: string
  description: string
  author_id: string
  created_at: string
  view_count: number
}

interface Profile {
  id: string
  display_name: string
  profile_image_url: string
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchNotices = async () => {
      const { data: noticesData, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && noticesData) {
        setNotices(noticesData as Notice[])


        const authorIds = [...new Set(noticesData.map((n: Notice) => n.author_id))]
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, profile_image_url")
          .in("id", authorIds)

        if (profilesData) {
          const profileMap = profilesData.reduce((acc: Record<string, Profile>, p: Profile) => {
            acc[p.id] = p
            return acc
          }, {})
          setProfiles(profileMap)
        }
      }

      setLoading(false)
    }

    fetchNotices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading notices...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
      </Link>

      <h1 className="text-4xl font-bold mb-8">All Notices</h1>

      {notices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No notices yet</p>
      )}
    </div>
  )
}