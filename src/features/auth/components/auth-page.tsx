"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { authClient } from "@/lib/auth-client"
import { ROUTES } from "../lib/routes"
import { AuthForm, type AuthMode } from "./auth-form"
import { AuthShell } from "./auth-shell"

const COPY = {
  "sign-up": {
    title: "Ici, on se parle.",
    description: "Un nom, une adresse email, et c'est parti. Pas de mot de passe à retenir.",
    footer: { text: "Déjà un compte ?", link: "Se connecter", href: ROUTES.signIn },
  },
  "sign-in": {
    title: "Content de vous revoir",
    description: "Indiquez l'adresse email de votre compte pour reprendre la conversation.",
    footer: { text: "Pas encore de compte ?", link: "Créer un compte", href: ROUTES.signUp },
  },
} as const

/** Réglages d'entrée d'Animate UI (`recipes/page.md`). */
const ENTRANCE = { fade: true, blur: { initialBlur: 2 }, slide: { offset: 16 } } as const

/**
 * Page d'inscription ou de connexion. `useSearchParams` (email pré-rempli)
 * impose une frontière `Suspense` : en attendant, la page affiche déjà son titre.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const { title, description, footer } = COPY[mode]

  return (
    <Suspense fallback={<AuthShell title={title} description={description} />}>
      <AuthShell
        title={title}
        description={description}
        footer={
          <>
            {footer.text}{" "}
            <Link href={footer.href} className="font-medium text-foreground underline-offset-4 hover:underline">
              {footer.link}
            </Link>
          </>
        }
      >
        <Effect {...ENTRANCE} className="w-full">
          <AuthContent mode={mode} />
        </Effect>
      </AuthShell>
    </Suspense>
  )
}

function AuthContent({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()

  // Déjà connecté, ou compte créé / connexion réussie à l'instant : direction le chat.
  useEffect(() => {
    if (session) router.replace(ROUTES.home)
  }, [session, router])

  // `key` : le formulaire repart de zéro en passant d'une page à l'autre.
  return <AuthForm key={mode} mode={mode} initialEmail={searchParams.get("email") ?? ""} />
}
