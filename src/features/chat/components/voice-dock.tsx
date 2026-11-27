"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import {
  ArrowLeft01Icon,
  ArrowUp01Icon,
  KeyboardIcon,
  SquareLock02Icon,
  SquareUnlock02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { ArrowUp02 } from "@/components/animate-ui/icons/hugeicons/arrow-up-02"
import { Delete02 } from "@/components/animate-ui/icons/hugeicons/delete-02"
import { Mic } from "@/components/animate-ui/icons/hugeicons/mic"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { useStreamLevel } from "../hooks/use-audio-level"
import { usePushToTalk } from "../hooks/use-push-to-talk"
import { useVoiceRecorder } from "../hooks/use-voice-recorder"
import { uploadAttachment } from "../lib/attachments"
import { MAX_VOICE_DURATION_MS, MIN_VOICE_DURATION_MS } from "../lib/config"
import { formatDuration } from "../lib/format"
import type { VoiceRecording } from "../lib/voice-recording"
import type { Attachment } from "../types"
import { VoiceHalo, type VoiceHaloTone } from "./voice-halo"
import { useVoicePlayback } from "./voice-playback"

/** Diamètre du bouton micro (px) : l'action principale de l'application. */
const MIC_SIZE = 68

/** Ce que fait le bouton micro, et donc l'icône qu'il montre. */
type MicIcon = "mic" | "cancel" | "send" | "sending"

type Problem =
  | { kind: "restart"; message: string }
  | { kind: "resend"; message: string; recording: VoiceRecording }

interface VoiceDockProps {
  onSend: (content: string, attachments: Attachment[]) => void
  /** Prévient les autres participants qu'un vocal s'enregistre. */
  onRecordingChange?: (isRecording: boolean) => void
  /** Passe au clavier (message écrit) ; absent si l'écrit est interdit. */
  onOpenKeyboard?: () => void
  /** Boutons secondaires à gauche au repos (pièce jointe, selfie). */
  leading: React.ReactNode
  disabled?: boolean
}

/**
 * Le dock vocal, cœur de l'application : un orbe flottant qui est à la fois
 * le bouton « maintenir pour parler » et la voix de la conversation. Il écoute
 * le micro pendant un enregistrement et s'anime avec le vocal en cours de lecture.
 */
