"use client"

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { SEARCH_MAX_LENGTH } from "../lib/config"

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  isSearching: boolean
  ref?: React.Ref<HTMLInputElement>
}

/** Champ de recherche de personnes, toujours à portée de main en haut de l'accueil. */
export function SearchField({ value, onChange, isSearching, ref }: SearchFieldProps) {
  return (
    <div role="search" className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
        {isSearching ? <Spinner size={18} /> : <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} />}
      </span>
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("")
        }}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder="Rechercher quelqu'un par son nom"
        aria-label="Rechercher quelqu'un par son nom"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-12 pr-12 pl-11 text-base [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
          className="absolute inset-y-0 right-1.5 my-auto size-9 text-muted-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </Button>
      )}
    </div>
  )
}
