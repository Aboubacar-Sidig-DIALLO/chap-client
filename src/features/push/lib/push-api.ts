import { apiFetch } from "@/lib/api"

/** Abonnement aux notifications push — routes `sse/src/push/push.controller.ts`. */
export const pushApi = {
  /** Clé publique VAPID ; `null` si le serveur n'envoie pas de notifications. */
  getPublicKey: () => apiFetch<{ publicKey: string | null }>("/push/public-key"),

  subscribe: (subscription: PushSubscriptionJSON) =>
    apiFetch<void>("/push/subscriptions", { method: "POST", body: subscription }),

  unsubscribe: (endpoint: string) =>
    apiFetch<void>("/push/subscriptions", { method: "DELETE", body: { endpoint } }),
}
