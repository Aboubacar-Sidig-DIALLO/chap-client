/**
 * Service worker de l'application : il reçoit les notifications push, même
 * quand l'application est fermée, et ouvre la bonne conversation au toucher.
 *
 * Contenu d'une notification (envoyé par le serveur, chiffré jusqu'ici) —
 * à garder synchronisé avec `sse/src/push/push.types.ts` :
 * `{ tag, kind: "message" | "call" | "social", title, body, url, createdAt }`.
 */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  const notification = readPayload(event)
  if (notification) event.waitUntil(present(notification))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href
  event.waitUntil(openApp(url))
})

function readPayload(event) {
  try {
    return event.data?.json() ?? null
  } catch {
    return null
  }
}

/** L'application est à l'écran : elle annonce déjà tout elle-même (pastille, sonnerie, annonce). */
async function isAppVisible() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  return windows.some((client) => client.visibilityState === "visible")
}

async function present({ tag, kind, title, body, url, createdAt }) {
  if (await isAppVisible()) return

  // Plusieurs messages d'une même conversation : une seule notification, qui les compte.
  let count = 1
  if (kind === "message") {
    const [previous] = await self.registration.getNotifications({ tag })
    count = (previous?.data?.count ?? 0) + 1
  }

  await self.registration.showNotification(count > 1 ? `${title} · ${count} messages` : title, {
    body,
    tag,
    // Remplacer la notification précédente fait quand même vibrer / sonner.
    renotify: true,
    icon: "/icon",
    lang: "fr",
    timestamp: Date.parse(createdAt) || Date.now(),
    // Un appel reste affiché tant qu'on n'y a pas répondu (le serveur cesse de l'annoncer après la sonnerie).
    requireInteraction: kind === "call",
    vibrate: kind === "call" ? [400, 200, 400, 200, 400] : [120],
    data: { url, kind, count },
  })
}

/**
 * Ouvre la page de la notification : dans une fenêtre déjà ouverte (elle y
 * navigue sans se recharger), sinon dans une nouvelle.
 */
async function openApp(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)

  if (existing) {
    await existing.focus()
    existing.postMessage({ type: "navigate", url })
    return
  }
  await self.clients.openWindow(url)
}
