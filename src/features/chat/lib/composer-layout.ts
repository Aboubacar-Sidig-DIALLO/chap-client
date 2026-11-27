/**
 * Éléments présents dans les deux modes du compositeur (voix et texte). Avec
 * le même `layoutId`, Motion les fait glisser d'une place à l'autre au lieu
 * de les faire disparaître puis réapparaître :
 * - l'orbe du micro se rétracte en bouton d'envoi, et inversement ;
 * - pièce jointe et selfie rejoignent le champ de saisie.
 */
export const COMPOSER_LAYOUT_IDS = {
  primary: "composer-primary",
  attachments: "composer-attachments",
} as const
