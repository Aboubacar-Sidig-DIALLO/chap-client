import type { Presence } from "../types"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * Libellé de présence : « En ligne », « Hors ligne depuis 5 min / 3 h / 2 j »,
 * puis « Vu le 12 nov. » au-delà d'une semaine.
 */
export function formatPresence({ online, lastSeenAt }: Presence, now: number): string {
  if (online) return "En ligne"
  if (!lastSeenAt) return "Hors ligne"

  const seenAt = Date.parse(lastSeenAt)
  const elapsed = Math.max(0, now - seenAt)
  if (elapsed < MINUTE) return "Hors ligne à l'instant"
  if (elapsed < HOUR) return `Hors ligne depuis ${Math.floor(elapsed / MINUTE)} min`
  if (elapsed < DAY) return `Hors ligne depuis ${Math.floor(elapsed / HOUR)} h`
  if (elapsed < WEEK) return `Hors ligne depuis ${Math.floor(elapsed / DAY)} j`

  const sameYear = new Date(seenAt).getFullYear() === new Date(now).getFullYear()
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(seenAt)
  return `Vu le ${date}`
}

/** Amis en ligne d'abord, puis par ordre alphabétique. */
export function byPresenceThenName(a: { name: string; presence: Presence }, b: { name: string; presence: Presence }) {
  if (a.presence.online !== b.presence.online) return a.presence.online ? -1 : 1
  return a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
}
