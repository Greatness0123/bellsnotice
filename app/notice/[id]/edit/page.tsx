"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Tag {
  id: string
  name: string
}

interface MediaUrl {
  type: string
  url: string
}

interface NoticeMedia {
  id: string
  media_type: string
  media_url: string
  is_link: boolean
}

export default function NoticeEditPage() {
  const params = useParams()
  const noticeId = params?.id as string
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [expiryDate, setExpiryDate] = useState("")
  const [existingMedia, setExistingMedia] = useState<NoticeMedia[]>([])
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadNotice = async () => {
      try {
        // Check authentication
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/")
          return
        }

        setUser(user)

        // Fetch notice details
        const { data: notice, error: noticeError } = await supabase
          .from("notices")
          .select("*")
          .eq("id", noticeId)
          .single()

        if (noticeError) throw noticeError

        // Check if user is the author
        if (notice.author_id !== user.id) {
          router.push("/dashboard")
          return
        }

        // Populate form with notice data
        setTitle(notice.title)
        setDescription(notice.description)
        setIsImportant(notice.is_important || false)
        setExpiryDate(notice.expires_at ? new Date(notice.expires_at).toISOString().slice(0, 16) : "")

        // Fetch tags
        const { data: noticeTags } = await supabase
          .from("notice_tags")
          .select("tags(name)")
          .eq("notice_id", noticeId)

        if (noticeTags) {
          setTags(noticeTags.map((nt: any) => nt.tags.name))
        }

        // Fetch media
        const { data: mediaData } = await supabase.from("notice_media").select("*").eq("notice_id", noticeId)

        if (mediaData) {
          setExistingMedia(mediaData)
        }

        setIsLoading(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load notice")
        setIsLoading(false)
      }
    }

    loadNotice()
  }, [noticeId])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleRemoveExistingMedia = async (mediaId: string) => {
    await supabase.from("notice_media").delete().eq("id", mediaId)
    setExistingMedia(existingMedia.filter((m) => m.id !== mediaId))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "images" | "videos" | "files") => {
    const selectedFiles = Array.from(e.target.files || [])
    if (type === "images") setImages([...images, ...selectedFiles])
    if (type === "videos") setVideos([...videos, ...selectedFiles])
    if (type === "files") setFiles([...files, ...selectedFiles])
  }

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`
    const { data, error: uploadError } = await supabase.storage.from(bucket).upload(`${path}/${fileName}`, file)

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(`${path}/${fileName}`)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (!title || !description) {
        throw new Error("Title and description are required")
      }

      // Update notice
      const { error: noticeError } = await supabase
        .from("notices")
        .update({
          title,
          description,
          is_important: isImportant,
          expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        })
        .eq("id", noticeId)

      if (noticeError) throw noticeError

      // Upload new media
      const mediaUrls: MediaUrl[] = []

      for (const image of images) {
        const url = await uploadFile(image, "bellsnotice", "images")
        mediaUrls.push({ type: "image", url })
      }

      for (const video of videos) {
        const url = await uploadFile(video, "bellsnotice", "videos")
        mediaUrls.push({ type: "video", url })
      }

      for (const file of files) {
        const url = await uploadFile(file, "bellsnotice", "files")
        mediaUrls.push({ type: "file", url })
      }

      // Insert new media records
      if (mediaUrls.length > 0) {
        await supabase.from("notice_media").insert(
          mediaUrls.map((m) => ({
            notice_id: noticeId,
            media_type: m.type,
            media_url: m.url,
            is_link: false,
          }))
        )
      }

      // Update tags - delete existing and insert new ones
      await supabase.from("notice_tags").delete().eq("notice_id", noticeId)

      if (tags.length > 0) {
        const { data: existingTags } = await supabase.from("tags").select("id, name").in("name", tags)

        const existingTagNames = existingTags?.map((t: Tag) => t.name) || []
        const newTags = tags.filter((t: string) => !existingTagNames.includes(t))

        if (newTags.length > 0) {
          const { data: createdTags } = await supabase
            .from("tags")
            .insert(newTags.map((name: string) => ({ name })))
            .select()

          const tagIds = [
            ...(existingTags?.map((t: Tag) => t.id) || []),
            ...(createdTags?.map((t: Tag) => t.id) || []),
          ]

          await supabase
            .from("notice_tags")
            .insert(tagIds.map((tag_id: string) => ({ notice_id: noticeId, tag_id })))
        } else {
          const tagIds = existingTags?.map((t: Tag) => t.id) || []
          await supabase
            .from("notice_tags")
            .insert(tagIds.map((tag_id: string) => ({ notice_id: noticeId, tag_id })))
        }
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update notice")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading notice...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Notice</CardTitle>
          <CardDescription>Update your notice information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Notice title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Notice description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus size={16} />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
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
                <CardTitle className="text-base">Existing Media</CardTitle>
                <CardDescription>Remove unwanted media files</CardDescription>
              </CardHeader>
              <CardContent>
                {existingMedia.length > 0 ? (
                  <div className="space-y-2">
                    {existingMedia.map((media) => (
                      <div
                        key={media.id}
                        className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 p-3 rounded border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                            {media.media_type}
                          </span>
                          <a
                            href={media.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate max-w-xs"
                          >
                            {media.media_url.split("/").pop()}
                          </a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExistingMedia(media.id)}
                          className="text-red-600"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No existing media</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Media</CardTitle>
                <CardDescription>Upload additional images, videos, and files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="images">Images</Label>
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
                  <Label htmlFor="videos">Videos</Label>
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
                  <Label htmlFor="files">Files</Label>
                  <Input id="files" type="file" multiple onChange={(e) => handleFileChange(e, "files")} />
                  {files.length > 0 && (
                    <div className="text-sm text-muted-foreground">{files.length} file(s) selected</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="important">Mark as Important</Label>
                <Switch id="important" checked={isImportant} onCheckedChange={setIsImportant} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                <Input
                  id="expiry"
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}