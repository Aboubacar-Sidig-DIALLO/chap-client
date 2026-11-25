"use client"

import { useState } from "react"
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  blur,
  ReducedMotionConfig,
  scale,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Sent } from "@/components/animate-ui/icons/hugeicons/sent"
import { Spinner } from "@/components/ui/spinner"
import { CameraControlButton } from "./camera-control-button"
import { ProgressLine } from "./progress-line"

/** État de l'envoi : `null` tant qu'il n'a pas commencé. */
export interface UploadState {
  /** Progression de 0 à 1. */
  progress: number
  error?: string
}

interface SelfieReviewProps {
  photoUrl: string
  upload: UploadState | null
  onRetake: () => void
  onSend: (caption: string) => void
}

/** Aperçu de la photo prise, avec légende facultative avant envoi. */
export function SelfieReview({ photoUrl, upload, onRetake, onSend }: SelfieReviewProps) {
  const [caption, setCaption] = useState("")
  const isSending = upload !== null && !upload.error

  const reveal = useTempoTransition(transition.reveal)
  const swap = useTempoTransition(transition.swap)

  return (
    <ReducedMotionConfig>
      {/* La photo se révèle en sortant d'un léger flou. */}
      <motion.img
        src={photoUrl}
        alt="Aperçu du selfie"
        initial={{ opacity: 0, filter: blur.surface }}
        animate={{ opacity: 1, filter: "blur(0px)", transition: reveal }}
        className="size-full object-contain"
      />
      {/* Flash de l'appareil photo, qui s'efface aussitôt. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, transition: reveal }}
        className="pointer-events-none absolute inset-0 bg-white"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!isSending) onSend(caption)
        }}
        className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-linear-to-t from-black/80 to-transparent px-4 pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {upload?.error && (
          <p role="alert" className="text-center text-sm text-red-300">
            {upload.error} — réessayez.
          </p>
        )}

        {isSending && (
          <ProgressLine
            value={upload.progress}
            label="Envoi du selfie"
            className="rounded-full bg-white/20"
            indicatorClassName="bg-white"
          />
        )}

        <div className="flex items-center gap-2">
          <CameraControlButton
            aria-label="Reprendre la photo"
            onClick={onRetake}
            disabled={isSending}
          >
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={20} />
          </CameraControlButton>

          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            disabled={isSending}
            maxLength={2000}
            aria-label="Légende"
            placeholder="Ajouter une légende…"
            enterKeyHint="send"
            // 16 px sur mobile : en dessous, iOS zoome automatiquement sur le champ.
            className="h-11 min-w-0 flex-1 rounded-full bg-white/15 px-4 text-base text-white backdrop-blur-md transition-[background-color,box-shadow,opacity] outline-none placeholder:text-white/60 focus:bg-white/20 focus:ring-2 focus:ring-white/40 disabled:opacity-60 sm:text-sm"
          />

          {/* L'avion en papier décolle au survol ; il laisse la place au chargement pendant l'envoi. */}
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="submit"
              disabled={isSending}
              aria-label={isSending ? "Envoi en cours…" : "Envoyer le selfie"}
              className="press grid size-11 shrink-0 place-items-center rounded-full bg-white text-black outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-80"
            >
              <span className="relative inline-flex">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={isSending ? "sending" : "send"}
                    className="inline-flex"
                    initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
                    exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
                  >
                    {isSending ? <Spinner size={20} /> : <Sent size={20} />}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          </AnimateIcon>
        </div>
      </form>
    </ReducedMotionConfig>
  )
}
