"use client"

import { useEffect, useEffectEvent } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import type { AnnouncedNotice, HomeNotice } from "../hooks/use-social"
import { conversationHref } from "../lib/conversation"
import type { PublicUser } from "../types"

/** Assez long pour lire et agir, assez court pour ne pas encombrer. */
const VISIBLE_MS = 6000

/** Personne à l'origine de l'annonce. */
function authorOf(notice: HomeNotice): PublicUser {
  return notice.type === "message" ? notice.from : notice.user
}

function NoticeText({ notice }: { notice: HomeNotice }) {
  const name = <strong className="font-semibold">{authorOf(notice).name}</strong>
  switch (notice.type) {
    case "message":
      return notice.conversation.type === "direct" ? (
        <>{name} vous a écrit</>
      ) : (
        <>
          {name} a écrit dans « {notice.conversation.groupName} »
        </>
      )
    case "friend-request":
      return <>{name} vous a envoyé une demande d&apos;ami</>
    case "friend-accepted":
      return <>{name} a accepté votre demande : vous êtes amis !</>
    case "group-added":
      return (
        <>
          {name} vous a ajouté au groupe « {notice.groupName} »
        </>
      )
    case "invite-accepted":
      return notice.group ? (
        <>
          {name} a rejoint « {notice.group.name} » grâce à votre invitation
        </>
      ) : (
        <>{name} a accepté votre invitation : vous êtes amis !</>
      )
  }
}

/** La conversation à ouvrir depuis l'annonce, s'il y en a une. */
function noticeHref(notice: HomeNotice) {
  switch (notice.type) {
    case "message":
      return conversationHref(notice.conversation)
    case "invite-accepted":
      return notice.group ? ROUTES.group(notice.group.id) : ROUTES.friend(notice.user.id)
    default:
      return null
  }
}

interface SocialToastProps {
  announced: AnnouncedNotice | null
  onDismiss: () => void
  /** Accepter directement une demande reçue, depuis l'annonce. */
  onAccept: (userId: string) => Promise<unknown>
}

/**
 * Annonce en haut d'écran d'un événement social (demande reçue, acceptée,
 * ajout à un groupe). Lue par les lecteurs d'écran ; disparaît d'elle-même.
 */
export function SocialToast({ announced, onDismiss, onAccept }: SocialToastProps) {
  const reduceMotion = useReducedMotion()
  const dismiss = useEffectEvent(onDismiss)

  useEffect(() => {
    if (!announced) return
    const timeout = setTimeout(() => dismiss(), VISIBLE_MS)
    return () => clearTimeout(timeout)
  }, [announced])

  const offset = reduceMotion ? 0 : -16
  const href = announced ? noticeHref(announced.notice) : null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-4 md:top-4 md:justify-end md:px-6"
    >
      <AnimatePresence>
        {announced && (
          <motion.div
            key={announced.id}
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset / 2 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-3xl border bg-background/95 p-2.5 pl-3 shadow-xl backdrop-blur-lg"
          >
            <UserAvatar
              user={{
                id: authorOf(announced.notice).id,
                name: authorOf(announced.notice).name,
                avatarUrl: authorOf(announced.notice).image ?? undefined,
              }}
            />
            <p className="min-w-0 flex-1 text-sm">
              <NoticeText notice={announced.notice} />
            </p>
            {href && (
              <Link
                href={href}
                onClick={onDismiss}
                className={buttonVariants({ size: "sm", className: "h-8 shrink-0" })}
              >
                Ouvrir
              </Link>
            )}
            {announced.notice.type === "friend-request" && (
              <Button
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  void onAccept(authorOf(announced.notice).id)
                  onDismiss()
                }}
              >
                Accepter
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              aria-label="Fermer"
              className="size-8 shrink-0 text-muted-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
