import type { BetterAuthClientPlugin } from "better-auth/client"

/** À garder synchronisé avec le serveur (`sse/src/auth/email-only.plugin.ts`). */
const SIGN_UP_PATH = "/sign-up/email-only"
const SIGN_IN_PATH = "/sign-in/email-only"

interface AuthResponse {
  user: { id: string; name: string; email: string }
}

/**
 * Pendant côté client du plugin serveur `emailOnly` : inscription et connexion
 * par simple adresse email.
 *
 * Après un appel réussi, la session est relue pour que `useSession` voie
 * l'utilisateur connecté. Ce signal est envoyé ici explicitement : Better Auth
 * ne le déclenche tout seul que pour ses propres routes, pas pour les actions
 * d'un plugin.
 */
export const emailOnlyClient = () =>
  ({
    id: "email-only",
    getActions: ($fetch, $store) => {
      const refreshSession = () => $store.notify("$sessionSignal")

      return {
        signUpWithEmail: (body: { name: string; email: string }) =>
          $fetch<AuthResponse>(SIGN_UP_PATH, { method: "POST", body, onSuccess: refreshSession }),
        signInWithEmail: (body: { email: string }) =>
          $fetch<AuthResponse>(SIGN_IN_PATH, { method: "POST", body, onSuccess: refreshSession }),
      }
    },
  }) satisfies BetterAuthClientPlugin
