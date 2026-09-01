/**
 * Ein Canvas-Kontext, der nur mitschreibt.
 *
 * jsdom liefert für `getContext('2d')` `null` — ein rasternder Vergleich prüfte
 * dort nichts und sähe trotzdem grün aus. Aufgezeichnet werden Befehl und
 * gerundete Koordinaten; das trennt zwei Motive zuverlässig, ohne einen Pixel zu
 * brauchen.
 */
export function recordingCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = []
  const num = (v: number) => Math.round(v * 100) / 100
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(
        `${name}(${args.map((a) => (typeof a === 'number' ? num(a) : String(a))).join(',')})`,
      )
    }
  const gradient = { addColorStop: rec('addColorStop') }
  const ctx = {
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    rect: rec('rect'),
    fillRect: rec('fillRect'),
    clearRect: rec('clearRect'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    bezierCurveTo: rec('bezierCurveTo'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    scale: rec('scale'),
    setTransform: rec('setTransform'),
    setLineDash: rec('setLineDash'),
    drawImage: rec('drawImage'),
    createLinearGradient: (...a: unknown[]) => {
      rec('createLinearGradient')(...a)
      return gradient
    },
    createRadialGradient: (...a: unknown[]) => {
      rec('createRadialGradient')(...a)
      return gradient
    },
    createPattern: () => null,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D
  return { ctx, ops }
}
