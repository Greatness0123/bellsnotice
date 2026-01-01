"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function FilterPage() {
  const [allNotices, setAllNotices] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [tags, setTags] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showImportant, setShowImportant] = useState(false)
  const [showFeatured, setShowFeatured] = useState(false)
  const [filteredNotices, setFilteredNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all notices
      const { data: noticesData } = await supabase.from("notices").select("*").order("created_at", { ascending: false })

      if (noticesData) {
        setAllNotices(noticesData)

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

      // Fetch all tags
      const { data: tagsData } = await supabase.from("tags").select("*").order("name")

      if (tagsData) {
        setTags(tagsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    const applyFilters = () => {
      let filtered = allNotices

      if (showImportant) {
        filtered = filtered.filter((n) => n.is_important)
      }

      if (showFeatured) {
        filtered = filtered.filter((n) => n.is_featured)
      }

      if (selectedTags.length > 0) {
        const filterByTags = async () => {
          const { data: noticeTagsData } = await supabase
            .from("notice_tags")
            .select("notice_id")
            .in("tag_id", selectedTags)

          const noticeIds = noticeTagsData?.map((nt) => nt.notice_id) || []
          filtered = filtered.filter((n) => noticeIds.includes(n.id))
          setFilteredNotices(filtered)
        }

        filterByTags()
      } else {
        setFilteredNotices(filtered)
      }
    }

    applyFilters()
  }, [selectedTags, showImportant, showFeatured, allNotices])

  const handleReset = () => {
    setSelectedTags([])
    setShowImportant(false)
    setShowFeatured(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading filters...</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Refine your search</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Important Filter */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="important"
                  checked={showImportant}
                  onCheckedChange={(checked) => setShowImportant(checked as boolean)}
                />
                <Label htmlFor="important" className="cursor-pointer">
                  Important
                </Label>
              </div>
            </div>

            {/* Featured Filter */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="featured"
                  checked={showFeatured}
                  onCheckedChange={(checked) => setShowFeatured(checked as boolean)}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured
                </Label>
              </div>
            </div>

            {/* Tags Filter */}
            {tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3">Tags</h4>
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTags([...selectedTags, tag.id])
                          } else {
                            setSelectedTags(selectedTags.filter((t) => t !== tag.id))
                          }
                        }}
                      />
                      <Label htmlFor={tag.id} className="cursor-pointer text-sm">
                        {tag.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3">
          <h1 className="text-4xl font-bold mb-8">
            Notices
            {filteredNotices.length > 0 && (
              <span className="text-xl font-normal text-muted-foreground ml-2">({filteredNotices.length})</span>
            )}
          </h1>

          {filteredNotices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="text-muted-foreground">No notices match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
