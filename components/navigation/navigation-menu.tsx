"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Search, Filter, LayoutDashboard, List, Bookmark, LogOut, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface NavigationMenuProps {
  user: any
}

export function NavigationMenu({ user }: NavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [yPosition, setYPosition] = useState("50%")
  const [isDragging, setIsDragging] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const buttonRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Fetch unread request count
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      const { data, error } = await supabase.rpc('get_unread_request_count', {
        user_id: user.id
      })

      if (!error && data !== null) {
        setUnreadCount(data)
      }
    }

    fetchUnreadCount()

    // Set up real-time subscription
    const channel = supabase
      .channel('request_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notice_requests',
          filter: `requester_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && buttonRef.current) {
      const height = window.innerHeight
      const buttonHeight = buttonRef.current.offsetHeight
      
      let newY = e.clientY
      
      // Keep button within viewport bounds
      if (newY < buttonHeight / 2) newY = buttonHeight / 2
      if (newY > height - buttonHeight / 2) newY = height - buttonHeight / 2

      setYPosition(`${newY}px`)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      const height = window.innerHeight
      const buttonHeight = buttonRef.current?.offsetHeight || 64
      
      let newY = e.touches[0].clientY
      
      // Keep button within viewport bounds
      if (newY < buttonHeight / 2) newY = buttonHeight / 2
      if (newY > height - buttonHeight / 2) newY = height - buttonHeight / 2

      setYPosition(`${newY}px`)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Add global mouse/touch event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const menuItems = [
    { icon: Search, label: "Search", href: "/search" },
    { icon: Filter, label: "Filter", href: "/filter" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: List, label: "All Notices", href: "/notices" },
    { icon: Bookmark, label: "Saved", href: "/saved" },
  ]

  if (!user) {
    return null
  }

  const getMenuItemPosition = (index: number, total: number) => {
    const startAngle = Math.PI / 2
    const endAngle = (3 * Math.PI) / 2
    const angle = startAngle + (index / (total - 1)) * (endAngle - startAngle)
    const radius = 100
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return { x, y }
  }

  return (
    <>
      <div
        ref={buttonRef}
        className="fixed z-50 select-none right-1"
        style={{
          top: yPosition,
          transform: "translateY(-50%)",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {/* Main button with logo and notification badge */}
        <div className="relative">
          <button
            onClick={() => !isDragging && setIsOpen(!isOpen)}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all relative overflow-hidden"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            <img
              src="/images/bells-20notice-20icon.jpg"
              alt="Bells Notice"
              className={`w-16 h-16 object-contain transition-transform pointer-events-none ${isOpen ? "rotate-45" : ""}`}
              draggable={false}
            />
          </button>
          
          {/* Notification badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>

        {/* Semicircle menu items */}
        {isOpen && !isDragging && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {menuItems.map((item, index) => {
              const pos = getMenuItemPosition(index, menuItems.length)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="pointer-events-auto"
                  style={{
                    position: "absolute",
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <button className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-lg hover:shadow-xl group relative">
                    <item.icon size={20} />
                    <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.label}
                    </span>
                  </button>
                </Link>
              )
            })}
            {user && (
              <button
                onClick={handleLogout}
                className="pointer-events-auto group relative"
                style={{
                  position: "absolute",
                  left: `${getMenuItemPosition(menuItems.length, menuItems.length + 1).x}px`,
                  top: `${getMenuItemPosition(menuItems.length, menuItems.length + 1).y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="w-12 h-12 rounded-full bg-neutral-400 hover:bg-neutral-500 text-white flex items-center justify-center transition-colors shadow-lg hover:shadow-xl">
                  <LogOut size={20} />
                  <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Logout
                  </span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}