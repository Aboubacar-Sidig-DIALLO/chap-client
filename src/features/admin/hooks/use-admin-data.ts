"use client"

import { useCallback, useEffect, useState } from "react"
import { getErrorMessage } from "@/lib/api"
import { adminApi } from "../lib/api"
import type { AdminStats, AdminUserPage, AdminUserQuery } from "../types"

/**
 * Une page de comptes pour `query`, rechargée quand la recherche change ou
 * après une action (`reload`). Une réponse dépassée (recherche modifiée
 * entre-temps) est abandonnée.
 */
export function useAdminUsers(query: AdminUserQuery) {
  const [page, setPage] = useState<AdminUserPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  /** Dernière requête terminée (réussie ou non) : chargement tant qu'elle diffère de l'actuelle. */
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const { search, filter, sort, page: pageNumber } = query
  const requestKey = JSON.stringify([search, filter, sort, pageNumber, version])

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .listUsers({ search, filter, sort, page: pageNumber }, controller.signal)
      .then((result) => {
        setPage(result)
        setError(null)
        setSettledKey(requestKey)
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return
        setError(getErrorMessage(loadError))
        setSettledKey(requestKey)
      })
    return () => controller.abort()
  }, [search, filter, sort, pageNumber, requestKey])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { page, error, isLoading: settledKey !== requestKey, reload }
}

/** Vue d'ensemble des comptes ; `reload` après une action qui la change. */
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    adminApi
      .getStats()
      .then((result) => {
        if (isCurrent) setStats(result)
      })
      // Les chiffres sont un plus : la liste reste utilisable sans eux.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { stats, reload }
}
