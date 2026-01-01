"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NoticeCard } from "@/components/notice-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, SearchIcon } from "lucide-react"

export function SearchPageClient() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!error && data) {
      setSearchResults(data)

      const authorIds = [...new Set(data.map((n) => n.author_id))]
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

    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Search Notices</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by title, description, or tags..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              className="pr-10"
            />
            <SearchIcon className="absolute right-3 top-2.5 text-muted-foreground" size={20} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} authorProfile={profiles[notice.author_id]} />
          ))}
        </div>
      ) : query.trim() ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Start typing to search notices</p>
        </div>
      )}
    </div>
  )
}
