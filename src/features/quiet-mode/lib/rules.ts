import type { QuietModeState } from "../types"

/**
 * Règles des heures calmes — les mêmes que le serveur
 * (`sse/src/quiet-mode/quiet-mode.rules.ts`), qui seul décide pour les
 * notifications et le talkie-walkie. Ici, de quoi afficher l'état et faire
 * taire les sons de l'application.
 */

/** L'heure qu'il est à `now` dans ce fuseau, en minutes depuis minuit. */
function minuteOfDay(now: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now)
    const value = (type: "hour" | "minute") => Number(parts.find((part) => part.type === type)?.value ?? 0)
    return value("hour") * 60 + value("minute")
  } catch {
    return null
  }
}

/** Une plage qui passe minuit (22:00 → 07:00) s'étend sur deux jours ; une plage vide ne couvre rien. */
function isInRange(startMinute: number, endMinute: number, minute: number) {
  if (startMinute === endMinute) return false
  return startMinute < endMinute
    ? minute >= startMinute && minute < endMinute
    : minute >= startMinute || minute < endMinute
}

/** Pourquoi on est en mode calme en ce moment ; `null` si on ne l'est pas. */
export type QuietReason =
  | { kind: "manual"; until: Date | null }
  | { kind: "schedule"; endMinute: number }

export function quietReasonAt(state: QuietModeState, now: Date): QuietReason | null {
  const { manual, schedule } = state
  const until = manual.until ? new Date(manual.until) : null
  if (manual.on && (until === null || until > now)) return { kind: "manual", until }

  const minute = schedule.enabled ? minuteOfDay(now, schedule.timeZone) : null
  if (minute !== null && isInRange(schedule.startMinute, schedule.endMinute, minute)) {
    return { kind: "schedule", endMinute: schedule.endMinute }
  }
  return null
}

/** 420 → « 07:00 ». */
export function formatMinute(minute: number) {
  const hours = Math.floor(minute / 60)
  return `${String(hours).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
}

/** « 07:30 » (champ `<input type="time">`) → 450 ; `null` si incomplet. */
export function parseMinute(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const minute = Number(match[1]) * 60 + Number(match[2])
  return minute < 24 * 60 ? minute : null
}

/** Le fuseau horaire de l'appareil (« Europe/Paris »), pour l'horaire quotidien. */
export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })

/** « jusqu'à 7:00 », « jusqu'à demain 8:00 », « jusqu'à ce que vous le désactiviez ». */
export function describeUntil(reason: QuietReason, now: Date) {
  if (reason.kind === "schedule") return `jusqu'à ${formatMinute(reason.endMinute)}`
  if (!reason.until) return "jusqu'à ce que vous le désactiviez"
  const isTomorrow = reason.until.toDateString() !== now.toDateString()
  return `jusqu'à ${isTomorrow ? "demain " : ""}${timeFormatter.format(reason.until)}`
}

/** Heure du réveil proposée (« jusqu'à demain matin ») : 8:00, aujourd'hui s'il n'est pas encore passé. */
const MORNING_HOUR = 8

export function nextMorning(now: Date) {
  const morning = new Date(now)
  morning.setHours(MORNING_HOUR, 0, 0, 0)
  if (morning <= now) morning.setDate(morning.getDate() + 1)
  return morning
}
