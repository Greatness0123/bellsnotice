"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, X, Plus } from "lucide-react"
import Link from "next/link"

interface CreateNoticeFormState {
  title: string
  description: string
  tags: string[]
  tagInput: string
  isImportant: boolean
  expiryDate: string
}

interface MediaUrl {
  type: string
  url: string
  isLink: boolean
}

export default function CreateNoticePage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<CreateNoticeFormState>({
    title: "",
    description: "",
    tags: [],
    tagInput: "",
    isImportant: false,
    expiryDate: "",
  })

  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [fileUrlInput, setFileUrlInput] = useState("")

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Check if admin
      const adminAuth = sessionStorage.getItem("adminAuthenticated")

      if (!user && adminAuth !== "true") {
        router.push("/")
        return
      }

      setUser(user)
      setIsAdmin(adminAuth === "true")

      // Check user type if regular user
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

        if (profile?.user_type !== "rep" && adminAuth !== "true") {
          router.push("/")
          return
        }
      }

      setLoading(false)
    }

    checkUser()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddTag = () => {
    if (form.tagInput.trim() && !form.tags.includes(form.tagInput.trim())) {
      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: "",
      }))
    }
  }

  const handleRemoveTag = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "images" | "videos" | "files") => {
    const selectedFiles = Array.from(e.target.files || [])
    if (type === "images") setImages([...images, ...selectedFiles])
    if (type === "videos") setVideos([...videos, ...selectedFiles])
    if (type === "files") setFiles([...files, ...selectedFiles])
  }

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImageUrls([...imageUrls, imageUrlInput.trim()])
      setImageUrlInput("")
    }
  }

  const handleAddVideoUrl = () => {
    if (videoUrlInput.trim()) {
      setVideoUrls([...videoUrls, videoUrlInput.trim()])
      setVideoUrlInput("")
    }
  }

  const handleAddFileUrl = () => {
    if (fileUrlInput.trim()) {
      setFileUrls([...fileUrls, fileUrlInput.trim()])
      setFileUrlInput("")
    }
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

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`${path}/${fileName}`, file)

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(`${path}/${fileName}`)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!form.title || !form.description) {
        throw new Error("Title and description are required")
      }

      const authorId = isAdmin ? user?.id || "admin" : user?.id

      const { data: newNotice, error: insertError } = await supabase
        .from("notices")
        .insert({
          title: form.title,
          description: form.description,
          author_id: authorId,
          is_important: form.isImportant && isAdmin,
          expires_at: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Upload media
      const mediaUrls: MediaUrl[] = []

      for (const image of images) {
        const url = await uploadFile(image, "bellsnotice", "images")
        mediaUrls.push({ type: "image", url, isLink: false })
      }

      for (const video of videos) {
        const url = await uploadFile(video, "bellsnotice", "videos")
        mediaUrls.push({ type: "video", url, isLink: false })
      }

      for (const file of files) {
        const url = await uploadFile(file, "bellsnotice", "files")
        mediaUrls.push({ type: "file", url, isLink: false })
      }

      // Add media URLs from web
      for (const imageUrl of imageUrls) {
        mediaUrls.push({ type: "image", url: imageUrl, isLink: true })
      }

      for (const videoUrl of videoUrls) {
        mediaUrls.push({ type: "video", url: videoUrl, isLink: true })
      }

      for (const fileUrl of fileUrls) {
        mediaUrls.push({ type: "file", url: fileUrl, isLink: true })
      }

      // Insert media records
      if (mediaUrls.length > 0) {
        const { error: mediaError } = await supabase.from("notice_media").insert(
          mediaUrls.map((m) => ({
            notice_id: newNotice.id,
            media_type: m.type,
            media_url: m.url,
            is_link: m.isLink,
          })),
        )
        if (mediaError) {
          console.error("Media insert error:", mediaError)
          throw mediaError
        }
      }

      // Add tags if provided
      if (form.tags.length > 0) {
        const { data: existingTags } = await supabase
          .from("tags")
          .select("id, name")
          .in("name", form.tags)

        const existingTagNames = existingTags?.map((t: any) => t.name) || []
        const newTags = form.tags.filter((t: string) => !existingTagNames.includes(t))

        if (newTags.length > 0) {
          const { data: createdTags } = await supabase
            .from("tags")
            .insert(newTags.map((name: string) => ({ name })))
            .select()

          const tagIds = [
            ...(existingTags?.map((t: any) => t.id) || []),
            ...(createdTags?.map((t: any) => t.id) || []),
          ]

          await supabase
            .from("notice_tags")
            .insert(tagIds.map((tag_id: string) => ({ notice_id: newNotice.id, tag_id })))
        } else {
          const tagIds = existingTags?.map((t: any) => t.id) || []
          await supabase
            .from("notice_tags")
            .insert(tagIds.map((tag_id: string) => ({ notice_id: newNotice.id, tag_id })))
        }
      }

      router.push(`/notice/${newNotice?.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create notice")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user && !isAdmin) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={isAdmin ? "/admin" : "/dashboard"}>
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Notice</CardTitle>
          <CardDescription>Share a new notice with the community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Notice title"
                required
                value={form.title}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Full notice content"
                required
                rows={6}
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={form.tagInput}
                  onChange={(e) => setForm((prev) => ({ ...prev, tagInput: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus size={16} />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      <span className="text-sm">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        className="text-xs hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Media</CardTitle>
                <CardDescription>Upload images, videos, and files (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <div className="text-sm text-muted-foreground">{images.length} image(s) selected</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Images (URL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="imageUrl"
                      placeholder="Paste image URL"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImageUrl())}
                    />
                    <Button type="button" onClick={handleAddImageUrl} variant="outline">
                      <Plus size={16} />
                    </Button>
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="space-y-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-xs truncate flex-1">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImageUrl(index)}
                            className="text-xs hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                    <div className="text-sm text-muted-foreground">{videos.length} video(s) selected</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Videos (URL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="videoUrl"
                      placeholder="Paste video URL"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVideoUrl())}
                    />
                    <Button type="button" onClick={handleAddVideoUrl} variant="outline">
                      <Plus size={16} />
                    </Button>
                  </div>
                  {videoUrls.length > 0 && (
                    <div className="space-y-2">
                      {videoUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-xs truncate flex-1">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideoUrl(index)}
                            className="text-xs hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="files">Files (Upload)</Label>
                  <Input id="files" type="file" multiple onChange={(e) => handleFileChange(e, "files")} />
                  {files.length > 0 && (
                    <div className="text-sm text-muted-foreground">{files.length} file(s) selected</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileUrl">Files (URL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fileUrl"
                      placeholder="Paste file URL"
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFileUrl())}
                    />
                    <Button type="button" onClick={handleAddFileUrl} variant="outline">
                      <Plus size={16} />
                    </Button>
                  </div>
                  {fileUrls.length > 0 && (
                    <div className="space-y-2">
                      {fileUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-xs truncate flex-1">{url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFileUrl(index)}
                            className="text-xs hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border">
                <Label htmlFor="important" className="cursor-pointer">
                  Mark as Important
                </Label>
                <Switch
                  id="important"
                  checked={form.isImportant}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isImportant: checked }))}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="expiry">Expiry Date (optional)</Label>
              <Input
                id="expiry"
                name="expiryDate"
                type="datetime-local"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end pt-4">
              <Link href={isAdmin ? "/admin" : "/dashboard"}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Notice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}