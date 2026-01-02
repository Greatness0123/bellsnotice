"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Trash2, Eye, Edit, Pencil, ArrowLeft, Upload, CheckCircle, XCircle, Clock, MessageSquare, User, BarChart3, FileText, Bell, Image as ImageIcon, Video, File, ExternalLink, X } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const DEPARTMENTS = {
  COLNAS: [
    { label: "Biotechnology", value: "Biotechnology" },
    { label: "Applied Mathematics", value: "Applied Mathematics" },
    { label: "Statistics", value: "Statistics" },
    { label: "Microbiology", value: "Microbiology" },
    { label: "Physics with Electricity", value: "Physics with Electricity" },
    { label: "Industrial Chemistry", value: "Industrial Chemistry" },
    { label: "Biochemistry", value: "Biochemistry" },
    { label: "Computer Science", value: "Computer Science" },
    { label: "Information Technology", value: "Information Technology" },
  ],
  COLMANS: [
    { label: "Business Administration", value: "Business Administration" },
    { label: "Human Resource Management", value: "Human Resource Management" },
    { label: "Marketing", value: "Marketing" },
    { label: "Accounting", value: "Accounting" },
    { label: "Economics", value: "Economics" },
    { label: "Finance and Banking", value: "Finance and Banking" },
    { label: "Management Technology", value: "Management Technology" },
    { label: "Project Management", value: "Project Management" },
    { label: "Transport Management", value: "Transport Management" },
  ],
  COLFAST: [
    { label: "Agricultural and Agricultural technology", value: "Agric and Agric tech" },
    { label: "Food Technology", value: "Food Technology" },
    { label: "Agricbusiness", value: "Agricbusiness" },
    { label: "Agronomy", value: "Agronomy" },
    { label: "Fishery", value: "Fishery" },
    { label: "Animal sciences", value: "Animal sciences" },
    { label: "Nutrition and Dietetics", value: "Nutrition and Dietetics" },
  ],
  COLENG: [
    { label: "Civil Engineering", value: "Civil Engineering" },
    { label: "Mechanical Engineering", value: "Mechanical Engineering" },
    { label: "Electrical and Electronics Engineering", value: "Electrical and Electronics Engineering" },
    { label: "biomedical Engineering", value: "biomedical Engineering" },
    { label: "Mechatronics Engineering", value: "Mechatronics Engineering" },
    { label: "Agricultural and Biosystems Engineering", value: "Agricultural and Biosystems Engineering" },
    { label: "Telecommunication Engineering", value: "Telecommunication Engineering" },
    { label: "Computer Engineering", value: "Computer Engineering" },
  ],
  COLENVS: [
    { label: "Architecture", value: "Architecture" },
    { label: "Building Technology", value: "Building Technology" },
    { label: "Estate Management", value: "Estate Management" },
    { label: "Quantity Surveying", value: "Quantity Surveying" },
    { label: "Surveying and Geoinformatics", value: "Surveying and Geo." },
    { label: "Urban and Regional Planning", value: "Urban and Regional Planning" },
  ],
}

// Type definitions
interface RequestMedia {
  id: string
  request_id: string
  media_type: "image" | "video" | "file"
  media_url: string
  is_link: boolean
  file_name: string | null
  created_at: string
}

interface NoticeRequest {
  id: string
  title: string
  description: string
  status: string
  response_message: string | null
  responded_at: string | null
  created_at: string
  requester_id: string
  rep_id: string
  notice_id: string | null
  requester: {
    display_name: string | null
    email: string
  }
  media?: RequestMedia[]
}

