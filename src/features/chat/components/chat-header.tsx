"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft01Icon, HourglassIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@animate-ui/react/primitives/avatar-group"
import {
  blur,
  ReducedMotionConfig,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { AvatarGroupCount } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"
import { cn } from "@/lib/utils"
import type { ChatUser, ConnectionStatus } from "../types"
import { UserAvatar } from "./user-avatar"

const MAX_VISIBLE_AVATARS = 3

const CONNECTION_STATUS: Record<
  ConnectionStatus,
  { label: string; dotClassName: string }
> = {
  connecting: { label: "Connexion…", dotClassName: "animate-pulse bg-amber-500" },
  connected: { label: "Connecté", dotClassName: "bg-emerald-500" },
  reconnecting: { label: "Reconnexion…", dotClassName: "animate-pulse bg-amber-500" },
  disconnected: { label: "Hors ligne", dotClassName: "bg-muted-foreground" },
}

function getStatusLabel(status: ConnectionStatus, onlineCount: number) {
  if (status !== "connected") return CONNECTION_STATUS[status].label
  return onlineCount > 1 ? `${onlineCount} personnes en ligne` : "Vous êtes seul·e ici"
}

interface ChatHeaderProps {
  title: string
  onlineUsers: ChatUser[]
  connectionStatus: ConnectionStatus
  /** Actions de la salle (ex. le direct). */
  actions?: React.ReactNode
}

export function ChatHeader({
  title,
  onlineUsers,
  connectionStatus,
  actions,
}: ChatHeaderProps) {
  const visibleUsers = onlineUsers.slice(0, MAX_VISIBLE_AVATARS)
  const hiddenCount = onlineUsers.length - visibleUsers.length
  const statusLabel = getStatusLabel(connectionStatus, onlineUsers.length)
  const swap = useTempoTransition(transition.swap)

  return (
    <header className="flex items-center gap-3 border-b bg-background/80 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-lg sm:px-4 sm:py-3">
      <Link
        href={ROUTES.home}
        aria-label="Retour à l'accueil"
        className={buttonVariants({ variant: "ghost", size: "icon", className: "-mr-1 size-10 shrink-0 sm:size-8" })}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="truncate text-base font-semibold sm:text-sm">{title}</h1>
          {/* Application de l'instant : rappel discret que les messages ne durent qu'une heure. */}
          <span
            title="Les messages disparaissent une heure après leur envoi"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <HugeiconsIcon icon={HourglassIcon} size={11} strokeWidth={2.5} aria-hidden />
            1 h
            <span className="sr-only"> : les messages disparaissent une heure après leur envoi</span>
          </span>
        </div>
        <p
          role="status"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 rounded-full transition-colors",
              CONNECTION_STATUS[connectionStatus].dotClassName
            )}
          />
          {/* Le libellé change sur place : fondu et léger flou, jamais d'échelle (règle B9). */}
          <span className="relative inline-flex min-w-0">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={statusLabel}
                initial={{ opacity: 0, filter: blur.icon }}
                animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
                exit={{ opacity: 0, filter: blur.icon, transition: swap }}
                className="truncate"
              >
                {statusLabel}
              </motion.span>
            </AnimatePresence>
          </span>
        </p>
      </div>

      {connectionStatus === "connected" && visibleUsers.length > 0 && (
        // Survoler (ou toucher) un avatar le fait monter et affiche le nom.
        <ReducedMotionConfig>
          <AvatarGroup
            aria-label="Personnes en ligne"
            translate="-20%"
            sideOffset={14}
            className="-space-x-2"
          >
            {[
              ...visibleUsers.map((user) => (
                <UserAvatar
                  key={user.id}
                  user={user}
                  className="ring-2 ring-background"
                >
                  <AvatarGroupTooltip className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                    {user.name}
                  </AvatarGroupTooltip>
                </UserAvatar>
              )),
              ...(hiddenCount > 0
                ? [
                    <AvatarGroupCount key="more" className="text-xs">
                      +{hiddenCount}
                      <AvatarGroupTooltip className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                        {onlineUsers
                          .slice(MAX_VISIBLE_AVATARS)
                          .map((user) => user.name)
                          .join(", ")}
                      </AvatarGroupTooltip>
                    </AvatarGroupCount>,
                  ]
                : []),
            ]}
          </AvatarGroup>
        </ReducedMotionConfig>
      )}

      {actions}
    </header>
  )
}
