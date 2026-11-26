"use client"

import { useState } from "react"
import { UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { apiUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Teintes douces des groupes, écrites en entier pour que Tailwind les génère.
 * Lisibles en clair comme en sombre, sans concurrencer la couleur « voix ».
 */
const GROUP_TONES = [
  "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  "bg-teal-500/12 text-teal-700 dark:text-teal-300",
] as const

/** Toujours la même teinte pour un même groupe, sur tous les appareils. */
function toneOf(groupId: string) {
  let hash = 0
  for (const char of groupId) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return GROUP_TONES[Math.abs(hash) % GROUP_TONES.length]
}

/** Premier caractère du nom (un emoji reste entier), en majuscule. */
function initialOf(name: string) {
  const [first = "#"] = Array.from(name.trim())
  return first.toUpperCase()
}

const SIZES = {
  /** En-tête de conversation (comme l'avatar d'un ami). */
  default: { tile: "size-8 rounded-lg text-sm", badge: "size-4 [&_svg]:size-2.5" },
  /** Listes de l'accueil. */
  lg: { tile: "size-10 rounded-xl text-base", badge: "size-4.5 [&_svg]:size-3" },
  /** Fiche du groupe : la forme suffit, pas de badge. */
  xl: { tile: "size-24 rounded-[1.75rem] text-4xl", badge: null },
} as const

interface GroupAvatarProps {
  group: { id: string; name: string; photoUrl: string | null }
  size?: keyof typeof SIZES
}

/**
 * Avatar d'un groupe : une tuile carrée arrondie avec sa photo ou, à défaut,
 * son initiale sur une teinte qui lui est propre, et un badge « groupe ». Les
 * personnes ont un avatar rond (et leur pastille de présence) : on distingue
 * d'un coup d'œil un ami d'un groupe.
 */
export function GroupAvatar({ group, size = "lg" }: GroupAvatarProps) {
  const { tile, badge } = SIZES[size]
  // Photo introuvable (supprimée entre-temps) : l'initiale prend le relais.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const photoUrl = group.photoUrl && group.photoUrl !== failedUrl ? group.photoUrl : null

  return (
    <span aria-hidden className="relative shrink-0">
      <span
        className={cn(
          "grid place-items-center overflow-hidden font-semibold select-none",
          tile,
          photoUrl ? "bg-muted" : toneOf(group.id)
        )}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- fichier servi par l'API, déjà au bon format
          <img
            src={apiUrl(photoUrl)}
            alt=""
            draggable={false}
            onError={() => setFailedUrl(photoUrl)}
            className="size-full object-cover"
          />
        ) : (
          initialOf(group.name)
        )}
      </span>
      {badge && (
        <span
          className={cn(
            "absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-background text-muted-foreground ring-2 ring-background",
            badge
          )}
        >
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
        </span>
      )}
    </span>
  )
}
