"use client"

import { HeadphonesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number"
import {
  blur,
  ReducedMotionConfig,
  scale,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { formatNameList } from "../lib/format"
import type { ChatUser, ListenProgress } from "../types"
import { VoiceBars } from "./voice-bars"

export type ListenState =
  /** Quelqu'un écoute à l'instant ; `percent` absent s'il l'avait déjà écouté en entier. */
  | { kind: "live"; users: ChatUser[]; percent?: number }
  /** Écouté en partie, puis arrêté : la meilleure progression reste affichée. */
  | { kind: "partial"; progress: ListenProgress[]; percent: number }
  | { kind: "listened"; users: ChatUser[] }
  /** Personne n'a encore lancé la lecture. */
  | { kind: "unheard" }

/** Couleur d'une carte vocale (`data-listen` de `listen-card`, dans `globals.css`). */
export type ListenTone = "pending" | "live" | "done"

/** Ambre tant que ce n'est pas écouté en entier, violet pendant l'écoute, vert une fois écouté. */
export const LISTEN_TONE: Record<ListenState["kind"], ListenTone> = {
  unheard: "pending",
  partial: "pending",
  live: "live",
  listened: "done",
}

/** Résume l'écoute d'un vocal envoyé, de l'état le plus vivant au plus ancien. */
export function getListenState(
  liveListeners: ChatUser[],
  listeners: ChatUser[],
  progress: ListenProgress[]
): ListenState {
  const hasFinished = (user: ChatUser) => listeners.some((item) => item.id === user.id)

  if (liveListeners.length > 0) {
    const first = liveListeners[0]
    const percent = progress.find((item) => item.user.id === first.id)?.percent ?? 0
    return { kind: "live", users: liveListeners, percent: hasFinished(first) ? undefined : percent }
  }
  if (listeners.length > 0) return { kind: "listened", users: listeners }

  const partial = progress.filter((item) => item.percent > 0 && !hasFinished(item.user))
  if (partial.length === 0) return { kind: "unheard" }
  return {
    kind: "partial",
    progress: partial,
    percent: Math.max(...partial.map((item) => item.percent)),
  }
}

/** Texte complet, pour le survol et les lecteurs d'écran. */
function describe(state: ListenState) {
  switch (state.kind) {
    case "live": {
      const names = formatNameList(state.users.map((user) => user.name))
      return `${names} ${state.users.length > 1 ? "écoutent" : "écoute"} en ce moment`
    }
    case "partial":
      return `Écouté en partie : ${state.progress
        .map((item) => `${item.user.name} ${item.percent} %`)
        .join(", ")}`
    case "listened":
      return `Écouté par ${formatNameList(state.users.map((user) => user.name))}`
    case "unheard":
      return "Personne n'a encore écouté ce vocal"
  }
}

/**
 * Accusé d'écoute d'un vocal envoyé, qui suit le parcours de l'auditeur :
 * - « Non écouté » (anneau en pointillés) tant que personne ne l'a lancé ;
 * - « En écoute · 42 % » (barres qui battent) pendant que quelqu'un l'écoute ;
 * - « Écouté à 42 % » (anneau de progression) s'il s'est arrêté en route ;
 * - « Écouté » une fois entendu jusqu'au bout.
 * Les états s'échangent sur place (Animate UI, `recipes/swap.md`) et le
 * pourcentage défile chiffre par chiffre (`SlidingNumber`). La couleur vient
 * de la carte qui l'entoure (`listen-card`).
 */
export function ListenStatus({ state }: { state: ListenState }) {
  const swap = useTempoTransition(transition.swap)
  const description = describe(state)

  return (
    <span className="relative inline-flex">
      {/* Le texte « en écoute » ne contient pas le pourcentage : les lecteurs
          d'écran annoncent les changements d'état, pas chaque point gagné. */}
      <span role="status" className="sr-only">
        {description}
      </span>

      <ReducedMotionConfig>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state.kind}
            aria-hidden
            title={description}
            initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
            exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
            className="flex items-center gap-1 font-medium whitespace-nowrap"
          >
            {state.kind === "unheard" && (
              <>
                <PendingRing />
                Non écouté
              </>
            )}
            {state.kind === "live" && (
              <>
                <VoiceBars className="h-2.5" />
                En écoute
                {state.percent !== undefined && (
                  <>
                    <span className="opacity-60">·</span>
                    <Percent value={state.percent} />
                  </>
                )}
              </>
            )}
            {state.kind === "partial" && (
              <>
                <ProgressRing percent={state.percent} />
                Écouté à <Percent value={state.percent} />
              </>
            )}
            {state.kind === "listened" && (
              <>
                <HugeiconsIcon icon={HeadphonesIcon} size={12} strokeWidth={2} />
                Écouté
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </ReducedMotionConfig>
    </span>
  )
}

function Percent({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center tabular-nums">
      <SlidingNumber number={value} />
      &nbsp;%
    </span>
  )
}

/** Anneau en pointillés : le vocal attend son auditeur, avant que l'anneau ne se remplisse. */
function PendingRing() {
  return (
    <svg viewBox="0 0 12 12" className="size-3">
      <circle
        cx="6"
        cy="6"
        r="4.5"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="2.4 2.3"
        className="stroke-current"
      />
    </svg>
  )
}

/** Petit anneau qui se remplit selon la part écoutée. */
function ProgressRing({ percent }: { percent: number }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 -rotate-90">
      <circle cx="6" cy="6" r="4.5" fill="none" strokeWidth="2" className="stroke-current opacity-30" />
      <circle
        cx="6"
        cy="6"
        r="4.5"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - percent}
        className="stroke-current transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  )
}
