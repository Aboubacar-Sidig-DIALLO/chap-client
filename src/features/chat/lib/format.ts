const LOCALE = "fr-FR"

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
})

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
})

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function formatTime(isoDate: string) {
  return timeFormatter.format(new Date(isoDate))
}

/** « Aujourd'hui », « Hier » ou « Lundi 23 novembre ». */
export function formatDayLabel(isoDate: string) {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return "Aujourd'hui"
  if (isSameDay(date, yesterday)) return "Hier"

  const label = dayFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const listFormatter = new Intl.ListFormat(LOCALE, {
  style: "long",
  type: "conjunction",
})

/** « Alice », « Alice et Bob », « Alice, Bob et Carol », « Alice, Bob et 3 autres ». */
export function formatNameList(names: string[], maxNames = 2) {
  if (names.length <= maxNames + 1) return listFormatter.format(names)

  const othersCount = names.length - maxNames
  return listFormatter.format([...names.slice(0, maxNames), `${othersCount} autres`])
}

const SIZE_UNITS =["byte", "kilobyte", "megabyte", "gigabyte"] as const

const sizeFormatters = SIZE_UNITS.map(
  (unit) =>
    new Intl.NumberFormat(LOCALE, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: 1,
    })
)

/** 1536 → « 1,5 ko ». */
export function formatFileSize(bytes: number) {
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024
    unitIndex++
  }

  return sizeFormatters[unitIndex].format(value)
}

/** 72 500 ms → « 1:12 ». */
export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** « 11:00 – 11:12 », ou « 11:01 » quand tout tient dans la même minute. */
export function formatTimeRange(startIso: string, endIso: string) {
  const start = formatTime(startIso)
  const end = formatTime(endIso)
  return start === end ? start : `${start} – ${end}`
}

/** Durée d'un appel : « 42 s », « 12 min », « 1 h 05 ». */
export function formatCallDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  if (totalSeconds < 60) return `${totalSeconds} s`

  const totalMinutes = Math.round(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  return `${hours} h ${String(totalMinutes % 60).padStart(2, "0")}`
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
