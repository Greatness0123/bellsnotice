import { createClient } from "@/lib/supabase/server"
import { NoticeCard } from "@/components/notice-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ChevronLeft, MessageSquare, FileText, Clock, CheckCircle, XCircle, User } from "lucide-react"
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-6">Profile not found</p>
          <Link href="/" className="inline-block">
            <Button className="w-full sm:w-auto">Back Home</Button>
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
          <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <Clock size={12} />
            <span>Pending</span>
          </div>
        )
      case "approved":
        return (
          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            <span>Approved</span>
          </div>
        )
      case "rejected":
        return (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs font-medium">
            <XCircle size={12} />
            <span>Rejected</span>
          </div>
        )
      default:
        return null
    }
  }

  // Calculate total tabs
  const totalTabs = isRep ? 2 : 2 // Notices/Comments or Requests/Comments
  const defaultTab = isRep ? "notices" : "requests"

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <div className="mb-6 sm:mb-8">
        <Link href="/" className="inline-block">
          <Button variant="outline" size="sm" className="bg-background hover:bg-accent">
            <ChevronLeft size={16} className="mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="mb-8 sm:mb-12">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Profile Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border-4 border-background shadow-sm">
              {typedProfile.profile_image_url ? (
                <img
                  src={typedProfile.profile_image_url}
                  alt={typedProfile.display_name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl sm:text-3xl text-muted-foreground font-medium">
                  {typedProfile.display_name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <CardTitle className="text-2xl sm:text-3xl font-bold">
                  {typedProfile.display_name || "User"}
                </CardTitle>
                <div className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold w-fit mx-auto sm:mx-0 ${
                  isRep
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                    : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                }`}>
                  {isRep ? "Class Representative" : "Student"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm text-muted-foreground">
                {typedProfile.college && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-foreground text-xs mb-1">College</p>
                    <p className="truncate">{typedProfile.college}</p>
                  </div>
                )}
                {typedProfile.department && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-foreground text-xs mb-1">Department</p>
                    <p className="truncate">{typedProfile.department}</p>
                  </div>
                )}
                {typedProfile.level && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-foreground text-xs mb-1">Level</p>
                    <p>{typedProfile.level}</p>
                  </div>
                )}
                {typedProfile.matric_number && (
                  <div className="bg-muted/50 rounded-lg p-3 sm:col-span-2 lg:col-span-1">
                    <p className="font-medium text-foreground text-xs mb-1">Matric Number</p>
                    <p className="font-semibold text-foreground">{typedProfile.matric_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-full min-w-[300px] sm:min-w-0">
              {isRep ? (
                <>
                  <TabsTrigger value="notices" className="flex items-center gap-2 px-4 py-3 flex-1">
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate">Notices</span>
                    <span className="ml-auto bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {notices.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2 px-4 py-3 flex-1">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">Comments</span>
                    <span className="ml-auto bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {typedComments.length}
                    </span>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="requests" className="flex items-center gap-2 px-4 py-3 flex-1">
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate">Requests</span>
                    <span className="ml-auto bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {noticeRequests.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2 px-4 py-3 flex-1">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">Comments</span>
                    <span className="ml-auto bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {typedComments.length}
                    </span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* Notices Tab (Rep Only) */}
          {isRep && (
            <TabsContent value="notices" className="mt-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-6">Posted Notices</h2>
                {notices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {notices.map((notice) => (
                      <div key={notice.id} className="h-full">
                        <NoticeCard 
                          notice={notice} 
                          authorProfile={{
                            id: typedProfile.id,
                            display_name: typedProfile.display_name || "User",
                            profile_image_url: typedProfile.profile_image_url,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 sm:py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <FileText size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Notices Yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {typedProfile.display_name} hasn&apos;t posted any notices yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* Requested Notices Tab (Regular Users Only) */}
          {!isRep && (
            <TabsContent value="requests" className="mt-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-6">Notice Requests</h2>
                {noticeRequests.length > 0 ? (
                  <div className="space-y-4">
                    {noticeRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
                        <CardContent className="p-4 sm:p-6">
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex-1 space-y-2">
                                <h3 className="font-semibold text-base sm:text-lg leading-tight">
                                  {request.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Submitted to: <span className="font-medium text-foreground">
                                    {request.rep?.display_name || "Unknown Representative"}
                                  </span>
                                </p>
                              </div>
                              <div className="sm:self-start">
                                {getStatusBadge(request.status)}
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {request.description}
                            </p>

                            {/* Response Message */}
                            {request.status !== "pending" && request.response_message && (
                              <div
                                className={`p-4 rounded-lg border text-sm ${
                                  request.status === "approved"
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {request.status === "approved" ? (
                                    <CheckCircle size={16} className="text-green-600" />
                                  ) : (
                                    <XCircle size={16} className="text-red-600" />
                                  )}
                                  <p className="font-medium">
                                    {request.status === "approved" ? "Approved" : "Rejected"}
                                  </p>
                                </div>
                                <p>{request.response_message}</p>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-3 border-t">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Submitted: {new Date(request.created_at).toLocaleDateString()}
                              </span>
                              {request.responded_at && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  Responded: {new Date(request.responded_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* View Notice Button */}
                            {request.status === "approved" && request.notice_id && (
                              <div className="pt-2">
                                <Link href={`/notice/${request.notice_id}`}>
                                  <Button size="sm" variant="outline" className="w-full">
                                    View Posted Notice
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 sm:py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <FileText size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {typedProfile.display_name} hasn&apos;t made any notice requests yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-8 space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-6">Comments</h2>
              {typedComments.length > 0 ? (
                <div className="space-y-4">
                  {typedComments.map((comment) => (
                    <Card key={comment.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                          {/* Notice Link */}
                          {comment.notices?.id && (
                            <Link href={`/notice/${comment.notices.id}`} className="block">
                              <div className="flex items-center gap-2 mb-2 group">
                                <FileText size={14} className="text-muted-foreground group-hover:text-primary" />
                                <h3 className="font-semibold text-sm sm:text-base text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors line-clamp-1">
                                  {comment.notices.title || "Unknown Notice"}
                                </h3>
                              </div>
                            </Link>
                          )}

                          {/* Comment Content */}
                          <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-sm sm:text-base text-foreground">{comment.content}</p>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 sm:py-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Comments Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {typedProfile.display_name} hasn&apos;t made any comments yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}