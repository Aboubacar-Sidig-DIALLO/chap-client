"use client"

import { useId } from "react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "../hooks/use-theme"
import { isThemePreference } from "../lib/theme"
import { THEME_OPTIONS, centerOf, describeTheme } from "../lib/theme-options"
import { ThemePreview } from "./theme-preview"

/** Réglage « Apparence », sur la page de profil : trois aperçus, un seul choix. */
export function ThemeSettings() {
  const name = useId()
  const descriptionId = useId()
  const { preference, resolved, setPreference } = useTheme()

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value, labels } = event.currentTarget
    if (!isThemePreference(value)) return
    // Le nouveau thème se dévoile depuis l'aperçu choisi (au doigt comme au clavier).
    setPreference(value, centerOf(labels?.[0]))
  }

  return (
    <fieldset aria-describedby={descriptionId} className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <legend className="sr-only">Thème de l&apos;application</legend>
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map(({ value, label, icon }) => (
          <label key={value} className="group/theme flex cursor-pointer flex-col gap-2">
            <input
              type="radio"
              name={name}
              value={value}
              checked={preference === value}
              onChange={handleChange}
              className="peer sr-only"
            />
            <span className="press relative overflow-hidden rounded-2xl ring-1 ring-border transition-shadow [--press-scale:0.97] group-hover/theme:ring-foreground/25 peer-checked:ring-2 peer-checked:ring-voice peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
              <ThemePreview preference={value} />
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 grid size-5 scale-50 place-items-center rounded-full bg-voice text-voice-foreground opacity-0 shadow-sm transition-[scale,opacity] duration-300 ease-out group-has-checked/theme:scale-100 group-has-checked/theme:opacity-100"
              >
                <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />
              </span>
            </span>
            <span className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors peer-checked:font-medium peer-checked:text-foreground">
              <HugeiconsIcon icon={icon} size={15} strokeWidth={2} aria-hidden />
              {label}
            </span>
          </label>
        ))}
      </div>
      <p id={descriptionId} className="px-1 text-sm text-pretty text-muted-foreground">
        {describeTheme(preference, resolved)}
      </p>
    </fieldset>
  )
}
