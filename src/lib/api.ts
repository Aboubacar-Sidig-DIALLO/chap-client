import { API_URL } from "./config"

/** Erreur HTTP de l'API, avec le message (en français) renvoyé par le serveur. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const NETWORK_ERROR = "Serveur injoignable. Vérifiez votre connexion."
const SERVER_ERROR = "Le service est momentanément indisponible. Réessayez dans un instant."

/**
 * Appel JSON à l'API NestJS, cookie de session compris.
 * Lève une `ApiError` si la réponse n'est pas un succès.
 */
export async function apiFetch<T>(
  path: string,
  { body, ...init }: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: body === undefined ? init.headers : { "Content-Type": "application/json", ...init.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(NETWORK_ERROR, 0)
  }

  if (!response.ok) {
    // Panne côté serveur : son message (technique, en anglais) n'aiderait pas l'utilisateur.
    if (response.status >= 500) throw new ApiError(SERVER_ERROR, response.status)

    const payload = (await response.json().catch(() => null)) as { message?: unknown } | null
    const message = typeof payload?.message === "string" ? payload.message : "Une erreur est survenue."
    throw new ApiError(message, response.status)
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

/** Message à afficher pour une erreur quelconque. */
export function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Une erreur est survenue."
}
