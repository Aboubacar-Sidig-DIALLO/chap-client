import {
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  THEME_ATTRIBUTE,
  THEME_COLORS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "./theme"

const json = JSON.stringify

/**
 * Script lancé pendant la lecture du HTML, avant la première peinture : il pose
 * le thème sur `<html>` et la couleur de la barre du navigateur, sans flash ni
 * erreur d'hydratation. Il n'est construit qu'à partir de constantes (aucune
 * donnée extérieure n'y est injectée), et une valeur stockée inconnue ou un
 * stockage inaccessible ramènent à l'apparence de l'appareil.
 * Doit rester fidèle à `applyTheme` (`theme-dom.ts`), qui prend le relais ensuite.
 */
export const THEME_SCRIPT = `(function(){var p;try{p=localStorage.getItem(${json(THEME_STORAGE_KEY)})}catch(e){}if(${json(THEME_PREFERENCES)}.indexOf(p)<0)p=${json(DEFAULT_THEME_PREFERENCE)};var t=p==="system"?(matchMedia(${json(DARK_SCHEME_QUERY)}).matches?"dark":"light"):p;document.documentElement.setAttribute(${json(THEME_ATTRIBUTE)},t);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=${json(THEME_COLORS)}[t]})()`
