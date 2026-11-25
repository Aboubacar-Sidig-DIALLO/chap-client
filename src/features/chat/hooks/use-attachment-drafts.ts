"use client"

import { useEffect, useRef, useState } from "react"
import { isPreviewableImage, uploadAttachment } from "../lib/attachments"
import { MAX_ATTACHMENTS_PER_MESSAGE, MAX_FILE_SIZE } from "../lib/config"
import { formatFileSize } from "../lib/format"
import { createId } from "../lib/id"
import { readImageMetadata } from "../lib/image-metadata"
import type { Attachment } from "../types"

export type DraftStatus = "uploading" | "uploaded" | "failed"

/** Fichier joint au message en cours de rédaction. */
export interface AttachmentDraft {
  id: string
  file: File
  /** URL locale (`blob:`) pour afficher l'image avant la fin de l'envoi. */
  previewUrl?: string
  status: DraftStatus
  /** Progression de l'envoi, de 0 à 1. */
  progress: number
  error?: string
  /** `false` si un nouvel essai échouerait forcément (fichier trop lourd). */
  canRetry: boolean
  /** Pièce jointe renvoyée par le serveur une fois l'envoi terminé. */
  attachment?: Attachment
}

/**
 * Pièces jointes du message en cours de rédaction. Chaque fichier est envoyé
 * dès sa sélection : il est en général prêt avant que le message soit écrit.
 */
export function useAttachmentDrafts() {
  const [drafts, setDrafts] = useState<AttachmentDraft[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const uploadsRef = useRef(new Map<string, AbortController>())
  const previewUrlsRef = useRef(new Map<string, string>())

  /** Annule l'envoi éventuel et libère l'aperçu local d'un brouillon. */
  function release(id: string) {
    uploadsRef.current.get(id)?.abort()
    uploadsRef.current.delete(id)

    const previewUrl = previewUrlsRef.current.get(id)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrlsRef.current.delete(id)
  }

  useEffect(() => {
    const uploads = uploadsRef.current
    const previewUrls = previewUrlsRef.current
    return () => {
      uploads.forEach((controller) => controller.abort())
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function updateDraft(id: string, update: Partial<AttachmentDraft>) {
    setDrafts((previous) =>
      previous.map((draft) => (draft.id === id ? { ...draft, ...update } : draft))
    )
  }

  function startUpload({ id, file }: AttachmentDraft) {
    const controller = new AbortController()
    uploadsRef.current.set(id, controller)
    updateDraft(id, { status: "uploading", progress: 0, error: undefined })

    // Une image est d'abord mesurée (dimensions, couleur) pour s'afficher sans à-coup.
    const measured = isPreviewableImage(file.type)
      ? readImageMetadata(file)
      : Promise.resolve(undefined)

    measured
      .then((image) =>
        uploadAttachment(file, {
          signal: controller.signal,
          image,
          onProgress: (progress) => updateDraft(id, { progress }),
        })
      )
      .then((attachment) =>
        updateDraft(id, { status: "uploaded", progress: 1, attachment })
      )
      .catch((error: Error) => {
        // Annulation volontaire (fichier retiré) : le brouillon n'existe plus.
        if (error.name === "AbortError") return
        updateDraft(id, { status: "failed", error: error.message })
      })
      .finally(() => {
        if (uploadsRef.current.get(id) === controller) uploadsRef.current.delete(id)
      })
  }

  function createDraft(file: File): AttachmentDraft {
    const id = createId()
    const isTooLarge = file.size > MAX_FILE_SIZE

    let previewUrl: string | undefined
    if (isPreviewableImage(file.type)) {
      previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.set(id, previewUrl)
    }

    return {
      id,
      file,
      previewUrl,
      status: isTooLarge ? "failed" : "uploading",
      progress: 0,
      error: isTooLarge
        ? `Trop volumineux (max ${formatFileSize(MAX_FILE_SIZE)})`
        : undefined,
      canRetry: !isTooLarge,
    }
  }

  function addFiles(files: Iterable<File>) {
    const incoming = Array.from(files)
    const freeSlots = MAX_ATTACHMENTS_PER_MESSAGE - drafts.length
    const accepted = incoming.slice(0, Math.max(0, freeSlots))

    setNotice(
      accepted.length < incoming.length
        ? `${MAX_ATTACHMENTS_PER_MESSAGE} fichiers maximum par message`
        : null
    )
    if (accepted.length === 0) return

    const newDrafts = accepted.map(createDraft)
    setDrafts((previous) => [...previous, ...newDrafts])
    newDrafts
      .filter((draft) => draft.status === "uploading")
      .forEach(startUpload)
  }

  function removeDraft(id: string) {
    release(id)
    setDrafts((previous) => previous.filter((draft) => draft.id !== id))
    setNotice(null)
  }

  function retryDraft(id: string) {
    const draft = drafts.find((item) => item.id === id)
    if (draft?.canRetry) startUpload(draft)
  }

  /** Vide la liste après l'envoi du message. */
  function clear() {
    drafts.forEach((draft) => release(draft.id))
    setDrafts([])
    setNotice(null)
  }

  return {
    drafts,
    notice,
    /** Pièces jointes prêtes à être envoyées avec le message. */
    attachments: drafts.flatMap((draft) => draft.attachment ?? []),
    isUploading: drafts.some((draft) => draft.status === "uploading"),
    hasFailures: drafts.some((draft) => draft.status === "failed"),
    canAddMore: drafts.length < MAX_ATTACHMENTS_PER_MESSAGE,
    addFiles,
    removeDraft,
    retryDraft,
    clear,
  }
}

export type AttachmentDrafts = ReturnType<typeof useAttachmentDrafts>
