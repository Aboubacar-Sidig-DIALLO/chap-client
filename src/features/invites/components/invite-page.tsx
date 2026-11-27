"use client"

import { useEffect, useEffectEvent, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { HourglassIcon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SessionGate } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { formatDuration } from "@/features/chat/lib/format"
import { GroupAvatar } from "@/features/social/components/group-avatar"
import { useNow } from "@/features/social/hooks/use-now"
import { ApiError, getErrorMessage } from "@/lib/api"
import { PAGE_ENTRANCE } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { acceptanceHref, invitesApi } from "../lib/api"
import { INVITE_ENDING_MS } from "../lib/config"
import type { InvitePreview } from "../types"

/** Lien expiré, désactivé ou mal recopié : le serveur répond de la même façon. */
const EXPIRED_MESSAGE = "Comme les messages, ce lien n'a duré que quelques minutes. Demandez-en un nouveau."

type LoadState =
  | { status: "loading" }
  | { status: "ready"; preview: InvitePreview }
  | { status: "expired"; message: string }
  | { status: "error"; message: string }

/**
 * Page ouverte par un lien ou un QR code d'invitation. Sans session, on passe
 * d'abord par la connexion (ou l'inscription), qui ramène ici.
 */
export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  return (
    <SessionGate>{() => <InviteView key={token} token={token} />}</SessionGate>
  )
}

function InviteView({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const now = useNow(1000)

  function settle(request: Promise<InvitePreview>, isCurrent = () => true) {
    request.then(
      (preview) => isCurrent() && setState({ status: "ready", preview }),
      (error: unknown) =>
        isCurrent() &&
        setState(
          isExpiredError(error)
            ? { status: "expired", message: error.message }
            : { status: "error", message: getErrorMessage(error) }
        )
    )
  }

  /** Recharge après une erreur. */
  function reload() {
    setState({ status: "loading" })
    settle(invitesApi.get(token))
  }

  // Chargée à l'ouverture ; une réponse arrivée après avoir quitté la page est ignorée.
  const loadOnOpen = useEffectEvent((isCurrent: () => boolean) => settle(invitesApi.get(token), isCurrent))
  useEffect(() => {
    let isCurrent = true
    loadOnOpen(() => isCurrent)
    return () => {
      isCurrent = false
    }
  }, [])

  async function accept() {
    setAcceptError(null)
    setIsAccepting(true)
    try {
      // On arrive dans la conversation : l'ami, ou le groupe.
      router.replace(acceptanceHref(await invitesApi.accept(token)))
    } catch (error) {
      if (isExpiredError(error)) setState({ status: "expired", message: error.message })
      else setAcceptError(getErrorMessage(error))
      setIsAccepting(false)
    }
  }

  const remainingMs = state.status === "ready" ? Math.max(0, Date.parse(state.preview.expiresAt) - now) : 0
  // Le temps est écoulé sous nos yeux : l'invitation a disparu, comme côté serveur.
  const shown: LoadState =
    state.status === "ready" && remainingMs === 0 && !isAccepting
      ? { status: "expired", message: EXPIRED_MESSAGE }
      : state

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(70%_50%_at_50%_25%,color-mix(in_oklch,var(--voice)_9%,transparent),transparent_70%)] px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Effect key={shown.status} {...PAGE_ENTRANCE} className="flex w-full max-w-sm flex-col items-center gap-7 text-center">
        {shown.status === "loading" && <Spinner size={24} className="text-muted-foreground" />}
        {shown.status === "expired" && <ExpiredInvite message={shown.message || EXPIRED_MESSAGE} />}
        {shown.status === "error" && (
          <>
            <Message title="Invitation indisponible" description={shown.message} />
            <Button size="lg" onClick={reload} className="w-full">
              Réessayer
            </Button>
          </>
        )}
        {shown.status === "ready" && (
          <InviteDetails
            preview={shown.preview}
            remainingMs={remainingMs}
            isAccepting={isAccepting}
            error={acceptError}
            onAccept={() => void accept()}
          />
        )}
      </Effect>
    </main>
  )
}

