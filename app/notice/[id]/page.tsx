"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Heart, Share2, Bookmark, Check, ChevronDown, X, MessageSquare, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CommentThread } from "@/components/comment-thread"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Notice {
  id: string
  title: string
  description: string
  author_id: string
  created_at: string
  view_count: number
  is_important: boolean
  is_featured: boolean
}

interface Profile {
  id: string
  display_name: string
  profile_image_url: string | null
}

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  parent_comment_id: string | null
  notice_id: string
  profiles?: {
    display_name: string
    profile_image_url: string | null
  }
  replies?: Comment[]
}

interface MediaItem {
  id: string
  notice_id: string
  media_type: string
  media_url: string
  is_link: boolean
}

export default function NoticePage() {
  const params = useParams()
  const router = useRouter()
  const noticeId = params.id as string
  const [notice, setNotice] = useState<Notice | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasReacted, setHasReacted] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [selectedMedia, setSelectedMedia] = useState<{ type: "image" | "video"; url: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  useEffect(() => {
    const fetchNotice = async () => {
      if (!noticeId) return

      const { data: noticeData, error: noticeError } = await supabase
        .from("notices")
        .select("*")
        .eq("id", noticeId)
        .single()

      if (!noticeError && noticeData) {
        setNotice(noticeData)


        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name, profile_image_url")
          .eq("id", noticeData.author_id)
          .single()

        if (profileData) {
          setAuthor(profileData)
        }


        const { data: mediaData, error: mediaError } = await supabase
          .from("notice_media")
          .select("*")
          .eq("notice_id", noticeId)

        if (mediaError) {
          console.error("Error fetching media:", mediaError)
        } else if (mediaData) {
          console.log("Media fetched:", mediaData)
          setMedia(mediaData)
        } else {
          console.log("No media found for notice:", noticeId)
        }


        if (user) {
          await supabase.from("notice_views").insert({
            notice_id: noticeId,
            user_id: user.id,
          })


          await supabase.rpc("increment_view_count", { notice_id: noticeId })
        }
      }

      setLoading(false)
    }

    if (user !== undefined) {
      fetchNotice()
    }
  }, [noticeId, user])

  useEffect(() => {
    const fetchReactions = async () => {
      if (!noticeId) return

      const { count } = await supabase
        .from("reactions")
        .select("*", { count: "exact", head: true })
        .eq("notice_id", noticeId)

      setReactionCount(count || 0)

      if (user) {
        const { data: userReaction } = await supabase
          .from("reactions")
          .select("*")
          .eq("notice_id", noticeId)
          .eq("user_id", user.id)
          .single()

        setHasReacted(!!userReaction)
      }
    }

    fetchReactions()
  }, [noticeId, user])

  const fetchComments = async () => {
    if (!noticeId) return

    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("*, profiles(display_name, profile_image_url)")
      .eq("notice_id", noticeId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return
    }


    const commentMap: { [key: string]: Comment } = {}
    const topLevelComments: Comment[] = []

    commentsData?.forEach((comment: any) => {
      commentMap[comment.id] = { ...comment, replies: [] }
    })

    commentsData?.forEach((comment: any) => {
      if (!comment.parent_comment_id) {
        topLevelComments.push(commentMap[comment.id])
      } else if (commentMap[comment.parent_comment_id]) {
        if (!commentMap[comment.parent_comment_id].replies) {
          commentMap[comment.parent_comment_id].replies = []
        }
        commentMap[comment.parent_comment_id].replies?.push(commentMap[comment.id])
      }
    })


    topLevelComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setComments(topLevelComments)
  }

  useEffect(() => {
    fetchComments()
  }, [noticeId])

  const handleReact = async () => {
    if (!user || !noticeId) {
      router.push("/")
      return
    }

    if (hasReacted) {
      await supabase.from("reactions").delete().eq("notice_id", noticeId).eq("user_id", user.id)
      setHasReacted(false)
      setReactionCount(Math.max(0, reactionCount - 1))
    } else {
      await supabase.from("reactions").insert({
        notice_id: noticeId,
        user_id: user.id,
        reaction_type: "like",
      })
      setHasReacted(true)
      setReactionCount(reactionCount + 1)
    }
  }

  const handleSave = async () => {
    if (!user || !noticeId) {
      router.push("/")
      return
    }

    if (isSaved) {
      await supabase.from("saved_notices").delete().eq("user_id", user.id).eq("notice_id", noticeId)
      setIsSaved(false)
    } else {
      await supabase.from("saved_notices").insert({
        user_id: user.id,
        notice_id: noticeId,
      })
      setIsSaved(true)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !noticeId || !commentText.trim()) return

    setIsPosting(true)
    setCommentError(null)

    try {
      const { data: newComment, error } = await supabase
        .from("comments")
        .insert({
          notice_id: noticeId,
          user_id: user.id,
          content: commentText.trim(),
        })
        .select("*, profiles(display_name, profile_image_url)")
        .single()

      if (error) {
        console.error("Comment error:", error)
        setCommentError(error.message || "Failed to post comment. Please check RLS policies.")
        return
      }

      if (newComment) {
        await fetchComments()
        setCommentText("")
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setCommentError("An unexpected error occurred")
    } finally {
      setIsPosting(false)
    }
  }

  const handleReply = async (parentId: string, content: string) => {
    if (!user || !noticeId) return

    const { data: newReply, error } = await supabase
      .from("comments")
      .insert({
        notice_id: noticeId,
        user_id: user.id,
        parent_comment_id: parentId,
        content: content,
      })
      .select("*, profiles(display_name, profile_image_url)")
      .single()

    if (error) {
      console.error("Reply error:", error)
      return
    }

    if (newReply) {

      setExpandedReplies((prev) => new Set(prev).add(parentId))
      await fetchComments()
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId)

    if (!error) {
      await fetchComments()
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      const shareText = `Check out this notice: ${notice?.title}`


      if (navigator.share) {
        await navigator.share({
          title: notice?.title,
          text: shareText,
          url: shareUrl,
        })
      } else {

        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    } catch (err) {
      console.error("Share error:", err)

      try {
        await navigator.clipboard.writeText(window.location.href)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch (clipErr) {
        console.error("Clipboard error:", clipErr)
      }
    }
  }

  useEffect(() => {
    const fetchSavedStatus = async () => {
      if (!user || !noticeId) return

      const { data } = await supabase
        .from("saved_notices")
        .select("*")
        .eq("user_id", user.id)
        .eq("notice_id", noticeId)
        .single()

      setIsSaved(!!data)
    }

    fetchSavedStatus()
  }, [user, noticeId])

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedReplies(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading notice...</p>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Notice not found</p>
      </div>
    )
  }

  const images = media.filter((m) => m.media_type === "image")
  const videos = media.filter((m) => m.media_type === "video")
  const files = media.filter((m) => m.media_type === "file")

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl">

      <div className="md:hidden sticky top-0 bg-white dark:bg-neutral-800 z-10 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft size={18} />
          </Button>
        </Link>
      </div>


      <div className="hidden md:block mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <article className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 md:p-8 mb-6 md:mb-8">

        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 md:mb-6 gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {notice.is_important && (
                <Badge variant="destructive" className="text-xs">
                  Important
                </Badge>
              )}
              {notice.is_featured && (
                <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Featured
                </Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1">
                <Eye size={12} />
                {notice.view_count} views
              </Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">{notice.title}</h1>
          </div>
        </div>


        <Link href={`/profile/${author?.id}`}>
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 pb-4 md:pb-6 border-b hover:opacity-70 transition-opacity cursor-pointer">
            {author?.profile_image_url ? (
              <img
                src={author.profile_image_url}
                alt={author.display_name}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-white font-semibold text-sm md:text-base">
                {author?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="font-medium text-sm md:text-base">{author?.display_name || "Anonymous"}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                {new Date(notice.created_at).toLocaleDateString()} • {new Date(notice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </Link>


        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none mb-6 md:mb-8">
          <p className="whitespace-pre-wrap leading-relaxed">{notice.description}</p>
        </div>


        {media.length > 0 && (
          <div className="mb-6 md:mb-8 space-y-4 md:space-y-6">

            {images.length > 0 && (
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.media_url}
                        alt="Notice media"
                        onClick={() => setSelectedMedia({ type: "image", url: img.media_url })}
                        className="w-full rounded-lg object-cover max-h-64 md:max-h-96 cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}


            {videos.length > 0 && (
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Videos</h3>
                <div className="space-y-3 md:space-y-4">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setSelectedMedia({ type: "video", url: video.media_url })}
                      className="cursor-pointer hover:opacity-90 transition-opacity relative group"
                    >
                      <video
                        src={video.media_url}
                        className="w-full rounded-lg max-h-64 md:max-h-96"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}


            {files.length > 0 && (
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Files</h3>
                <div className="space-y-2">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm md:text-base"
                    >
                      <span className="font-medium truncate flex-1">
                        {file.media_url.split("/").pop() || "Download File"}
                      </span>
                      <span className="text-xs md:text-sm text-muted-foreground">↓</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        <div className="flex gap-2 md:gap-4 pt-4 border-t">

          <Button
            variant={hasReacted ? "default" : "outline"}
            onClick={handleReact}
            disabled={!user}
            size="sm"
            className="flex-1 md:flex-none md:px-4"
          >
            <Heart size={16} className="md:mr-2" fill={hasReacted ? "currentColor" : "none"} />
            <span className="hidden md:inline">Like</span>
            <span className="ml-1 md:ml-2">({reactionCount})</span>
          </Button>


          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!user}
            size="icon"
            className="md:hidden h-9 w-9"
          >
            <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!user}
            size="sm"
            className="hidden md:flex md:px-4"
          >
            <Bookmark size={16} className="mr-2" fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Saved" : "Save"}
          </Button>


          <Button
            variant="outline"
            onClick={handleShare}
            size="icon"
            className="md:hidden h-9 w-9 relative"
          >
            {shareSuccess ? (
              <Check size={18} />
            ) : (
              <Share2 size={18} />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            size="sm"
            className="hidden md:flex md:px-4"
          >
            {shareSuccess ? (
              <>
                <Check size={16} className="mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Share2 size={16} className="mr-2" />
                Share
              </>
            )}
          </Button>


          <div className="md:hidden flex items-center gap-1 text-sm text-muted-foreground ml-auto">
            <MessageSquare size={16} />
            <span>{comments.length}</span>
          </div>
        </div>
      </article>


      {user ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Comments</h2>
            <span className="text-sm text-muted-foreground">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
          </div>

          <form onSubmit={handleAddComment} className="mb-6">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="mb-2 text-sm md:text-base"
              disabled={isPosting}
              rows={3}
            />
            {commentError && <p className="text-sm text-red-500 mb-2">{commentError}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={!commentText.trim() || isPosting} size="sm" className="md:size-default">
                {isPosting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 md:p-8 mb-6 md:mb-8 text-center">
          <p className="text-muted-foreground mb-4">Please log in to comment</p>
          <Link href="/">
            <Button size="sm" className="md:size-default">Log In</Button>
          </Link>
        </div>
      )}


      {comments.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 md:p-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Comments ({comments.length})</h3>
          <div className="space-y-4 md:space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3 md:space-y-4">
                <CommentThread
                  comment={comment}
                  user={user}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  noticeAuthorId={notice.author_id}
                />


                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-4 md:ml-6 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 md:pl-4">
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className="flex items-center gap-2 py-2 text-xs md:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors w-full"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${expandedReplies.has(comment.id) ? "rotate-0" : "-rotate-90"
                          }`}
                      />
                      {expandedReplies.has(comment.id) ? "Hide" : "Show"} {comment.replies.length} repl
                      {comment.replies.length !== 1 ? "ies" : "y"}
                    </button>

                    {expandedReplies.has(comment.id) && (
                      <div className="space-y-2 md:space-y-3 mt-2 md:mt-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="bg-neutral-50 dark:bg-neutral-900 rounded p-3 md:p-4 space-y-2 md:space-y-3">
                            <div className="flex items-start gap-2 md:gap-3">
                              {reply.profiles?.profile_image_url ? (
                                <img
                                  src={reply.profiles.profile_image_url}
                                  alt={reply.profiles.display_name}
                                  className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {reply.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs md:text-sm">{reply.profiles?.display_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{reply.content}</p>
                            {user && user.id === reply.user_id && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === "image" ? (
              <img
                src={selectedMedia.url}
                alt="Expanded media"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
                loading="lazy"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 md:p-2 transition-colors"
              aria-label="Close media viewer"
            >
              <X size={20} className="md:size-6" />
            </button>
          </div>
        </div>
      )}


      <div className="h-4 md:hidden" />
    </div>
  )
}