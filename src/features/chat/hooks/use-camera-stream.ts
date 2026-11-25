"use client"

import { useEffect, useRef, useState } from "react"
import {
  getCameraErrorMessage,
  hasMultipleCameras,
  openCamera,
  stopStream,
  type FacingMode,
} from "../lib/camera"

/**
 * Flux vidéo de la caméra, branché sur `videoRef`. La caméra est ouverte au
 * montage et coupée au démontage : pour changer de caméra ou réessayer après
 * une erreur, il suffit de remonter le composant (via sa `key`).
 */
export function useCameraStream(facingMode: FacingMode) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)

  useEffect(() => {
    let isActive = true
    let acquired: MediaStream | undefined

    openCamera(facingMode)
      .then(async (cameraStream) => {
        acquired = cameraStream
        // Composant démonté pendant la demande d'autorisation : on libère tout de suite.
        if (!isActive) return stopStream(cameraStream)

        setStream(cameraStream)
        // La liste des caméras n'est complète qu'une fois l'autorisation accordée.
        const multiple = await hasMultipleCameras()
        if (isActive) setCanSwitchCamera(multiple)
      })
      .catch((cameraError: unknown) => {
        if (isActive) setError(getCameraErrorMessage(cameraError))
      })

    return () => {
      isActive = false
      if (acquired) stopStream(acquired)
    }
  }, [facingMode])

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  return { videoRef, error, canSwitchCamera }
}
