import type { GuestClaim } from "../types"

/**
 * Le laissez-passer de l'invité, gardé le temps de l'onglet (`sessionStorage`) :
 * recharger la page le ramène dans l'appel, alors que le lien, lui, a déjà
 * servi. Un autre onglet ou appareil n'en hérite pas.
 */

const keyOf = (token: string) => `guest-call:${token}`

function isClaim(value: unknown): value is GuestClaim {
  const claim = value as GuestClaim | null
  return typeof claim?.pass === "string" && typeof claim.guest?.id === "string" && typeof claim.group?.name === "string"
}

export function readClaim(token: string): GuestClaim | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(keyOf(token)) ?? "null")
    return isClaim(value) ? value : null
  } catch {
    return null
  }
}

export function storeClaim(token: string, claim: GuestClaim) {
  try {
    sessionStorage.setItem(keyOf(token), JSON.stringify(claim))
  } catch {
    // Stockage indisponible (navigation privée stricte) : seul le rechargement en pâtit.
  }
}

export function forgetClaim(token: string) {
  try {
    sessionStorage.removeItem(keyOf(token))
  } catch {
    // Rien à oublier.
  }
}
