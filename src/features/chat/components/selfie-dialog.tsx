"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { AnimateIcon } from "@animate-ui/react/icons"
import { Camera } from "@/components/animate-ui/icons/hugeicons/camera"
import { Cancel01 } from "@/components/animate-ui/icons/hugeicons/cancel-01"
import { buttonVariants } from "@/components/ui/button"
import { uploadAttachment } from "../lib/attachments"
import { readImageMetadata } from "../lib/image-metadata"
import type { FacingMode } from "../lib/camera"
import type { Attachment } from "../types"
import { cameraControlClass } from "./camera-control-button"
import { SelfieCapture } from "./selfie-capture"
import { SelfieReview, type UploadState } from "./selfie-review"

interface SelfieDialogProps {
  onSend: (content: string, attachments: Attachment[]) => void
  disabled?: boolean
  /** Classes du bouton déclencheur. */
  className?: string
}

/** Bouton « selfie » du compositeur et fenêtre de prise de vue associée. */
export function SelfieDialog({ onSend, disabled, className }: SelfieDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Au survol (ou au toucher), l'appareil photo se déclenche avec un flash. */}
      <AnimateIcon animateOnHover="flash" animateOnTap="flash" asChild>
        <Dialog.Trigger
          disabled={disabled}
          aria-label="Prendre un selfie"
          className={buttonVariants({ variant: "ghost", size: "icon", className })}
        >
          <Camera size={18} />
        </Dialog.Trigger>
      </AnimateIcon>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        {/* Plein écran sur mobile, format portrait centré sur grand écran. */}
        <Dialog.Popup className="fixed inset-0 z-50 overflow-hidden bg-black text-white shadow-2xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:aspect-3/4 sm:h-[min(85dvh,760px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          {/* Monté uniquement à l'ouverture : la caméra s'éteint et tout est réinitialisé à la fermeture. */}
          <SelfieSession onSend={onSend} onDone={() => setOpen(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface Photo {
  file: File
  /** URL locale (`blob:`) de l'aperçu. */
  url: string
}

interface SelfieSessionProps {
  onSend: SelfieDialogProps["onSend"]
  onDone: () => void
}

/** Enchaîne prise de vue → aperçu → envoi. */
function SelfieSession({ onSend, onDone }: SelfieSessionProps) {
  const [facingMode, setFacingMode] = useState<FacingMode>("user")
  /** Incrémenté pour rouvrir la caméra après une erreur. */
  const [attempt, setAttempt] = useState(0)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const uploadRef = useRef<AbortController | null>(null)

  // Libère l'aperçu précédent quand la photo change ou à la fermeture.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url)
    }
  }, [photo])

  // Fermeture pendant l'envoi : on l'annule.
  useEffect(() => () => uploadRef.current?.abort(), [])

  function retake() {
    setPhoto(null)
    setUpload(null)
  }

  async function send(caption: string) {
    if (!photo) return

    const controller = new AbortController()
    uploadRef.current = controller
    setUpload({ progress: 0 })

    try {
      const attachment = await uploadAttachment(photo.file, {
        signal: controller.signal,
        image: await readImageMetadata(photo.file),
        onProgress: (progress) => setUpload({ progress }),
      })
      onSend(caption.trim(), [attachment])
      onDone()
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setUpload({ progress: 0, error: error.message })
      }
    }
  }

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[2.75rem_1fr_2.75rem] items-center bg-linear-to-b from-black/60 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AnimateIcon animateOnHover animateOnTap asChild>
          <Dialog.Close aria-label="Fermer" className={cameraControlClass}>
            <Cancel01 size={20} />
          </Dialog.Close>
        </AnimateIcon>
        <Dialog.Title className="text-center text-sm font-medium">
          {photo ? "Aperçu" : "Selfie"}
        </Dialog.Title>
      </header>

      {photo ? (
        <SelfieReview
          photoUrl={photo.url}
          upload={upload}
          onRetake={retake}
          onSend={send}
        />
      ) : (
        <SelfieCapture
          key={`${facingMode}-${attempt}`}
          facingMode={facingMode}
          onSwitchCamera={() =>
            setFacingMode((mode) => (mode === "user" ? "environment" : "user"))
          }
          onRetry={() => setAttempt((count) => count + 1)}
          onCapture={(file) => setPhoto({ file, url: URL.createObjectURL(file) })}
        />
      )}
    </>
  )
}
