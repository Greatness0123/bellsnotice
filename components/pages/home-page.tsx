"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Define types based on what NoticeCard expects
type Notice = {
  id: string
  title: string
  description: string  // Changed from content to description
  author_id: string
  is_important?: boolean
  is_featured?: boolean
  created_at: string
  view_count: number
  // Add other fields from your database as optional
  content?: string  // Keep content as optional if it exists in DB
}

type Profile = {
  id: string
  display_name: string
  profile_image_url: string | null  // Changed to match NoticeCard expectation
}

type HomePageProps = {
  user: any
}

export default function HomePage({ user }: HomePageProps) {
  const [importantNotices, setImportantNotices] = useState<Notice[]>([])
  const [featuredNotices, setFeaturedNotices] = useState<Notice[]>([])
  const [randomNotices, setRandomNotices] = useState<Notice[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [importantCarouselIndex, setImportantCarouselIndex] = useState(0)
  const [featuredCarouselIndex, setFeaturedCarouselIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchNotices = async () => {
      // Fetch important notices - need to select all fields that NoticeCard expects
      const { data: importantData } = await supabase
        .from("notices")
        .select("id, title, description, author_id, created_at, view_count, is_important, is_featured, content")
        .eq("is_important", true)
        .order("created_at", { ascending: false })
        .limit(20)

      // Fetch featured notices
      const { data: featuredData } = await supabase
        .from("notices")
        .select("id, title, description, author_id, created_at, view_count, is_important, is_featured, content")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(20)

      // Fetch all notices for random selection
      const { data: allData } = await supabase
        .from("notices")
        .select("id, title, description, author_id, created_at, view_count, is_important, is_featured, content")
        .order("created_at", { ascending: false })
        .limit(50)

      // Transform data to match Notice type
      const transformNotice = (notice: any): Notice => ({
        id: notice.id,
        title: notice.title,
        description: notice.description || notice.content || "", // Map content to description if needed
        author_id: notice.author_id,
        created_at: notice.created_at,
        view_count: notice.view_count || 0,
        is_important: notice.is_important,
        is_featured: notice.is_featured,
        content: notice.content
      })

      const importantTransformed = (importantData || []).map(transformNotice)
      const featuredTransformed = (featuredData || []).map(transformNotice)
      const allTransformed = (allData || []).map(transformNotice)

      // Shuffle and get 12 random notices
      const randomSelected = [...allTransformed]
        .sort(() => Math.random() - 0.5)
        .slice(0, 12)

      // Get unique author IDs
      const authorIds = [
        ...importantTransformed.map((n: Notice) => n.author_id),
        ...featuredTransformed.map((n: Notice) => n.author_id),
        ...randomSelected.map((n: Notice) => n.author_id),
      ]
      const uniqueAuthorIds = [...new Set(authorIds)]

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, profile_image_url")
        .in("id", uniqueAuthorIds)

      if (profilesData) {
        const profileMap = profilesData.reduce((acc: Record<string, Profile>, p: any) => {
          acc[p.id] = {
            id: p.id,
            display_name: p.display_name,
            profile_image_url: p.profile_image_url  // This will be string | null from DB
          }
          return acc
        }, {})
        setProfiles(profileMap)
      }

      setImportantNotices(importantTransformed)
      setFeaturedNotices(featuredTransformed)
      setRandomNotices(randomSelected)
      setLoading(false)
    }

    fetchNotices()

    // Shuffle carousels every 30 minutes
    const interval = setInterval(
      () => {
        setImportantCarouselIndex((i) => (i + 6) % Math.max(importantNotices.length, 6))
        setFeaturedCarouselIndex((i) => (i + 6) % Math.max(featuredNotices.length, 6))
      },
      30 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  // Calculate displayed notices
  const importantDisplayed = importantNotices.slice(importantCarouselIndex, importantCarouselIndex + 6)
  const featuredDisplayed = featuredNotices.slice(featuredCarouselIndex, featuredCarouselIndex + 6)

  // Carousel navigation handlers
  const handleImportantNext = () => {
    setImportantCarouselIndex((i) => (i + 6) % Math.max(importantNotices.length, 6))
  }

  const handleImportantPrev = () => {
    setImportantCarouselIndex(
      (i) => (i - 6 + Math.max(importantNotices.length, 6)) % Math.max(importantNotices.length, 6),
    )
  }

  const handleFeaturedNext = () => {
    setFeaturedCarouselIndex((i) => (i + 6) % Math.max(featuredNotices.length, 6))
  }

  const handleFeaturedPrev = () => {
    setFeaturedCarouselIndex((i) => (i - 6 + Math.max(featuredNotices.length, 6)) % Math.max(featuredNotices.length, 6))
  }

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
    <div className="container mx-auto px-4 py-12">
      {/* Important Notices Section with Horizontal Scroll */}
      {importantNotices.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-red-600">Important Notices</h2>
            {importantNotices.length > 6 && (
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={handleImportantPrev}>
                  <ChevronLeft size={20} />
                </Button>
                <Button size="icon" variant="outline" onClick={handleImportantNext}>
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4 min-w-min">
                {importantDisplayed.map((notice) => (
                  <div key={notice.id} className="w-[350px] flex-shrink-0">
                    <NoticeCard 
                      notice={notice} 
                      authorProfile={profiles[notice.author_id]} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Notices Carousel */}
      {featuredNotices.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-blue-600">Featured Notices</h2>
            {featuredNotices.length > 6 && (
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={handleFeaturedPrev}>
                  <ChevronLeft size={20} />
                </Button>
                <Button size="icon" variant="outline" onClick={handleFeaturedNext}>
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDisplayed.map((notice) => (
              <NoticeCard 
                key={notice.id} 
                notice={notice} 
                authorProfile={profiles[notice.author_id]} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Random Notices Grid */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Latest Notices</h2>
        {randomNotices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {randomNotices.map((notice) => (
              <NoticeCard 
                key={notice.id} 
                notice={notice} 
                authorProfile={profiles[notice.author_id]} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
            <p className="text-muted-foreground">No notices available yet</p>
          </div>
        )}
      </section>
    </div>
  )
}