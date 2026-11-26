"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const VISIBLE_MS = 4000

interface Notice {
  id: number
  message: string
}

/** Confirmation brève d'une action réussie (« Compte suspendu »). */
export function useAdminNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const countRef = useRef(0)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const show = useCallback((message: string) => setNotice({ id: ++countRef.current, message }), [])
  return { notice, show }
}

/** Bulle en bas de l'écran ; annoncée poliment aux lecteurs d'écran. */
export function AdminNotice({ notice }: { notice: Notice | null }) {
  const reduceMotion = useReducedMotion()
  const offset = reduceMotion ? 0 : 12

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-60 flex justify-center px-4"
    >
      <AnimatePresence>
        {notice && (
          <motion.p
            key={notice.id}
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset / 2 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} aria-hidden />
            {notice.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
