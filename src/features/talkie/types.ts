import type { ChatUser } from "@/features/chat/types"

/**
 * Où en est votre prise de parole :
 * - `requesting` : le serveur est interrogé (le début de la voix est gardé) ;
 * - `live` : on vous entend en direct ;
 * - `alone` : personne n'a la conversation ouverte, ou vous êtes en appel ;
 * - `busy` : quelqu'un parle déjà ;
 * - `unavailable` : direct refusé ou interrompu.
 *
 * Dans tous les cas, l'enregistrement part ensuite comme vocal classique.
 */
export type OutgoingTalkStatus = "requesting" | "live" | "alone" | "busy" | "unavailable"

export interface OutgoingTalk {
  /** Id du vocal qui suivra. */
  id: string
  status: OutgoingTalkStatus
  /** Qui vous entend (en direct). */
  listeners: ChatUser[]
  /** Qui parle déjà (`busy`). */
  speaker: ChatUser | null
}

/** Quelqu'un vous parle en direct. */
export interface IncomingTalk {
  id: string
  user: ChatUser
}

/** Tout ce que l'interface affiche du talkie-walkie ; remplacé (jamais modifié) à chaque changement. */
export interface TalkieSnapshot {
  outgoing: OutgoingTalk | null
  incoming: IncomingTalk | null
  /** Vous avez coupé le son des directs reçus (sur cet appareil). */
  isMuted: boolean
  /** Le navigateur attend un geste avant de jouer du son : « touchez pour écouter ». */
  needsTap: boolean
  /** Les autres participants qui ont la conversation ouverte : ils vous entendraient. */
  audience: ChatUser[]
  /** En appel dans cette conversation : le direct passe déjà par l'appel. */
  isSuppressed: boolean
}
