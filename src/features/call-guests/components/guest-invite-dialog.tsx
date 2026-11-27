"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import {
  Alert02Icon,
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  Share08Icon,
  Tick02Icon,
  Unlink02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { SHEET_BACKDROP_CLASS } from "@/components/confirm-dialog"
import { Swap } from "@/components/motion/swap"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCall } from "@/features/call/components/call-provider"
import { QrCode } from "@/features/invites/components/qr-code"
import { useShareLink } from "@/features/invites/hooks/use-share-link"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { callGuestsApi, guestCallUrl } from "../lib/api"
import { GUEST_LINK_TTL_MS } from "../lib/config"
import type { CreatedGuestLink } from "../types"

type LinkState =
  | { status: "loading" }
  | { status: "ready"; link: CreatedGuestLink }
  | { status: "revoked" }
  | { status: "error"; message: string }

interface GuestInviteDialogProps {
  groupId: string
  groupName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * « Inviter à l'appel » : un lien (et son QR code) pour une personne
 * extérieure au groupe, même sans compte. Il ne sert qu'une fois, et l'accès
 * qu'il donne prend fin avec l'appel. À monter pour toute la conversation :
 * rouvrir la fenêtre réaffiche le même lien, tant qu'il n'a pas été remplacé.
 */
export function GuestInviteDialog({ groupId, groupName, open, onOpenChange }: GuestInviteDialogProps) {
  const { call } = useCall()
  const isInCall = call.status === "joined"
  const [state, setState] = useState<LinkState>({ status: "loading" })
  const [isBusy, setIsBusy] = useState(false)
  const { canShare, share, copy, copyFeedback } = useShareLink()

  // Appel quitté ou terminé : ses liens ne valent plus rien, on n'en garde pas.
  const [wasInCall, setWasInCall] = useState(isInCall)
  if (wasInCall !== isInCall) {
    setWasInCall(isInCall)
    if (!isInCall) setState({ status: "loading" })
  }

  /** Nouveau lien : pour une autre personne, ou pour remplacer celui retiré. */
  async function createLink() {
    setIsBusy(true)
    try {
      setState({ status: "ready", link: await callGuestsApi.createLink(groupId) })
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  // À la première ouverture pendant l'appel : un lien, gardé tant qu'il sert.
  const createFirst = useEffectEvent(() => callGuestsApi.createLink(groupId))
  const needsLink = open && isInCall && state.status === "loading"
  useEffect(() => {
    if (!needsLink) return
    let isCurrent = true
    createFirst().then(
      (link) => isCurrent && setState({ status: "ready", link }),
      (error: unknown) => isCurrent && setState({ status: "error", message: getErrorMessage(error) })
    )
    return () => {
      isCurrent = false
    }
  }, [needsLink])

  async function revoke(link: CreatedGuestLink) {
    setIsBusy(true)
    try {
      await callGuestsApi.revokeLink(link.token)
      setState({ status: "revoked" })
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) })
    } finally {
      setIsBusy(false)
    }
  }

  const url = state.status === "ready" ? guestCallUrl(state.link.token) : null
  const shareText = `Rejoins l'appel du groupe « ${groupName} » (lien personnel, à usage unique) :`

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={SHEET_BACKDROP_CLASS} />
        <Dialog.Popup
          from="bottom"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
          )}
        >
          <div aria-hidden className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-muted sm:hidden" />
          <div className="space-y-1 text-center">
            <Dialog.Title className="text-lg font-semibold">Inviter à l&apos;appel</Dialog.Title>
            <Dialog.Description className="text-sm text-balance text-muted-foreground">
              Pour une personne extérieure au groupe, même sans compte. Elle ne verra que l&apos;appel, le temps
              qu&apos;il dure.
            </Dialog.Description>
          </div>

          <ul aria-label="Ce lien" className="flex flex-wrap justify-center gap-1.5 text-xs font-medium">
            {["Usage unique", "Sans compte", "Le temps de l'appel"].map((label) => (
              <li key={label} className="rounded-full bg-voice/10 px-2.5 py-1 text-voice">
                {label}
              </li>
            ))}
          </ul>

          {/* Toujours clair, même en thème sombre : c'est ce que les appareils photo lisent le mieux. */}
          <div className="relative mx-auto w-full max-w-52 overflow-hidden rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-black/5">
            <Swap swapKey={state.status === "ready" ? state.link.token : state.status} className="aspect-square">
              {url ? (
                <QrCode value={url} label="QR code de l'invitation à l'appel : à scanner avec l'appareil photo" className="size-full" />
              ) : state.status === "loading" ? (
                <div className="grid size-full place-items-center">
                  <Spinner size={24} className="text-neutral-400" />
                </div>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-neutral-900">
                  <HugeiconsIcon
                    icon={state.status === "revoked" ? Unlink02Icon : Alert02Icon}
                    size={24}
                    strokeWidth={2}
                    aria-hidden
                    className="text-neutral-500"
                  />
                  <p role="status" className="text-sm font-medium text-pretty">
                    {state.status === "revoked"
                      ? "Lien retiré : il ne fonctionne plus."
                      : state.status === "error"
                        ? state.message
                        : null}
                  </p>
                </div>
              )}
            </Swap>
          </div>

          {!isInCall ? (
            <p role="status" className="text-center text-sm text-muted-foreground">
              Rejoignez l&apos;appel pour y inviter quelqu&apos;un.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={!url}
                  onClick={() => url && (canShare ? share(url, shareText) : copy(url))}
                >
                  <HugeiconsIcon
                    icon={canShare ? Share08Icon : copyFeedback === "copied" ? Tick02Icon : Copy01Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  {canShare ? "Partager le lien" : copyFeedback === "copied" ? "Lien copié" : "Copier le lien"}
                </Button>
                {canShare && (
                  <Button
                    variant="outline"
                    size="icon-lg"
                    disabled={!url}
                    onClick={() => url && copy(url)}
                    aria-label={copyFeedback === "copied" ? "Lien copié" : "Copier le lien"}
                  >
                    <HugeiconsIcon icon={copyFeedback === "copied" ? Tick02Icon : Copy01Icon} strokeWidth={2} />
                  </Button>
                )}
              </div>
              <p aria-live="polite" className="min-h-4 text-center text-xs text-destructive">
                {copyFeedback === "failed" && "Copie impossible : faites plutôt scanner le QR code."}
              </p>

              <div className="flex justify-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => void createLink()} disabled={isBusy} className="text-muted-foreground">
                  {isBusy ? <Spinner size={14} /> : <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} data-icon="inline-start" />}
                  {state.status === "ready" ? "Lien pour une autre personne" : "Nouveau lien"}
                </Button>
                {state.status === "ready" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void revoke(state.link)}
                    disabled={isBusy}
                    className="text-muted-foreground"
                  >
                    <HugeiconsIcon icon={Unlink02Icon} strokeWidth={2} data-icon="inline-start" />
                    Retirer
                  </Button>
                )}
              </div>
              <p className="text-center text-xs text-pretty text-muted-foreground">
                Un lien par personne : il cesse de fonctionner dès qu&apos;il a servi, à la fin de l&apos;appel, ou au bout
                de {GUEST_LINK_TTL_MS / 60_000} minutes s&apos;il n&apos;est pas utilisé.
              </p>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
