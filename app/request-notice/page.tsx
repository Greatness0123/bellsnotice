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
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, Link as LinkIcon } from "lucide-react"
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

export default function RequestNoticePage() {
  const [user, setUser] = useState<User | null>(null)
  const [reps, setReps] = useState<Profile[]>([])
  const [requests, setRequests] = useState<NoticeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<RequestFormState>({
    title: "",
    description: "",
    selectedRepId: "",
  })

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setUploadedFiles(files)
      setError(null)
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

      // Upload files if any
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            const timestamp = Date.now()
            const randomId = Math.random().toString(36).substring(7)
            const fileName = `requests/${user.id}/${timestamp}-${randomId}-${file.name}`
            const fileExt = file.name.split(".").pop()?.toLowerCase() || ""

            // Determine media type
            let mediaType: "image" | "video" | "file" = "file"
            if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
              mediaType = "image"
            } else if (["mp4", "webm", "mov", "avi"].includes(fileExt)) {
              mediaType = "video"
            }

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from("bellsnotice")
              .upload(fileName, file)

            if (uploadError) {
              console.error("Upload error for file:", file.name, uploadError)
              continue
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from("bellsnotice")
              .getPublicUrl(fileName)

            // Save media reference to notice_request_media table
            const { error: mediaError } = await supabase
              .from("notice_request_media")
              .insert({
                request_id: newRequest.id,
                media_type: mediaType,
                media_url: urlData.publicUrl,
              })

            if (mediaError) {
              console.error("Media insert error:", mediaError)
            }
          } catch (fileErr) {
            console.error("Error processing file:", file.name, fileErr)
          }
        }
      }

      // Reset form
      setForm({
        title: "",
        description: "",
        selectedRepId: "",
      })
      setUploadedFiles([])
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

              {/* Title */}
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-base font-semibold">
                  Notice Title <span className="text-red-500">*</span>
                </Label>
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
                <p className="text-xs text-muted-foreground">
                  {form.title.length}/200 characters
                </p>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Notice Description <span className="text-red-500">*</span>
                </Label>
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
                <p className="text-xs text-muted-foreground">
                  {form.description.length}/5000 characters
                </p>
              </div>

              {/* File Upload */}
              <div className="grid gap-2">
                <Label htmlFor="files" className="text-base font-semibold">
                  Attach Files <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  You can upload images, videos, or documents to support your notice
                </p>
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-8 text-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <input
                    id="files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  />
                  <label htmlFor="files" className="cursor-pointer block">
                    <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      {uploadedFiles.length > 0
                        ? `${uploadedFiles.length} file(s) selected`
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, MP4, PDF or DOC (max 50MB each)
                    </p>
                  </label>
                </div>

                {/* Show selected files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <p className="text-sm font-semibold mb-3">Selected files ({uploadedFiles.length}):</p>
                    <ul className="space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
                          {file.name}
                          <span className="text-xs">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

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
                    setUploadedFiles([])
                    setError(null)
                  }}
                  disabled={submitting}
                  size="lg"
                >
                  Clear
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

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
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
                        <p className="text-sm text-foreground">
                          {request.response_message}
                        </p>
                      </div>
                    )}

                    {/* Timeline info */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-muted-foreground">
                      <span>
                        Submitted: {new Date(request.created_at).toLocaleString()}
                      </span>
                      {request.responded_at && (
                        <span>
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