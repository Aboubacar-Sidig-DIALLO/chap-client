import Link from "next/link"
import { Alert02Icon, CallEnd01Icon, Call02Icon, UserRemove01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"

/** Les écrans de l'invité hors de l'appel : terminé, retiré, sorti, lien caduc, injoignable. */
export type GuestScreen =
  | { kind: "ended"; groupName: string | null }
  | { kind: "removed" }
  | { kind: "left"; error: string | null }
  | { kind: "gone"; message: string }
  | { kind: "unreachable"; message: string }

interface GuestCallOutcomeProps {
  screen: GuestScreen
  /** Revenir dans l'appel (sorti) ou réessayer (injoignable). */
  onRetry?: () => void
}

const COPY: Record<GuestScreen["kind"], { icon: IconSvgElement; title: string }> = {
  ended: { icon: CallEnd01Icon, title: "L'appel est terminé" },
  removed: { icon: UserRemove01Icon, title: "Vous avez été retiré de l'appel" },
  left: { icon: Call02Icon, title: "Vous avez quitté l'appel" },
  gone: { icon: Alert02Icon, title: "Ce lien n'est plus valable" },
  unreachable: { icon: Alert02Icon, title: "Connexion impossible" },
}

function descriptionOf(screen: GuestScreen) {
  switch (screen.kind) {
    case "ended":
      return "Merci d'y avoir participé. Votre accès a pris fin avec l'appel."
    case "removed":
      return "Un administrateur du groupe a mis fin à votre participation."
    case "left":
      return screen.error ?? "Vous pouvez y revenir tant que l'appel dure."
    case "gone":
    case "unreachable":
      return screen.message
  }
}

/**
 * Hors de l'appel : ce qui s'est passé, de quoi y revenir quand c'est encore
 * possible, et une invitation à créer son compte pour continuer à échanger.
 */
export function GuestCallOutcome({ screen, onRetry }: GuestCallOutcomeProps) {
  const { icon, title } = COPY[screen.kind]
  const canRetry = onRetry && (screen.kind === "left" || screen.kind === "unreachable")

  return (
    <>
      <span aria-hidden className="grid size-20 place-items-center rounded-[1.75rem] bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} size={34} strokeWidth={1.8} />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p role="status" className="text-sm text-balance text-muted-foreground">
          {descriptionOf(screen)}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {canRetry && (
          <Button size="lg" onClick={onRetry} className="h-12 text-base">
            <HugeiconsIcon icon={Call02Icon} strokeWidth={2} data-icon="inline-start" />
            {screen.kind === "left" ? "Revenir dans l'appel" : "Réessayer"}
          </Button>
        )}
        {screen.kind !== "unreachable" && (
          <div className="flex flex-col gap-2 rounded-2xl border bg-card/60 p-4">
            <p className="text-sm text-balance text-muted-foreground">
              {screen.kind === "ended" && screen.groupName
                ? `Pour continuer à échanger avec « ${screen.groupName} », créez votre compte : c'est gratuit, et sans mot de passe.`
                : "Envie de continuer à échanger ? Créez votre compte : c'est gratuit, et sans mot de passe."}
            </p>
            <Link
              href={ROUTES.signUp}
              className={buttonVariants({ variant: canRetry ? "outline" : "default", size: "lg", className: "h-11" })}
            >
              Créer un compte
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
