import { createClient } from "@/lib/supabase/server"
import { NoticeCard } from "@/components/notice-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ChevronLeft, MessageSquare, FileText, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Notice {
  id: string
  title: string
  description: string
  author_id: string
  view_count: number
  is_important: boolean
  is_featured: boolean
  created_at: string
}

interface Comment {
  id: string
  content: string
  user_id: string
  notice_id: string
  created_at: string
  notices?: {
    title: string
    id: string
  }
}

interface NoticeRequest {
  id: string
  title: string
  description: string
  status: "pending" | "approved" | "rejected"
  response_message: string | null
  responded_at: string | null
  created_at: string
  rep_id: string
  requester_id: string
  notice_id: string | null
  rep?: {
    display_name: string | null
  }
}

interface Profile {
  id: string
  display_name: string | null
  user_type: string
  profile_image_url: string | null
  college: string
  department: string
  level: string
  program: string
  matric_number: string | null
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch profile information
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single()

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Link href="/">
            <Button>Back Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const typedProfile = profile as Profile
  const isRep = typedProfile.user_type === "rep"

  // Fetch author's notices (only for reps)
  let notices: Notice[] = []
  if (isRep) {
    const { data: noticesData } = await supabase
      .from("notices")
      .select("*")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
    notices = noticesData || []
  }

  // Fetch user's comments
  const { data: comments } = await supabase
    .from("comments")
    .select("*, notices(title, id)")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
  const typedComments = (comments || []) as Comment[]

  // Fetch notice requests (only for regular users)
  let noticeRequests: NoticeRequest[] = []
  if (!isRep) {
    const { data: requestsData } = await supabase
      .from("notice_requests")
      .select("*")
      .eq("requester_id", id)
      .order("created_at", { ascending: false })

    if (requestsData && requestsData.length > 0) {
      // Fetch rep information for each request
      const requestsWithReps = await Promise.all(
        requestsData.map(async (request) => {
          const { data: repData } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", request.rep_id)
            .single()

          return {
            ...request,
            rep: repData || { display_name: null }
          } as NoticeRequest
        })
      )
      noticeRequests = requestsWithReps
    }
  }

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <Clock size={12} />
            <span>Pending</span>
          </div>
        )
      case "approved":
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            <span>Approved</span>
          </div>
        )
      case "rejected":
        return (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <XCircle size={12} />
            <span>Rejected</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="outline" size="sm" className="mb-6 bg-transparent">
          <ChevronLeft size={16} className="mr-2" />
          Back
        </Button>
      </Link>

      {/* Profile Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
              {typedProfile.profile_image_url ? (
                <img
                  src={typedProfile.profile_image_url}
                  alt={typedProfile.display_name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-neutral-400">
                  {typedProfile.display_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-3xl">{typedProfile.display_name || "User"}</CardTitle>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isRep
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                }`}>
                  {isRep ? "Rep" : "Regular User"}
                </div>
              </div>

              {(typedProfile.college || typedProfile.matric_number) && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {typedProfile.college && <p>College: {typedProfile.college}</p>}
                  {typedProfile.department && <p>Department: {typedProfile.department}</p>}
                  {typedProfile.level && <p>Level: {typedProfile.level}</p>}
                  {typedProfile.program && <p>Program: {typedProfile.program}</p>}
                  {typedProfile.matric_number && (
                    <p className="font-medium text-foreground">Matric: {typedProfile.matric_number}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different content */}
      <Tabs defaultValue={isRep ? "notices" : "requests"} className="w-full">
        <TabsList className="grid w-full gap-4">
          {isRep && (
            <TabsTrigger value="notices" className="flex items-center gap-2">
              <FileText size={16} />
              <span>Notices ({notices.length})</span>
            </TabsTrigger>
          )}
          {!isRep && (
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <FileText size={16} />
              <span>Requested Notices ({noticeRequests.length})</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Comments ({typedComments.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Notices Tab (Rep Only) */}
        {isRep && (
          <TabsContent value="notices" className="mt-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Notices by {typedProfile.display_name}</h2>
              {notices && notices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notices.map((notice) => (
                    <NoticeCard 
                      key={notice.id} 
                      notice={notice} 
                      authorProfile={{
                        id: typedProfile.id,
                        display_name: typedProfile.display_name || "User",
                        profile_image_url: typedProfile.profile_image_url,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No notices posted yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {/* Requested Notices Tab (Regular Users Only) */}
        {!isRep && (
          <TabsContent value="requests" className="mt-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Notice Requests by {typedProfile.display_name}</h2>
              {noticeRequests && noticeRequests.length > 0 ? (
                <div className="space-y-4">
                  {noticeRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{request.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Submitted to: <span className="font-medium">{request.rep?.display_name || "Unknown Rep"}</span>
                              </p>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.description}
                          </p>

                          {request.status !== "pending" && request.response_message && (
                            <div
                              className={`p-3 rounded-lg border text-sm ${
                                request.status === "approved"
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              }`}
                            >
                              <p className="font-medium mb-1">
                                {request.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                              </p>
                              <p>{request.response_message}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                            {request.responded_at && (
                              <span>Responded: {new Date(request.responded_at).toLocaleDateString()}</span>
                            )}
                          </div>

                          {request.status === "approved" && request.notice_id && (
                            <Link href={`/notice/${request.notice_id}`}>
                              <Button size="sm" variant="outline" className="w-full">
                                View Posted Notice
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No notice requests made yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-6">
          <div>
            <h2 className="text-2xl font-bold mb-6">Comments by {typedProfile.display_name}</h2>
            {typedComments && typedComments.length > 0 ? (
              <div className="space-y-4">
                {typedComments.map((comment) => (
                  <Card key={comment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <Link href={`/notice/${comment.notices?.id}`}>
                            <h3 className="font-semibold text-blue-600 hover:underline mb-2">
                              On: {comment.notices?.title || "Unknown Notice"}
                            </h3>
                          </Link>
                          <p className="text-sm text-foreground">{comment.content}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No comments made yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}