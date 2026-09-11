import { DRIFTERS } from '@/config/world/drifters'

/* Die Artworks der Drifter, vorgeladen und dekodiert. Der Leviathan ist ein
   1254²-Original (≈ 6 MB dekodiert): ohne Vorlauf ruckt sein erster Auftritt. */

const decoded = new Map<string, { img: HTMLImageElement; ready: Promise<void> }>()

export function decodeDrifterArt(src: string): Promise<void> {
  const hit = decoded.get(src)
  if (hit) return hit.ready
  if (typeof Image === 'undefined') return Promise.resolve()
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  const ready = typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve()
  decoded.set(src, { img, ready })
  return ready
}

export function prewarmDrifterArt(): void {
  for (const def of DRIFTERS) void decodeDrifterArt(def.image)
}
