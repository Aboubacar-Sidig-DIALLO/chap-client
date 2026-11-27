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
import { useTalkie } from "@/features/talkie/components/talkie-provider"
import { formatHearers, formatPresent, formatQuiet } from "@/features/talkie/lib/labels"
import type { OutgoingTalk } from "@/features/talkie/types"
import { useStreamLevel } from "../hooks/use-audio-level"
import { usePushToTalk } from "../hooks/use-push-to-talk"
import { useVoiceRecorder } from "../hooks/use-voice-recorder"
import { COMPOSER_LAYOUT_IDS } from "../lib/composer-layout"
import { uploadAttachment } from "../lib/attachments"
import { MAX_VOICE_DURATION_MS, MIN_VOICE_DURATION_MS } from "../lib/config"
import { formatDuration } from "../lib/format"
import { createId } from "../lib/id"
import type { VoiceRecording } from "../lib/voice-recording"
import type { Attachment, SendOptions } from "../types"
import { ViewOnceIcon } from "./view-once-icon"
import { VoiceHalo, type VoiceHaloTone } from "./voice-halo"
import { useVoicePlayback } from "./voice-playback"

/** Diamètre du bouton micro (px) : l'action principale de l'application. */
const MIC_SIZE = 68

/** Ce que fait le bouton micro, et donc l'icône qu'il montre. */
type MicIcon = "mic" | "cancel" | "send" | "sending"

type Problem =
  | { kind: "restart"; message: string }
  | { kind: "resend"; message: string; recording: VoiceRecording; id: string }

interface VoiceDockProps {
  /** `id` : celui du direct (talkie-walkie) que ce vocal prolonge. */
  onSend: (content: string, attachments: Attachment[], options?: SendOptions) => void
  /** Prévient les autres participants qu'un vocal s'enregistre. */
  onRecordingChange?: (isRecording: boolean) => void
  /** Passe au clavier (message écrit) ; absent si l'écrit est interdit. */
  onOpenKeyboard?: () => void
  /** Boutons secondaires à gauche au repos (pièce jointe, selfie, vue unique). */
  leading: React.ReactNode
  /**
   * Le prochain vocal sera à écoute unique : il ne part pas en direct (on
   * l'entendrait sans l'ouvrir) et l'orbe porte le symbole de la vue unique.
   */
  isViewOnce?: boolean
  disabled?: boolean
}

/**
 * Le dock vocal, cœur de l'application : un orbe flottant qui est à la fois
 * le bouton « maintenir pour parler » et la voix de la conversation. Il écoute
 * le micro pendant un enregistrement et s'anime avec le vocal en cours de lecture.
 *
 * Talkie-walkie : si quelqu'un d'autre a la conversation ouverte, il entend
 * votre voix en direct pendant que vous parlez ; le vocal part ensuite pour
 * tous (déjà « écouté » par ceux qui l'ont entendu en direct).
 */
