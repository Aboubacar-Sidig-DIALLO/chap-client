"use client"

import { useEffect, useRef } from "react"

/** Durée d'appui avant déclenchement, comme dans les messageries mobiles. */
const LONG_PRESS_MS = 450
/** Au-delà, le doigt fait défiler la page : ce n'est pas un appui long. */
const MOVE_TOLERANCE_PX = 10

/**
 * Appui long au doigt ou au stylet (la souris a le survol et le clic droit).
 * Le clic qui suit l'appui long est avalé : il ne lance pas, en plus, la
 * lecture d'un vocal ou l'ouverture d'une photo. Gestionnaires à étaler sur l'élément.
 */
export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function cancel() {
    clearTimeout(timerRef.current)
    startRef.current = null
  }

  return {
    onPointerDown(event: React.PointerEvent) {
      if (event.pointerType === "mouse") return
      firedRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
      timerRef.current = setTimeout(() => {
        startRef.current = null
        firedRef.current = true
        navigator.vibrate?.(10)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove(event: React.PointerEvent) {
      const start = startRef.current
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX) {
        cancel()
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    // Android ouvre son menu contextuel au même moment.
    onContextMenu(event: React.MouseEvent) {
      if (startRef.current || firedRef.current) event.preventDefault()
    },
    onClickCapture(event: React.MouseEvent) {
      if (!firedRef.current) return
      firedRef.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
