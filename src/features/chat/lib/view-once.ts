import type { Attachment, ViewOnceFile, ViewOnceItem, ViewOnceKind } from "../types"
import {
  API_URL,
  PLAYABLE_AUDIO_TYPES,
  PLAYABLE_VIDEO_TYPES,
  PREVIEWABLE_IMAGE_TYPES,
} from "./config"
import { formatDuration } from "./format"

/**
 * Vue unique : un vocal, une photo, une vidéo ou un fichier que chaque
 * destinataire n'ouvre qu'une fois. Ici, ce qu'on en dit (libellés) et la
 * façon de l'ouvrir sans le laisser traîner (mémoire seulement).
 */

/** Genre d'une pièce jointe (même règle que le serveur, `sse/src/chat/view-once.ts`). */
function kindOf(attachment: Attachment): ViewOnceKind {
  if (attachment.voice || attachment.mimeType.startsWith("audio/")) return "voice"
  if (attachment.image) return "image"
  if (PLAYABLE_VIDEO_TYPES.has(attachment.mimeType)) return "video"
  return "file"
}

/** L'annonce d'une pièce jointe : son genre et, pour un vocal, sa durée. */
export function toViewOnceItem(attachment: Attachment): ViewOnceItem {
  const kind = kindOf(attachment)
  return attachment.voice ? { kind, durationMs: attachment.voice.durationMs } : { kind }
}

interface KindCopy {
  singular: string
  plural: string
  /** « Écouter », « Voir », « Ouvrir ». */
  open: string
  /** Après l'ouverture, côté destinataire : « Vocal écouté », « Photos vues »… */
  opened: (count: number) => string
  /** Côté auteur : « Écouté par Léa », « Vu par 2 sur 3 »… */
  doneBy: string
  /** « Pas encore écouté », « Pas encore vu »… */
  pending: string
}

const COPY: Record<ViewOnceKind, KindCopy> = {
  voice: {
    singular: "Vocal",
    plural: "vocaux",
    open: "Écouter",
    opened: (count) => (count > 1 ? "Vocaux écoutés" : "Vocal écouté"),
    doneBy: "Écouté par",
    pending: "Pas encore écouté",
  },
  image: {
    singular: "Photo",
    plural: "photos",
    open: "Voir",
    opened: (count) => (count > 1 ? "Photos vues" : "Photo vue"),
    doneBy: "Vu par",
    pending: "Pas encore vu",
  },
  video: {
    singular: "Vidéo",
    plural: "vidéos",
    open: "Voir",
    opened: (count) => (count > 1 ? "Vidéos vues" : "Vidéo vue"),
    doneBy: "Vu par",
    pending: "Pas encore vu",
  },
  file: {
    singular: "Fichier",
    plural: "fichiers",
    open: "Ouvrir",
    opened: (count) => (count > 1 ? "Fichiers ouverts" : "Fichier ouvert"),
    doneBy: "Ouvert par",
    pending: "Pas encore ouvert",
  },
}

/** Plusieurs genres mêlés (une photo et un fichier…). */
const MIXED_COPY: KindCopy = {
  singular: "Pièce jointe",
  plural: "pièces jointes",
  open: "Ouvrir",
  opened: () => "Pièces jointes ouvertes",
  doneBy: "Ouvert par",
  pending: "Pas encore ouvert",
}

export interface ViewOnceSummary {
  /** Le genre commun ; `null` s'ils sont mêlés. */
  kind: ViewOnceKind | null
  /** « Vocal · 0:12 », « Photo », « 3 photos »… */
  title: string
  copy: KindCopy
}

/** Ce qu'on peut dire d'un message à vue unique sans l'ouvrir. */
export function summarizeViewOnce(items: ViewOnceItem[]): ViewOnceSummary {
  const kinds = new Set(items.map((item) => item.kind))
  const kind = kinds.size === 1 ? items[0].kind : null
  const copy = kind ? COPY[kind] : MIXED_COPY
  const count = items.length

  let title = count > 1 ? `${count} ${copy.plural}` : copy.singular
  const duration = items[0]?.durationMs
  if (count === 1 && kind === "voice" && duration) {
    title = `${title} · ${formatDuration(duration)}`
  }
  return { kind, title, copy }
}

/** « Écoute unique » pour un vocal, « Vue unique » pour le reste. */
export function viewOnceModeLabel(kind: ViewOnceKind | null) {
  return kind === "voice" ? "Écoute unique" : "Vue unique"
}

/**
 * Type sous lequel le contenu est mis en mémoire. Seuls les formats affichés
 * tels quels le gardent ; tout le reste devient un flux d'octets, que le
 * navigateur n'interprétera jamais (pas de HTML ni de SVG actif).
 */
function safeType({ kind, mimeType }: ViewOnceFile) {
  if (kind === "voice" && PLAYABLE_AUDIO_TYPES.has(mimeType)) return mimeType
  if (kind === "image" && PREVIEWABLE_IMAGE_TYPES.has(mimeType)) return mimeType
  if (kind === "video" && PLAYABLE_VIDEO_TYPES.has(mimeType)) return mimeType
  return "application/octet-stream"
}

/** Pièce jointe ouverte : en mémoire (`blob:`), à libérer à la fermeture. */
export interface OpenedFile extends ViewOnceFile {
  objectUrl: string
}

/**
 * Télécharge les fichiers d'un message à vue unique (avec la session : le
 * ticket n'est valable que pour soi) et les garde en mémoire, jamais en
 * cache ni sur le disque. Rejette si l'un d'eux n'arrive pas, ou si
 * `signal` interrompt le chargement (visionneuse fermée entre-temps).
 */
export async function loadViewOnceFiles(
  files: ViewOnceFile[],
  { signal }: { signal?: AbortSignal } = {}
): Promise<OpenedFile[]> {
  const opened: OpenedFile[] = []
  try {
    for (const file of files) {
      const response = await fetch(`${API_URL}${file.url}`, {
        credentials: "include",
        cache: "no-store",
        signal,
      })
      if (!response.ok) throw new Error("Ce contenu n'est plus disponible")
      const blob = new Blob([await response.arrayBuffer()], { type: safeType(file) })
      opened.push({ ...file, objectUrl: URL.createObjectURL(blob) })
    }
    return opened
  } catch (error) {
    releaseViewOnceFiles(opened)
    throw error
  }
}

export function releaseViewOnceFiles(files: OpenedFile[]) {
  for (const file of files) URL.revokeObjectURL(file.objectUrl)
}
