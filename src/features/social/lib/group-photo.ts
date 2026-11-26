import { GROUP_PHOTO_SIZE } from "./config"

const UNREADABLE = "Cette image ne peut pas être lue. Essayez une photo JPEG ou PNG."

/** Image refusée avant l'envoi ; son message s'affiche tel quel. */
export class PhotoError extends Error {}

/**
 * Prépare la photo d'un groupe avant l'envoi : recadrée en carré sur son
 * centre (elle s'affiche dans une tuile carrée), réduite à
 * `GROUP_PHOTO_SIZE` px et convertie en JPEG. Une photo de plusieurs Mo
 * devient un fichier léger, et les métadonnées (position GPS…) disparaissent.
 *
 * Lève une `PhotoError` au message lisible si l'image ne peut pas être lue.
 */
export async function prepareGroupPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new PhotoError("Choisissez une image.")

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new PhotoError(UNREADABLE)
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.min(GROUP_PHOTO_SIZE, side)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new PhotoError(UNREADABLE)
  }

  context.imageSmoothingQuality = "high"
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  )
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
  if (!blob) throw new PhotoError(UNREADABLE)
  return blob
}
