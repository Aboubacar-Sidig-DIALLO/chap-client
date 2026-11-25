"use client"

import {
  AlertCircleIcon,
  Clock01Icon,
  Tick02Icon,
  TickDouble02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import {
  blur,
  ReducedMotionConfig,
  scale,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { cn } from "@/lib/utils"
import type { MessageStatus } from "../types"

/**
 * Convention des messageries : horloge → envoi, coche → reçu par le serveur,
 * double coche → reçu par un destinataire, double coche colorée → lu.
 */
export const STATUS_CONFIG: Record<
  MessageStatus,
  { icon: IconSvgElement; label: string; className?: string }
> = {
  sending: { icon: Clock01Icon, label: "Envoi en cours" },
  sent: { icon: Tick02Icon, label: "Envoyé" },
  delivered: { icon: TickDouble02Icon, label: "Distribué" },
  read: { icon: TickDouble02Icon, label: "Lu", className: "text-read" },
  failed: { icon: AlertCircleIcon, label: "Échec", className: "text-destructive" },
}

interface MessageStatusIconProps {
  status: MessageStatus
  /** Remplace le libellé par défaut (ex. « Lu par Alice »). */
  label?: string
  /** Affiche le libellé à côté de l'icône (sinon, réservé aux lecteurs d'écran). */
  showLabel?: boolean
}

/**
 * Icône (et libellé) du statut. Chaque changement d'état se fait sur place
 * (Animate UI, `recipes/swap.md`) : l'ancienne icône s'efface pendant que la
 * nouvelle apparaît, un léger flou liant les deux en un seul geste.
 */
export function MessageStatusIcon({
  status,
  label,
  showLabel = false,
}: MessageStatusIconProps) {
  const config = STATUS_CONFIG[status]
  const text = label ?? config.label
  const swap = useTempoTransition(transition.swap)

  return (
    <ReducedMotionConfig>
      <span
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          config.className
        )}
      >
        <span className="relative inline-flex">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status}
              className="inline-flex"
              initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
              exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
            >
              <HugeiconsIcon icon={config.icon} size={14} strokeWidth={2} aria-hidden />
            </motion.span>
          </AnimatePresence>
        </span>

        {showLabel ? (
          // Un texte qui change s'efface et se floute, sans jamais changer d'échelle.
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={text}
              layout="position"
              initial={{ opacity: 0, filter: blur.icon }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
              exit={{ opacity: 0, filter: blur.icon, transition: swap }}
            >
              {text}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span className="sr-only">{text}</span>
        )}
      </span>
    </ReducedMotionConfig>
  )
}
