"use client"

import { AnimatePresence, motion } from "motion/react"
import {
  blur,
  ReducedMotionConfig,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { WifiDisconnected01 } from "@/components/animate-ui/icons/hugeicons/wifi-disconnected-01"
import { Spinner } from "@/components/ui/spinner"
import type { ConnectionStatus } from "../types"

/**
 * Bandeau bien visible (surtout sur mobile) quand la connexion est perdue
 * (Animate UI, `interactions/banner.md`) : il se déplie en poussant la
 * conversation, puis se replie au retour du réseau.
 */
export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const unfold = useTempoTransition(transition.disclosure)
  const swap = useTempoTransition(transition.swap)

  const isOffline = status === "disconnected" || status === "reconnecting"
  const isReconnecting = status === "reconnecting"

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {isOffline && (
          <motion.div
            key="banner"
            role="status"
            initial={{ height: 0, opacity: 0, filter: blur.disclosure }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: blur.disclosure }}
            transition={unfold}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
              {/* Les deux états s'échangent sur place, sans changer d'échelle. */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={status}
                  initial={{ opacity: 0, filter: blur.icon }}
                  animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
                  exit={{ opacity: 0, filter: blur.icon, transition: swap }}
                  className="flex items-center gap-2"
                >
                  {isReconnecting ? (
                    <Spinner size={14} />
                  ) : (
                    <WifiDisconnected01 size={14} animate aria-hidden />
                  )}
                  {isReconnecting
                    ? "Connexion perdue — reconnexion en cours…"
                    : "Hors ligne — vos messages ne peuvent pas être envoyés"}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}
