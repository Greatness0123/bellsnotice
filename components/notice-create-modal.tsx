"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Plus } from "lucide-react"

interface NoticeCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Tag {
  id: string
  name: string
}

interface MediaUrl {
  type: string
  url: string
  isLink: boolean
}

export function NoticeCreateModal({ open, onOpenChange }: NoticeCreateModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [expiryDate, setExpiryDate] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [fileUrlInput, setFileUrlInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
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
    setError(null)
    setIsLoading(true)

    try {
      if (!title || !description) {
        throw new Error("Title and description are required")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Create notice
      const { data: notice, error: noticeError } = await supabase
        .from("notices")
        .insert({
          title,
          description,
          author_id: user.id,
          is_important: isImportant,
          expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        })
        .select()
        .single()

      if (noticeError) throw noticeError

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
            notice_id: notice.id,
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

      // Insert tags
      if (tags.length > 0) {
        const { data: existingTags } = await supabase
          .from("tags")
          .select("id, name")
          .in("name", tags)

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
            .insert(tagIds.map((tag_id: string) => ({ notice_id: notice.id, tag_id })))
        } else {
          const tagIds = existingTags?.map((t: Tag) => t.id) || []
          await supabase
            .from("notice_tags")
            .insert(tagIds.map((tag_id: string) => ({ notice_id: notice.id, tag_id })))
        }
      }

      onOpenChange(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create notice")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Notice</DialogTitle>
          <DialogDescription>Add a new notice to the board</DialogDescription>
        </DialogHeader>

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
                    <button type="button" onClick={() => handleRemoveTag(index)} className="text-xs hover:text-red-500">
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Notice"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}