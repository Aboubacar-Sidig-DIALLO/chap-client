"use client"

import { useId } from "react"
import { Mic01Icon, Moon02Icon, Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Reveal } from "@/components/motion/reveal"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useQuietMode } from "../hooks/use-quiet-mode"
import { quietStore } from "../lib/quiet-store"
import { describeUntil, deviceTimeZone, formatMinute, nextMorning, parseMinute } from "../lib/rules"
import type { QuietSchedule } from "../types"

const EFFECTS: { icon: IconSvgElement; text: string }[] = [
  { icon: Notification01Icon, text: "Les notifications arrivent sans son ni vibration." },
  { icon: Mic01Icon, text: "Les vocaux arrivent sans bruit ; le talkie-walkie vous parvient en vocal, à écouter plus tard." },
]

/** Réglages « Heures calmes », sur la page de profil : ne pas déranger maintenant, et chaque jour. */
export function QuietModeSettings() {
  const quiet = useQuietMode()
  const { state, reason, now } = quiet

  if (!state) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-3xl border bg-card p-4 text-sm text-muted-foreground">
        {quiet.status === "error" ? quiet.error : <Spinner size={18} />}
      </div>
    )
  }

  const isManualOn = reason?.kind === "manual"

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2 px-1 text-sm text-muted-foreground">
        {EFFECTS.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-2.5">
            <HugeiconsIcon icon={icon} size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-voice" />
            {text}
          </li>
        ))}
      </ul>

      <SettingCard
        title="Ne pas déranger"
        description={
          isManualOn && reason
            ? `Activé ${describeUntil(reason, now)}.`
            : "Pour un moment de calme, tout de suite."
        }
        checked={isManualOn}
        // Activé ici : jusqu'au matin, la durée la plus courante (le menu de l'accueil en propose d'autres).
        onCheckedChange={(on) => void quietStore.setManual(on, on ? nextMorning(now) : null)}
      />

      <SettingCard
        title="Heures calmes chaque jour"
        description={
          state.schedule.enabled
            ? `De ${formatMinute(state.schedule.startMinute)} à ${formatMinute(state.schedule.endMinute)}, chaque jour.`
            : "Par exemple la nuit : le calme revient tout seul, chaque jour."
        }
        checked={state.schedule.enabled}
        onCheckedChange={(enabled) => void saveSchedule(state.schedule, { enabled })}
      >
        <Reveal show={state.schedule.enabled}>
          <ScheduleFields schedule={state.schedule} />
        </Reveal>
      </SettingCard>

      {quiet.error && (
        <p role="alert" className="px-1 text-sm text-destructive">
          {quiet.error}
        </p>
      )}
    </div>
  )
}

/** Enregistre l'horaire, dans le fuseau de cet appareil (celui où l'on vit ses journées). */
function saveSchedule(current: QuietSchedule, patch: Partial<QuietSchedule>) {
  return quietStore.setSchedule({ ...current, ...patch, timeZone: deviceTimeZone() })
}

interface SettingCardProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: React.ReactNode
}

function SettingCard({ title, description, checked, onCheckedChange, children }: SettingCardProps) {
  const labelId = useId()
  const descriptionId = useId()

  return (
    <div className={cn("rounded-3xl border bg-card p-4 transition-colors", checked && "border-voice/30 bg-voice/5")}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p id={labelId} className="flex items-center gap-1.5 text-sm font-medium">
            {checked && <HugeiconsIcon icon={Moon02Icon} size={14} strokeWidth={2} fill="currentColor" aria-hidden className="text-voice" />}
            {title}
          </p>
          <p id={descriptionId} className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
        />
      </div>
      {children}
    </div>
  )
}

/** De… à… : deux heures, enregistrées dès qu'elles sont complètes. */
function ScheduleFields({ schedule }: { schedule: QuietSchedule }) {
  const fields = [
    { key: "startMinute", label: "De", value: schedule.startMinute },
    { key: "endMinute", label: "À", value: schedule.endMinute },
  ] as const

  return (
    <div className="flex flex-col gap-2 pt-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, value }) => (
          <label key={key} className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            {label}
            <input
              type="time"
              step={300}
              // Remonté quand l'heure enregistrée change (ici ou sur un autre appareil).
              key={value}
              defaultValue={formatMinute(value)}
              onChange={(event) => {
                const minute = parseMinute(event.target.value)
                if (minute !== null && minute !== value) void saveSchedule(schedule, { [key]: minute })
              }}
              className="h-11 rounded-2xl border bg-background px-3 text-base text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </label>
        ))}
      </div>
      {schedule.startMinute === schedule.endMinute && (
        <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
          Choisissez deux heures différentes.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Heure de cet appareil ({schedule.timeZone.replace(/_/g, " ")}).
      </p>
    </div>
  )
}
