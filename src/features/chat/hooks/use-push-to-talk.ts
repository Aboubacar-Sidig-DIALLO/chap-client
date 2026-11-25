"use client"

import { useEffect, useRef } from "react"
import { useMotionValue } from "motion/react"

/** En dessous, l'appui est un « toucher » : l'enregistrement passe en mains libres. */
const TAP_MAX_MS = 350
/** Distance (px) à glisser vers la gauche pour annuler. */
const CANCEL_DISTANCE_PX = 90
/** Distance (px) à glisser vers le haut pour verrouiller l'enregistrement. */
export const LOCK_DISTANCE_PX = 80
/** Le navigateur émet un `click` juste après le relâchement : il est ignoré pendant ce délai. */
const CLICK_GUARD_MS = 400

interface UsePushToTalkOptions {
  /** Le doigt (ou la souris) se pose : l'enregistrement commence. */
  onStart: () => void
  /** Relâché après un appui long : le vocal part. */
  onRelease: () => void
  /** Appui bref, glissement vers le haut ou clavier : l'enregistrement continue en mains libres. */
  onLock: () => void
  /** Relâché après avoir glissé vers la gauche (ou geste interrompu). */
  onCancel: () => void
  /** Le glissement franchit (ou repasse) le seuil d'annulation. */
  onCancelArmedChange: (isArmed: boolean) => void
}

/**
 * Ignore le `click` que le navigateur émet après un geste : sans cela, il
 * atteindrait le bouton devenu « envoyer » et enverrait aussitôt le vocal.
 */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener("click", swallow, { capture: true, once: true })
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), CLICK_GUARD_MS)
}

/**
 * Geste « maintenir pour parler » des messageries vocales :
 * - relâcher envoie ;
 * - glisser vers la gauche annule ;
 * - glisser vers le haut verrouille (on peut lâcher, l'enregistrement continue) ;
 * - un appui bref passe aussi en mains libres.
 *
 * Le suivi se fait sur `window` : le geste continue même si le bouton est
 * remplacé. `lockProgress` (0 à 1) suit le doigt sans aucun rendu React ;
 * seul le franchissement d'un seuil en déclenche un.
 */
export function usePushToTalk(options: UsePushToTalkOptions) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const lockProgress = useMotionValue(0)

  // Démonté en plein geste : on retire les écouteurs.
  useEffect(() => () => cleanupRef.current?.(), [])

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || cleanupRef.current) return
    event.preventDefault()

    const { pointerId, clientX: startX, clientY: startY } = event
    const startedAt = performance.now()
    let isCancelArmed = false
    /** Verrouillé par glissement : le doigt est encore posé, mais le geste est terminé. */
    let isLocked = false

    function lock() {
      isLocked = true
      lockProgress.set(0)
      navigator.vibrate?.(15)
      options.onLock()
    }

    function handleMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId || isLocked) return

      const left = startX - moveEvent.clientX
      const up = startY - moveEvent.clientY

      const isBeyondCancel = left > CANCEL_DISTANCE_PX
      if (isBeyondCancel !== isCancelArmed) {
        isCancelArmed = isBeyondCancel
        options.onCancelArmedChange(isBeyondCancel)
      }

      // Prêt à annuler, le verrou se vide ; sinon il se remplit en montant.
      const progress = isCancelArmed ? 0 : Math.min(Math.max(up / LOCK_DISTANCE_PX, 0), 1)
      lockProgress.set(progress)
      if (progress >= 1) lock()
    }

    function handleUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) return
      end()
      if (isLocked) return
      if (isCancelArmed) options.onCancel()
      else if (performance.now() - startedAt < TAP_MAX_MS) options.onLock()
      else options.onRelease()
    }

    function handleInterrupted(cancelEvent: PointerEvent) {
      if (cancelEvent.pointerId !== pointerId) return
      end()
      if (!isLocked) options.onCancel()
    }

    function end() {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleInterrupted)
      cleanupRef.current = null
      lockProgress.set(0)
      swallowNextClick()
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleInterrupted)
    cleanupRef.current = () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleInterrupted)
    }

    // Retour haptique discret (Android) : l'enregistrement a commencé.
    navigator.vibrate?.(10)
    options.onStart()
  }

  /** Activation au clavier (Entrée, Espace) : `detail` vaut 0, pas de geste possible. */
  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) {
      options.onStart()
      options.onLock()
    }
  }

  return {
    /** À poser sur le bouton micro. */
    buttonProps: {
      onPointerDown: handlePointerDown,
      onClick: handleClick,
      // Un appui long ne doit ni sélectionner de texte ni ouvrir le menu contextuel.
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    },
    /** Avancée vers le verrouillage (0 à 1), pour le rail au-dessus du bouton. */
    lockProgress,
  }
}
