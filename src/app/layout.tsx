import type { Metadata, Viewport } from "next"
import { Figtree } from "next/font/google"
import { IncomingCallNotifier } from "@/features/social/components/incoming-call"
import "./globals.css"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Chat",
  description: "Messagerie instantanée",
  applicationName: "Chat",
  // Ajout à l'écran d'accueil iOS : lancement plein écran, comme une app native.
  appleWebApp: { capable: true, title: "Chat", statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Nécessaire pour que `env(safe-area-inset-*)` tienne compte de l'encoche et de la barre d'accueil.
  viewportFit: "cover",
  // Android : le clavier virtuel réduit la zone d'affichage au lieu de recouvrir la page.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${figtree.variable} h-full font-sans antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Les appels des amis et des groupes sonnent sur toutes les pages. */}
        <IncomingCallNotifier />
      </body>
    </html>
  )
}
