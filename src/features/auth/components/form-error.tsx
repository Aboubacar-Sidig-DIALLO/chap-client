/** Message d'erreur annoncé aux lecteurs d'écran dès son apparition. */
export function FormError({ id, children }: { id: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="text-sm text-balance text-destructive">
      {children}
    </p>
  )
}
