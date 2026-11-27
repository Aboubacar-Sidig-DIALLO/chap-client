"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Notification03Icon, Share08Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { blur, ReducedMotionConfig, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { APP_NAME } from "@/lib/config"
import { usePushNotifications } from "../hooks/use-push-notifications"

/** « Plus tard » : l'invitation revient après ce délai. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const SNOOZE_STORAGE_KEY = "chapchap:push-invite-snoozed-at"

function readSnoozedAt() {
  try {
    return Number(localStorage.getItem(SNOOZE_STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}

function storeSnoozedAt(time: number) {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, String(time))
  } catch {
    // Stockage indisponible : l'invitation reviendra au prochain chargement.
  }
}

/**
 * Invitation discrète, sur l'accueil, à recevoir les messages et les appels
 * même application fermée. Jamais de demande d'autorisation au chargement :
 * le navigateur ne la pose qu'au clic sur « Activer ». Sur iPhone, elle
 * explique d'abord comment installer l'application.
 */
export function PushInvite() {
  const push = usePushNotifications()
  const [snoozedAt, setSnoozedAt] = useState(readSnoozedAt)
  // Lu une fois : l'invitation ne réapparaît pas en pleine session.
  const [now] = useState(Date.now)
  const unfold = useTempoTransition(transition.disclosure)

  const isSnoozed = now - snoozedAt < SNOOZE_MS
  const isVisible = !isSnoozed && (push.status === "off" || push.status === "install-required")

  function snooze() {
    const time = Date.now()
    storeSnoozedAt(time)
    setSnoozedAt(time)
  }

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.div
            key="push-invite"
            initial={{ height: 0, opacity: 0, filter: blur.disclosure }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: blur.disclosure }}
            transition={unfold}
            className="overflow-hidden"
          >
            {push.status === "install-required" ? (
              <InviteCard
                icon={Share08Icon}
                title={`Installez ${APP_NAME}`}
                description={`Pour recevoir messages et appels sur iPhone, touchez Partager puis « Sur l'écran d'accueil », et ouvrez ${APP_NAME} depuis son icône.`}
              >
                <Button size="sm" variant="ghost" onClick={snooze}>
                  Compris
                </Button>
              </InviteCard>
            ) : (
              <InviteCard
                icon={Notification03Icon}
                title="Ne manquez plus rien"
                description={`Recevez les messages et les appels même quand ${APP_NAME} est fermé.`}
                error={push.error}
              >
                <Button size="sm" variant="ghost" onClick={snooze} disabled={push.isBusy}>
                  Plus tard
                </Button>
                <Button size="sm" onClick={() => void push.enable()} disabled={push.isBusy}>
                  {push.isBusy && <Spinner size={14} />}
                  Activer
                </Button>
              </InviteCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}

interface InviteCardProps {
  icon: IconSvgElement
  title: string
  description: string
  error?: string | null
  children: React.ReactNode
}

function InviteCard({ icon, title, description, error, children }: InviteCardProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-3xl border bg-card p-4 md:rounded-2xl md:p-3.5"
    >
      <div className="flex gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-voice/12 text-voice md:size-9"
        >
          <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-pretty text-muted-foreground md:text-xs md:leading-relaxed">{description}</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">{children}</div>
    </section>
  )
}
