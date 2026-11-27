"use client"

import { Delete02Icon, File01Icon, Mic01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { getAttachmentUrl, isPlayableAudio, isPreviewableImage } from "../lib/attachments"
import type { Attachment } from "../types"
import type { MessageActions } from "./message-actions"

interface MessageMenuProps {
  actions: MessageActions
  onEdit: () => void
  /** Demande la suppression (confirmée ensuite). */
  onRemove: () => void
  onRemoveAttachment: (attachment: Attachment) => void
}

/**
 * Actions sous la barre de réactions : modifier, supprimer, retirer une
 * pièce jointe. Rien ne s'affiche s'il n'y a rien de permis.
 */
export function MessageMenu({ actions, onEdit, onRemove, onRemoveAttachment }: MessageMenuProps) {
  const { canEdit, removal, removableAttachments, isChangeable } = actions
  if (!canEdit && !removal && removableAttachments.length === 0) return null

  const images = removableAttachments.filter((item) => isPreviewableImage(item.mimeType))

  return (
    <div className="mt-1 flex flex-col border-t pt-1">
      {canEdit && <MenuAction icon={PencilEdit02Icon} label="Modifier" onClick={onEdit} />}
      {removableAttachments.map((attachment) => (
        <MenuAction
          key={attachment.id}
          icon={attachmentIcon(attachment)}
          thumbnail={isPreviewableImage(attachment.mimeType) ? getAttachmentUrl(attachment) : undefined}
          label={removeAttachmentLabel(attachment, images)}
          onClick={() => onRemoveAttachment(attachment)}
        />
      ))}
      {removal && (
        <MenuAction
          icon={Delete02Icon}
          label={removal === "moderate" ? "Supprimer pour tous" : "Supprimer"}
          tone="destructive"
          onClick={onRemove}
        />
      )}
      {isChangeable && (
        <p className="px-3 pt-1 pb-1.5 text-[11px] text-muted-foreground">
          Modifiable tant que personne ne l&apos;a vu
        </p>
      )}
    </div>
  )
}

/** « Retirer le vocal », « Retirer la photo 2 », « Retirer « devis.pdf » ». */
function removeAttachmentLabel(attachment: Attachment, images: Attachment[]) {
  if (attachment.voice || isPlayableAudio(attachment.mimeType)) return "Retirer le vocal"
  if (isPreviewableImage(attachment.mimeType)) {
    return images.length > 1 ? `Retirer la photo ${images.indexOf(attachment) + 1}` : "Retirer la photo"
  }
  return `Retirer « ${attachment.name} »`
}

function attachmentIcon(attachment: Attachment): IconSvgElement {
  return attachment.voice || isPlayableAudio(attachment.mimeType) ? Mic01Icon : File01Icon
}

interface MenuActionProps {
  icon: IconSvgElement
  label: string
  onClick: () => void
  /** Miniature d'une photo, plus parlante qu'une icône. */
  thumbnail?: string
  tone?: "default" | "destructive"
}

function MenuAction({ icon, label, onClick, thumbnail, tone = "default" }: MenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-2xl px-3 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        tone === "destructive" ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted"
      )}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniature d'une pièce jointe servie par l'API
        <img src={thumbnail} alt="" className="size-5 shrink-0 rounded-md object-cover" />
      ) : (
        <HugeiconsIcon
          icon={icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden
          className={cn("shrink-0", tone === "default" && "text-muted-foreground")}
        />
      )}
      <span className="max-w-56 min-w-0 truncate">{label}</span>
    </button>
  )
}
