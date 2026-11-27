"use client"

import { useEffect, useRef } from "react"

/** Durée d'immobilité avant déclenchement (celle de l'appui long des messages). */
const HOLD_MS = 450
/** En deçà, le doigt tremble mais ne bouge pas. */
const MOVE_TOLERANCE_PX = 8

export interface HoldPoint {
  clientX: number
  clientY: number
  pointerId: number
}

/**
 * Appui maintenu sans bouger, au doigt, au stylet ou à la souris. Bouger
 * relance l'attente là où l'on s'arrête : on glisse jusqu'au bon endroit
 * (un passage d'un vocal), puis on y reste. Gestionnaires à appeler depuis
 * ceux de l'élément.
 */
export function useHoldStill(onHold: (point: HoldPoint) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const originRef = useRef<HoldPoint | null>(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function cancel() {
    clearTimeout(timerRef.current)
    originRef.current = null
  }

  function start({ clientX, clientY, pointerId }: React.PointerEvent) {
    clearTimeout(timerRef.current)
    const point = { clientX, clientY, pointerId }
    originRef.current = point
    timerRef.current = setTimeout(() => {
      originRef.current = null
      navigator.vibrate?.(10)
      onHold(point)
    }, HOLD_MS)
  }

  return {
    onPointerDown: start,
    onPointerMove(event: React.PointerEvent) {
      const origin = originRef.current
      if (origin && Math.hypot(event.clientX - origin.clientX, event.clientY - origin.clientY) > MOVE_TOLERANCE_PX) {
        start(event)
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  }
}
