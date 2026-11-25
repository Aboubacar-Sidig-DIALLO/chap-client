/* eslint-disable @next/next/no-img-element -- aperçu local (`blob:`), non optimisable par next/image. */
"use client"

import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade"
import {
  ReducedMotionConfig,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Cancel01 } from "@/components/animate-ui/icons/hugeicons/cancel-01"
import { Refresh } from "@/components/animate-ui/icons/hugeicons/refresh"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AttachmentDraft } from "../hooks/use-attachment-drafts"
import { getFileExtension } from "../lib/attachments"
import { formatFileSize } from "../lib/format"
import { FileTypeIcon } from "./file-type-icon"
import { ProgressLine } from "./progress-line"

interface AttachmentDraftListProps {
  drafts: AttachmentDraft[]
  notice: string | null
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

/**
 * Fichiers joints au message en cours de rédaction (Animate UI, `interactions/list.md`) :
 * un fichier ajouté apparaît, un fichier retiré s'efface et les autres se resserrent.
 */
export function AttachmentDraftList({
  drafts,
  notice,
  onRemove,
  onRetry,
}: AttachmentDraftListProps) {
  const move = useTempoTransition(spring.reflow)
  const fade = useTempoTransition(transition.fade)

  if (drafts.length === 0 && !notice) return null

  return (
    <ReducedMotionConfig>
      <div className="flex flex-col gap-1.5 px-1.5 pt-1.5">
        {drafts.length > 0 && (
          // Les bords s'estompent quand d'autres fichiers attendent hors champ.
          <ScrollFade asChild orientation="horizontal" size={24} shrink={0} blur={0}>
            <ul
              aria-label="Pièces jointes"
              className="flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-0.5"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {drafts.map((draft) => (
                  <motion.li
                    key={draft.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { ...move, opacity: fade } }}
                    exit={{ opacity: 0, scale: 0.96, transition: fade }}
                    transition={move}
                    className="shrink-0 snap-start"
                  >
                    <DraftTile
                      draft={draft}
                      onRemove={(event) => {
                        leave(event.currentTarget.closest("li"))
                        onRemove(draft.id)
                      }}
                      onRetry={() => onRetry(draft.id)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </ScrollFade>
        )}

        {notice && (
          <p role="status" className="px-2 text-xs text-destructive">
            {notice}
          </p>
        )}
      </div>
    </ReducedMotionConfig>
  )
}

/**
 * L'élément qui s'en va n'est plus atteignable au clavier, et s'il avait le
 * focus, il le confie à son voisin (règle A17 d'Animate UI).
 */
function leave(item: HTMLElement | null) {
  if (!item) return
  const neighbor = (item.nextElementSibling ??
    item.previousElementSibling) as HTMLElement | null
  if (item.contains(document.activeElement)) {
    neighbor?.querySelector<HTMLElement>("button")?.focus()
  }
  item.inert = true
}

interface DraftTileProps {
  draft: AttachmentDraft
  onRemove: (event: React.MouseEvent<HTMLButtonElement>) => void
  onRetry: () => void
}

function DraftTile({ draft, onRemove, onRetry }: DraftTileProps) {
  const { file, previewUrl, status, progress, error, canRetry } = draft
  const isFailed = status === "failed"

  return (
    <div
      data-status={status}
      title={error ? `${file.name} — ${error}` : file.name}
      className={cn(
        "relative flex h-16 overflow-hidden rounded-xl border bg-background transition-colors",
        "data-[status=failed]:border-destructive/50",
        previewUrl ? "w-16" : "w-56 items-center gap-2.5 pr-8 pl-2.5"
      )}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className={cn(
            "size-full object-cover transition-opacity",
            status !== "uploaded" && "opacity-50"
          )}
        />
      ) : (
        <>
          <FileTypeIcon mimeType={file.type} />
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className={cn("truncate text-muted-foreground", isFailed && "text-destructive")}>
              {isFailed
                ? error
                : status === "uploading"
                  ? `Envoi… ${Math.round(progress * 100)} %`
                  : `${getFileExtension(file.name)} · ${formatFileSize(file.size)}`}
            </p>
          </div>
        </>
      )}

      {status === "uploading" && (
        <ProgressLine
          value={progress}
          label={`Envoi de ${file.name}`}
          className="absolute inset-x-0 bottom-0"
        />
      )}

      {isFailed && canRetry && (
        <AnimateIcon animateOnHover="rotate" animateOnTap="rotate" asChild>
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            aria-label={`Réessayer l'envoi de ${file.name}`}
            onClick={onRetry}
            className={cn(
              "absolute",
              previewUrl ? "inset-0 m-auto bg-background/90" : "right-1.5 bottom-1.5"
            )}
          >
            <Refresh size={12} />
          </Button>
        </AnimateIcon>
      )}

      <AnimateIcon animateOnHover animateOnTap asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          aria-label={`Retirer ${file.name}`}
          onClick={onRemove}
          // Bouton discret, mais zone tactile élargie par le pseudo-élément.
          className="absolute top-1 right-1 size-6 bg-background/90 shadow-sm backdrop-blur after:absolute after:-inset-2 sm:size-5"
        >
          <Cancel01 size={12} strokeWidth={2.5} />
        </Button>
      </AnimateIcon>
    </div>
  )
}
