"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Plus, Edit2, Trash2, Star } from "lucide-react"
import Link from "next/link"

interface Notice {
  id: string
  title: string
  description: string
  author_id: string
  created_at: string
  view_count: number
  is_important: boolean
  is_featured: boolean
  profiles?: {
    display_name: string
    profile_image_url: string | null
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [allNotices, setAllNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {

    const adminAuth = sessionStorage.getItem("adminAuthenticated")
    if (adminAuth !== "true") {
      router.push("/")
      return
    }
    setIsAuthenticated(true)
  }, [])

  useEffect(() => {
    const fetchAllNotices = async () => {
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("id, title, description, author_id, created_at, view_count, is_important, is_featured")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching notices:", error)
          setLoading(false)
          return
        }

        if (data) {

          const authorIds = [...new Set(data.map((item: any) => item.author_id))]
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, profile_image_url")
            .in("id", authorIds)


          const profileMap: Record<string, any> = {}
          profiles?.forEach((profile: any) => {
            profileMap[profile.id] = profile
          })

          const noticesWithProfiles: Notice[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            author_id: item.author_id,
            created_at: item.created_at,
            view_count: item.view_count,
            is_important: item.is_important,
            is_featured: item.is_featured,
            profiles: profileMap[item.author_id],
          }))

          setAllNotices(noticesWithProfiles)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchAllNotices()
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated")
    router.push("/")
  }

  const handleToggleFeatured = async (noticeId: string, isFeatured: boolean) => {
    const { error } = await supabase
      .from("notices")
      .update({ is_featured: !isFeatured })
      .eq("id", noticeId)

    if (!error) {
      setAllNotices(allNotices.map((n) => (n.id === noticeId ? { ...n, is_featured: !isFeatured } : n)))
    }
  }

  const handleToggleImportant = async (noticeId: string, isImportant: boolean) => {
    const { error } = await supabase
      .from("notices")
      .update({ is_important: !isImportant })
      .eq("id", noticeId)

    if (!error) {
      setAllNotices(allNotices.map((n) => (n.id === noticeId ? { ...n, is_important: !isImportant } : n)))
    }
  }

  const handleDeleteNotice = async (noticeId: string) => {
    const { error } = await supabase.from("notices").delete().eq("id", noticeId)

    if (!error) {
      setAllNotices(allNotices.filter((n) => n.id !== noticeId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const importantNotices = allNotices.filter((n) => n.is_important)
  const featuredNotices = allNotices.filter((n) => n.is_featured)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage all notices on the platform</p>
        </div>
        <div className="flex gap-2">
          <Link href="/notice/create">
            <Button>
              <Plus size={16} className="mr-2" />
              Add Notice
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Notices ({allNotices.length})</TabsTrigger>
          <TabsTrigger value="important">Important ({importantNotices.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredNotices.length})</TabsTrigger>
        </TabsList>


        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Notices</CardTitle>
              <CardDescription>View and manage all notices on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {allNotices.length > 0 ? (
                <div className="space-y-4">
                  {allNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{notice.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notice.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                          <span>By: {notice.profiles?.display_name || "Unknown"}</span>
                          <span>{notice.view_count} views</span>
                          <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                          {notice.is_important && (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">Important</span>
                          )}
                          {notice.is_featured && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Featured</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <Link href={`/notice/${notice.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit2 size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleImportant(notice.id, notice.is_important)}
                          className={notice.is_important ? "bg-red-50" : ""}
                          title={notice.is_important ? "Unmark as important" : "Mark as important"}
                        >
                          <span className="text-xs">{notice.is_important ? "Unmark" : "Mark"} Important</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFeatured(notice.id, notice.is_featured)}
                          className={notice.is_featured ? "bg-blue-50" : ""}
                          title={notice.is_featured ? "Unmark as featured" : "Mark as featured"}
                        >
                          <Star size={16} fill={notice.is_featured ? "currentColor" : "none"} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this notice?")) {
                              handleDeleteNotice(notice.id)
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No notices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="important">
          <Card>
            <CardHeader>
              <CardTitle>Important Notices</CardTitle>
              <CardDescription>Notices marked as important by reps</CardDescription>
            </CardHeader>
            <CardContent>
              {importantNotices.length > 0 ? (
                <div className="space-y-4">
                  {importantNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{notice.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notice.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                          <span>By: {notice.profiles?.display_name || "Unknown"}</span>
                          <span>{notice.view_count} views</span>
                          <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <Link href={`/notice/${notice.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit2 size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleImportant(notice.id, notice.is_important)}
                        >
                          <span className="text-xs">Unmark Important</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No important notices</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle>Featured Notices</CardTitle>
              <CardDescription>Notices marked as featured by admins</CardDescription>
            </CardHeader>
            <CardContent>
              {featuredNotices.length > 0 ? (
                <div className="space-y-4">
                  {featuredNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{notice.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notice.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                          <span>By: {notice.profiles?.display_name || "Unknown"}</span>
                          <span>{notice.view_count} views</span>
                          <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <Link href={`/notice/${notice.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit2 size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleFeatured(notice.id, notice.is_featured)}
                        >
                          <Star size={16} fill="currentColor" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No featured notices</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}