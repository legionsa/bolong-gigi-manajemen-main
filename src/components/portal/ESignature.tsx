import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Eraser, Download, Undo, CheckCircle } from 'lucide-react'

interface ESignatureProps {
  value?: string
  onChange: (signature: string) => void
  width?: number
  height?: number
  lineWidth?: number
  lineColor?: string
  className?: string
}

export function ESignature({
  value = '',
  onChange,
  width = 500,
  height = 200,
  lineWidth = 2,
  lineColor = '#000000',
  className = '',
}: ESignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const { toast } = useToast()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas with proper DPI scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Set drawing styles
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // If there's an existing signature, draw it
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        setHasSignature(true)
        saveToHistory()
      }
      img.src = value
    } else {
      saveToHistory()
    }
  }, [width, height, lineWidth, lineColor])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, width, height)
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), imageData])
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex, width, height])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
      updateSignature()
    }
  }

  const updateSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  const undo = () => {
    if (historyIndex <= 0) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const newIndex = historyIndex - 1
    ctx.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
    updateSignature()
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    setHasSignature(false)
    saveToHistory()
    onChange('')
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'signature.png'
    link.href = canvas.toDataURL('image/png')
    link.click()

    toast({
      title: 'Tanda Tangan Diunduh',
      description: 'File signature.png telah disimpan.',
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Tanda Tangan Elektronik</CardTitle>
        <CardDescription>
          Gambar tanda tangan Anda pada kotak di bawah
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
          />

          {/* Signature line */}
          <div className="absolute bottom-8 left-4 right-4 border-b border-gray-300" />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <span className="text-xs text-gray-400 bg-white px-2">
              Tulis tanda tangan di atas garis ini
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={!hasSignature}
            >
              <Eraser className="w-4 h-4 mr-1" />
              Hapus
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={download}
            disabled={!hasSignature}
          >
            <Download className="w-4 h-4 mr-1" />
            Unduh
          </Button>
        </div>

        {hasSignature && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Tanda tangan telah direkam</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}