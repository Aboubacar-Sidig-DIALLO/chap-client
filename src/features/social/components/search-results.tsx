"use client"

import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import type { Relation, SearchResult } from "../types"
import { InviteButton } from "./invite-button"
import { PersonRow } from "./person-row"
import { RelationActions } from "./relation-actions"
import { Section, SectionEmpty, SectionList } from "./section"

const RELATION_LABEL: Partial<Record<Relation, string>> = {
  incoming: "Vous a envoyé une demande",
  outgoing: "Demande envoyée",
}

interface SearchResultsProps {
  query: string
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  onAdd: (userId: string) => Promise<unknown>
  onRemove: (userId: string) => Promise<unknown>
}

/** Résultats de recherche, chacun avec l'action adaptée au lien que l'on a avec la personne. */
export function SearchResults({ query, results, isSearching, error, onAdd, onRemove }: SearchResultsProps) {
  if (error) {
    return <p role="alert" className="px-1 text-sm text-destructive">{error}</p>
  }

  if (results.length === 0) {
    if (isSearching) return null
    return (
      <SectionEmpty
        icon={<HugeiconsIcon icon={Search01Icon} strokeWidth={2} />}
        title="Aucun résultat"
        description={`Personne ne s'appelle « ${query.trim()} » ici pour l'instant. Vérifiez l'orthographe, ou invitez cette personne à vous rejoindre.`}
        action={<InviteButton />}
      />
    )
  }

  return (
    <Section title="Résultats" count={results.length}>
      {/* Résultats précédents atténués pendant la recherche suivante. */}
      <div aria-busy={isSearching} className={cn("transition-opacity", isSearching && "opacity-60")}>
        <SectionList>
          {results.map((user) => (
            <PersonRow
              key={user.id}
              user={user}
              description={RELATION_LABEL[user.relation]}
              actions={
                <RelationActions
                  name={user.name}
                  relation={user.relation}
                  onAdd={() => onAdd(user.id)}
                  onRemove={() => onRemove(user.id)}
                />
              }
            />
          ))}
        </SectionList>
      </div>
    </Section>
  )
}
