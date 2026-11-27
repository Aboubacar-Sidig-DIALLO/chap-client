/**
 * Ferme un contexte audio sans erreur s'il l'est déjà (le navigateur refuse
 * une seconde fermeture par une promesse rejetée).
 */
export function closeAudioContext(context: AudioContext) {
  if (context.state === "closed") return
  context.close().catch(() => {
    // Fermé entre-temps : rien à faire.
  })
}
