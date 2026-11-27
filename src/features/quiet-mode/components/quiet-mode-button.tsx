"use client"

import { useRouter } from "next/navigation"
import { Clock01Icon, Moon02Icon, Notification01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu"
import { ROUTES } from "@/features/auth/lib/routes"
import { cn } from "@/lib/utils"
import { useQuietMode } from "../hooks/use-quiet-mode"
import { quietStore } from "../lib/quiet-store"
import { describeUntil, nextMorning } from "../lib/rules"

const HOUR_MS = 60 * 60 * 1000

/** Ancre des réglages des heures calmes, sur la page de profil. */
export const QUIET_SETTINGS_ANCHOR = "heures-calmes"

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit" })

/**
 * « Ne pas déranger » en un geste, depuis l'accueil : la lune s'allume tant
 * que rien ne doit sonner. Pour une heure, jusqu'au matin, ou sans fin ; et
 * le chemin vers les heures calmes de chaque jour.
 */
export function QuietModeButton({ className }: { className?: string }) {
  const router = useRouter()
  const { reason, now, state } = useQuietMode()
  const isManual = reason?.kind === "manual"
  const morning = nextMorning(now)
  const isMorningTomorrow = morning.toDateString() !== now.toDateString()

  return (
    <Menu>
      <MenuTrigger
        aria-label={reason ? `Mode calme, ${describeUntil(reason, now)}` : "Ne pas déranger"}
        title={reason ? `Mode calme ${describeUntil(reason, now)}` : "Ne pas déranger"}
        disabled={!state}
        className={cn(
          "press grid size-10 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 sm:size-8",
          reason ? "bg-voice/12 text-voice" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <HugeiconsIcon icon={Moon02Icon} size={18} strokeWidth={2} fill={reason ? "currentColor" : "none"} />
      </MenuTrigger>
      <MenuContent className={cn("w-72", className)}>
        <div className="flex flex-col gap-1 px-2.5 pt-2 pb-2">
          <p className="flex items-center gap-1.5 font-medium">
            <HugeiconsIcon icon={Moon02Icon} size={15} strokeWidth={2} aria-hidden className="text-voice" />
            {reason ? `Mode calme ${describeUntil(reason, now)}` : "Ne pas déranger"}
          </p>
          <p className="text-xs text-pretty text-muted-foreground">
            {reason?.kind === "schedule"
              ? "Selon vos heures calmes de chaque jour. "
              : ""}
            Rien ne sonne : les vocaux arrivent sans bruit, et le talkie-walkie vous parvient en vocal à écouter plus
            tard.
          </p>
        </div>
        <MenuSeparator />
        {isManual ? (
          <MenuItem onClick={() => void quietStore.setManual(false)}>
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} />
            Désactiver
          </MenuItem>
        ) : (
          <>
            <MenuItem onClick={() => void quietStore.setManual(true, new Date(now.getTime() + HOUR_MS))}>
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
              Pendant 1 heure
            </MenuItem>
            <MenuItem onClick={() => void quietStore.setManual(true, morning)}>
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
              Jusqu&apos;à {isMorningTomorrow ? "demain " : ""}
              {timeFormatter.format(morning)}
            </MenuItem>
            <MenuItem onClick={() => void quietStore.setManual(true, null)}>
              <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
              Jusqu&apos;à ce que je le désactive
            </MenuItem>
          </>
        )}
        <MenuSeparator />
        <MenuItem onClick={() => router.push(`${ROUTES.profile}#${QUIET_SETTINGS_ANCHOR}`)}>
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
          Heures calmes chaque jour…
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

/** « Mode calme jusqu'à 7:00 », sous son nom dans la barre de compte ; sinon `fallback`. */
export function QuietStatus({ fallback }: { fallback: string }) {
  const { reason, now } = useQuietMode()
  if (!reason) return <>{fallback}</>
  return <span className="text-voice">Mode calme {describeUntil(reason, now)}</span>
}
