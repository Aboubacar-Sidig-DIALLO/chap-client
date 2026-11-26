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
import { PresenceAvatar } from "@/features/social/components/presence-avatar"
import { useNow } from "@/features/social/hooks/use-now"
import { formatPresence } from "@/features/social/lib/presence"
import type { Presence } from "@/features/social/types"
import { cn } from "@/lib/utils"
import type { ChatUser, ConnectionStatus } from "../types"
import { UserAvatar } from "./user-avatar"

const MAX_VISIBLE_AVATARS = 3

interface StatusLine {
  label: string
  /** Pastille devant le libellé ; aucune quand l'avatar porte déjà la présence. */
  dotClassName: string | null
  /** L'ami est en ligne : le libellé passe en vert. */
  isOnline?: boolean
}

const CONNECTION_STATUS: Record<Exclude<ConnectionStatus, "connected">, StatusLine> = {
  connecting: { label: "Connexion…", dotClassName: "animate-pulse bg-amber-500" },
  reconnecting: { label: "Reconnexion…", dotClassName: "animate-pulse bg-amber-500" },
  disconnected: { label: "Hors ligne", dotClassName: "bg-muted-foreground" },
}

/** Conversation privée : l'ami et sa présence dans l'application. */
interface DirectHeader {
  type: "direct"
  friend: ChatUser
  /** `null` tant que le serveur ne l'a pas transmise. */
  friendPresence: Presence | null
}

/** Groupe : qui a la conversation ouverte en ce moment. */
interface GroupHeader {
  type: "group"
  onlineUsers: ChatUser[]
}

type ChatHeaderProps = (DirectHeader | GroupHeader) & {
  title: string
  connectionStatus: ConnectionStatus
  /** Actions de la conversation (ex. l'appel). */
  actions?: React.ReactNode
}

/**
 * En-tête de la conversation. Entre amis, comme au téléphone : son avatar,
 * son nom et sa présence (« En ligne », « Hors ligne depuis 5 min »).
 * En groupe : qui est là en ce moment.
 */
export function ChatHeader(props: ChatHeaderProps) {
  const { title, connectionStatus, actions } = props
  const now = useNow()
  const status = getStatusLine(props, now)

  return (
    <header className="flex items-center gap-3 border-b bg-background/80 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-lg sm:px-4 sm:py-3 md:min-h-[4.25rem] md:px-6">
      {/* Sur grand écran, la liste des conversations reste affichée à côté. */}
      <Link
        href={ROUTES.home}
        aria-label="Retour à l'accueil"
        className={buttonVariants({ variant: "ghost", size: "icon", className: "-mr-1 size-10 shrink-0 sm:size-8 md:hidden" })}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
      </Link>

      {props.type === "direct" && <FriendAvatar friend={props.friend} presence={props.friendPresence} />}

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
        <StatusText status={status} />
      </div>

      {props.type === "group" && connectionStatus === "connected" && (
        <OnlineAvatars users={props.onlineUsers} />
      )}

      {actions}
    </header>
  )
}

function getStatusLine(props: ChatHeaderProps, now: number): StatusLine | null {
  if (props.connectionStatus !== "connected") return CONNECTION_STATUS[props.connectionStatus]

  if (props.type === "direct") {
    if (!props.friendPresence) return null
    const { online } = props.friendPresence
    return { label: formatPresence(props.friendPresence, now), dotClassName: null, isOnline: online }
  }

  const count = props.onlineUsers.length
  return {
    label: count > 1 ? `${count} personnes en ligne` : "Vous êtes seul·e ici",
    dotClassName: "bg-emerald-500",
  }
}

function FriendAvatar({ friend, presence }: { friend: ChatUser; presence: Presence | null }) {
  const user = { id: friend.id, name: friend.name, image: friend.avatarUrl ?? null }
  // La pastille n'apparaît qu'une fois la présence connue : pas de faux « hors ligne ».
  return presence ? <PresenceAvatar user={user} presence={presence} size="default" /> : <UserAvatar user={friend} />
}

function StatusText({ status }: { status: StatusLine | null }) {
  const swap = useTempoTransition(transition.swap)
  return (
    <p
      role="status"
      className={cn(
        "flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground",
        status?.isOnline && "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {status?.dotClassName && (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full transition-colors", status.dotClassName)} />
      )}
      {/* Le libellé change sur place : fondu et léger flou, jamais d'échelle (règle B9). */}
      <span className="relative inline-flex min-w-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {status && (
            <motion.span
              key={status.label}
              initial={{ opacity: 0, filter: blur.icon }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
              exit={{ opacity: 0, filter: blur.icon, transition: swap }}
              className="truncate"
            >
              {status.label}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </p>
  )
}

/** Groupe : les avatars de ceux qui sont là ; survoler (ou toucher) un avatar affiche son nom. */
function OnlineAvatars({ users }: { users: ChatUser[] }) {
  const visibleUsers = users.slice(0, MAX_VISIBLE_AVATARS)
  const hiddenUsers = users.slice(MAX_VISIBLE_AVATARS)
  if (visibleUsers.length === 0) return null

  return (
    <ReducedMotionConfig>
      <AvatarGroup
        aria-label="Personnes en ligne"
        translate="-20%"
        sideOffset={14}
        className="-space-x-2"
      >
        {[
          ...visibleUsers.map((user) => (
            <UserAvatar key={user.id} user={user} className="ring-2 ring-background">
              <AvatarGroupTooltip className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                {user.name}
              </AvatarGroupTooltip>
            </UserAvatar>
          )),
          ...(hiddenUsers.length > 0
            ? [
                <AvatarGroupCount key="more" className="text-xs">
                  +{hiddenUsers.length}
                  <AvatarGroupTooltip className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
                    {hiddenUsers.map((user) => user.name).join(", ")}
                  </AvatarGroupTooltip>
                </AvatarGroupCount>,
              ]
            : []),
        ]}
      </AvatarGroup>
    </ReducedMotionConfig>
  )
}