/** Le serveur ne connaît plus ce lien (expiré, désactivé, caduc) ou il est mal formé. */
function isExpiredError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 410 || error.status === 400)
}

interface InviteDetailsProps {
  preview: InvitePreview
  remainingMs: number
  isAccepting: boolean
  error: string | null
  onAccept: () => void
}

function InviteDetails({ preview, remainingMs, isAccepting, error, onAccept }: InviteDetailsProps) {
  const { inviter, group, status } = preview
  const conversationHref = group ? ROUTES.group(group.id) : ROUTES.friend(inviter.id)

  const copy = group
    ? {
        title: `Rejoindre « ${group.name} »`,
        description: `${inviter.name} vous invite dans ce groupe de ${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}.`,
        accept: "Rejoindre le groupe",
        done: "Vous faites déjà partie de ce groupe.",
      }
    : {
        title: `${inviter.name} vous invite`,
        description: "Acceptez pour devenir amis et commencer à vous parler.",
        accept: "Devenir amis",
        done: `Vous êtes déjà amis avec ${inviter.name}.`,
      }

  return (
    <>
      <div className="relative">
        {group ? (
          <GroupAvatar group={group} size="xl" />
        ) : (
          <UserAvatar
            user={{ id: inviter.id, name: inviter.name, avatarUrl: inviter.image ?? undefined }}
            className="size-24 text-3xl"
          />
        )}
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-voice text-voice-foreground ring-4 ring-background"
        >
          <HugeiconsIcon icon={group ? UserGroupIcon : UserAdd01Icon} size={18} strokeWidth={2} />
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{copy.title}</h1>
        <p className="text-sm text-balance text-muted-foreground">
          {status === "own"
            ? "C'est votre propre invitation : faites-la scanner par la personne à inviter."
            : status === "done"
              ? copy.done
              : copy.description}
        </p>
      </div>

      {status === "pending" && (
        <div className="flex w-full flex-col items-center gap-3">
          <Button size="lg" onClick={onAccept} disabled={isAccepting} className="h-12 w-full text-base">
            {isAccepting && <Spinner size={16} />}
            {copy.accept}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <ExpiryHint remainingMs={remainingMs} />
        </div>
      )}

      {status === "done" && (
        <Link href={conversationHref} className={buttonVariants({ size: "lg", className: "h-12 w-full text-base" })}>
          Ouvrir la conversation
        </Link>
      )}

      <Link href={ROUTES.home} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
        {status === "pending" ? "Plus tard" : "Retour à l'accueil"}
      </Link>
    </>
  )
}

/** « Expire dans 3:12 » : la dernière minute, en ambre. */
function ExpiryHint({ remainingMs }: { remainingMs: number }) {
  const isEnding = remainingMs <= INVITE_ENDING_MS
  return (
    <p
      role="timer"
      aria-label={`L'invitation expire dans ${formatDuration(remainingMs)}`}
      className={cn(
        "flex items-center gap-1.5 text-sm tabular-nums transition-colors",
        isEnding ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      <HugeiconsIcon icon={HourglassIcon} size={15} strokeWidth={2} aria-hidden />
      Expire dans {formatDuration(remainingMs)}
    </p>
  )
}

function ExpiredInvite({ message }: { message: string }) {
  return (
    <>
      <span aria-hidden className="grid size-20 place-items-center rounded-[1.75rem] bg-muted text-muted-foreground">
        <HugeiconsIcon icon={HourglassIcon} size={34} strokeWidth={1.8} />
      </span>
      <Message title="Invitation expirée" description={message} />
      <Link href={ROUTES.home} className={buttonVariants({ size: "lg", className: "h-12 w-full text-base" })}>
        Retour à l&apos;accueil
      </Link>
    </>
  )
}

function Message({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="text-sm text-balance text-muted-foreground">{description}</p>
    </div>
  )
}
