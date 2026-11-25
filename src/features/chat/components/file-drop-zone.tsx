"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { CloudUpload } from "@/components/animate-ui/icons/hugeicons/cloud-upload"
import { cn } from "@/lib/utils"
import { MAX_FILE_SIZE } from "../lib/config"
import { formatFileSize } from "../lib/format"

interface FileDropZoneProps extends React.ComponentProps<"div"> {
  onDropFiles: (files: FileList) => void
}

function hasFiles(event: React.DragEvent) {
  return event.dataTransfer.types.includes("Files")
}

/** Zone acceptant le glisser-déposer de fichiers, avec un calque d'indication. */
export function FileDropZone({
  onDropFiles,
  className,
  children,
  ...props
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  // `dragenter`/`dragleave` se déclenchent aussi sur chaque enfant survolé :
  // on compte la profondeur pour ne masquer le calque qu'en sortant de la zone.
  const depthRef = useRef(0)
  const fade = useTempoTransition(transition.fade)

  function reset() {
    depthRef.current = 0
    setIsDragging(false)
  }

  return (
    <div
      {...props}
      className={cn("relative", className)}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        depthRef.current++
        setIsDragging(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        // Sans `preventDefault`, le navigateur ouvrirait le fichier à la place de la page.
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return
        depthRef.current--
        if (depthRef.current <= 0) reset()
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        reset()
        onDropFiles(event.dataTransfer.files)
      }}
    >
      {children}

      {/* Le calque apparaît et disparaît en fondu (`transition.fade`) : il ne coupe pas net au dépôt. */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            key="drop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: fade }}
            exit={{ opacity: 0, transition: fade }}
            className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-background/85 text-center backdrop-blur-sm"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {/* En boucle tant que le calque est visible : il invite à lâcher le fichier. */}
              <CloudUpload size={24} animate loop />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Déposez vos fichiers ici</p>
              <p className="text-xs text-muted-foreground">
                Images et documents · {formatFileSize(MAX_FILE_SIZE)} max par fichier
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
