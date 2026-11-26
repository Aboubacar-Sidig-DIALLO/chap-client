/** Nom de l'application : titre des pages, écran d'accueil, barre latérale. */
export const APP_NAME = "Chat"

/** URL de l'API NestJS : HTTP, Socket.io et authentification (`/api/auth`). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
