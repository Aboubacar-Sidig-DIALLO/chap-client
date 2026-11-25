/* eslint-disable @next/next/no-img-element -- petites images d'emojis servies par Google Fonts, déjà optimisées. */
"use client"

import { useState } from "react"
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion"
import { cn } from "@/lib/utils"
import { getNotoEmojiUrl } from "../lib/emoji"

interface EmojiProps {
  emoji: string
  /** Côté en pixels. */
  size: number
  /** Joue la version animée (sauf sous « réduire les animations »). */
  animated?: boolean
  className?: string
}

/**
 * Emoji dessiné (Noto), identique sur tous les appareils. La version animée se
 * superpose au dessin fixe une fois chargée : jamais de case vide. Si Noto ne
 * connaît pas l'emoji, celui du système prend le relais.
 */
export function Emoji({ emoji, size, animated = false, className }: EmojiProps) {
  const reduceMotion = useShouldReduceMotion()
  const [failedEmoji, setFailedEmoji] = useState<string | null>(null)
  const box = { width: size, height: size }

  if (failedEmoji === emoji) {
    return (
      <span
        className={cn("inline-grid shrink-0 place-items-center leading-none", className)}
        style={{ ...box, fontSize: size * 0.85 }}
      >
        {emoji}
      </span>
    )
  }

  return (
    <span className={cn("relative inline-block shrink-0", className)} style={box}>
      <img
        src={getNotoEmojiUrl(emoji, false)}
        alt={emoji}
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        decoding="async"
        onError={() => setFailedEmoji(emoji)}
        className="size-full select-none"
      />
      {animated && !reduceMotion && (
        <img
          src={getNotoEmojiUrl(emoji, true)}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          // Révélée seulement une fois prête, sans re-rendu.
          onLoad={(event) => event.currentTarget.setAttribute("data-loaded", "")}
          className="absolute inset-0 size-full opacity-0 transition-opacity duration-150 select-none data-loaded:opacity-100"
        />
      )}
    </span>
  )
}
