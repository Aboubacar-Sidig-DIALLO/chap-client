"use client"

import { useState } from "react"
import { Cancel01Icon, Tick02Icon, UserAdd01Icon, UserCheck01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Relation } from "../types"

interface RelationActionsProps {
  name: string
  relation: Relation
  onAdd: () => Promise<unknown>
  onRemove: () => Promise<unknown>
}

/**
 * Les actions possibles avec quelqu'un, selon le lien que l'on a avec lui :
 * l'ajouter, accepter ou refuser sa demande, annuler la sienne.
 */
export function RelationActions({ name, relation, onAdd, onRemove }: RelationActionsProps) {
  const [isBusy, setIsBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true)
    await action()
    setIsBusy(false)
  }

  if (isBusy) return <Spinner className="mx-3 text-muted-foreground" />

  switch (relation) {
    case "none":
      return (
        <Button size="sm" onClick={() => run(onAdd)} className="h-9 px-3.5">
          <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} data-icon="inline-start" />
          Ajouter
        </Button>
      )
    case "incoming":
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => run(onRemove)}
            aria-label={`Refuser la demande de ${name}`}
            className="size-9 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
          <Button size="sm" onClick={() => run(onAdd)} className="h-9 px-3.5">
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
            Accepter
          </Button>
        </>
      )
    case "outgoing":
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => run(onRemove)}
          aria-label={`Annuler la demande envoyée à ${name}`}
          className="h-9 px-3.5"
        >
          Annuler
        </Button>
      )
    case "friend":
      return (
        <span className="flex items-center gap-1 px-2 text-sm font-medium text-muted-foreground">
          <HugeiconsIcon icon={UserCheck01Icon} size={16} strokeWidth={2} />
          Ami
        </span>
      )
  }
}
