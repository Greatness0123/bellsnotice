"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Link as LinkIcon, Plus, X } from "lucide-react"
import Link from "next/link"

interface RequestFormState {
  title: string
  description: string
  selectedRepId: string
}

interface Profile {
  id: string
  display_name: string | null
  user_type: string
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
  rep: {
    display_name: string | null
  } | null
}

interface SupabaseNoticeRequest {
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
}

interface User {
  id: string
  email?: string
}

interface MediaItem {
  type: "image" | "video" | "file"
  url: string
  isLink: boolean
  name?: string
}

export default function RequestNoticePage() {
  const [user, setUser] = useState<User | null>(null)
  const [reps, setReps] = useState<Profile[]>([])
  const [requests, setRequests] = useState<NoticeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<RequestFormState>({
    title: "",
    description: "",
    selectedRepId: "",
  })

  // Media state for uploads and links
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [fileUrlInput, setFileUrlInput] = useState("")

  // Initial load - check user and fetch reps
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/")
          return
        }

        setUser(authUser)

        // Verify user is a regular user (not a rep)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", authUser.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          router.push("/")
          return
        }

        if (profile?.user_type !== "regular") {
          router.push("/")
          return
        }

        // Fetch all reps
        const { data: repsData, error: repsError } = await supabase
          .from("profiles")
          .select("id, display_name, user_type")
          .eq("user_type", "rep")
          .order("display_name", { ascending: true })

        if (repsError) {
          console.error("Error fetching reps:", repsError)
          setReps([])
        } else {
          setReps(repsData || [])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error in checkUserAndLoadData:", err)
        router.push("/")
      }
    }

    checkUserAndLoadData()
  }, [router, supabase])

  // Fetch user's requests
  useEffect(() => {
    const fetchUserRequests = async () => {
      if (!user) return

      try {
        const { data: requestsData, error: requestsError } = await supabase
          .from("notice_requests")
          .select("*")
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false })

        if (requestsError) {
          console.error("Error fetching requests:", requestsError)
          setRequests([])
          return
        }

        if (!requestsData || requestsData.length === 0) {
          setRequests([])
          return
        }

        // Fetch rep information for each request
        const requestsWithReps = await Promise.all(
          requestsData.map(async (request: SupabaseNoticeRequest) => {
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

        setRequests(requestsWithReps)
      } catch (err) {
        console.error("Error fetching user requests:", err)
        setRequests([])
      }
    }

    fetchUserRequests()
  }, [user, supabase])

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "images" | "videos" | "files") => {
    const selectedFiles = Array.from(e.target.files || [])
    if (type === "images") setImages([...images, ...selectedFiles])
    if (type === "videos") setVideos([...videos, ...selectedFiles])
    if (type === "files") setFiles([...files, ...selectedFiles])
  }

  // URL handlers
  const handleAddImageUrl = () => {
    if (imageUrlInput.trim() && isValidUrl(imageUrlInput.trim())) {
      setImageUrls([...imageUrls, imageUrlInput.trim()])
      setImageUrlInput("")
    } else {
      setError("Please enter a valid URL for the image")
    }
  }

  const handleAddVideoUrl = () => {
    if (videoUrlInput.trim() && isValidUrl(videoUrlInput.trim())) {
      setVideoUrls([...videoUrls, videoUrlInput.trim()])
      setVideoUrlInput("")
    } else {
      setError("Please enter a valid URL for the video")
    }
  }

  const handleAddFileUrl = () => {
    if (fileUrlInput.trim() && isValidUrl(fileUrlInput.trim())) {
      setFileUrls([...fileUrls, fileUrlInput.trim()])
      setFileUrlInput("")
    } else {
      setError("Please enter a valid URL for the file")
    }
  }

  // Remove handlers
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleRemoveImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const handleRemoveVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index))
  }

  const handleRemoveFileUrl = (index: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== index))
  }

  // Helper function to validate URLs
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  // Upload file to storage - COMMENTED OUT FOR NOW
  /*
  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExtension = file.name.split('.').pop()
    const uniqueFileName = `${timestamp}-${randomId}.${fileExtension}`
    const fileName = `${path}/${user?.id}/${uniqueFileName}`
    
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    if (!user) {
      setError("User not found. Please log in again.")
      setSubmitting(false)
      return
    }

    if (!form.selectedRepId.trim()) {
      setError("Please select a rep to submit your request to.")
      setSubmitting(false)
      return
    }

    if (!form.title.trim()) {
      setError("Please enter a title for your notice.")
      setSubmitting(false)
      return
    }

    if (!form.description.trim()) {
      setError("Please enter a description for your notice.")
      setSubmitting(false)
      return
    }

    try {
      // Create notice request
      const { data: newRequest, error: insertError } = await supabase
        .from("notice_requests")
        .insert({
          requester_id: user.id,
          rep_id: form.selectedRepId,
          title: form.title.trim(),
          description: form.description.trim(),
          status: "pending",
        })
        .select()
        .single()

      if (insertError) {
        console.error("Insert error:", insertError)
        throw new Error("Failed to create request. Please try again.")
      }

      // Prepare all media items (both uploaded files and links)
      const mediaItems: MediaItem[] = []

      // COMMENTED OUT: File upload functionality temporarily disabled
      /*
      // Upload and add uploaded images
      for (const image of images) {
        try {
          const url = await uploadFile(image, "bellsnotice", "request/images")
          mediaItems.push({
            type: "image",
            url,
            isLink: false,
            name: image.name
          })
        } catch (err) {
          console.error("Error uploading image:", image.name, err)
        }
      }

      // Upload and add uploaded videos
      for (const video of videos) {
        try {
          const url = await uploadFile(video, "bellsnotice", "request/videos")
          mediaItems.push({
            type: "video",
            url,
            isLink: false,
            name: video.name
          })
        } catch (err) {
          console.error("Error uploading video:", video.name, err)
        }
      }

      // Upload and add uploaded files
      for (const file of files) {
        try {
          const url = await uploadFile(file, "bellsnotice", "request/files")
          mediaItems.push({
            type: "file",
            url,
            isLink: false,
            name: file.name
          })
        } catch (err) {
          console.error("Error uploading file:", file.name, err)
        }
      }
      */

      // Add image URLs
      for (const imageUrl of imageUrls) {
        mediaItems.push({
          type: "image",
          url: imageUrl,
          isLink: true
        })
      }

      // Add video URLs
      for (const videoUrl of videoUrls) {
        mediaItems.push({
          type: "video",
          url: videoUrl,
          isLink: true
        })
      }

      // Add file URLs
      for (const fileUrl of fileUrls) {
        mediaItems.push({
          type: "file",
          url: fileUrl,
          isLink: true
        })
      }

      // Insert media records if we have any
      if (mediaItems.length > 0) {
        const mediaRecords = mediaItems.map((item) => ({
          request_id: newRequest.id,
          media_type: item.type,
          media_url: item.url,
          is_link: item.isLink,
          file_name: item.name || null
        }))

        const { error: mediaError } = await supabase
          .from("notice_request_media")
          .insert(mediaRecords)

        if (mediaError) {
          console.error("Media insert error:", mediaError)
          // Don't throw, just log the error
        }
      }

      // Reset form
      setForm({
        title: "",
        description: "",
        selectedRepId: "",
      })
      // Reset all media states
      setImages([])
      setVideos([])
      setFiles([])
      setImageUrls([])
      setVideoUrls([])
      setFileUrls([])
      setImageUrlInput("")
      setVideoUrlInput("")
      setFileUrlInput("")
      
      setSuccessMessage("Request submitted successfully! The rep will review it shortly.")

      // Refresh requests list
      setTimeout(async () => {
        const { data: updatedRequests } = await supabase
          .from("notice_requests")
          .select("*")
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false })

        if (updatedRequests && updatedRequests.length > 0) {
          const requestsWithReps = await Promise.all(
            updatedRequests.map(async (request: SupabaseNoticeRequest) => {
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

          setRequests(requestsWithReps)
        }
      }, 500)
    } catch (err: unknown) {
      console.error("Submission error:", err)
      setError(err instanceof Error ? err.message : "Failed to submit request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-full text-sm font-medium">
            <Clock size={14} />
            <span>Pending</span>
          </div>
        )
      case "approved":
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full text-sm font-medium">
            <CheckCircle size={14} />
            <span>Approved</span>
          </div>
        )
      case "rejected":
        return (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full text-sm font-medium">
            <XCircle size={14} />
            <span>Rejected</span>
          </div>
        )
      default:
        return null
    }
  }

  // Calculate total files count for display
  const totalUploadedFiles = images.length + videos.length + files.length
  const totalUrls = imageUrls.length + videoUrls.length + fileUrls.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pt-24">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
      </Link>

      <div className="grid gap-6">
        {/* Submit New Request Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-3xl">Request to Post Notice</CardTitle>
              <CardDescription className="mt-2">
                Submit your notice content to a rep for review and approval
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select Rep */}
              <div className="grid gap-2">
                <Label htmlFor="rep" className="text-base font-semibold">
                  Select Rep <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose which rep you'd like to submit this notice to
                </p>
                <select
                  id="rep"
                  name="selectedRepId"
                  required
                  value={form.selectedRepId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-foreground transition-colors hover:border-neutral-400 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">-- Select a rep --</option>
                  {reps.length > 0 ? (
                    reps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.display_name || "Unknown Rep"} ({rep.id.substring(0, 8)})
                      </option>
                    ))
                  ) : (
                    <option disabled>No reps available</option>
                  )}
                </select>
              </div>

              {/* Title - FIXED: Added container to prevent overflow */}
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="title" className="text-base font-semibold">
                    Notice Title <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {form.title.length}/200
                  </span>
                </div>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Final Year Project Submission Deadline"
                  required
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  className="px-4 py-3"
                />
              </div>

              {/* Description - FIXED: Added container to prevent overflow */}
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Notice Description <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {form.description.length}/5000
                  </span>
                </div>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter the full content of your notice here..."
                  required
                  rows={6}
                  value={form.description}
                  onChange={handleChange}
                  maxLength={5000}
                  className="px-4 py-3 resize-none"
                />
              </div>

              {/* Media Upload Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Media Attachments</CardTitle>
                  <CardDescription>
                    Upload files or add web links to support your notice (Optional)
                  </CardDescription>
                  {(totalUploadedFiles > 0 || totalUrls > 0) && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {totalUploadedFiles} file(s) uploaded • {totalUrls} link(s) added
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Images */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="images">Images (Upload)</Label>
                      <Input
                        id="images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "images")}
                      />
                      {images.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {images.map((image, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{image.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="imageUrl">Images (Web Link)</Label>
                        {imageUrlInput.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {imageUrlInput.length}/500
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="imageUrl"
                          placeholder="Paste image URL (e.g., https://example.com/image.jpg)"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImageUrl())}
                          maxLength={500}
                        />
                        <Button type="button" onClick={handleAddImageUrl} variant="outline">
                          <Plus size={16} />
                        </Button>
                      </div>
                      {imageUrls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {imageUrls.map((url, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{url}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveImageUrl(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Videos */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="videos">Videos (Upload)</Label>
                      <Input
                        id="videos"
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={(e) => handleFileChange(e, "videos")}
                      />
                      {videos.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {videos.map((video, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{video.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveVideo(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="videoUrl">Videos (Web Link)</Label>
                        {videoUrlInput.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {videoUrlInput.length}/500
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="videoUrl"
                          placeholder="Paste video URL (e.g., https://example.com/video.mp4)"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVideoUrl())}
                          maxLength={500}
                        />
                        <Button type="button" onClick={handleAddVideoUrl} variant="outline">
                          <Plus size={16} />
                        </Button>
                      </div>
                      {videoUrls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {videoUrls.map((url, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{url}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveVideoUrl(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Files */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="files">Documents (Upload)</Label>
                      <Input
                        id="files"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        onChange={(e) => handleFileChange(e, "files")}
                      />
                      {files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="fileUrl">Documents (Web Link)</Label>
                        {fileUrlInput.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {fileUrlInput.length}/500
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="fileUrl"
                          placeholder="Paste file URL (e.g., https://example.com/document.pdf)"
                          value={fileUrlInput}
                          onChange={(e) => setFileUrlInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFileUrl())}
                          maxLength={500}
                        />
                        <Button type="button" onClick={handleAddFileUrl} variant="outline">
                          <Plus size={16} />
                        </Button>
                      </div>
                      {fileUrls.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {fileUrls.map((url, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                              <span className="text-sm truncate flex-1 mr-2">{url}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFileUrl(index)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    ⚠️ {error}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ {successMessage}
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      title: "",
                      description: "",
                      selectedRepId: "",
                    })
                    // Clear all media
                    setImages([])
                    setVideos([])
                    setFiles([])
                    setImageUrls([])
                    setVideoUrls([])
                    setFileUrls([])
                    setImageUrlInput("")
                    setVideoUrlInput("")
                    setFileUrlInput("")
                    setError(null)
                    setSuccessMessage(null)
                  }}
                  disabled={submitting}
                  size="lg"
                >
                  Clear All
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Request History Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                View and track the status of all your submitted notice requests
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request: NoticeRequest) => (
                  <div
                    key={request.id}
                    className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-4 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    {/* Header with title and status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground truncate">
                          {request.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted to: <span className="font-medium text-foreground">
                            {request.rep?.display_name || "Unknown Rep"}
                          </span>
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {/* Description - FIXED: Added max-width and word-wrap */}
                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                      {request.description}
                    </p>

                    {/* Rep's Response (if available) */}
                    {request.status !== "pending" && request.response_message && (
                      <div
                        className={`p-4 rounded-lg border ${
                          request.status === "approved"
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        }`}
                      >
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          {request.status === "approved" ? (
                            <>
                              <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                              <span className="text-green-700 dark:text-green-400">Rep's Response:</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} className="text-red-600 dark:text-red-400" />
                              <span className="text-red-700 dark:text-red-400">Rep's Response:</span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-foreground break-words">
                          {request.response_message}
                        </p>
                      </div>
                    )}

                    {/* Timeline info */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-muted-foreground">
                      <span className="break-words">
                        Submitted: {new Date(request.created_at).toLocaleString()}
                      </span>
                      {request.responded_at && (
                        <span className="break-words">
                          Responded: {new Date(request.responded_at).toLocaleString()}
                        </span>
                      )}
                      {request.status === "approved" && request.notice_id && (
                        <Link href={`/notice/${request.notice_id}`}>
                          <Button variant="outline" size="sm">
                            <LinkIcon size={14} className="mr-2" />
                            View Notice
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No requests submitted yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit your first notice request above to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}