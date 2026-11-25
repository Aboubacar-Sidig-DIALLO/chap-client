/**
 * Emojis Noto de Google (https://googlefonts.github.io/noto-emoji-animation) :
 * un dessin identique sur tous les appareils, et une version animée.
 */
const NOTO_BASE_URL = "https://fonts.gstatic.com/s/e/notoemoji/latest"

/** « ❤️ » → « 2764_fe0f » : les points de code en hexadécimal, comme les nomme Noto. */
function toNotoCode(emoji: string) {
  return Array.from(emoji, (char) => char.codePointAt(0)!.toString(16)).join("_")
}

/** Image de l'emoji : fixe (SVG léger) ou animée (WebP). */
export function getNotoEmojiUrl(emoji: string, animated: boolean) {
  return `${NOTO_BASE_URL}/${toNotoCode(emoji)}/${animated ? "512.webp" : "emoji.svg"}`
}

/** Au-delà, un message d'emojis s'affiche comme du texte normal. */
const MAX_JUMBO_EMOJIS = 3

const segmenter = new Intl.Segmenter("fr", { granularity: "grapheme" })
/** Un emoji affiché en image (« ❤️ », « 👍🏽 »), pas un symbole texte comme « © ». */
const EMOJI_PATTERN = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u

/**
 * Emojis d'un message qui n'en contient que quelques-uns (« 🔥 », « 😂👏 »),
 * à afficher en grand ; `null` pour tout autre message.
 */
export function getJumboEmojis(text: string): string[] | null {
  const graphemes = Array.from(segmenter.segment(text.trim()), (item) => item.segment).filter(
    (segment) => segment.trim() !== ""
  )
  const isJumbo =
    graphemes.length > 0 &&
    graphemes.length <= MAX_JUMBO_EMOJIS &&
    graphemes.every((segment) => EMOJI_PATTERN.test(segment))

  return isJumbo ? graphemes : null
}
