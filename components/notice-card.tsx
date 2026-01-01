"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface NoticeCardProps {
  notice: {
    id: string
    title: string
    description: string
    author_id: string
    created_at: string
    view_count: number
  }
  authorProfile?: {
    id: string
    display_name: string
    profile_image_url: string | null
  }
}

export function NoticeCard({ notice, authorProfile }: NoticeCardProps) {
  const [reactionCount, setReactionCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchReactionCount = async () => {
      const { count } = await supabase
        .from("reactions")
        .select("*", { count: "exact", head: true })
        .eq("notice_id", notice.id)

      setReactionCount(count || 0)
    }

    fetchReactionCount()
  }, [notice.id])

  return (
    <Link href={`/notice/${notice.id}`}>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer h-full">
        <h2 className="text-xl font-semibold mb-2 line-clamp-2">{notice.title}</h2>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{notice.description}...</p>

        <Link href={`/profile/${authorProfile?.id}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4 hover:opacity-70 transition-opacity">
            {authorProfile?.profile_image_url ? (
              <img
                src={authorProfile.profile_image_url || "/placeholder.svg"}
                alt={authorProfile.display_name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            )}
            <div>
              <p className="text-sm font-medium">{authorProfile?.display_name || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-1">
            <Heart size={16} />
            <span>{reactionCount}</span>
          </div>
          <span>{notice.view_count} views</span>
        </div>
      </div>
    </Link>
  )
}
