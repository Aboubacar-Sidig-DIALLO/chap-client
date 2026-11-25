import { ImageResponse } from "next/og"

/** Icône de l'application (bulle de discussion), générée à la taille demandée. */
export function renderAppIcon(size: number, { rounded = true } = {}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg
          width={size * 0.56}
          height={size * 0.56}
          // Décalé pour centrer visuellement la bulle (sa queue est en bas à gauche).
          viewBox="-2 -0.75 24 24"
          fill="none"
          stroke="#fafafa"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 18.5 4 21v-4.6A8.5 8.5 0 1 1 8 18.5Z" />
          <path d="M6.5 8.75h7M6.5 12.25h4.5" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
