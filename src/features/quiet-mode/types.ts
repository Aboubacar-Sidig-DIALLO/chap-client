/** Contrat de l'API des heures calmes — à garder synchronisé avec le serveur (`sse/src/quiet-mode/quiet-mode.types.ts`). */

/** Ses réglages, tels qu'on les affiche et les modifie. */
export interface QuietModeState {
  /** Heures calmes chaque jour (heure du fuseau `timeZone`). */
  schedule: QuietSchedule
  /** Ne pas déranger, activé à la main ; `until` : date ISO 8601, ou `null` jusqu'à ce qu'on le désactive. */
  manual: { on: boolean; until: string | null }
}

export interface QuietSchedule {
  enabled: boolean
  /** Minutes depuis minuit (0 à 1439). */
  startMinute: number
  endMinute: number
  timeZone: string
}
