import { encode, QrCodeDataType } from "uqr"
import { cn } from "@/lib/utils"

/** Marge blanche autour du code, en modules : les lecteurs en ont besoin pour le repérer. */
const QUIET_ZONE = 2
/** Taille d'un repère de position (les trois grands carrés des coins). */
const FINDER_SIZE = 7

interface QrCodeProps {
  value: string
  /** Ce que lit un lecteur d'écran. */
  label: string
  className?: string
}

/**
 * QR code dessiné en SVG : modules arrondis, repères en carrés doux teintés
 * de la couleur « voix ». Toujours foncé sur fond clair, même en thème
 * sombre : c'est ce que les appareils photo lisent le mieux.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  // Niveau « M » : reste lisible abîmé à 15 %, sans alourdir le code.
  const { size, data, types } = encode(value, { ecc: "M", border: 0 })
  const extent = size + QUIET_ZONE * 2
  const finders = [
    [0, 0],
    [size - FINDER_SIZE, 0],
    [0, size - FINDER_SIZE],
  ]

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${extent} ${extent}`}
      shapeRendering="geometricPrecision"
      className={cn("block bg-white", className)}
    >
      <g fill="#0b0b12">
        {data.flatMap((row, y) =>
          row.map((isDark, x) =>
            // Les repères de position sont dessinés à part, ci-dessous.
            isDark && types[y][x] !== QrCodeDataType.Position ? (
              <rect key={`${x}:${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.3} />
            ) : null
          )
        )}
      </g>
      {finders.map(([x, y]) => (
        <g key={`${x}:${y}`} className="text-voice">
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={FINDER_SIZE - 1}
            height={FINDER_SIZE - 1}
            rx={1.8}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
