"use client"

import { useEffect, useState } from "react"
import { getErrorMessage } from "@/lib/api"
import { socialApi } from "../lib/api"
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH } from "../lib/config"
import type { Relation, SearchResult } from "../types"
import { useDebouncedValue } from "./use-debounced-value"

interface SearchState {
  /** Recherche à laquelle correspondent `results` / `error`. */
  query: string
  results: SearchResult[]
  error: string | null
}

const EMPTY: SearchState = { query: "", results: [], error: null }

/**
 * Recherche de personnes par leur nom, lancée quand la saisie se stabilise.
 * Une recherche dépassée est annulée : seule la dernière s'affiche.
 */
export function useUserSearch(input: string) {
  const query = input.trim()
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const [state, setState] = useState<SearchState>(EMPTY)

  useEffect(() => {
    if (debouncedQuery.length < SEARCH_MIN_LENGTH) return

    const controller = new AbortController()
    socialApi
      .searchUsers(debouncedQuery, controller.signal)
      .then((results) => setState({ query: debouncedQuery, results, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ query: debouncedQuery, results: [], error: getErrorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [debouncedQuery])

  /** Après une action (demande envoyée, acceptée…), met à jour le résultat concerné. */
  function updateRelation(userId: string, relation: Relation) {
    setState((current) => ({
      ...current,
      results: current.results.map((user) => (user.id === userId ? { ...user, relation } : user)),
    }))
  }

  const isActive = query.length >= SEARCH_MIN_LENGTH

  return {
    /** La saisie est assez longue : la recherche remplace l'accueil. */
    isActive,
    /** Saisie trop courte, mais commencée. */
    needsMoreCharacters: query.length > 0 && !isActive,
    /** Une recherche plus récente que les résultats affichés est en cours. */
    isSearching: isActive && state.query !== query,
    /** Résultats de la dernière recherche aboutie (gardés pendant la suivante, sans clignotement). */
    results: state.results,
    error: state.query === query ? state.error : null,
    updateRelation,
  }
}
