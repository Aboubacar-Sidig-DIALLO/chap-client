"use client"

import { useEffect, useEffectEvent } from "react"

/**
 * Ce que le panneau de bienvenue peut demander à la barre latérale. Les deux sont
 * voisins dans la coque, sans état partagé : la demande passe par un événement.
 */
export type HomeCommand = "search" | "create-group"

const EVENT_NAME = "home-command"
const COMMANDS: readonly HomeCommand[] = ["search", "create-group"]

function isHomeCommand(value: unknown): value is HomeCommand {
  return COMMANDS.includes(value as HomeCommand)
}

/** Demande une action à la barre latérale. */
export function sendHomeCommand(command: HomeCommand) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: command }))
}

/** Exécute les actions demandées par `sendHomeCommand` ; toute autre valeur est ignorée. */
export function useHomeCommands(onCommand: (command: HomeCommand) => void) {
  const handleCommand = useEffectEvent(onCommand)

  useEffect(() => {
    function handleEvent(event: Event) {
      const command = (event as CustomEvent<unknown>).detail
      if (isHomeCommand(command)) handleCommand(command)
    }

    window.addEventListener(EVENT_NAME, handleEvent)
    return () => window.removeEventListener(EVENT_NAME, handleEvent)
  }, [])
}
