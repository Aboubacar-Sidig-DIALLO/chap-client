import type { Attachment, ImageMetadata, VoiceMetadata } from "../types"
import { API_URL, PLAYABLE_AUDIO_TYPES, PREVIEWABLE_IMAGE_TYPES } from "./config"

export function isPreviewableImage(mimeType: string) {
  return PREVIEWABLE_IMAGE_TYPES.has(mimeType)
}

/** Vocal ou fichier audio lisible directement dans le chat. */
export function isPlayableAudio(mimeType: string) {
  return PLAYABLE_AUDIO_TYPES.has(mimeType)
}

/** URL absolue d'une pièce jointe ; `download` force le téléchargement. */
export function getAttachmentUrl(attachment: Attachment, { download = false } = {}) {
  const url = `${API_URL}${attachment.url}`
  return download ? `${url}?download` : url
}

/** « rapport.final.pdf » → « PDF ». */
export function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toUpperCase() : "Fichier"
}

interface UploadOptions {
  /** Progression de 0 à 1. */
  onProgress?: (progress: number) => void
  signal?: AbortSignal
  /** Durée et forme d'onde d'un message vocal. */
  voice?: VoiceMetadata
  /** Dimensions et couleur dominante d'une image. */
  image?: ImageMetadata
}

function getUploadErrorMessage(status: number) {
  if (status === 413) return "Fichier trop volumineux"
  if (status === 401) return "Session expirée, reconnectez-vous"
  if (status === 0) return "Serveur injoignable"
  return "Échec de l'envoi"
}

/**
 * Envoie un fichier à l'API. `XMLHttpRequest` plutôt que `fetch` : c'est le seul
 * moyen de suivre la progression d'un envoi.
 */
export function uploadAttachment(
  file: File,
  { onProgress, signal, voice, image }: UploadOptions = {}
): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const body = new FormData()
    if (voice) {
      body.append("durationMs", String(voice.durationMs))
      body.append("waveform", JSON.stringify(voice.waveform))
    }
    if (image) {
      body.append("width", String(image.width))
      body.append("height", String(image.height))
      body.append("color", image.color)
    }
    body.append("file", file)

    xhr.open("POST", `${API_URL}/attachments`)
    // Envoi réservé aux utilisateurs connectés : le cookie de session doit suivre.
    xhr.withCredentials = true
    xhr.responseType = "json"

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as Attachment)
      else reject(new Error(getUploadErrorMessage(xhr.status)))
    }
    xhr.onerror = () => reject(new Error(getUploadErrorMessage(0)))
    xhr.onabort = () => reject(new DOMException("Envoi annulé", "AbortError"))

    signal?.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}
