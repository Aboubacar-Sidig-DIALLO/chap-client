"use client"

import { AnimateIcon } from "@animate-ui/react/icons"
import { Download04 } from "@/components/animate-ui/icons/hugeicons/download-04"
import { cn } from "@/lib/utils"
import {
  getAttachmentUrl,
  getFileExtension,
  isPlayableAudio,
  isPreviewableImage,
} from "../lib/attachments"
import { formatFileSize } from "../lib/format"
import type { Attachment, ChatMessage } from "../types"
import { FileTypeIcon } from "./file-type-icon"
import { ImageMosaic } from "./image-mosaic"
import { VoiceMessage } from "./voice-message"

interface MessageAttachmentsProps {
  message: ChatMessage
  isOwn: boolean
}

/** Pièces jointes d'un message : vocaux, images en mosaïque, autres fichiers en cartes. */
export function MessageAttachments({ message, isOwn }: MessageAttachmentsProps) {
  const { attachments, status } = message
  const audios = attachments.filter((item) => isPlayableAudio(item.mimeType))
  const images = attachments.filter((item) => isPreviewableImage(item.mimeType))
  const files = attachments.filter(
    (item) => !isPlayableAudio(item.mimeType) && !isPreviewableImage(item.mimeType)
  )

  return (
    <div
      data-slot="message-attachments"
      data-variant={isOwn ? "own" : "other"}
      data-status={status}
      className={cn(
        // Largeur max. relative à la colonne des messages (`@container` du message).
        "flex max-w-[85cqw] flex-col gap-1 transition-opacity data-[status=sending]:opacity-60 sm:max-w-[75cqw]",
        // Une image seule prend un peu plus de place : c'est elle, le message.
        images.length > 0 ? "w-72" : "w-64"
      )}
    >
      {audios.map((audio) => (
        <VoiceMessage key={audio.id} attachment={audio} message={message} isOwn={isOwn} />
      ))}

      {images.length > 0 && <ImageMosaic images={images} isOwn={isOwn} />}

      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  )
}

function FileCard({ file }: { file: Attachment }) {
  return (
    // Survoler ou toucher la carte entière anime son icône de téléchargement.
    <AnimateIcon animateOnHover animateOnTap asChild>
      <a
        href={getAttachmentUrl(file, { download: true })}
        download={file.name}
        className="group/file press flex items-center gap-3 rounded-2xl border bg-card p-2.5 pr-3 outline-none [--press-scale:0.985] hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <FileTypeIcon mimeType={file.mimeType} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{file.name}</span>
          <span className="block text-xs text-muted-foreground">
            {getFileExtension(file.name)} · {formatFileSize(file.size)}
          </span>
        </span>
        <Download04
          size={18}
          aria-label="Télécharger"
          className="shrink-0 text-muted-foreground transition-colors group-hover/file:text-foreground"
        />
      </a>
    </AnimateIcon>
  )
}
