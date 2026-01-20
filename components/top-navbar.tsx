"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Bell } from "lucide-react"
import Image from "next/image"
import { NoticeCreateModal } from "./notice-create-modal"

interface TopNavbarProps {
  user: any
}

export function TopNavbar({ user }: TopNavbarProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        setProfile(data)
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  if (!user || loading) {
    return null
  }

  const isRep = profile?.user_type === "rep"

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                 <div className="flex-1">
            <Link href="/" className="text-lg font-bold text-black-600">
              Bells Notice
            </Link>
          </div>

          
          <div className="flex-1"></div>

          
          <div className="flex items-center gap-4">
            
            {isRep ? (
              <Button size="sm" onClick={() => setCreateNoticeOpen(true)} className="flex items-center gap-2">
                <Plus size={16} />
                Add Notice
              </Button>
            ) : (
              <Link href="/request-notice">
                <Button size="sm" variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Bell size={16} />
                  Request to Post
                </Button>
              </Link>
            )}

           
            <Link href={`/profile/${user.id}`}>
              <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 hover:border-red-500 transition-colors">
                {profile?.profile_image_url ? (
                  <Image
                    src={profile.profile_image_url || "/placeholder.svg"}
                    alt={profile.display_name || "Profile"}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <NoticeCreateModal open={createNoticeOpen} onOpenChange={setCreateNoticeOpen} />
    </>
  )
}
