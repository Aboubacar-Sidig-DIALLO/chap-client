import { disable as disablePush } from "@/features/push/lib/push-store"
import { authClient } from "@/lib/auth-client"

/**
 * Déconnexion : cet appareil cesse d'abord de recevoir les notifications du
 * compte (la session est encore là pour l'authentifier), puis la session est
 * fermée. Sur un appareil partagé, le suivant ne voit rien passer.
 */
export async function signOut() {
  await disablePush()
  await authClient.signOut()
}
