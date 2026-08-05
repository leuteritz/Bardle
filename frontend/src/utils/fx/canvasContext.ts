// utils/canvasContext.ts
// Chrome darf den Backing-Store eines 2D-Canvas verwerfen, wenn der Tab lange
// im Hintergrund war (GPU-Speicherdruck). Danach werden alle Zeichenbefehle
// stillschweigend verworfen — die rAF-Loop läuft normal weiter, aber der
// Canvas bleibt bis zum Reload leer. Das Neusetzen der Dimensionen erzwingt
// einen frischen Backing-Store; Loops, die pro Frame vollständig neu zeichnen,
// heilen sich damit im nächsten Frame selbst.

type Ctx2DWithLossCheck = CanvasRenderingContext2D & { isContextLost?: () => boolean }

/** Reallocates the canvas backing store if its 2D context was lost. */
export function resetCanvasIfContextLost(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d') as Ctx2DWithLossCheck | null
  if (!ctx?.isContextLost?.()) return
  const w = canvas.width
  const h = canvas.height
  canvas.width = w
  canvas.height = h
}
