/** Bonjour le matin et l'après-midi, bonsoir à partir de 18 h. */
export function greeting(date = new Date()) {
  return date.getHours() >= 18 ? "Bonsoir" : "Bonjour"
}

/** « Bonsoir, Léa » : la salutation, avec le seul prénom. */
export function greetingFor(name: string) {
  return `${greeting()}, ${name.split(" ")[0]}`
}
