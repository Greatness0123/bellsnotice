"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function HomePage({ user }: { user: any }) {
  const [importantNotices, setImportantNotices] = useState<any[]>([])
  const [featuredNotices, setFeaturedNotices] = useState<any[]>([])
  const [randomNotices, setRandomNotices] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [importantCarouselIndex, setImportantCarouselIndex] = useState(0)
  const [featuredCarouselIndex, setFeaturedCarouselIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchNotices = async () => {
      // Fetch important notices
      const { data: importantData } = await supabase
        .from("notices")
        .select("*")
        .eq("is_important", true)
        .order("created_at", { ascending: false })
        .limit(20)

      // Fetch featured notices
      const { data: featuredData } = await supabase
        .from("notices")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(20)

      // Fetch all notices for random selection
      const { data: allData } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      // Shuffle and get 12 random notices
      const randomSelected = allData?.sort(() => Math.random() - 0.5).slice(0, 12) || []

      // Get unique author IDs
      const authorIds = [
        ...(importantData?.map((n) => n.author_id) || []),
        ...(featuredData?.map((n) => n.author_id) || []),
        ...(randomSelected?.map((n) => n.author_id) || []),
      ]
      const uniqueAuthorIds = [...new Set(authorIds)]

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, profile_image_url")
        .in("id", uniqueAuthorIds)

      if (profilesData) {
        const profileMap = profilesData.reduce((acc: any, p) => {
          acc[p.id] = p
          return acc
        }, {})
        setProfiles(profileMap)
      }

      setImportantNotices(importantData || [])
      setFeaturedNotices(featuredData || [])
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

  const importantDisplayed = importantNotices.slice(importantCarouselIndex, importantCarouselIndex + 6)
  const featuredDisplayed = featuredNotices.slice(featuredCarouselIndex, featuredCarouselIndex + 6)

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
      {/* Important Notices Carousel */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {importantDisplayed.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
            ))}
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
              <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
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
              <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
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
