"use client"

import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  /** Contenu du bouton déclencheur (souvent une icône). */
  trigger: React.ReactNode
  /** Libellé accessible du déclencheur. */
  triggerLabel: string
  triggerClassName?: string
  title: string
  description: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
}

/**
 * Confirmation d'une action destructive, dans une feuille ancrée en bas sur
 * mobile (à portée de pouce), centrée sur grand écran.
 */
export function ConfirmDialog({
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
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

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        {/* Bascule depuis le bas : la feuille arrive du côté où elle est ancrée sur mobile. */}
        <AlertDialog.Popup
          from="bottom"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-5 rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
          )}
        >
          {/* Poignée de feuille, repère visuel sur mobile. */}
          <div aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-muted sm:hidden" />

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
              className={buttonVariants({ variant: "destructive", size: "lg", className: "h-11 sm:h-9" })}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
