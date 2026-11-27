"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { authClient } from "@/lib/auth-client"
import { authHref, NEXT_PARAM, ROUTES, safeNextPath } from "../lib/routes"
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
            {footer.text} <AuthSwitchLink href={footer.href}>{footer.link}</AuthSwitchLink>
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

/** La page où revenir une fois connecté (chemin interne vérifié), ou `null`. */
function useNextPath() {
  return safeNextPath(useSearchParams().get(NEXT_PARAM))
}

function AuthContent({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = useNextPath()
  const { data: session } = authClient.useSession()

  // Déjà connecté, ou compte créé / connexion réussie à l'instant : direction la
  // page demandée (une invitation…), sinon le chat.
  useEffect(() => {
    if (session) router.replace(next ?? ROUTES.home)
  }, [session, router, next])

  return (
    <div className="flex w-full flex-col gap-5">
      {next?.startsWith(ROUTES.invite("")) && (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-voice/20 bg-voice/8 px-3.5 py-2.5 text-left text-sm"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={18} strokeWidth={2} aria-hidden className="shrink-0 text-voice" />
          {mode === "sign-up"
            ? "Créez votre compte pour accepter l'invitation : on vous y ramène aussitôt."
            : "Connectez-vous pour accepter l'invitation : on vous y ramène aussitôt."}
        </p>
      )}
      {/* `key` : le formulaire repart de zéro en passant d'une page à l'autre. */}
      <AuthForm key={mode} mode={mode} initialEmail={searchParams.get("email") ?? ""} next={next} />
    </div>
  )
}

/** Vers l'autre parcours (connexion ↔ inscription), sans perdre la page où revenir. */
function AuthSwitchLink({ href, children }: { href: string; children: React.ReactNode }) {
  const next = useNextPath()
  return (
    <Link href={authHref(href, { next })} className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
