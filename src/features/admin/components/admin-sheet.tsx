"use client"

import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { SHEET_BACKDROP_CLASS, SheetHandle } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"

interface AdminSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Contenu remonté à chaque ouverture : un formulaire repart de zéro. */
  children: React.ReactNode
}

/**
 * Fenêtre d'une action d'administration : feuille ancrée en bas sur mobile,
 * fenêtre centrée sur grand écran (comme le reste de l'application).
 */
export function AdminSheet({ open, onOpenChange, title, description, children }: AdminSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={SHEET_BACKDROP_CLASS} />
        <Dialog.Popup
          from="bottom"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
          )}
        >
          <SheetHandle />
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
            )}
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Erreur d'un formulaire, annoncée aux lecteurs d'écran. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      {message}
    </p>
  )
}
