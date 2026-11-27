import type { Metadata, Viewport } from "next"
import { Figtree } from "next/font/google"
import { ImpersonationBanner } from "@/features/admin/components/impersonation-banner"
import { SessionEndedListener } from "@/features/auth/components/session-ended-listener"
import { PushNavigationListener } from "@/features/push/components/push-navigation-listener"
import { IncomingCallNotifier } from "@/features/social/components/incoming-call"
import { ThemeController } from "@/features/theme/components/theme-controller"
import { APP_NAME } from "@/lib/config"
import "./globals.css"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Messagerie instantanée",
  applicationName: APP_NAME,
  // Ajout à l'écran d'accueil iOS : lancement plein écran, comme une app native.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Nécessaire pour que `env(safe-area-inset-*)` tienne compte de l'encoche et de la barre d'accueil.
  viewportFit: "cover",
  // Android : le clavier virtuel réduit la zone d'affichage au lieu de recouvrir la page.
  interactiveWidget: "resizes-content",
  // Pas de `themeColor` ici : la couleur de la barre suit le thème choisi (`ThemeController`).
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `data-theme` est posé sur `<html>` avant l'hydratation, par le script du thème.
    <html lang="fr" className={`${figtree.variable} h-full font-sans antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeController />
        {/* Administrateur connecté « en tant que » quelqu'un : toujours visible. */}
        <ImpersonationBanner />
        {children}
        {/* Les appels des amis et des groupes sonnent sur toutes les pages. */}
        <IncomingCallNotifier />
        {/* Sessions fermées depuis un autre appareil : retour à la connexion, partout. */}
        <SessionEndedListener />
        {/* Notification touchée, application déjà ouverte : on y navigue sur place. */}
        <PushNavigationListener />
      </body>
    </html>
  )
}
