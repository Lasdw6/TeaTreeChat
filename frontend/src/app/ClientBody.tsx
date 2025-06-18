'use client'
import { useEffect } from 'react'

interface ClientBodyProps {
  children: React.ReactNode
  fontClassName: string
}

export default function ClientBody({ children, fontClassName }: ClientBodyProps) {
  useEffect(() => {
    // Apply the font className to body after hydration to avoid mismatches
    document.body.className = fontClassName
  }, [fontClassName])

  return <>{children}</>
} 