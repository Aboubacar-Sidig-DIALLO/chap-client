import { authClient } from "@/lib/auth-client"

/** Vrai quand cet onglet ferme lui-même ses sessions et a déjà prévu où aller ensuite. */
let isLeaving = false

/**
 * Relit la session. Si elle n'existe plus, chaque page réservée renvoie aussitôt
 * vers la connexion (`SessionGate`). Sans effet pendant `endSessionsThenGo`, qui
 * choisit lui-même la page suivante.
 */
export function refreshSession() {
  if (!isLeaving) authClient.$store.notify("$sessionSignal")
}

/**
 * Lance une action qui ferme toutes les sessions (changement d'adresse,
 * suppression du compte) puis, si elle réussit, recharge entièrement la page sur
 * `destination` : rien de l'ancienne session ne subsiste en mémoire.
 *
 * Entre-temps, le serveur annonce aussi la fin des sessions à cet onglet ; cette
 * annonce est ignorée, sinon `SessionGate` redirigerait de son côté, en
 * concurrence avec `destination`.
 *
 * Renvoie l'erreur de l'action, ou `null` en cas de succès.
 */
export async function endSessionsThenGo<E>(
  action: () => Promise<{ error: E | null }>,
  destination: string
): Promise<E | null> {
  isLeaving = true
  let succeeded = false
  try {
    const { error } = await action()
    succeeded = !error
    return error
  } finally {
    if (succeeded) window.location.replace(destination)
    else isLeaving = false
  }
}
