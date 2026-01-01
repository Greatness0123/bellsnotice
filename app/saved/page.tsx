"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"

export default function SavedNoticesPage() {
  const [savedNotices, setSavedNotices] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchSavedNotices = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/")
        return
      }

      const { data: savedData } = await supabase.from("saved_notices").select("notice_id").eq("user_id", user.id)

      if (savedData) {
        const noticeIds = savedData.map((s) => s.notice_id)

        const { data: noticesData } = await supabase
          .from("notices")
          .select("*")
          .in("id", noticeIds)
          .order("created_at", { ascending: false })

        if (noticesData) {
          setSavedNotices(noticesData)

          const authorIds = [...new Set(noticesData.map((n) => n.author_id))]
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name, profile_image_url")
            .in("id", authorIds)

          if (profilesData) {
            const profileMap = profilesData.reduce((acc: any, p) => {
              acc[p.id] = p
              return acc
            }, {})
            setProfiles(profileMap)
          }
        }
      }

      setLoading(false)
    }

    fetchSavedNotices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading saved notices...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Saved Notices</h1>

      {savedNotices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedNotices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No saved notices yet</p>
      )}
    </div>
  )
}
