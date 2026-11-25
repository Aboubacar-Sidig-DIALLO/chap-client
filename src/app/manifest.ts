import type { MetadataRoute } from "next"

/** Permet d'installer le chat sur l'écran d'accueil et de l'ouvrir en plein écran. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chat",
    short_name: "Chat",
    description: "Messagerie instantanée",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
