"use client"

import { useEffect, useRef, useState } from "react"
import { CameraOff02Icon, CameraRotated01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Timer } from "@/components/animate-ui/icons/hugeicons/timer"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { useCameraStream } from "../hooks/use-camera-stream"
import { captureFrame, type FacingMode } from "../lib/camera"
import { CameraControlButton } from "./camera-control-button"

const TIMER_SECONDS = 3

interface SelfieCaptureProps {
  facingMode: FacingMode
  onSwitchCamera: () => void
  /** Rouvre la caméra après une erreur. */
  onRetry: () => void
  onCapture: (photo: File) => void
}

/** Viseur plein cadre avec déclencheur, minuteur et changement de caméra. */
export function SelfieCapture({
  facingMode,
  onSwitchCamera,
  onRetry,
  onCapture,
}: SelfieCaptureProps) {
  const { videoRef, error, canSwitchCamera } = useCameraStream(facingMode)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTimerEnabled, setIsTimerEnabled] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const pop = useTempoTransition(spring.checkPop)
  const popOut = useTempoTransition(transition.popOut)

  // Aperçu en miroir pour la caméra frontale, comme dans un vrai miroir.
  const isMirrored = facingMode === "user"
  const isCountingDown = countdown !== null

  useEffect(() => () => clearInterval(countdownRef.current), [])

  async function takePhoto() {
    const video = videoRef.current
    if (video) onCapture(await captureFrame(video, { mirror: isMirrored }))
  }

  function startCountdown() {
    let remaining = TIMER_SECONDS
    setCountdown(remaining)

    countdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining > 0) return setCountdown(remaining)

      clearInterval(countdownRef.current)
      setCountdown(null)
      void takePhoto()
    }, 1000)
  }

  function cancelCountdown() {
    clearInterval(countdownRef.current)
    setCountdown(null)
  }

  function handleShutter() {
    if (isCountingDown) cancelCountdown()
    else if (isTimerEnabled) startCountdown()
    else void takePhoto()
  }

  if (error) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-white/10">
          <HugeiconsIcon icon={CameraOff02Icon} size={26} />
        </div>
        <p className="max-w-xs text-sm text-white/80">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="press rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <ReducedMotionConfig>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlaying={() => setIsPlaying(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-500",
          isMirrored && "-scale-x-100",
          isPlaying ? "opacity-100" : "opacity-0"
        )}
      />

      {!isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/70">
          <Spinner size={28} />
          Ouverture de la caméra…
        </div>
      )}

      <Countdown value={countdown} />

      <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 items-center justify-items-center bg-linear-to-t from-black/70 to-transparent px-6 pt-16 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        {/* Le minuteur s'anime quand on l'active. */}
        <CameraControlButton
          aria-pressed={isTimerEnabled}
          aria-label={`Minuteur ${TIMER_SECONDS} secondes`}
          disabled={isCountingDown}
          onClick={() => setIsTimerEnabled((enabled) => !enabled)}
          className="relative"
        >
          <Timer size={20} animate={isTimerEnabled} />
          <AnimatePresence initial={false}>
            {isTimerEnabled && (
              <motion.span
                key="timer-badge"
                initial={{ opacity: 0, scale: scale.icon }}
                animate={{ opacity: 1, scale: 1, transition: pop }}
                exit={{ opacity: 0, scale: scale.icon, transition: popOut }}
                className="absolute -top-1 -right-1 rounded-full bg-white px-1 text-[10px] font-semibold text-black ring-2 ring-black/40"
              >
                {TIMER_SECONDS}s
              </motion.span>
            )}
          </AnimatePresence>
        </CameraControlButton>

        <button
          type="button"
          onClick={handleShutter}
          disabled={!isPlaying}
          aria-label={isCountingDown ? "Annuler le minuteur" : "Prendre la photo"}
          className="group grid size-18 place-items-center rounded-full border-4 border-white transition outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-40"
        >
          {/* Le disque intérieur s'enfonce comme un vrai déclencheur, et devient « stop » pendant le minuteur. */}
          <span
            className={cn(
              "size-14 rounded-full bg-white transition-[width,height,border-radius,background-color,scale] duration-200 motion-safe:group-active:scale-90",
              isCountingDown && "size-7 rounded-md bg-red-500"
            )}
          />
        </button>

        {canSwitchCamera ? (
          <CameraControlButton
            aria-label="Changer de caméra"
            disabled={isCountingDown}
            onClick={onSwitchCamera}
          >
            <HugeiconsIcon icon={CameraRotated01Icon} size={20} />
          </CameraControlButton>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </ReducedMotionConfig>
  )
}

/**
 * Compte à rebours du minuteur. Moment rare (« délice ») : chaque chiffre
 * arrive un peu plus grand et se pose sur un ressort vif, pendant que le
 * précédent s'efface. Sous « réduire les animations », seuls les fondus restent.
 */
function Countdown({ value }: { value: number | null }) {
  const land = useTempoTransition(spring.checkPop)
  const fade = useTempoTransition(transition.fade)

  return (
    <ReducedMotionConfig>
      <span
        aria-live="assertive"
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <AnimatePresence mode="popLayout">
          {value !== null && (
            <motion.span
              key={value}
              initial={{ opacity: 0, scale: 1.4, filter: blur.surface }}
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                transition: { ...land, opacity: fade, filter: fade },
              }}
              exit={{ opacity: 0, scale: 0.8, filter: blur.surface, transition: fade }}
              className="text-9xl font-semibold tabular-nums drop-shadow-lg"
            >
              {value}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </ReducedMotionConfig>
  )
}
