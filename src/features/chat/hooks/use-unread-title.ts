"use client"

import { useEffect } from "react"

/** Préfixe le titre de l'onglet par le nombre de messages non lus : « (3) Chat ». */
export function useUnreadTitle(unreadCount: number) {
  useEffect(() => {
    if (unreadCount === 0) return

    const title = document.title
    document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${title}`
    return () => {
      document.title = title
    }
  }, [unreadCount])
}
