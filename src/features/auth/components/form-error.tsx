"use client"

import { Reveal } from "@/components/motion/reveal"

interface FormErrorProps {
  id: string
  children: React.ReactNode
  /** Espace (px) entre les champs du formulaire : il s'ouvre avec le message. */
  gap?: number
}

/**
 * Message d'erreur annoncé aux lecteurs d'écran dès son apparition. Il se
 * déplie sous le champ, poussant doucement le bouton, et se replie de même.
 */
export function FormError({ id, children, gap = 16 }: FormErrorProps) {
  return (
    <Reveal show={Boolean(children)} gap={gap}>
      <p id={id} role="alert" className="text-sm text-balance text-destructive">
        {children}
      </p>
    </Reveal>
  )
}
