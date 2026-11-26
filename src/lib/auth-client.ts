import { emailOnlyClient } from "@/features/auth/lib/email-only-client"
import { adminClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { API_URL } from "./config"

/**
 * Client Better Auth : appelle les routes `/api/auth/*` de l'API NestJS.
 * Le cookie de session (httpOnly) est envoyé et reçu automatiquement.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [emailOnlyClient(), adminClient() ],
})