export function VoiceDock({
  onSend,
  onRecordingChange,
  onOpenKeyboard,
  leading,
  disabled,
}: VoiceDockProps) {
  const playback = useVoicePlayback()
  const [mode, setMode] = useState<"hold" | "locked">("locked")
  const [isCancelArmed, setIsCancelArmed] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const uploadRef = useRef<AbortController | null>(null)

  const recorder = useVoiceRecorder({
    maxDurationMs: MAX_VOICE_DURATION_MS,
    // Durée maximale atteinte : le vocal part tout seul.
    onMaxDuration: () => void finish(),
  })
  const microphoneLevel = useStreamLevel(recorder.stream)

  const isActive = recorder.status !== "idle"
  const isRecording = recorder.status === "recording"
  const isHolding = isActive && mode === "hold"

  // Fermeture pendant l'envoi : on l'annule.
  useEffect(() => () => uploadRef.current?.abort(), [])

  // « Alice enregistre un vocal… » chez les autres, le temps de l'enregistrement.
  const wasRecordingRef = useRef(false)
  const reportRecording = useEffectEvent((value: boolean) => onRecordingChange?.(value))
  useEffect(() => {
    if (isRecording !== wasRecordingRef.current) reportRecording(isRecording)
    wasRecordingRef.current = isRecording
  }, [isRecording])
  useEffect(() => () => {
    if (wasRecordingRef.current) reportRecording(false)
  }, [])

  async function send(recording: VoiceRecording) {
    const controller = new AbortController()
    uploadRef.current = controller
    setProblem(null)
    setIsSending(true)

    try {
      const attachment = await uploadAttachment(recording.file, {
        signal: controller.signal,
        voice: { durationMs: recording.durationMs, waveform: recording.waveform },
      })
      onSend("", [attachment])
    } catch (uploadError) {
      if (uploadError instanceof Error && uploadError.name !== "AbortError") {
        setProblem({ kind: "resend", message: uploadError.message, recording })
      }
    } finally {
      if (uploadRef.current === controller) setIsSending(false)
    }
  }

  async function finish() {
    setMode("locked")
    setIsCancelArmed(false)
    const recording = await recorder.stop()
    if (!recording) return

    if (recording.durationMs < MIN_VOICE_DURATION_MS) {
      setProblem({ kind: "restart", message: "Message vocal trop court — maintenez un peu plus longtemps" })
      return
    }
    await send(recording)
  }

  function cancel() {
    recorder.cancel()
    setIsCancelArmed(false)
    setMode("locked")
  }

  const pushToTalk = usePushToTalk({
    onStart: () => {
      setMode("hold")
      setProblem(null)
      void recorder.start()
    },
    onLock: () => setMode("locked"),
    onRelease: () => void finish(),
    onCancel: cancel,
    onCancelArmedChange: setIsCancelArmed,
  })

  // Échap annule l'enregistrement en cours.
  const onEscape = useEffectEvent(() => {
    if (isActive) cancel()
  })
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Les ondes du bouton suivent la voix du moment : la vôtre, ou celle du vocal lu.
  const isSpeaking = playback.nowPlaying?.isPlaying ?? false
  const tone: VoiceHaloTone = isCancelArmed
    ? "muted"
    : isActive || isSending
      ? "recording"
      : "voice"
  const getLevel = isActive ? microphoneLevel : isSpeaking ? playback.getLevel : undefined
  const icon: MicIcon = isSending
    ? "sending"
    : isCancelArmed
      ? "cancel"
      : isActive && !isHolding
        ? "send"
        : "mic"

  const caption = isSending
    ? "Envoi…"
    : recorder.status === "starting"
      ? "Ouverture du micro…"
      : isHolding
        ? isCancelArmed
          ? "Relâchez pour annuler"
          : "Relâchez pour envoyer"
        : isActive
          ? "Verrouillé · touchez pour envoyer"
          : "Maintenir pour parler"

  const view = isSending ? "sending" : isHolding ? "hold" : isActive ? "locked" : "idle"
  const visibleProblem = recorder.error
    ? ({ kind: "restart", message: recorder.error } as const)
    : problem

  return (
    <ReducedMotionConfig>
      <div className="relative z-10">
        <AnimatePresence initial={false}>
          {visibleProblem && (
            <DockProblem
              message={visibleProblem.message}
              onClose={() => {
                setProblem(null)
                recorder.clearError()
              }}
              onRetry={() => {
                if (visibleProblem.kind === "resend") void send(visibleProblem.recording)
                else {
                  setProblem(null)
                  recorder.clearError()
                }
              }}
              retryLabel={visibleProblem.kind === "resend" ? "Renvoyer" : "Compris"}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <DockSide side="left" view={view}>
            {view === "idle" && <div className="flex items-center gap-0.5">{leading}</div>}
            {view === "hold" && <RecordingTimer elapsedMs={recorder.elapsedMs} />}
            {(view === "locked" || view === "sending") && (
              <div className="flex items-center gap-1">
                <AnimateIcon animateOnHover animateOnTap asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Annuler le message vocal"
                    disabled={isSending}
                    onClick={cancel}
                    className="size-10 text-muted-foreground hover:text-destructive"
                  >
                    <Delete02 size={18} />
                  </Button>
                </AnimateIcon>
                {view === "locked" && <RecordingTimer elapsedMs={recorder.elapsedMs} />}
              </div>
            )}
          </DockSide>

          <MicButton
            tone={tone}
            icon={icon}
            getLevel={getLevel}
            isBreathing={view === "idle" && !isSpeaking}
            isHolding={isHolding}
            lockProgress={pushToTalk.lockProgress}
            isCancelArmed={isCancelArmed}
            caption={caption}
            disabled={disabled || isSending}
            // Au repos : le geste « maintenir pour parler ». En mains libres : toucher envoie.
            buttonProps={
              isActive
                ? { onClick: () => void finish(), "aria-label": "Envoyer le message vocal" }
                : {
                    ...pushToTalk.buttonProps,
                    "aria-label": "Maintenir pour parler (appui simple : mains libres)",
                  }
            }
          />

          <DockSide side="right" view={view}>
            {view === "idle" && onOpenKeyboard && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Écrire un message"
                onClick={onOpenKeyboard}
                className="size-10 text-muted-foreground"
              >
                <HugeiconsIcon icon={KeyboardIcon} size={18} strokeWidth={2} />
              </Button>
            )}
            {view === "hold" && <CancelHint isArmed={isCancelArmed} />}
            {(view === "locked" || view === "sending") && (
              <Button
                type="button"
                size="icon"
                aria-label={isSending ? "Envoi du message vocal…" : "Envoyer le message vocal"}
                disabled={!isRecording}
                onClick={() => void finish()}
                className="size-10"
              >
                {isSending ? <Spinner size={18} /> : <ArrowUp02 size={18} />}
              </Button>
            )}
          </DockSide>
        </div>
      </div>
    </ReducedMotionConfig>
  )
}

interface MicButtonProps {
  tone: VoiceHaloTone
  icon: MicIcon
  getLevel?: () => number
  isBreathing: boolean
  isHolding: boolean
  /** Avancée du glissement vers le haut (0 à 1), qui verrouille l'enregistrement. */
  lockProgress: MotionValue<number>
  isCancelArmed: boolean
  caption: string
  disabled?: boolean
  buttonProps: React.ComponentProps<"button">
}

/**
 * Le bouton micro, flottant au-dessus de la barre : un disque « voix » et ses
 * ondes, une icône qui dit ce que fait l'appui, et la consigne du geste dessous.
 */
function MicButton({
  tone,
  icon,
  getLevel,
  isBreathing,
  isHolding,
  lockProgress,
  isCancelArmed,
  caption,
  disabled,
  buttonProps,
}: MicButtonProps) {
  const pop = useTempoTransition(spring.pop)
  const swap = useTempoTransition(transition.swap)

  return (
    <div className="relative -mt-9 flex flex-col items-center gap-2">
      {/* Pendant l'appui : glisser vers le haut verrouille, on peut alors lâcher. */}
      <AnimatePresence>
        {isHolding && <LockRail key="lock-rail" progress={lockProgress} />}
      </AnimatePresence>

      {/* Sous le doigt, le bouton grossit ; prêt à annuler, il se fait plus petit. */}
      <motion.div
        animate={{ scale: isCancelArmed ? 0.9 : isHolding ? 1.14 : 1 }}
        transition={pop}
      >
        <AnimateIcon animateOnHover="wiggle" asChild>
          <button
            type="button"
            disabled={disabled}
            {...buttonProps}
            className="block touch-none rounded-full outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
          >
            <VoiceHalo size={MIC_SIZE} tone={tone} getLevel={getLevel} isBreathing={isBreathing}>
              <span className="relative inline-flex">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={icon}
                    className="inline-flex"
                    initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
                    exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
                  >
                    {icon === "mic" && <Mic size={30} />}
                    {icon === "cancel" && <Delete02 size={26} />}
                    {icon === "send" && <ArrowUp02 size={28} />}
                    {icon === "sending" && <Spinner size={26} />}
                  </motion.span>
                </AnimatePresence>
              </span>
            </VoiceHalo>
          </button>
        </AnimateIcon>
      </motion.div>

      <span className="relative grid h-4 place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={caption}
            role="status"
            initial={{ opacity: 0, filter: blur.icon }}
            animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
            exit={{ opacity: 0, filter: blur.icon, transition: swap }}
            className={cn(
              "text-[11px] font-medium whitespace-nowrap",
              isCancelArmed ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {caption}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  )
}

/**
 * Rail de verrouillage au-dessus du bouton : il se remplit en suivant le doigt
 * (sans rendu React), et son cadenas se ferme en fin de course.
 */
function LockRail({ progress }: { progress: MotionValue<number> }) {
  const pop = useTempoTransition(spring.pop)
  const fade = useTempoTransition(transition.fade)
  const closedOpacity = useTransform(progress, [0.7, 1], [0, 1])

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 8, scale: scale.action }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: pop }}
      exit={{ opacity: 0, y: 8, transition: fade }}
      className="pointer-events-none absolute bottom-full left-1/2 mb-6 -translate-x-1/2"
    >
      <div className="relative flex h-24 w-11 flex-col items-center justify-between overflow-hidden rounded-full border bg-background/95 py-3 shadow-lg backdrop-blur">
        <motion.span
          className="absolute inset-0 origin-bottom bg-voice/20"
          style={{ scaleY: progress }}
        />
        <span className="relative grid text-muted-foreground">
          <HugeiconsIcon icon={SquareUnlock02Icon} size={18} strokeWidth={2} />
          <motion.span className="absolute inset-0 text-voice" style={{ opacity: closedOpacity }}>
            <HugeiconsIcon icon={SquareLock02Icon} size={18} strokeWidth={2} />
          </motion.span>
        </span>
        <HugeiconsIcon
          icon={ArrowUp01Icon}
          size={16}
          strokeWidth={2}
          className="relative text-muted-foreground motion-safe:animate-nudge-up"
        />
      </div>
    </motion.div>
  )
}

