const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

/** « 12 nov. 2026 ». */
export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value))
}

/** « 12 nov., 14:05 ». */
export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value))
}

/** « Suspendu jusqu'au 12 nov. 2026 », ou « Suspendu définitivement ». */
export function formatBan(banExpires: string | null) {
  return banExpires ? `Suspendu jusqu'au ${formatDate(banExpires)}` : "Suspendu définitivement"
}

const BROWSERS = [
  ["Edg/", "Edge"],
  ["OPR/", "Opera"],
  ["Firefox/", "Firefox"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
] as const

const SYSTEMS = [
  ["iPhone", "iPhone"],
  ["iPad", "iPad"],
  ["Android", "Android"],
  ["Windows", "Windows"],
  ["Mac OS X", "macOS"],
  ["Linux", "Linux"],
] as const

/**
 * Appareil d'une session, lisible : « Chrome sur Windows ». Lu dans
 * l'en-tête `User-Agent`, donc indicatif (il peut être falsifié).
 */
export function describeDevice(userAgent: string | null | undefined) {
  if (!userAgent) return "Appareil inconnu"
  const browser = BROWSERS.find(([marker]) => userAgent.includes(marker))?.[1] ?? "Navigateur"
  const system = SYSTEMS.find(([marker]) => userAgent.includes(marker))?.[1]
  return system ? `${browser} sur ${system}` : browser
}
