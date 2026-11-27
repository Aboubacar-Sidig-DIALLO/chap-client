import type { Attachment, ChatMessage, VoiceMetadata } from "../types"
import { isPreviewableImage } from "./attachments"
import { formatDuration } from "./format"
import { summarizeViewOnce } from "./view-once"

/**
 * Réponses et moments d'un vocal : on répond à un message, ou à un passage
 * précis d'un vocal (« à 0:42 »), et l'on peut y réagir (« 🔥 à 0:42 »).
 * Mêmes règles que le serveur (`sse/src/chat/replies.ts`).
 */

/**
 * Le vocal d'un message, s'il en a un dont on peut citer un moment. Un vocal
 * à écoute unique n'en a pas : sa forme d'onde n'est jamais diffusée.
 */
export function voiceOf(message: ChatMessage): VoiceMetadata | null {
  if (message.viewOnce || message.deletedBy) return null
  return message.attachments.find((item) => item.voice)?.voice ?? null
}

/** « à 0:42 » */
export function formatMoment(atMs: number) {
  return `à ${formatDuration(atMs)}`
}

/** Genre du message cité : l'icône de la citation en dépend. */
export type QuoteKind = "text" | "voice" | "photo" | "file" | "view-once" | "gone"

export interface QuotePreview {
  kind: QuoteKind
  /** Une ligne : le texte cité, ou ce que contient le message (« Message vocal · 1:12 »). */
  text: string
  /** Photo citée : sa miniature, plus parlante qu'un mot. */
  thumbnail?: Attachment
  /** Vocal cité : de quoi dessiner sa forme d'onde. */
  voice?: VoiceMetadata
}

/**
 * Ce qu'une citation montre du message auquel on répond. Disparu (expiré,
 * retiré par son auteur) ou supprimé : seule reste la mention, jamais le contenu.
 */
export function describeQuote(message: ChatMessage | undefined): QuotePreview {
  if (!message) return { kind: "gone", text: "Message disparu" }
  if (message.deletedBy) return { kind: "gone", text: "Message supprimé" }

  const { content, attachments, viewOnce } = message
  if (viewOnce) {
    return { kind: "view-once", text: `${summarizeViewOnce(viewOnce.items).title} · vue unique` }
  }

  const voice = voiceOf(message)
  if (voice) {
    return { kind: "voice", text: content || `Message vocal · ${formatDuration(voice.durationMs)}`, voice }
  }

  const photos = attachments.filter((item) => isPreviewableImage(item.mimeType))
  if (photos.length > 0) {
    const label = photos.length > 1 ? `${photos.length} photos` : "Photo"
    return { kind: "photo", text: content || label, thumbnail: photos[0] }
  }
  if (attachments.length > 0) {
    const label = attachments.length > 1 ? `${attachments.length} fichiers` : attachments[0].name
    return { kind: "file", text: content || label }
  }
  return { kind: "text", text: content }
}

/** Identifiant DOM d'un message, cible du saut depuis une citation. */
export function messageElementId(messageId: string) {
  return `message-${messageId}`
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Fait défiler la conversation jusqu'au message et le fait briller un
 * instant (`data-flash`, animé en CSS). `false` s'il n'est pas à l'écran.
 */
export function revealMessage(messageId: string, { scroll = true } = {}): boolean {
  const element = document.getElementById(messageElementId(messageId))
  if (!element) return false

  if (scroll) {
    element.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" })
  }
  // Retiré puis reposé : l'animation repart de zéro, même si elle jouait encore.
  element.removeAttribute("data-flash")
  void element.offsetWidth
  element.setAttribute("data-flash", "")
  element.addEventListener("animationend", () => element.removeAttribute("data-flash"), { once: true })
  return true
}
