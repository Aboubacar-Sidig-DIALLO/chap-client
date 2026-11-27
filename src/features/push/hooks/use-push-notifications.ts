"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  disable,
  enable,
  getServerSnapshot,
  getSnapshot,
  initialize,
  subscribe,
} from "../lib/push-store"

/**
 * Les notifications push de cet appareil : leur état, partagé par toute
 * l'application (invitation de l'accueil, réglage du profil), et de quoi les
 * activer ou les désactiver. À utiliser une fois connecté.
 */
export function usePushNotifications() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    void initialize()
  }, [])

  return { ...state, enable, disable }
}
