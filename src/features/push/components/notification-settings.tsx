"use client"

import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { APP_NAME } from "@/lib/config"
import type { PushStatus } from "../lib/push-store"
import { usePushNotifications } from "../hooks/use-push-notifications"

/** Ce que l'utilisateur doit savoir, pour chaque état. */
const DESCRIPTIONS: Record<PushStatus, string> = {
  loading: "Vérification…",
  on: "Messages, appels et demandes d'amis vous parviennent même application fermée. Leur contenu n'est jamais affiché.",
  off: `Activez-les pour être prévenu même quand ${APP_NAME} est fermé.`,
  denied:
    "Bloquées par votre navigateur. Autorisez les notifications pour ce site dans ses réglages, puis rechargez la page.",
  "install-required": `Sur iPhone et iPad, ajoutez d'abord ${APP_NAME} à l'écran d'accueil (Partager › « Sur l'écran d'accueil »), puis ouvrez-le depuis son icône.`,
  unsupported: "Ce navigateur ne permet pas les notifications push.",
  unavailable: "Les notifications ne sont pas disponibles pour le moment.",
}

/** Réglage « Notifications sur cet appareil », sur la page de profil. */
export function NotificationSettings() {
  const push = usePushNotifications()
  const labelId = useId()
  const descriptionId = useId()
  const canToggle = push.status === "on" || push.status === "off"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-4 rounded-3xl border bg-card p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p id={labelId} className="text-sm font-medium">
            Notifications sur cet appareil
          </p>
          <p id={descriptionId} className="text-sm text-pretty text-muted-foreground">
            {DESCRIPTIONS[push.status]}
          </p>
        </div>
        <div className="flex h-6 items-center gap-2">
          {push.isBusy && <Spinner size={14} className="text-muted-foreground" />}
          <Switch
            checked={push.status === "on"}
            disabled={!canToggle || push.isBusy}
            onCheckedChange={(checked) => void (checked ? push.enable() : push.disable())}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
          />
        </div>
      </div>
      {push.error && (
        <p role="alert" className="px-1 text-sm text-destructive">
          {push.error}
        </p>
      )}
    </div>
  )
}