export function VoiceDock({
  onSend,
  onRecordingChange,
  onOpenKeyboard,
  leading,
  isViewOnce = false,
  disabled,
}: VoiceDockProps) {
  const playback = useVoicePlayback()
  const talkie = useTalkie()
  const { session: talkieSession } = talkie
  /** Id du vocal en cours d'enregistrement, partagé avec son direct. */
  const talkIdRef = useRef<string | null>(null)
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

  // Micro ouvert : la voix part aussi en direct, si la parole a été demandée.
  useEffect(() => {
    if (recorder.stream) return talkieSession.capture(recorder.stream)
  }, [recorder.stream, talkieSession])

  // Micro refusé ou introuvable : il n'y aura ni direct, ni vocal.
  useEffect(() => {
    if (recorder.error) talkieSession.end({ cancelled: true })
  }, [recorder.error, talkieSession])

  // Fermé en pleine prise de parole : on rend la parole.
  useEffect(() => () => talkieSession.end({ cancelled: true }), [talkieSession])

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

  async function send(recording: VoiceRecording, id: string) {
    const controller = new AbortController()
    uploadRef.current = controller
    setProblem(null)
    setIsSending(true)

    try {
      const attachment = await uploadAttachment(recording.file, {
        signal: controller.signal,
        voice: { durationMs: recording.durationMs, waveform: recording.waveform },
      })
      onSend("", [attachment], { id })
    } catch (uploadError) {
      if (uploadError instanceof Error && uploadError.name !== "AbortError") {
        setProblem({ kind: "resend", message: uploadError.message, recording, id })
      }
    } finally {
      if (uploadRef.current === controller) setIsSending(false)
    }
  }

  /** L'id du vocal en cours, oublié une fois utilisé (le suivant en aura un nouveau). */
  function takeTalkId() {
    const id = talkIdRef.current ?? createId()
    talkIdRef.current = null
    return id
  }

  async function finish() {
    setMode("locked")
    setIsCancelArmed(false)
    const id = takeTalkId()
    const recording = await recorder.stop()
    const isTooShort = !recording || recording.durationMs < MIN_VOICE_DURATION_MS
    // Pas de vocal à suivre : le direct est annoncé comme annulé.
    talkieSession.end({ cancelled: isTooShort })
    if (!recording) return

    if (isTooShort) {
      setProblem({ kind: "restart", message: "Message vocal trop court — maintenez un peu plus longtemps" })
      return
    }
    await send(recording, id)
  }

  function cancel() {
    talkieSession.end({ cancelled: true })
    takeTalkId()
    recorder.cancel()
    setIsCancelArmed(false)
    setMode("locked")
  }

  const pushToTalk = usePushToTalk({
    onStart: () => {
      setMode("hold")
      setProblem(null)
      // Le vocal reçoit son id dès maintenant : c'est aussi celui du direct.
      const id = createId()
      talkIdRef.current = id
      if (!isViewOnce) talkieSession.begin(id)
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

  // Talkie-walkie : vous parlez en direct, quelqu'un vous parle, ou quelqu'un est là pour vous entendre.
  const outgoing = talkie.outgoing
  const isLive = isActive && outgoing?.status === "live"
  const isHearingLive = talkie.incoming !== null && !talkie.isMuted && !talkie.isSuppressed
  const canTalkLive =
    talkie.audience.length > 0 && !talkie.isSuppressed && !disabled && !isViewOnce

  // Les ondes du bouton suivent la voix du moment : la vôtre, celle du direct reçu, ou celle du vocal lu.
  const isSpeaking = playback.nowPlaying?.isPlaying ?? false
  const tone: VoiceHaloTone = isCancelArmed
    ? "muted"
    : isActive || isSending
      ? "recording"
      : "voice"
  const getLevel = isActive
    ? microphoneLevel
    : isHearingLive
      ? talkieSession.getIncomingLevel
      : isSpeaking
        ? playback.getLevel
        : undefined
  const icon: MicIcon = isSending
    ? "sending"
    : isCancelArmed
      ? "cancel"
      : isActive && !isHolding
        ? "send"
        : "mic"

  const caption = getCaption({
    isSending,
    isStarting: recorder.status === "starting",
    isHolding,
    isActive,
    isCancelArmed,
    isLive,
    outgoing,
    canTalkLive,
    isViewOnce,
  })

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
                if (visibleProblem.kind === "resend") void send(visibleProblem.recording, visibleProblem.id)
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
            {view === "hold" && <RecordingTimer elapsedMs={recorder.elapsedMs} isLive={isLive} />}
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
                {view === "locked" && <RecordingTimer elapsedMs={recorder.elapsedMs} isLive={isLive} />}
              </div>
            )}
          </DockSide>

          <MicButton
            tone={tone}
            icon={icon}
            getLevel={getLevel}
            isBreathing={view === "idle" && !isSpeaking && !isHearingLive}
            hasAudience={view === "idle" && canTalkLive}
            isViewOnce={isViewOnce}
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
                    "aria-label": canTalkLive
                      ? `Maintenir pour parler en direct — ${formatPresent(talkie.audience)} (appui simple : mains libres)`
                      : "Maintenir pour parler (appui simple : mains libres)",
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

interface CaptionState {
  isSending: boolean
  isStarting: boolean
  isHolding: boolean
  isActive: boolean
  isCancelArmed: boolean
  isLive: boolean
  outgoing: OutgoingTalk | null
  /** Quelqu'un a la conversation ouverte : il vous entendrait en direct. */
  canTalkLive: boolean
  isViewOnce: boolean
}

/** La consigne sous le bouton micro : ce que fait le geste, et qui vous entend. */
function getCaption(state: CaptionState) {
  const { isSending, isStarting, isHolding, isActive, isCancelArmed, isLive, outgoing } = state

  if (isSending) return "Envoi…"
  if (isStarting) return "Ouverture du micro…"
  if (isHolding && isCancelArmed) return "Relâchez pour annuler"
  if (isLive && outgoing) {
    // Certains sont en heures calmes : ils recevront le vocal, à écouter plus tard.
    const quiet = outgoing.deferred.length > 0 ? ` · ${formatQuiet(outgoing.deferred)}` : ""
    return `En direct · ${formatHearers(outgoing.listeners)}${quiet}`
  }
  if (isActive && outgoing?.status === "quiet" && outgoing.deferred.length > 0) {
    // Heures calmes de tous : le talkie bascule en vocal différé.
    const waits = outgoing.deferred.length > 1 ? "les attendra" : "l'attendra"
    return `${formatQuiet(outgoing.deferred)} · votre vocal ${waits}`
  }
  if (isActive && outgoing?.status === "busy" && outgoing.speaker) {
    return `${outgoing.speaker.name} parle · votre vocal suivra`
  }
  if (isHolding) return state.isViewOnce ? "Relâchez pour envoyer · écoute unique" : "Relâchez pour envoyer"
  if (isActive) return state.isViewOnce ? "Verrouillé · écoute unique" : "Verrouillé · touchez pour envoyer"
  if (state.isViewOnce) return "Écoute unique · maintenir pour parler"
  return state.canTalkLive ? "Maintenir pour parler en direct" : "Maintenir pour parler"
}

interface MicButtonProps {
  tone: VoiceHaloTone
  icon: MicIcon
  getLevel?: () => number
  isBreathing: boolean
  /** Quelqu'un est là pour vous entendre en direct : un point « présent » sur l'orbe. */
  hasAudience: boolean
  /** Le vocal sera à écoute unique : son symbole sur l'orbe. */
  isViewOnce: boolean
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
  hasAudience,
  isViewOnce,
  isHolding,
  lockProgress,
  isCancelArmed,
  caption,
  disabled,
  buttonProps,
}: MicButtonProps) {
  const pop = useTempoTransition(spring.pop)
  const swap = useTempoTransition(transition.swap)
  const morph = useTempoTransition(spring.morph)

  return (
    <div className="relative -mt-9 flex flex-col items-center gap-2">
      {/* Pendant l'appui : glisser vers le haut verrouille, on peut alors lâcher. */}
      <AnimatePresence>
        {isHolding && <LockRail key="lock-rail" progress={lockProgress} />}
      </AnimatePresence>

      {/* Même `layoutId` que le bouton d'envoi du mode texte : l'orbe s'y rétracte, et en renaît. */}
      <motion.div layoutId={COMPOSER_LAYOUT_IDS.primary} transition={morph} className="rounded-full">
        {/* Sous le doigt, le bouton grossit ; prêt à annuler, il se fait plus petit. */}
        <motion.div
          animate={{ scale: isCancelArmed ? 0.9 : isHolding ? 1.14 : 1 }}
          transition={pop}
          className="relative"
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

          {/* Sur le bord de l'orbe, en haut à droite ; ils suivent l'orbe quand il grossit. */}
          <AnimatePresence>
            {hasAudience && (
              // Quelqu'un est là : maintenir, c'est lui parler en direct.
              <OrbBadge key="audience" className="size-4 bg-background">
                <span className="relative inline-flex size-2.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 motion-safe:animate-voice-breathe" />
                  <span className="relative size-full rounded-full bg-emerald-500" />
                </span>
              </OrbBadge>
            )}
            {isViewOnce && (
              // Le vocal partira en écoute unique.
              <OrbBadge key="view-once" isSpinning className="size-6 bg-background text-read">
                <ViewOnceIcon size={16} />
              </OrbBadge>
            )}
          </AnimatePresence>
        </motion.div>

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

/** Point du bord de l'orbe à 45°, en haut à droite (en % de son diamètre). */
const ORB_EDGE_45 = { left: "85.36%", top: "14.64%" }

/**
 * Pastille posée sur le bord de l'orbe : centrée sur son cercle, détachée
 * par un liseré du fond. Elle apparaît d'un léger rebond.
 */
function OrbBadge({
  isSpinning = false,
  className,
  children,
}: {
  /** Entre en faisant un quart de tour (le cercle de la vue unique). */
  isSpinning?: boolean
  className?: string
  children: React.ReactNode
}) {
  const pop = useTempoTransition(spring.pop)
  const swap = useTempoTransition(transition.swap)

  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, scale: scale.icon, rotate: isSpinning ? -90 : 0 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, transition: pop }}
      exit={{ opacity: 0, scale: scale.icon, transition: swap }}
      // Centrée sur le point du cercle : le décalage passe par Motion (qui gère la transformation).
      style={{ ...ORB_EDGE_45, x: "-50%", y: "-50%" }}
      className={cn(
        "pointer-events-none absolute grid place-items-center rounded-full shadow-md ring-2 ring-background",
        className
      )}
    >
      {children}
    </motion.span>
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

/** Chronomètre de l'enregistrement ; en direct, la mention « Direct » s'y ajoute. */
function RecordingTimer({ elapsedMs, isLive }: { elapsedMs: number; isLive: boolean }) {
  const swap = useTempoTransition(transition.swap)

  return (
    <span className="flex items-center gap-2 px-1">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
      />
      <time className="text-sm font-medium tabular-nums">{formatDuration(elapsedMs)}</time>
      <AnimatePresence initial={false}>
        {isLive && (
          <motion.span
            key="live"
            initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
            exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
            className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-white uppercase"
          >
            Direct
          </motion.span>
        )}
      </AnimatePresence>
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
