"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AdminActionError, BAN_DURATIONS } from "../lib/api"
import type { AdminUser } from "../types"
import { AdminSheet, FormError } from "./admin-sheet"

const MAX_REASON_LENGTH = 200

interface BanUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onBan: (reason: string, expiresInSeconds: number | null) => Promise<unknown>
}

/** Suspension d'un compte : pour combien de temps, et pourquoi (facultatif). */
export function BanUserDialog({ user, open, onOpenChange, onBan }: BanUserDialogProps) {
  return (
    <AdminSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Suspendre ${user.name}`}
      description="Ses sessions se ferment aussitôt, sur tous ses appareils, et il ne pourra plus se connecter jusqu'à la fin de la suspension."
    >
      <BanForm onBan={onBan} onDone={() => onOpenChange(false)} />
    </AdminSheet>
  )
}

function BanForm({ onBan, onDone }: Pick<BanUserDialogProps, "onBan"> & { onDone: () => void }) {
  const [durationIndex, setDurationIndex] = useState(1)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await onBan(reason.trim(), BAN_DURATIONS[durationIndex].seconds)
      onDone()
    } catch (banError) {
      setError(banError instanceof AdminActionError ? banError.message : "La suspension a échoué.")
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 px-1 text-sm font-medium">Durée</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BAN_DURATIONS.map((duration, index) => (
            <label
              key={duration.label}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                durationIndex === index
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "hover:bg-muted/50"
              )}
            >
              <input
                type="radio"
                name="duration"
                checked={durationIndex === index}
                onChange={() => setDurationIndex(index)}
                className="sr-only"
              />
              {duration.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="flex justify-between px-1 text-sm font-medium">
          Motif
          <span className="font-normal text-muted-foreground">Facultatif</span>
        </span>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={MAX_REASON_LENGTH}
          rows={2}
          placeholder="Ex. Messages abusifs signalés"
        />
      </label>

      <FormError message={error} />

      <Button type="submit" variant="destructive" size="lg" disabled={isSaving} className="h-12 text-base sm:h-11">
        {isSaving && <Spinner />}
        Suspendre le compte
      </Button>
    </form>
  )
}
