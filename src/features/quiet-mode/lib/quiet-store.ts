import { apiFetch, getErrorMessage } from "@/lib/api"
import type { QuietModeState, QuietSchedule } from "../types"
import { quietReasonAt } from "./rules"

/**
 * Les heures calmes de l'utilisateur, partagées par toute l'application
 * (bouton de l'accueil, profil, sons) : chargées une fois, puis tenues à
 * jour. Les changements s'affichent aussitôt et sont annulés si le serveur
 * les refuse.
 */

export interface QuietSnapshot {
  state: QuietModeState | null
  status: "idle" | "loading" | "ready" | "error"
  /** Dernière erreur à expliquer (enregistrement refusé…). */
  error: string | null
}

const INITIAL: QuietSnapshot = { state: null, status: "idle", error: null }

let snapshot = INITIAL
const listeners = new Set<() => void>()

function update(patch: Partial<QuietSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
}

export const quietStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => INITIAL,

  /** Charge les réglages (ou les relit, ex. modifiés depuis un autre appareil). */
  async refresh() {
    if (snapshot.status === "idle") update({ status: "loading" })
    try {
      update({ state: await apiFetch<QuietModeState>("/quiet-mode"), status: "ready", error: null })
    } catch (error) {
      // Déjà chargés : on garde ceux qu'on a.
      update({ status: snapshot.state ? "ready" : "error", error: snapshot.state ? null : getErrorMessage(error) })
    }
  },

  /** « Ne pas déranger » maintenant, jusqu'à `until` (`null` : jusqu'à ce qu'on le désactive), ou plus. */
  setManual(on: boolean, until: Date | null = null) {
    const manual = { on, until: on && until ? until.toISOString() : null }
    return save({ manual }, () => apiFetch<QuietModeState>("/quiet-mode/manual", { method: "PUT", body: manual }))
  },

  /** Heures calmes chaque jour. */
  setSchedule(schedule: QuietSchedule) {
    return save({ schedule }, () =>
      apiFetch<QuietModeState>("/quiet-mode/schedule", { method: "PUT", body: schedule })
    )
  },
}

/** Applique le changement tout de suite, puis la réponse du serveur (ou revient en arrière). */
async function save(patch: Partial<QuietModeState>, request: () => Promise<QuietModeState>) {
  const previous = snapshot.state
  if (previous) update({ state: { ...previous, ...patch }, error: null })
  try {
    update({ state: await request(), status: "ready", error: null })
  } catch (error) {
    update({ state: previous, error: getErrorMessage(error) })
  }
}

/**
 * En heures calmes à l'instant ? Pour faire taire un son au moment de le
 * jouer. Réglages pas encore connus : non (mieux vaut un son de trop).
 */
export function isQuietNow() {
  return snapshot.state !== null && quietReasonAt(snapshot.state, new Date()) !== null
}
