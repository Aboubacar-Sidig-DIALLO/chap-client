"use client"

import { useState } from "react"
import { Call02Icon, Clock01Icon, LockIcon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { LiveDot } from "@/features/call/components/live-dot"
import { GroupAvatar } from "@/features/social/components/group-avatar"
import { GUEST_NAME_MAX_LENGTH } from "../lib/config"
import type { GuestLinkPreview } from "../types"

const ASSURANCES: { icon: IconSvgElement; text: string }[] = [
  { icon: UserIcon, text: "Pas besoin de compte : un nom suffit." },
  { icon: LockIcon, text: "Vous ne verrez que l'appel, ni le groupe ni ses messages." },
  { icon: Clock01Icon, text: "Votre accès prend fin avec l'appel ; ce lien ne sert qu'une fois." },
]

interface GuestLobbyProps {
  preview: GuestLinkPreview
  isJoining: boolean
  error: string | null
  onJoin: (name: string) => void
}

/** Avant d'entrer : quel appel, qui invite, et sous quel nom on y apparaîtra. */
export function GuestLobby({ preview, isJoining, error, onJoin }: GuestLobbyProps) {
  const [name, setName] = useState("")
  const { group, inviterName, participantCount } = preview
  const cleanName = name.replace(/\s+/g, " ").trim()

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* Sans identifiant de groupe (l'invité n'en connaît que le nom), la teinte suit le nom. */}
        <GroupAvatar group={{ id: group.name, name: group.name, photoUrl: group.photoUrl }} size="xl" />
        <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium shadow-xs ring-1 ring-border">
          <LiveDot /> En direct · {participantCount} {participantCount > 1 ? "personnes" : "personne"}
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Rejoindre l&apos;appel de « {group.name} »</h1>
        <p className="text-sm text-balance text-muted-foreground">
          {inviterName} vous invite à participer à cet appel.
        </p>
      </div>

      <form
        className="flex w-full flex-col gap-3 text-left"
        onSubmit={(event) => {
          event.preventDefault()
          if (cleanName) onJoin(cleanName)
        }}
      >
        <label htmlFor="guest-name" className="text-sm font-medium">
          Votre nom
        </label>
        <Input
          id="guest-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={GUEST_NAME_MAX_LENGTH}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="go"
          autoFocus
          required
          placeholder="Comment les autres vous verront"
          aria-describedby={error ? "guest-join-error" : "guest-mic-hint"}
          className="h-12 px-4 text-base sm:h-11"
        />
        <Button type="submit" size="lg" disabled={!cleanName || isJoining} className="h-12 text-base">
          {isJoining ? <Spinner size={16} /> : <HugeiconsIcon icon={Call02Icon} strokeWidth={2} data-icon="inline-start" />}
          Rejoindre l&apos;appel
        </Button>
        {error ? (
          <p id="guest-join-error" role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        ) : (
          <p id="guest-mic-hint" className="text-center text-xs text-muted-foreground">
            Votre navigateur vous demandera l&apos;accès au micro.
          </p>
        )}
      </form>

      <ul className="flex w-full flex-col gap-2.5 rounded-2xl border bg-card/60 p-4 text-left text-sm text-muted-foreground">
        {ASSURANCES.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-2.5">
            <HugeiconsIcon icon={icon} size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-voice" />
            {text}
          </li>
        ))}
      </ul>
    </>
  )
}
