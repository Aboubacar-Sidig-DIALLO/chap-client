import { ApiError, getErrorMessage } from "@/lib/api"
import { pushApi } from "./push-api"

const SERVICE_WORKER_URL = "/sw.js"

/**
 * Où en sont les notifications push sur cet appareil :
 * - `loading` : vérification en cours ;
 * - `unsupported` : navigateur incompatible ;
 * - `install-required` : iPhone / iPad, il faut d'abord ajouter l'app à l'écran d'accueil ;
 * - `unavailable` : le serveur n'envoie pas de notifications ;
 * - `denied` : bloquées dans les réglages du navigateur ;
 * - `off` / `on` : désactivées / activées.
 */
export type PushStatus =
  | "loading"
  | "unsupported"
  | "install-required"
  | "unavailable"
  | "denied"
  | "off"
  | "on"

export interface PushState {
  status: PushStatus
  /** Activation ou désactivation en cours. */
  isBusy: boolean
  error: string | null
}

let state: PushState = { status: "loading", isBusy: false, error: null }
const listeners = new Set<() => void>()
let initialization: Promise<void> | null = null
let publicKey: string | null = null

function update(changes: Partial<PushState>) {
  state = { ...state, ...changes }
  for (const listener of listeners) listener()
}

// ── Lecture par React (`useSyncExternalStore`) ──────────────────────────────

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getSnapshot = () => state

const SERVER_SNAPSHOT: PushState = { status: "loading", isBusy: false, error: null }
export const getServerSnapshot = () => SERVER_SNAPSHOT

// ── Navigateur ──────────────────────────────────────────────────────────────

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

/** iPhone et iPad (dont les iPad qui se présentent comme un Mac). */
function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
}

/** Clé VAPID (base64 « URL ») → octets attendus par `pushManager.subscribe`. */
function decodeKey(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/** L'abonnement a été créé avec cette clé (sinon, le serveur a changé de clés). */
function usesKey(subscription: PushSubscription, key: string) {
  const current = subscription.options.applicationServerKey
  if (!current) return false
  const expected = decodeKey(key)
  const actual = new Uint8Array(current)
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index])
}

async function registration() {
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/", updateViaCache: "none" })
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Vérifie l'état des notifications (une seule fois par chargement). Déjà
 * abonné, l'abonnement est renvoyé au serveur : il suit ainsi un changement
 * de compte ou un abonnement renouvelé par le navigateur.
 */
export function initialize() {
  initialization ??= detect().catch(() => update({ status: "unsupported" }))
  return initialization
}

async function detect() {
  if (!isSupported()) {
    update({ status: isAppleMobile() && !isInstalled() ? "install-required" : "unsupported" })
    return
  }

  const [{ publicKey: key }, worker] = await Promise.all([pushApi.getPublicKey(), registration()])
  publicKey = key
  if (!key) return update({ status: "unavailable" })
  if (Notification.permission === "denied") return update({ status: "denied" })

  const subscription = await worker.pushManager.getSubscription()
  if (!subscription || Notification.permission !== "granted") return update({ status: "off" })

  // Clés changées côté serveur : l'ancien abonnement ne recevrait plus rien.
  if (!usesKey(subscription, key)) {
    await subscription.unsubscribe()
    return update({ status: "off" })
  }
  await pushApi.subscribe(subscription.toJSON())
  update({ status: "on" })
}

/**
 * Active les notifications sur cet appareil. À appeler directement dans un
 * geste (clic) : le navigateur n'accepte de poser la question qu'à ce moment.
 */
export async function enable() {
  if (!publicKey || state.isBusy) return
  update({ isBusy: true, error: null })

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      update({ status: permission === "denied" ? "denied" : "off" })
      return
    }

    const worker = await navigator.serviceWorker.ready
    const subscription =
      (await worker.pushManager.getSubscription()) ??
      (await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) }))
    await pushApi.subscribe(subscription.toJSON())
    update({ status: "on" })
  } catch (error) {
    // Refus du serveur : son explication ; refus du navigateur : un message simple.
    update({ error: error instanceof ApiError ? error.message : "Activation impossible. Réessayez." })
  } finally {
    update({ isBusy: false })
  }
}

/**
 * Désactive les notifications sur cet appareil (et seulement lui). Appelé
 * aussi à la déconnexion : un appareil partagé ne reçoit plus rien du compte.
 */
export async function disable() {
  if (!isSupported() || state.isBusy) return
  update({ isBusy: true, error: null })

  try {
    const worker = await navigator.serviceWorker.getRegistration()
    const subscription = await worker?.pushManager.getSubscription()
    if (subscription) {
      // Le serveur d'abord : la session est encore ouverte pour l'authentifier.
      await pushApi.unsubscribe(subscription.endpoint).catch(() => {})
      await subscription.unsubscribe()
    }
    if (state.status === "on") update({ status: "off" })
  } catch (error) {
    update({ error: getErrorMessage(error) })
  } finally {
    update({ isBusy: false })
  }
}

/** Retire les notifications affichées d'une conversation (elle vient d'être ouverte). */
export async function clearNotifications(conversationKey: string) {
  if (!isSupported()) return
  const worker = await navigator.serviceWorker.getRegistration()
  if (!worker) return
  for (const tag of [`message:${conversationKey}`, `call:${conversationKey}`]) {
    const notifications = await worker.getNotifications({ tag })
    for (const notification of notifications) notification.close()
  }
}
