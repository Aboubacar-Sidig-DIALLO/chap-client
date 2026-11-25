import type { ImageMetadata } from "../types"

/** `[161, 178, 195]` → `#a1b2c3`. */
function toHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

/**
 * Mesure une image avant l'envoi : ses dimensions (orientation de l'appareil
 * photo comprise) et sa couleur dominante, obtenue en la réduisant à un pixel.
 * De quoi réserver sa place exacte et la teinter pendant son chargement.
 *
 * @returns `undefined` si l'image ne peut pas être lue (elle partira sans).
 */
export async function readImageMetadata(file: Blob): Promise<ImageMetadata | undefined> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const { width, height } = bitmap

    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d", { willReadFrequently: true })
    context?.drawImage(bitmap, 0, 0, 1, 1)
    bitmap.close()

    const [red = 0, green = 0, blue = 0] = context?.getImageData(0, 0, 1, 1).data ?? []
    return { width, height, color: toHex(red, green, blue) }
  } catch {
    return undefined
  }
}
