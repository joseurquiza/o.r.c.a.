"use client"

import {
  Home,
  Settings,
  LogOut,
  Menu,
  Bot,
  X,
  Inbox,
  Plug,
  Store,
  Upload,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { OrcaBotIcon } from "@/components/orca-bot-icon"

const navigationItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Workers",
    url: "/workers",
    icon: Bot,
  },
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Plug,
  },
  {
    title: "Store",
    url: "/store",
    icon: Store,
  },
  {
    title: "Submit App",
    url: "/creators",
    icon: Upload,
  },
  {
    title: "Review Queue",
    url: "/review",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleLinkClick = () => {
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setIsMobileOpen(true)} className="bg-white shadow-md">
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-50",
          // Desktop styles
          "hidden md:flex",
          isCollapsed ? "w-16" : "w-64",
          // Mobile styles
          isMobileOpen && "fixed inset-y-0 left-0 flex w-64 md:hidden",
        )}
      >
        {/* Header */}
        <div className="flex flex-col p-4 border-b border-gray-200 relative">
          {/* Desktop Menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-2 right-2 z-10 hidden md:flex"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Mobile Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-2 right-2 z-10 md:hidden"
          >
            <X className="h-4 w-4" />
          </Button>

          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col items-center space-y-3 pt-8">
              {/* Square orca icon with 1:1 ratio */}
              <div className="w-full flex justify-center">
                <OrcaBotIcon className="w-32 h-32" />
              </div>
              {/* Text below the icon */}
              <div className="text-center">
                <h1 className="text-lg font-bold">ORCA</h1>
                <p className="text-xs text-gray-500">Your AI Chief of Staff</p>
              </div>
            </div>
          )}
          {isCollapsed && !isMobile && (
            <div className="flex justify-center pt-8">
              <OrcaBotIcon className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {(!isCollapsed || isMobile) && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</p>
            )}
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                href={item.url}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors",
                  isCollapsed && !isMobile ? "justify-center" : "justify-start",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span className="font-medium">{item.title}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className={cn(
              "w-full text-gray-700 hover:bg-gray-100",
              isCollapsed && !isMobile ? "px-2" : "justify-start",
            )}
          >
            <LogOut className="h-4 w-4" />
            {(!isCollapsed || isMobile) && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </div>
    </>
  )
}
