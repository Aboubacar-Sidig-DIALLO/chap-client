"use client"

import { useState } from "react"
import { WifiDisconnected01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { SectionEmpty } from "./section"

/** Silhouette des listes pendant le premier chargement : la page garde sa forme. */
export function SectionsSkeleton() {
  return (
    <div aria-busy aria-label="Chargement de vos amis et groupes" className="flex flex-col gap-6">
      {/* Amis (avatars ronds), puis groupes (tuiles carrées arrondies). */}
      {[
        { rows: 3, avatarClassName: "rounded-full" },
        { rows: 2, avatarClassName: "rounded-xl" },
      ].map(({ rows, avatarClassName }, section) => (
        <div key={section} className="flex flex-col gap-2">
          <div className="mx-1 flex items-center gap-2 md:mx-2">
            <div className="size-6 animate-pulse rounded-lg bg-muted md:size-5 md:rounded-md" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted md:h-3 md:w-16" />
          </div>
          <div className="divide-y rounded-3xl border md:divide-y-0 md:rounded-none md:border-0">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex h-16 items-center gap-3 px-4 md:h-14 md:px-2">
                <div className={cn("size-10 animate-pulse bg-muted", avatarClassName)} />
                <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Échec du chargement initial : explication et nouvel essai, à la place des listes. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  const [isRetrying, setIsRetrying] = useState(false)

  async function retry() {
    setIsRetrying(true)
    await onRetry()
    setIsRetrying(false)
  }

  return (
    <div role="alert">
      <SectionEmpty
        icon={<HugeiconsIcon icon={WifiDisconnected01Icon} strokeWidth={2} />}
        title="Impossible d'afficher vos amis et groupes"
        description={message}
        action={
          <Button variant="outline" onClick={retry} disabled={isRetrying}>
            {isRetrying && <Spinner />}
            Réessayer
          </Button>
        }
      />
    </div>
  )
}
