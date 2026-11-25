"use client"

import { MicOff01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { ReducedMotionConfig, useShouldReduceMotion } from "@animate-ui/react/utils/motion"
import { cn } from "@/lib/utils"
import { Emoji } from "@/features/chat/components/emoji"
import { VoiceHalo } from "@/features/chat/components/voice-halo"
import { getInitials } from "@/features/chat/lib/format"
import { REACTION_LIFETIME_MS } from "../lib/config"
import type { FloatingReaction } from "../lib/call-session"
import type { CallParticipant } from "../types"

interface ParticipantOrbProps {
  participant: CallParticipant
  isSelf: boolean
  /** Son et image du participant (votre caméra, pour vous). */
  stream: MediaStream | null
  /** Volume lu à chaque image : les ondes s'ouvrent quand il parle. */
  getLevel: () => number
  reactions: FloatingReaction[]
  size: number
}

/**
 * Un participant du direct : un orbe vocal dont les ondes suivent sa voix.
 * Caméra allumée, l'orbe devient une bulle vidéo ronde, toujours entourée de
 * ses ondes. Ses réactions s'envolent au-dessus de lui.
 */
export function ParticipantOrb({
  participant,
  isSelf,
  stream,
  getLevel,
  reactions,
  size,
}: ParticipantOrbProps) {
  const { user, audio, video } = participant
  const isMuted = !audio
  const name = isSelf ? "Vous" : user.name

  return (
    <figure
      aria-label={`${name}${isMuted ? ", micro coupé" : ""}${video ? ", caméra allumée" : ""}`}
      className="relative flex flex-col items-center gap-3"
    >
      <div className="relative">
        <VoiceHalo
          size={size}
          tone={isMuted ? "muted" : "voice"}
          getLevel={isMuted ? undefined : getLevel}
        >
          {video && stream ? (
            <StreamVideo stream={stream} mirrored={isSelf} />
          ) : (
            <span aria-hidden className="font-semibold tracking-wide" style={{ fontSize: size * 0.3 }}>
              {getInitials(user.name)}
            </span>
          )}
        </VoiceHalo>

        {/* Micro coupé : une pastille sur le bord de l'orbe. */}
        {isMuted && (
          <span className="absolute right-[4%] bottom-[4%] grid size-7 place-items-center rounded-full bg-background text-muted-foreground shadow-md">
            <HugeiconsIcon icon={MicOff01Icon} size={14} strokeWidth={2} aria-hidden />
          </span>
        )}
      </div>

      <figcaption className="max-w-full truncate text-sm font-medium">{name}</figcaption>

      <RisingReactions reactions={reactions} />
    </figure>
  )
}

/** La vidéo remplit le disque de l'orbe. */
function StreamVideo({ stream, mirrored }: { stream: MediaStream; mirrored: boolean }) {
  return (
    <video
      autoPlay
      playsInline
      // Le son passe par `RemoteAudio` (et le sien ne doit pas revenir en écho).
      muted
      ref={(element) => {
        if (element && element.srcObject !== stream) element.srcObject = stream
      }}
      className={cn("absolute inset-0 size-full rounded-full object-cover", mirrored && "-scale-x-100")}
    />
  )
}

/** Chaque réaction monte en ondulant puis s'efface ; sous « réduire les animations », elle apparaît sur place. */
function RisingReactions({ reactions }: { reactions: FloatingReaction[] }) {
  const reduceMotion = useShouldReduceMotion()

  return (
    <ReducedMotionConfig>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <AnimatePresence>
          {reactions.map((reaction) => {
            // Une dérive propre à chaque réaction : elles ne se superposent pas.
            const drift = ((reaction.id * 37) % 60) - 30
            return (
              <motion.span
                key={reaction.id}
                className="absolute"
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.6 }}
                animate={
                  reduceMotion
                    ? { opacity: [0, 1, 1, 0], scale: 1 }
                    : {
                        opacity: [0, 1, 1, 0],
                        y: -140,
                        x: [0, drift, drift * 0.4],
                        scale: [0.6, 1.15, 1],
                      }
                }
                transition={{ duration: REACTION_LIFETIME_MS / 1000, ease: "easeOut" }}
              >
                <Emoji emoji={reaction.emoji} size={40} animated />
              </motion.span>
            )
          })}
        </AnimatePresence>
      </div>
    </ReducedMotionConfig>
  )
}
