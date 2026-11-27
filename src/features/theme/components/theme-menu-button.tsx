"use client"

import { useRef } from "react"
import { ContrastIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "@/components/ui/button"
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu"
import { cn } from "@/lib/utils"
import { useTheme } from "../hooks/use-theme"
import { isThemePreference } from "../lib/theme"
import { THEME_OPTIONS, centerOf, describeTheme } from "../lib/theme-options"

/**
 * Apparence en un geste, depuis l'accueil : automatique, clair ou sombre. Le
 * nouveau thème se dévoile depuis le bouton ; le réglage détaillé reste dans le profil.
 */
export function ThemeMenuButton() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { preference, resolved, setPreference } = useTheme()
  const currentLabel = THEME_OPTIONS.find(({ value }) => value === preference)?.label ?? ""

  function handleValueChange(value: unknown) {
    if (!isThemePreference(value)) return
    setPreference(value, centerOf(triggerRef.current))
  }

  return (
    <Menu>
      <MenuTrigger
        ref={triggerRef}
        aria-label={`Apparence : ${currentLabel}`}
        title="Apparence"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-10 shrink-0 text-muted-foreground sm:size-8")}
      >
        {/* Moitié pleine à gauche en clair, à droite en sombre. */}
        <HugeiconsIcon icon={ContrastIcon} size={18} strokeWidth={2} className="dark:rotate-180" />
      </MenuTrigger>
      <MenuContent className="w-64">
        <div className="flex flex-col gap-1 px-2.5 pt-2 pb-2">
          <p className="font-medium">Apparence</p>
          <p className="text-xs text-pretty text-muted-foreground">{describeTheme(preference, resolved)}</p>
        </div>
        <MenuSeparator />
        <MenuRadioGroup value={preference} onValueChange={handleValueChange}>
          {THEME_OPTIONS.map(({ value, label, icon }) => (
            <MenuRadioItem key={value} value={value}>
              <HugeiconsIcon icon={icon} strokeWidth={2} />
              {label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}