/** Un côté du dock : son contenu change sur place avec l'état (fondu et léger flou). */
function DockSide({
  side,
  view,
  children,
}: {
  side: "left" | "right"
  view: string
  children: React.ReactNode
}) {
  const swap = useTempoTransition(transition.swap)

  return (
    <div
      className={cn(
        "flex min-h-10 min-w-0 items-center pb-6",
        side === "left" ? "justify-self-start" : "justify-self-end"
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, filter: blur.icon }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
          exit={{ opacity: 0, filter: blur.icon, transition: swap }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function RecordingTimer({ elapsedMs }: { elapsedMs: number }) {
  return (
    <span className="flex items-center gap-2 px-1">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
      />
      <time className="text-sm font-medium tabular-nums">{formatDuration(elapsedMs)}</time>
    </span>
  )
}

function CancelHint({ isArmed }: { isArmed: boolean }) {
  return (
    <p
      aria-hidden
      className={cn(
        "flex items-center gap-0.5 px-1 text-xs font-medium whitespace-nowrap transition-colors",
        isArmed ? "text-destructive" : "text-muted-foreground"
      )}
    >
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        size={14}
        strokeWidth={2}
        className={cn(!isArmed && "motion-safe:animate-nudge-left")}
      />
      Annuler
    </p>
  )
}

interface DockProblemProps {
  message: string
  retryLabel: string
  onClose: () => void
  onRetry: () => void
}

/** Un souci (micro refusé, vocal trop court, envoi raté) au-dessus du dock, avec la solution. */
function DockProblem({ message, retryLabel, onClose, onRetry }: DockProblemProps) {
  const unfold = useTempoTransition(transition.disclosure)

  return (
    <motion.div
      key="problem"
      initial={{ height: 0, opacity: 0, filter: blur.disclosure }}
      animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
      exit={{ height: 0, opacity: 0, filter: blur.disclosure }}
      transition={unfold}
      className="overflow-hidden"
    >
      <div
        role="alert"
        className="mb-16 flex items-center gap-2 rounded-2xl bg-destructive/10 py-1.5 pr-1.5 pl-3"
      >
        <p className="min-w-0 flex-1 text-sm text-destructive">{message}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Fermer
        </Button>
        <Button type="button" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </motion.div>
  )
}
