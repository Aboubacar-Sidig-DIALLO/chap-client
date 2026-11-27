"use client"

import { motion } from "motion/react"
import { spring, useTempoTransition } from "@animate-ui/react/utils/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Le symbole de la vue unique : un « 1 » dans un cercle en pointillés, de la couleur du texte. */
export function ViewOnceIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeDasharray="3.2 2.6"
        strokeLinecap="round"
      />
      <path
        d="M10.4 9.3 12.6 7.8v8.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface ViewOnceToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * Arme la vue unique pour le prochain envoi (vocal, photo, vidéo, fichier).
 * Activée, elle prend la couleur d'accent et son cercle fait un tour.
 */
export function ViewOnceToggle({ pressed, onPressedChange, disabled, className }: ViewOnceToggleProps) {
  const pop = useTempoTransition(spring.pop)

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={
        pressed
          ? "Vue unique activée — touchez pour la désactiver"
          : "Vue unique : le prochain envoi ne pourra être ouvert qu'une fois"
      }
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "text-muted-foreground",
        pressed && "bg-read text-white hover:bg-read/90 hover:text-white dark:hover:bg-read/90",
        className
      )}
    >
      <motion.span
        className="inline-flex"
        initial={false}
        animate={{ rotate: pressed ? 360 : 0 }}
        transition={pop}
      >
        <ViewOnceIcon size={18} />
      </motion.span>
    </Button>
  )
}
