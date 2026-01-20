"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Trash2, Eye, Edit, Pencil, ArrowLeft, Upload, CheckCircle, XCircle, Clock, MessageSquare, User, BarChart3, FileText, Bell } from "lucide-react"
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


interface RequestMedia {
  id: string
  request_id: string
  media_type: "image" | "video" | "file"
  media_url: string
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


      if (profile?.user_type === "rep") {
        console.log("Fetching requests for rep:", user.id)


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
            const requestsWithData = await Promise.all(
              pendingData.map(async (request: SupabaseNoticeRequest) => {
                const { data: requesterData } = await supabase
                  .from("profiles")
                  .select("display_name, email")
                  .eq("id", request.requester_id)
                  .single()


                let email = requesterData?.email || ""
                if (!email) {
                  const { data: userData } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", request.requester_id)
                    .single()

                  if (userData) {
                    const { data: authData } = await supabase.auth.admin.getUserById(request.requester_id)
                    email = authData?.user?.email || ""
                  }
                }


                const { data: mediaData } = await supabase
                  .from("notice_request_media")
                  .select("*")
                  .eq("request_id", request.id)

                return {
                  ...request,
                  requester: {
                    display_name: requesterData?.display_name || null,
                    email: email
                  },
                  media: mediaData || []
                } as NoticeRequest
              })
            )

            setPendingRequests(requestsWithData)
          } else {
            setPendingRequests([])
          }
        }


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
            const requestsWithData = await Promise.all(
              processedData.map(async (request: SupabaseNoticeRequest) => {
                const { data: requesterData } = await supabase
                  .from("profiles")
                  .select("display_name, email")
                  .eq("id", request.requester_id)
                  .single()


                let email = requesterData?.email || ""
                if (!email) {
                  const { data: userData } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", request.requester_id)
                    .single()

                  if (userData) {
                    const { data: authData } = await supabase.auth.admin.getUserById(request.requester_id)
                    email = authData?.user?.email || ""
                  }
                }


                const { data: mediaData } = await supabase
                  .from("notice_request_media")
                  .select("*")
                  .eq("request_id", request.id)

                return {
                  ...request,
                  requester: {
                    display_name: requesterData?.display_name || null,
                    email: email
                  },
                  media: mediaData || []
                } as NoticeRequest
              })
            )

            setProcessedRequests(requestsWithData)
          } else {
            setProcessedRequests([])
          }
        }
      }
    }

    fetchUserData()
  }, [user, profile, supabase])

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

      const { data: requestMediaFiles } = await supabase
        .from("notice_request_media")
        .select("*")
        .eq("request_id", selectedRequest.id)


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


      if (requestMediaFiles && requestMediaFiles.length > 0) {
        for (const media of requestMediaFiles) {

          await supabase
            .from("notice_media")
            .insert({
              notice_id: newNotice.id,
              media_type: media.media_type,
              media_url: media.media_url,
            })
        }
      }


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


      await refreshRequests()


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

      const { error: updateError } = await supabase
        .from("notice_requests")
        .update({
          status: "rejected",
          response_message: responseMessage || "Your notice request has been rejected.",
          responded_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id)

      if (updateError) throw updateError


      await refreshRequests()

      setIsResponseDialogOpen(false)
      setSelectedRequest(null)
    } catch (err: unknown) {
      console.error("Error declining request:", err)
      alert("Failed to decline request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const refreshRequests = async () => {
    if (!user) return


    const { data: pendingData, error: pendingError } = await supabase
      .from("notice_requests")
      .select("*")
      .eq("rep_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (!pendingError && pendingData && pendingData.length > 0) {
      const requestsWithData = await Promise.all(
        pendingData.map(async (request: SupabaseNoticeRequest) => {
          const { data: requesterData } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", request.requester_id)
            .single()


          const { data: mediaData } = await supabase
            .from("notice_request_media")
            .select("*")
            .eq("request_id", request.id)

          return {
            ...request,
            requester: {
              display_name: requesterData?.display_name || null,
              email: requesterData?.email || ""
            },
            media: mediaData || []
          } as NoticeRequest
        })
      )
      setPendingRequests(requestsWithData)
    } else {
      setPendingRequests([])
    }


    const { data: processedData, error: processedError } = await supabase
      .from("notice_requests")
      .select("*")
      .eq("rep_id", user.id)
      .in("status", ["approved", "rejected"])
      .order("responded_at", { ascending: false })

    if (!processedError && processedData && processedData.length > 0) {
      const requestsWithData = await Promise.all(
        processedData.map(async (request: SupabaseNoticeRequest) => {
          const { data: requesterData } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", request.requester_id)
            .single()


          const { data: mediaData } = await supabase
            .from("notice_request_media")
            .select("*")
            .eq("request_id", request.id)

          return {
            ...request,
            requester: {
              display_name: requesterData?.display_name || null,
              email: requesterData?.email || ""
            },
            media: mediaData || []
          } as NoticeRequest
        })
      )
      setProcessedRequests(requestsWithData)
    } else {
      setProcessedRequests([])
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    await supabase.from("notice_request_media").delete().eq("request_id", requestId)
    await supabase.from("notice_requests").delete().eq("id", requestId)

    setPendingRequests(pendingRequests.filter((r) => r.id !== requestId))
    setProcessedRequests(processedRequests.filter((r) => r.id !== requestId))
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
                      <div className="grid gap-4">
                        <Label>Profile Picture</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                            {profileImagePreview ? (
                              <img
                                src={profileImagePreview}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-4xl text-neutral-400">
                                {editForm.display_name?.charAt(0)?.toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="profile-image" className="cursor-pointer">
                              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                <Upload size={16} />
                                <span className="text-sm">Upload Photo</span>
                              </div>
                              <Input
                                id="profile-image"
                                type="file"
                                accept="image/*"
                                onChange={handleProfileImageChange}
                                className="hidden"
                              />
                            </Label>
                            <p className="text-xs text-muted-foreground mt-2">
                              JPG, PNG or GIF (max. 5MB)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-display-name">Display Name</Label>
                        <Input
                          id="edit-display-name"
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-level">Level</Label>
                          <Select value={editForm.level} onValueChange={(val) => setEditForm({ ...editForm, level: val })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100">100 Level</SelectItem>
                              <SelectItem value="200">200 Level</SelectItem>
                              <SelectItem value="300">300 Level</SelectItem>
                              <SelectItem value="400">400 Level</SelectItem>
                              <SelectItem value="500">500 Level</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-program">Program</Label>
                          <Select value={editForm.program} onValueChange={(val) => setEditForm({ ...editForm, program: val })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="undergraduate">Undergraduate</SelectItem>
                              <SelectItem value="postgraduate">Postgraduate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-college">College</Label>
                        <Select value={editForm.college} onValueChange={(val) => setEditForm({ ...editForm, college: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLNAS">College of Natural and Applied Sciences</SelectItem>
                            <SelectItem value="COLMANS">College of Management and Social Sciences</SelectItem>
                            <SelectItem value="COLFAST">College of Agriculture, Food and Sustainable Development</SelectItem>
                            <SelectItem value="COLENG">College of Engineering</SelectItem>
                            <SelectItem value="COLENVS">College of Environmental Sciences</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-department">Department</Label>
                        <Select value={editForm.department} onValueChange={(val) => setEditForm({ ...editForm, department: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS[editForm.college as keyof typeof DEPARTMENTS]?.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-matric">Matric Number</Label>
                        <Input
                          id="edit-matric"
                          type="text"
                          placeholder="e.g., 2024/13016"
                          value={editForm.matric_number}
                          onChange={(e) => setEditForm({ ...editForm, matric_number: e.target.value })}
                        />
                      </div>
                      {updateError && <p className="text-sm text-red-500">{updateError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isUpdating}>
                          {isUpdating ? "Updating..." : "Save Changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                  {profile?.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-neutral-400">
                      {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{profile?.display_name || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>

              <div>
                <Label className="text-base font-semibold">Display Name</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.display_name || "Not set"}</p>
              </div>

              <div>
                <Label className="text-base font-semibold">Account Type</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRep ? "Rep (Can post notices)" : "Regular User"}
                </p>
              </div>

              <div>
                <Label className="text-base font-semibold">Level</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.level || "Not set"} Level</p>
              </div>

              <div>
                <Label className="text-base font-semibold">Program</Label>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{profile?.program || "Not set"}</p>
              </div>

              <div>
                <Label className="text-base font-semibold">College</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.college || "Not set"}</p>
              </div>

              <div>
                <Label className="text-base font-semibold">Department</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.department || "Not set"}</p>
              </div>

              <div>
                <Label className="text-base font-semibold">Matric Number</Label>
                <p className="text-sm text-muted-foreground mt-1">{profile?.matric_number || "Not set"}</p>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="read-receipt" className="text-base font-semibold">
                      Read Receipt Visibility
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow others to see that you&apos;ve viewed their notices
                    </p>
                  </div>
                  <Switch id="read-receipt" checked={readReceiptVisibility} onCheckedChange={handleToggleReadReceipt} />
                </div>
              </div>

              <div className="border-t pt-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account and all associated data will be permanently deleted.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600">
                        Delete
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>My Comments</CardTitle>
              <CardDescription>View and manage your comments</CardDescription>
            </CardHeader>
            <CardContent>
              {userComments.length > 0 ? (
                <div className="space-y-4">
                  {userComments.map((comment: Comment) => (
                    <div key={comment.id} className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border">
                      <Link href={`/notice/${comment.notice_id}`}>
                        <p className="text-sm font-medium text-blue-600 hover:underline mb-2">
                          On: {comment.notices?.title}
                        </p>
                      </Link>
                      <p className="text-sm mb-3">{comment.content}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No comments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>


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
                {userNotices.length > 0 ? (
                  <div className="space-y-4">
                    {userNotices.map((notice: Notice) => (
                      <div key={notice.id} className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link href={`/notice/${notice.id}`}>
                              <h3 className="font-semibold text-blue-600 hover:underline">{notice.title}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notice.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
                          <div className="flex gap-2 ml-4">
                            <Link href={`/notice/${notice.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <Edit size={16} />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 size={16} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Delete Notice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this notice? This action cannot be undone.
                                </AlertDialogDescription>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteNotice(notice.id)}
                                    className="bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No notices published yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}


        {isRep && (
          <TabsContent value="requests">
            <div className="space-y-6">

              <Card>
                <CardHeader>
                  <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
                  <CardDescription>Review and respond to notice requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length > 0 ? (
                    <div className="space-y-4">
                      {pendingRequests.map((request: NoticeRequest) => (
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


                          {request.media && request.media.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-sm font-medium">Attached files ({request.media.length}):</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {request.media.map((media: RequestMedia) => (
                                  <div key={media.id} className="border rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 hover:shadow-md transition-shadow">
                                    {media.media_type === "image" ? (
                                      <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={media.media_url}
                                          alt="Request attachment"
                                          className="w-full h-32 object-cover hover:opacity-80 transition-opacity"
                                        />
                                      </a>
                                    ) : media.media_type === "video" ? (
                                      <video
                                        src={media.media_url}
                                        controls
                                        className="w-full h-32 object-cover"
                                      />
                                    ) : (
                                      <a
                                        href={media.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center h-32 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        <div className="text-center p-4">
                                          <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                                          <p className="text-xs text-muted-foreground">View File</p>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                ))}
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
                      ))}
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


              <Card>
                <CardHeader>
                  <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
                  <CardDescription>View your past decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  {processedRequests.length > 0 ? (
                    <div className="space-y-4">
                      {processedRequests.map((request: NoticeRequest) => (
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


                          {request.media && request.media.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-sm font-medium">Attached files ({request.media.length}):</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {request.media.map((media: RequestMedia) => (
                                  <div key={media.id} className="border rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 hover:shadow-md transition-shadow">
                                    {media.media_type === "image" ? (
                                      <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={media.media_url}
                                          alt="Request attachment"
                                          className="w-full h-32 object-cover hover:opacity-80 transition-opacity"
                                        />
                                      </a>
                                    ) : media.media_type === "video" ? (
                                      <video
                                        src={media.media_url}
                                        controls
                                        className="w-full h-32 object-cover"
                                      />
                                    ) : (
                                      <a
                                        href={media.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center h-32 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        <div className="text-center p-4">
                                          <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                                          <p className="text-xs text-muted-foreground">View File</p>
                                        </div>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {request.response_message && (
                            <div className={`p-3 rounded border text-sm ${request.status === "approved"
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
                      ))}
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


        {isRep && (
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Notice Analytics</CardTitle>
                <CardDescription>View statistics for your notices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {userNotices.length > 0 ? (
                    userNotices.map((notice: Notice) => (
                      <div key={notice.id} className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border">
                        <Link href={`/notice/${notice.id}`}>
                          <h3 className="font-semibold text-blue-600 hover:underline mb-3">{notice.title}</h3>
                        </Link>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-1">
                              <Eye size={16} />
                              Views
                            </div>
                            <p className="text-2xl font-bold">{notice.view_count}</p>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Created</div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(notice.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Status</div>
                            <div className="flex gap-2">
                              {notice.is_important && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Important</span>
                              )}
                              {notice.is_featured && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Featured</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No notices to analyze</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>


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