interface SupabaseNoticeRequest {
  id: string
  title: string
  description: string
  status: string
  response_message: string | null
  responded_at: string | null
  created_at: string
  requester_id: string
  rep_id: string
  notice_id: string | null
  user_has_seen_response?: boolean
}

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  display_name: string | null
  user_type: string
  read_receipt_visibility: boolean
  profile_image_url: string | null
  level: string
  program: string
  college: string
  department: string
  matric_number: string | null
}

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
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userNotices, setUserNotices] = useState<Notice[]>([])
  const [userComments, setUserComments] = useState<Comment[]>([])
  const [pendingRequests, setPendingRequests] = useState<NoticeRequest[]>([])
  const [processedRequests, setProcessedRequests] = useState<NoticeRequest[]>([])
  const [readReceiptVisibility, setReadReceiptVisibility] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<NoticeRequest | null>(null)
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [responseAction, setResponseAction] = useState<"accept" | "decline">("accept")
  const [isProcessing, setIsProcessing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: "",
    level: "100",
    program: "undergraduate",
    college: "COLNAS",
    department: "Biotechnology",
    matric_number: "",
  })
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedMediaRequest, setSelectedMediaRequest] = useState<NoticeRequest | null>(null)
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false)
  const [viewingMediaType, setViewingMediaType] = useState<"all" | "images" | "videos" | "files">("all")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/")
        return
      }

      setUser(user)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        const typedProfile = profileData as Profile
        setProfile(typedProfile)
        setReadReceiptVisibility(typedProfile.read_receipt_visibility)
        setProfileImagePreview(typedProfile.profile_image_url)
        setEditForm({
          display_name: typedProfile.display_name || "",
          level: typedProfile.level || "100",
          program: typedProfile.program || "undergraduate",
          college: typedProfile.college || "COLNAS",
          department: typedProfile.department || "Biotechnology",
          matric_number: typedProfile.matric_number || "",
        })
      }

      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      const { data: noticesData } = await supabase
        .from("notices")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })

      setUserNotices(noticesData as Notice[] || [])

      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, notices(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setUserComments(commentsData as Comment[] || [])

      // Fetch requests if user is a rep
      if (profile?.user_type === "rep") {
        await fetchRequestsWithMedia()
      }
    }

    fetchUserData()
  }, [user, profile, supabase])

  const fetchRequestsWithMedia = async () => {
    if (!user) return

    console.log("Fetching requests with media for rep:", user.id)
    
    // Fetch pending requests with media
    const { data: pendingData, error: pendingError } = await supabase
      .from("notice_requests")
      .select("*")
      .eq("rep_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (pendingError) {
      console.error("Error fetching pending requests:", pendingError)
    } else {
      console.log("Pending requests found:", pendingData?.length || 0)
      
      if (pendingData && pendingData.length > 0) {
        const requestsWithDetails = await Promise.all(
          pendingData.map(async (request: SupabaseNoticeRequest) => {
            const [requesterData, mediaData] = await Promise.all([
              // Fetch requester info
              supabase
                .from("profiles")
                .select("display_name, email")
                .eq("id", request.requester_id)
                .single(),
              // Fetch media attachments
              supabase
                .from("notice_request_media")
                .select("*")
                .eq("request_id", request.id)
                .order("created_at", { ascending: true })
            ])

            // Get email from auth.users if not in profile
            let email = requesterData.data?.email || ""
            if (!email) {
              const { data: authData } = await supabase.auth.admin.getUserById(request.requester_id)
              email = authData?.user?.email || ""
            }
            
            return {
              ...request,
              requester: {
                display_name: requesterData.data?.display_name || null,
                email: email
              },
              media: mediaData.data || []
            } as NoticeRequest
          })
        )
        
        setPendingRequests(requestsWithDetails)
      } else {
        setPendingRequests([])
      }
    }

    // Fetch processed requests with media
    const { data: processedData, error: processedError } = await supabase
      .from("notice_requests")
      .select("*")
      .eq("rep_id", user.id)
      .in("status", ["approved", "rejected"])
      .order("responded_at", { ascending: false })

    if (processedError) {
      console.error("Error fetching processed requests:", processedError)
    } else {
      console.log("Processed requests found:", processedData?.length || 0)
      
      if (processedData && processedData.length > 0) {
        const requestsWithDetails = await Promise.all(
          processedData.map(async (request: SupabaseNoticeRequest) => {
            const [requesterData, mediaData] = await Promise.all([
              // Fetch requester info
              supabase
                .from("profiles")
                .select("display_name, email")
                .eq("id", request.requester_id)
                .single(),
              // Fetch media attachments
              supabase
                .from("notice_request_media")
                .select("*")
                .eq("request_id", request.id)
                .order("created_at", { ascending: true })
            ])

            // Get email from auth.users if not in profile
            let email = requesterData.data?.email || ""
            if (!email) {
              const { data: authData } = await supabase.auth.admin.getUserById(request.requester_id)
              email = authData?.user?.email || ""
            }
            
            return {
              ...request,
              requester: {
                display_name: requesterData.data?.display_name || null,
                email: email
              },
              media: mediaData.data || []
            } as NoticeRequest
          })
        )
        
        setProcessedRequests(requestsWithDetails)
      } else {
        setProcessedRequests([])
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId)
    setUserComments(userComments.filter((c) => c.id !== commentId))
  }

  const handleDeleteNotice = async (noticeId: string) => {
    await supabase.from("notice_tags").delete().eq("notice_id", noticeId)
    await supabase.from("notice_media").delete().eq("notice_id", noticeId)
    await supabase.from("comments").delete().eq("notice_id", noticeId)
    await supabase.from("notices").delete().eq("id", noticeId)
    setUserNotices(userNotices.filter((n) => n.id !== noticeId))
  }

  const handleDeleteAccount = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleToggleReadReceipt = async (value: boolean) => {
    setReadReceiptVisibility(value)
    await supabase
      .from("profiles")
      .update({ read_receipt_visibility: value })
      .eq("id", user?.id)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setUpdateError(null)

    if (!user) return

    try {
      let profileImageUrl = profile?.profile_image_url || null

      if (profileImage) {
        const fileName = `profile_${user.id}_${Date.now()}_${profileImage.name}`
        const { data, error: uploadError } = await supabase.storage
          .from("bellsnotice")
          .upload(`profiles/${fileName}`, profileImage)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("bellsnotice").getPublicUrl(`profiles/${fileName}`)

        profileImageUrl = publicUrl
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editForm.display_name,
          level: editForm.level,
          program: editForm.program,
          college: editForm.college,
          department: editForm.department,
          matric_number: editForm.matric_number,
          profile_image_url: profileImageUrl,
        })
        .eq("id", user.id)

      if (error) throw error

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData as Profile)
        setProfileImagePreview(profileData.profile_image_url)
      }

      setProfileImage(null)
      setIsEditModalOpen(false)
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const openResponseDialog = (request: NoticeRequest, action: "accept" | "decline") => {
    setSelectedRequest(request)
    setResponseAction(action)
    setResponseMessage("")
    setIsResponseDialogOpen(true)
  }

  const handleAcceptRequest = async () => {
    if (!selectedRequest || !user) return
    setIsProcessing(true)

    try {
      // Fetch media files associated with this request from notice_request_media table
      const { data: requestMediaFiles } = await supabase
        .from("notice_request_media")
        .select("*")
        .eq("request_id", selectedRequest.id)

      // Create the notice
      const { data: newNotice, error: noticeError } = await supabase
        .from("notices")
        .insert({
          title: selectedRequest.title,
          description: selectedRequest.description,
          author_id: user.id,
          view_count: 0,
          is_important: false,
          is_featured: false,
        })
        .select()
        .single()

      if (noticeError) throw noticeError

      // Link media files from notice_request_media to the new notice in notice_media table
      if (requestMediaFiles && requestMediaFiles.length > 0) {
        for (const media of requestMediaFiles) {
          // Create a new entry in notice_media with the same media
          await supabase
            .from("notice_media")
            .insert({
              notice_id: newNotice.id,
              media_type: media.media_type,
              media_url: media.media_url,
              is_link: media.is_link,
              file_name: media.file_name
            })
        }
      }
      
      // UPDATE: Use 'approved' instead of 'accepted'
      const { error: updateError } = await supabase
        .from("notice_requests")
        .update({
          status: "approved",
          response_message: responseMessage || "Your notice has been approved and posted.",
          responded_at: new Date().toISOString(),
          notice_id: newNotice.id,
        })
        .eq("id", selectedRequest.id)

      if (updateError) throw updateError

      // Refresh requests
      await fetchRequestsWithMedia()

      // Refresh notices
      const { data: noticesData } = await supabase
        .from("notices")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })

      setUserNotices(noticesData as Notice[] || [])

      setIsResponseDialogOpen(false)
      setSelectedRequest(null)
    } catch (err: unknown) {
      console.error("Error accepting request:", err)
      alert("Failed to accept request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!selectedRequest) return
    setIsProcessing(true)

    try {
      // UPDATE: Use 'rejected' instead of 'declined'
      const { error: updateError } = await supabase
        .from("notice_requests")
        .update({
          status: "rejected",
          response_message: responseMessage || "Your notice request has been rejected.",
          responded_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id)

      if (updateError) throw updateError

      // Refresh requests
      await fetchRequestsWithMedia()

      setIsResponseDialogOpen(false)
      setSelectedRequest(null)
    } catch (err: unknown) {
      console.error("Error declining request:", err)
      alert("Failed to decline request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    await supabase.from("notice_request_media").delete().eq("request_id", requestId)
    await supabase.from("notice_requests").delete().eq("id", requestId)

    setPendingRequests(pendingRequests.filter((r) => r.id !== requestId))
    setProcessedRequests(processedRequests.filter((r) => r.id !== requestId))
  }

  const openMediaViewer = (request: NoticeRequest) => {
    setSelectedMediaRequest(request)
    setViewingMediaType("all")
    setIsMediaViewerOpen(true)
  }

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case "image": return <ImageIcon size={16} />
      case "video": return <Video size={16} />
      default: return <File size={16} />
    }
  }

  const getMediaBadgeColor = (mediaType: string) => {
    switch (mediaType) {
      case "image": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "video": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getMediaCounts = (request: NoticeRequest | null) => {
    if (!request || !request.media) return { images: 0, videos: 0, files: 0, total: 0 }
    
    const images = request.media.filter(m => m.media_type === "image").length
    const videos = request.media.filter(m => m.media_type === "video").length
    const files = request.media.filter(m => m.media_type === "file").length
    
    return { images, videos, files, total: images + videos + files }
  }

  const filteredMedia = () => {
    if (!selectedMediaRequest || !selectedMediaRequest.media) return []
    
    if (viewingMediaType === "all") return selectedMediaRequest.media
    
    return selectedMediaRequest.media.filter(media => {
      if (viewingMediaType === "images") return media.media_type === "image"
      if (viewingMediaType === "videos") return media.media_type === "video"
      if (viewingMediaType === "files") return media.media_type === "file"
      return true
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isRep = profile?.user_type === "rep"
  const defaultTab = searchParams?.get("tab") || "profile"

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        {/* Responsive Tabs with icons on smaller screens */}
        <div className="relative">
          <TabsList className={`grid w-full ${isRep ? 'grid-cols-5' : 'grid-cols-2'} overflow-x-auto no-scrollbar`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User size={16} className="md:hidden" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare size={16} className="md:hidden" />
              <span className="hidden md:inline">Comments</span>
            </TabsTrigger>
            {isRep && (
              <TabsTrigger value="notices" className="flex items-center gap-2">
                <FileText size={16} className="md:hidden" />
                <span className="hidden md:inline">My Notices</span>
              </TabsTrigger>
            )}
            {isRep && (
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Bell size={16} className="md:hidden" />
                <span className="hidden md:inline">Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {isRep && (
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 size={16} className="md:hidden" />
                <span className="hidden md:inline">Analytics</span>
              </TabsTrigger>
            )}
          </TabsList>
          {/* Invisible scrollbar for better UX on mobile */}
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Manage your account information</CardDescription>
                </div>
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Pencil size={16} className="mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>Update your profile information</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      {/* ... (edit form content remains the same) ... */}
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ... (profile content remains the same) ... */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>My Comments</CardTitle>
              <CardDescription>View and manage your comments</CardDescription>
            </CardHeader>
            <CardContent>
              {/* ... (comments content remains the same) ... */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rep-only: My Notices Tab */}
        {isRep && (
          <TabsContent value="notices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Notices</CardTitle>
                    <CardDescription>Manage your published notices</CardDescription>
                  </div>
                  <Link href="/notice/create">
                    <Button>Add Notice</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {/* ... (notices content remains the same) ... */}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Rep-only: Requests Tab */}
        {isRep && (
          <TabsContent value="requests">
            <div className="space-y-6">
              {/* Pending Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
                  <CardDescription>Review and respond to notice requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length > 0 ? (
                    <div className="space-y-4">
                      {pendingRequests.map((request: NoticeRequest) => {
                        const mediaCounts = getMediaCounts(request)
                        return (
                          <div key={request.id} className="border rounded-lg p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{request.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  From: {request.requester.display_name || "Anonymous"} ({request.requester.email || "No email"})
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-sm">
                                <Clock size={14} />
                                <span>Pending</span>
                              </div>
                            </div>

                            <p className="text-sm">{request.description}</p>

                            {/* Media Attachments Preview */}
                            {mediaCounts.total > 0 && (
                              <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Attachments ({mediaCounts.total})</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openMediaViewer(request)}
                                    className="text-xs"
                                  >
                                    <Eye size={14} className="mr-1" />
                                    View All
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {mediaCounts.images > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      <ImageIcon size={12} className="mr-1" />
                                      {mediaCounts.images} image{mediaCounts.images > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {mediaCounts.videos > 0 && (
                                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                      <Video size={12} className="mr-1" />
                                      {mediaCounts.videos} video{mediaCounts.videos > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {mediaCounts.files > 0 && (
                                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300">
                                      <File size={12} className="mr-1" />
                                      {mediaCounts.files} file{mediaCounts.files > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                              <span>Submitted: {new Date(request.created_at).toLocaleString()}</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openResponseDialog(request, "accept")}
                              >
                                <CheckCircle size={16} className="mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openResponseDialog(request, "decline")}
                              >
                                <XCircle size={16} className="mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No pending requests</p>
                      <p className="text-sm text-muted-foreground mt-1">New requests will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processed Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
                  <CardDescription>View your past decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  {processedRequests.length > 0 ? (
                    <div className="space-y-4">
                      {processedRequests.map((request: NoticeRequest) => {
                        const mediaCounts = getMediaCounts(request)
                        return (
                          <div key={request.id} className="border rounded-lg p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{request.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  From: {request.requester.display_name || "Anonymous"}
                                </p>
                              </div>
                              {request.status === "approved" ? (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm">
                                  <CheckCircle size={14} />
                                  <span>Approved</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-sm">
                                  <XCircle size={14} />
                                  <span>Rejected</span>
                                </div>
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>

                            {/* Media Attachments Preview */}
                            {mediaCounts.total > 0 && (
                              <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Attachments ({mediaCounts.total})</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openMediaViewer(request)}
                                    className="text-xs"
                                  >
                                    <Eye size={14} className="mr-1" />
                                    View Attachments
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {mediaCounts.images > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      <ImageIcon size={12} className="mr-1" />
                                      {mediaCounts.images} image{mediaCounts.images > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {mediaCounts.videos > 0 && (
                                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                      <Video size={12} className="mr-1" />
                                      {mediaCounts.videos} video{mediaCounts.videos > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {mediaCounts.files > 0 && (
                                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300">
                                      <File size={12} className="mr-1" />
                                      {mediaCounts.files} file{mediaCounts.files > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {request.response_message && (
                              <div className={`p-3 rounded border text-sm ${
                                request.status === "approved"
                                  ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                                  : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                              }`}>
                                <p className="font-medium mb-1">Your response:</p>
                                <p className="text-sm">{request.response_message}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                              <span>Responded: {request.responded_at ? new Date(request.responded_at).toLocaleString() : "N/A"}</span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogTitle>Delete Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this request? This action cannot be undone.
                                  </AlertDialogDescription>
                                  <div className="flex gap-2 justify-end">
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteRequest(request.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No processed requests yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Accepted and declined requests will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Rep-only: Analytics Tab */}
        {isRep && (
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Notice Analytics</CardTitle>
                <CardDescription>View statistics for your notices</CardDescription>
              </CardHeader>
              <CardContent>
                {/* ... (analytics content remains the same) ... */}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Media Viewer Dialog */}
      <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Media Attachments</DialogTitle>
                <DialogDescription>
                  {selectedMediaRequest?.title || "Request Media"}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMediaViewerOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedMediaRequest && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={viewingMediaType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewingMediaType("all")}
                >
                  All ({getMediaCounts(selectedMediaRequest).total})
                </Button>
                <Button
                  variant={viewingMediaType === "images" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewingMediaType("images")}
                >
                  <ImageIcon size={14} className="mr-1" />
                  Images ({getMediaCounts(selectedMediaRequest).images})
                </Button>
                <Button
                  variant={viewingMediaType === "videos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewingMediaType("videos")}
                >
                  <Video size={14} className="mr-1" />
                  Videos ({getMediaCounts(selectedMediaRequest).videos})
                </Button>
                <Button
                  variant={viewingMediaType === "files" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewingMediaType("files")}
                >
                  <File size={14} className="mr-1" />
                  Files ({getMediaCounts(selectedMediaRequest).files})
                </Button>
              </div>

              {filteredMedia().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMedia().map((media) => (
                    <div key={media.id} className="border rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                      <div className={`p-3 ${getMediaBadgeColor(media.media_type)}`}>
                        <div className="flex items-center gap-2">
                          {getMediaIcon(media.media_type)}
                          <span className="text-xs font-medium capitalize">{media.media_type}</span>
                          {media.is_link && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              <ExternalLink size={10} className="mr-1" />
                              Link
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        {media.media_type === "image" ? (
                          <div className="aspect-video overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                            <img
                              src={media.media_url}
                              alt="Attachment"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E"
                              }}
                            />
                          </div>
                        ) : media.media_type === "video" ? (
                          <div className="aspect-video overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                            <video
                              src={media.media_url}
                              className="w-full h-full object-cover"
                              controls
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center aspect-square bg-neutral-100 dark:bg-neutral-800 rounded">
                            <File size={48} className="text-neutral-400" />
                          </div>
                        )}
                        
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground truncate">
                            {media.file_name || "No filename"}
                          </p>
                          <a
                            href={media.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline block truncate"
                          >
                            {media.media_url}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <File size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No media attachments found</p>
                  {viewingMediaType !== "all" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Try switching to "All" or another media type
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === "accept" ? "Accept Request" : "Decline Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="font-semibold text-foreground">{selectedRequest.title}</span>
                  </div>
                  <div className="text-sm">
                    From: {selectedRequest.requester.display_name || "Anonymous"}
                  </div>
                  <div className="text-sm mt-3">
                    Add an optional message to the requester:
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={
                responseAction === "accept"
                  ? "e.g., Your notice has been approved and will be posted shortly..."
                  : "e.g., Unfortunately, we cannot approve this notice because..."
              }
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {responseAction === "accept"
                ? "If no message is provided, a default approval message will be sent."
                : "If no message is provided, a default decline message will be sent."}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            {responseAction === "accept" ? (
              <Button
                onClick={handleAcceptRequest}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <span className="mr-2">Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Accept & Post
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleDeclineRequest}
                disabled={isProcessing}
                variant="destructive"
              >
                {isProcessing ? (
                  <>
                    <span className="mr-2">Processing...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="mr-2" />
                    Decline Request
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}