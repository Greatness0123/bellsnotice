"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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
}

interface CommentThreadProps {
  comment: Comment
  user: any
  onReply: (parentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  replies?: Comment[]
  noticeAuthorId?: string
}

export function CommentThread({ comment, user, onReply, onDelete, replies = [], noticeAuthorId }: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [hasReacted, setHasReacted] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchReactionCount = async () => {
      const { count } = await supabase
        .from("reactions")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", comment.id)

      setReactionCount(count || 0)

      if (user) {
        const { data: userReaction } = await supabase
          .from("reactions")
          .select("*")
          .eq("comment_id", comment.id)
          .eq("user_id", user.id)
          .single()

        setHasReacted(!!userReaction)
      }
    }

    fetchReactionCount()
  }, [comment.id, user])

  const handleReact = async () => {
    if (!user) return

    if (hasReacted) {
      await supabase.from("reactions").delete().eq("comment_id", comment.id).eq("user_id", user.id)
      setHasReacted(false)
      setReactionCount(Math.max(0, reactionCount - 1))
    } else {
      await supabase.from("reactions").insert({
        comment_id: comment.id,
        user_id: user.id,
        reaction_type: "like",
      })
      setHasReacted(true)
      setReactionCount(reactionCount + 1)
    }
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return

    await onReply(comment.id, replyContent)
    setReplyContent("")
    setIsReplying(false)
  }

  const isOwnComment = user?.id === comment.user_id

  return (
    <div className="border-l-4 border-neutral-200 dark:border-neutral-600 pl-4 py-2">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{comment.profiles?.display_name || "Anonymous"}</p>
            {noticeAuthorId === comment.user_id && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Author</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
        </div>
        {isOwnComment && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(comment.id)} className="h-8 w-8 p-0">
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <p className="text-sm mb-3">{comment.content}</p>

      <div className="flex items-center gap-3 mb-3">
        <Button variant="ghost" size="sm" onClick={handleReact} disabled={!user} className="h-8 gap-1 px-2">
          <Heart size={14} fill={hasReacted ? "currentColor" : "none"} />
          <span className="text-xs">{reactionCount}</span>
        </Button>
        {user && (
          <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)} className="h-8 gap-1 px-2">
            <MessageCircle size={14} />
            <span className="text-xs">Reply</span>
          </Button>
        )}
      </div>

      {isReplying && (
        <form onSubmit={handleReplySubmit} className="mb-4">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="mb-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!replyContent.trim()}>
              Reply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsReplying(false)
                setReplyContent("")
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {replies.length > 0 && (
        <div className="mt-4 ml-4 space-y-3">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              user={user}
              onReply={onReply}
              onDelete={onDelete}
              noticeAuthorId={noticeAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
