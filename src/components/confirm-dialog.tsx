"use client"

import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Fond assombri derrière une feuille de confirmation. */
export const SHEET_BACKDROP_CLASS = "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"

/** Feuille ancrée en bas sur mobile (à portée de pouce), centrée sur grand écran. */
export const SHEET_POPUP_CLASS = cn(
  "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-5 rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
  "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
)

/** Poignée de feuille, repère visuel sur mobile. */
export function SheetHandle() {
  return <div aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-muted sm:hidden" />
}

/**
 * Deux façons d'ouvrir la feuille, exclusives : son propre bouton déclencheur,
 * ou l'ouverture pilotée par le parent (ex. après validation d'un formulaire).
 */
type ConfirmDialogOpening =
  | {
      /** Contenu du bouton déclencheur (souvent une icône). */
      trigger: React.ReactNode
      /** Libellé accessible du déclencheur, indispensable pour une icône seule. */
      triggerLabel: string
      triggerClassName?: string
      open?: never
      onOpenChange?: never
    }
  | {
      trigger?: never
      triggerLabel?: never
      triggerClassName?: never
      open: boolean
      onOpenChange: (open: boolean) => void
    }

type ConfirmDialogProps = ConfirmDialogOpening & {
  title: string
  description: React.ReactNode
  confirmLabel: string
  /** `destructive` (par défaut) pour ce qui supprime ou retire. */
  tone?: "destructive" | "default"
  onConfirm: () => void
}

/** Confirmation d'une action importante, dans une feuille (voir `SHEET_POPUP_CLASS`). */
export function ConfirmDialog({
  trigger,
  triggerLabel,
  triggerClassName,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}>
      {trigger && (
        <AlertDialog.Trigger
          aria-label={triggerLabel}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-10 text-muted-foreground sm:size-8",
            triggerClassName
          )}
        >
          {trigger}
        </AlertDialog.Trigger>
      )}

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={SHEET_BACKDROP_CLASS} />
        {/* Bascule depuis le bas : la feuille arrive du côté où elle est ancrée sur mobile. */}
        <AlertDialog.Popup from="bottom" className={SHEET_POPUP_CLASS}>
          <SheetHandle />

          <div className="space-y-1.5 text-center sm:text-left">
            <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close
              className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 sm:h-9" })}
            >
              Annuler
            </AlertDialog.Close>
            <AlertDialog.Close
              onClick={onConfirm}
              className={buttonVariants({
                variant: tone === "destructive" ? "destructive" : "default",
                size: "lg",
                className: "h-11 sm:h-9",
              })}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
