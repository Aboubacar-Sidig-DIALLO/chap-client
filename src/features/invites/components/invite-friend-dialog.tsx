"use client"

import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { SHEET_BACKDROP_CLASS } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"
import { InvitePanel } from "./invite-panel"

interface InviteFriendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FRIEND_TARGET = { type: "friend" } as const

/**
 * « Inviter un ami » : un QR code à faire scanner, ou un lien à partager,
 * valable une minute. Qui l'ouvre devient votre ami d'un appui (après
 * avoir créé son compte s'il n'en a pas). Feuille ancrée en bas sur mobile,
 * fenêtre centrée sur grand écran.
 */
export function InviteFriendDialog({ open, onOpenChange }: InviteFriendDialogProps) {
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
            <Dialog.Title className="text-lg font-semibold">Inviter un ami</Dialog.Title>
            <Dialog.Description className="text-sm text-balance text-muted-foreground">
              Faites scanner ce code ou partagez le lien : il vous relie en un appui, puis disparaît au bout
              d&apos;une minute.
            </Dialog.Description>
          </div>
          {/* Monté à chaque ouverture : l'invitation en cours, ou une nouvelle. */}
          <InvitePanel target={FRIEND_TARGET} shareText="Ajoute-moi en ami, le lien est valable 1 minute :" />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
