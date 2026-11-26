"use client"

import { CallEnd01Icon, Mic01Icon, MicOff01Icon, SmilePlusIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { CameraKey } from "@/components/camera-key"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ReactionBar } from "@/features/chat/components/message-reactions"
import { useCall } from "./call-provider"

const KEY_SIZE = 56

/** Bouton rond du direct, toujours accompagné de son libellé. */
const ROUND_KEY =
  "press grid size-14 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

/**
 * Commandes du direct : micro, caméra (une vraie lentille qui s'ouvre sur vous),
 * réactions, et sortie.
 */
export function CallControls() {
  const { call, session, isDirect } = useCall()
  const isJoined = call.status === "joined"

  return (
    <div role="toolbar" aria-label={isDirect ? "Commandes de l'appel" : "Commandes du direct"} className="flex items-start justify-center gap-5 sm:gap-7">
      <ControlItem label={call.isMuted ? "Micro coupé" : "Micro"}>
        <button
          type="button"
          role="switch"
          aria-checked={!call.isMuted}
          aria-label="Micro"
          disabled={!isJoined}
          onClick={session.toggleMute}
          className={cn(
            ROUND_KEY,
            call.isMuted
              ? "bg-destructive/12 text-destructive"
              : "border bg-background text-foreground shadow-sm"
          )}
        >
          <HugeiconsIcon icon={call.isMuted ? MicOff01Icon : Mic01Icon} size={22} strokeWidth={1.8} />
        </button>
      </ControlItem>

      {/* La touche affiche elle-même son état sous la lentille. */}
      <CameraKey
        size={KEY_SIZE}
        stream={call.cameraStream}
        defaultOn={call.cameraStream !== null}
        onToggle={session.setCamera}
        disabled={!isJoined}
        labels={{
          off: "Caméra",
          starting: "Ouverture…",
          on: "Caméra",
          blocked: "Caméra bloquée",
        }}
        className="text-xs"
      />

      <ControlItem label="Réagir">
        <Popover>
          <PopoverTrigger
            aria-label="Envoyer une réaction"
            disabled={!isJoined}
            className={cn(ROUND_KEY, "border bg-background shadow-sm data-popup-open:bg-muted")}
          >
            <HugeiconsIcon icon={SmilePlusIcon} size={22} strokeWidth={1.8} />
          </PopoverTrigger>
          {/* Reste ouverte : on enchaîne les réactions. */}
          <PopoverContent side="top" className="w-auto rounded-full p-1 shadow-lg">
            <ReactionBar onSelect={session.react} />
          </PopoverContent>
        </Popover>
      </ControlItem>

      <ControlItem label={isDirect ? "Raccrocher" : "Quitter"}>
        <button
          type="button"
          aria-label={isDirect ? "Raccrocher" : "Quitter le direct"}
          onClick={session.leave}
          className={cn(ROUND_KEY, "bg-destructive text-white shadow-md shadow-destructive/30")}
        >
          <HugeiconsIcon icon={CallEnd01Icon} size={22} strokeWidth={1.8} />
        </button>
      </ControlItem>
    </div>
  )
}

function ControlItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span aria-hidden className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
