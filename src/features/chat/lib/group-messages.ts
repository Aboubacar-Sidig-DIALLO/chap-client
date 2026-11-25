import type { ChatMessage, ChatUser } from "../types"
import { isSameDay } from "./format"

/** Deux messages consécutifs du même auteur sont regroupés s'ils ont moins de 5 min d'écart. */
const GROUP_WINDOW_MS = 5 * 60 * 1000

/** Suite de messages consécutifs d'un même auteur. */
export interface MessageRun {
  author: ChatUser
  messages: ChatMessage[]
}

/** Messages d'une même journée. */
export interface DaySection {
  date: string
  runs: MessageRun[]
}

function belongsToRun(run: MessageRun, message: ChatMessage) {
  const previous = run.messages[run.messages.length - 1]
  const gap = Date.parse(message.createdAt) - Date.parse(previous.createdAt)

  return (
    run.author.id === message.author.id &&
    gap < GROUP_WINDOW_MS &&
    // La trace d'un direct reste seule : elle s'affiche au centre du fil.
    !message.call &&
    !previous.call
  )
}

export function groupMessages(messages: ChatMessage[]): DaySection[] {
  const sections: DaySection[] = []

  for (const message of messages) {
    let section = sections[sections.length - 1]

    if (
      !section ||
      !isSameDay(new Date(section.date), new Date(message.createdAt))
    ) {
      section = { date: message.createdAt, runs: [] }
      sections.push(section)
    }

    const run = section.runs[section.runs.length - 1]

    if (run && belongsToRun(run, message)) {
      run.messages.push(message)
    } else {
      section.runs.push({ author: message.author, messages: [message] })
    }
  }

  return sections
}
