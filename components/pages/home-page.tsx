"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"


type Notice = {
  id: string
  title: string
  description: string
  author_id: string
  is_important?: boolean
  is_featured?: boolean
  created_at: string
  view_count: number
}

type Profile = {
  id: string
  display_name: string
  profile_image_url: string | null
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


  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const carouselContainerRef = useRef<HTMLDivElement>(null)
  const carouselContentRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleImportantNext()
    }
    if (isRightSwipe) {
      handleImportantPrev()
    }
  }


  const getItemsPerView = () => {
    if (typeof window === 'undefined') return 1

    const screenWidth = window.innerWidth
    if (screenWidth >= 1024) return 3
    if (screenWidth >= 768) return 2
    return 1
  }

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        console.log("Fetching notices...")


        const { data: allColumns, error: allColumnsError } = await supabase
          .from("notices")
          .select("*")
          .limit(1)

        if (allColumnsError) {
          console.error("Error checking columns:", allColumnsError)
        }

        if (allColumns && allColumns.length > 0) {
          console.log("Available columns in notices table:", Object.keys(allColumns[0]))
        }


        const { data: importantData, error: importantError } = await supabase
          .from("notices")
          .select("*")
          .eq("is_important", true)
          .order("created_at", { ascending: false })
          .limit(20)

        if (importantError) {
          console.error("Error fetching important notices:", importantError)
        } else {
          console.log("Important notices fetched:", importantData?.length)
        }


        const { data: featuredData, error: featuredError } = await supabase
          .from("notices")
          .select("*")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(20)

        if (featuredError) {
          console.error("Error fetching featured notices:", featuredError)
        } else {
          console.log("Featured notices fetched:", featuredData?.length)
        }


        const { data: allData, error: allError } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)

        if (allError) {
          console.error("Error fetching all notices:", allError)
        } else {
          console.log("All notices fetched:", allData?.length)
        }


        const transformNotice = (notice: any): Notice => {
          console.log("Transforming notice:", notice.id, "Content field exists:", "content" in notice)

          return {
            id: notice.id,
            title: notice.title || "",

            description: notice.description || notice.content || "",
            author_id: notice.author_id || "",
            created_at: notice.created_at || new Date().toISOString(),
            view_count: notice.view_count || 0,
            is_important: notice.is_important || false,
            is_featured: notice.is_featured || false,
          }
        }

        const importantTransformed = (importantData || []).map(transformNotice)
        const featuredTransformed = (featuredData || []).map(transformNotice)
        const allTransformed = (allData || []).map(transformNotice)

        console.log("Important transformed:", importantTransformed.length)
        console.log("Featured transformed:", featuredTransformed.length)
        console.log("All transformed:", allTransformed.length)


        const randomSelected = [...allTransformed]
          .sort(() => Math.random() - 0.5)
          .slice(0, 12)

        console.log("Random selected:", randomSelected.length)


        const authorIds = [
          ...importantTransformed.map((n: Notice) => n.author_id),
          ...featuredTransformed.map((n: Notice) => n.author_id),
          ...randomSelected.map((n: Notice) => n.author_id),
        ]
        const uniqueAuthorIds = [...new Set(authorIds)]

        console.log("Unique author IDs:", uniqueAuthorIds)

        if (uniqueAuthorIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, profile_image_url")
            .in("id", uniqueAuthorIds)

          if (profilesError) {
            console.error("Error fetching profiles:", profilesError)
          } else {
            console.log("Profiles fetched:", profilesData?.length)

            if (profilesData) {
              const profileMap = profilesData.reduce((acc: Record<string, Profile>, p: any) => {
                acc[p.id] = {
                  id: p.id,
                  display_name: p.display_name || "Unknown",
                  profile_image_url: p.profile_image_url
                }
                return acc
              }, {})
              setProfiles(profileMap)
            }
          }
        }

        setImportantNotices(importantTransformed)
        setFeaturedNotices(featuredTransformed)
        setRandomNotices(randomSelected)
        console.log("State updated successfully")

      } catch (error) {
        console.error("Error in fetchNotices:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()


    const interval = setInterval(
      () => {
        const itemsPerView = getItemsPerView()
        setImportantCarouselIndex((i) => (i + itemsPerView) % Math.max(importantNotices.length, itemsPerView))
        setFeaturedCarouselIndex((i) => (i + itemsPerView) % Math.max(featuredNotices.length, itemsPerView))
      },
      30 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])


  const itemsPerView = getItemsPerView()
  const importantDisplayed = importantNotices.slice(importantCarouselIndex, importantCarouselIndex + itemsPerView)


  const totalImportantPages = Math.ceil(importantNotices.length / itemsPerView)
  const currentImportantPage = Math.floor(importantCarouselIndex / itemsPerView)


  const showDots = importantNotices.length > itemsPerView


  const handleImportantNext = () => {
    setImportantCarouselIndex((i) => {
      const nextIndex = i + itemsPerView
      return nextIndex >= importantNotices.length ? 0 : nextIndex
    })
  }

  const handleImportantPrev = () => {
    setImportantCarouselIndex((i) => {
      const prevIndex = i - itemsPerView
      return prevIndex < 0 ? Math.max(0, importantNotices.length - itemsPerView) : prevIndex
    })
  }


  const handleScroll = () => {
    if (carouselContentRef.current && carouselContainerRef.current) {
      const scrollLeft = carouselContainerRef.current.scrollLeft
      const itemWidth = carouselContentRef.current.children[0]?.clientWidth || 280
      const gap = 24
      const totalItemWidth = itemWidth + gap

      const newIndex = Math.round(scrollLeft / totalItemWidth)
      if (newIndex !== currentImportantPage * itemsPerView) {
        setImportantCarouselIndex(newIndex)
      }
    }
  }


  const goToImportantPage = (pageIndex: number) => {
    setImportantCarouselIndex(pageIndex * itemsPerView)


    if (carouselContentRef.current && carouselContainerRef.current) {
      const itemWidth = carouselContentRef.current.children[0]?.clientWidth || 280
      const gap = 24
      const totalItemWidth = itemWidth + gap
      const scrollPosition = pageIndex * itemsPerView * totalItemWidth

      carouselContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    }
  }


  useEffect(() => {
    if (carouselContentRef.current && carouselContainerRef.current) {
      const itemWidth = carouselContentRef.current.children[0]?.clientWidth || 280
      const gap = 24
      const totalItemWidth = itemWidth + gap
      const scrollPosition = importantCarouselIndex * totalItemWidth

      carouselContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [importantCarouselIndex])

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

      {importantNotices.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-red-600">Important Notices</h2>
            {showDots && (
              <div className="hidden md:flex gap-2">
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



            <div
              ref={carouselContainerRef}
              className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onScroll={handleScroll}
            >
              <div
                ref={carouselContentRef}
                className="flex gap-6 pb-4 min-w-min"
              >
                {importantNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="w-[280px] md:w-[350px] flex-shrink-0 snap-start"
                  >
                    <NoticeCard
                      notice={notice}
                      authorProfile={profiles[notice.author_id]}
                    />
                  </div>
                ))}
              </div>
            </div>


            {showDots && (
              <div className="flex justify-center items-center gap-2 mt-6">
                {Array.from({ length: totalImportantPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImportantPage(index)}
                    className={`transition-all duration-300 ease-in-out ${Math.floor(importantCarouselIndex / itemsPerView) === index
                        ? 'w-8 h-2 bg-red-600 rounded-full'
                        : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                      }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
            )}


            {showDots && (
              <div className="mt-2 text-center">
                <span className="text-sm text-muted-foreground">
                  {Math.floor(importantCarouselIndex / itemsPerView) + 1} of {totalImportantPages}
                </span>
              </div>
            )}
          </div>
        </section>
      )}


      {featuredNotices.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-blue-600">Featured Notices</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredNotices.slice(0, 6).map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                authorProfile={profiles[notice.author_id]}
              />
            ))}
          </div>
        </section>
      )}


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
            <p className="text-sm text-muted-foreground mt-2">
              Important: {importantNotices.length}, Featured: {featuredNotices.length}, Random: {randomNotices.length}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}