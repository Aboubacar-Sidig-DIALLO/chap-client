/* eslint-disable @next/next/no-img-element -- images d'utilisateurs servies par l'API ; la visionneuse a besoin de vrais <img>. */
"use client"

import { useState } from "react"
import { ImageViewer } from "@/components/image-viewer"
import { cn } from "@/lib/utils"
import { getAttachmentUrl } from "../lib/attachments"
import type { Attachment } from "../types"

/** Cases visibles au plus ; au-delà, la dernière affiche « +N ». */
const MAX_TILES = 4
/** Bornes du format d'une image seule (largeur / hauteur) : ni bandeau, ni colonne. */
const MIN_RATIO = 3 / 4
const MAX_RATIO = 2
const FALLBACK_RATIO = 4 / 3

function getRatio(image: Attachment) {
  const meta = image.image
  if (!meta) return FALLBACK_RATIO
  return Math.min(Math.max(meta.width / meta.height, MIN_RATIO), MAX_RATIO)
}

/** Disposition de la grille selon le nombre d'images. */
function getLayout(count: number) {
  if (count === 1) return ""
  if (count === 3) return "aspect-square grid-cols-2 grid-rows-2"
  return "grid-cols-2"
}

interface ImageMosaicProps {
  images: Attachment[]
  isOwn: boolean
}

/**
 * Images d'un message, en mosaïque : une image seule garde son format, plusieurs
 * se partagent la grille (2, 3 avec une grande à gauche, 2×2 avec « +N »).
 * Toucher une image l'ouvre en grand depuis sa place (Hairline UI `ImageViewer`).
 */
export function ImageMosaic({ images, isOwn }: ImageMosaicProps) {
  const visible = images.slice(0, MAX_TILES)
  const hidden = images.slice(MAX_TILES)
  const isSingle = images.length === 1

  return (
    <ImageViewer selector="img[data-zoom]" labels={{ close: "Fermer", next: "Image suivante", previous: "Image précédente", zoomIn: "Agrandir", zoomOut: "Réduire", viewer: "Visionneuse d'images" }}>
      <div
        className={cn(
          "grid gap-0.5 overflow-hidden rounded-[1.25rem] shadow-sm ring-1 ring-black/5 dark:ring-white/10",
          // La pointe de la bulle, côté auteur.
          isOwn ? "rounded-br-md" : "rounded-bl-md",
          getLayout(images.length)
        )}
      >
        {visible.map((image, index) => {
          const isLast = index === visible.length - 1
          return (
            <ImageTile
              key={image.id}
              image={image}
              className={cn(
                !isSingle && images.length !== 3 && "aspect-square",
                images.length === 3 && index === 0 && "row-span-2"
              )}
              style={isSingle ? { aspectRatio: getRatio(image) } : undefined}
            >
              {/* Les images en plus restent dans la page (invisibles) : la visionneuse les fait défiler. */}
              {isLast &&
                hidden.map((extra) => (
                  <img
                    key={extra.id}
                    data-zoom
                    src={getAttachmentUrl(extra)}
                    alt={extra.name}
                    loading="lazy"
                    className="pointer-events-none absolute inset-0 size-full object-cover opacity-0"
                  />
                ))}
              {isLast && hidden.length > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 text-2xl font-semibold text-white backdrop-blur-[2px]"
                >
                  +{hidden.length}
                </span>
              )}
            </ImageTile>
          )
        })}
      </div>
    </ImageViewer>
  )
}

interface ImageTileProps {
  image: Attachment
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

/** Une case : la couleur dominante de l'image patiente, puis l'image apparaît en fondu. */
function ImageTile({ image, className, style, children }: ImageTileProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div
      className={cn("relative min-h-0 overflow-hidden bg-muted", className)}
      style={{ backgroundColor: image.image?.color, ...style }}
    >
      <img
        data-zoom
        src={getAttachmentUrl(image)}
        alt={image.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "size-full cursor-zoom-in object-cover transition-[opacity,filter] duration-500 hover:brightness-95",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
      {children}
    </div>
  )
}
