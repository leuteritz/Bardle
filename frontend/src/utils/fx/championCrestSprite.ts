/* ── Der Champion-Rahmen im Idle-Orbit als Offscreen-Sprite ───────────────────
   Der Rang eines Champions als gemalter Kranz um sein Portrait: Reif, Nieten,
   Klingen, Krone, Strahlen, Sternkranz — gestuft nach CHAMPION_CREST_STAGES,
   alle zehn Level eine Stufe.

   EIN Bild je Schlüssel (Stufe · Rollenfarbe · px · dpr · Detail), gehängt als
   <img> in einen Slot. Kein Canvas als DOM-Kind — jeder Host-Canvas wird eine
   Compositor-Ebene. Nichts hier bewegt sich: der Kranz fährt im transform des
   Avatars mit, die einzige Animation ist die Deckkraft der Aura-Ebene daneben.

   Der Kranz ist bewusst OFFEN — Zacken, Klingen, Lücken. Ein glatter Ring mit
   Abstand um einen kleinen Körper im Orbit liest sich als Planet.            */

import {
  CHAMPION_CREST_BASE_SIZE,
  CHAMPION_CREST_CANVAS_MAX,
  CHAMPION_CREST_CROSSFADE_MS,
  CHAMPION_CREST_CROWN_GAP,
  CHAMPION_CREST_MAX_BACKING_PX,
  CHAMPION_CREST_MIN_SIZE,
  CHAMPION_CREST_ORNAMENT_MIN_SIZE,
  CHAMPION_CREST_PX_STEP,
  CHAMPION_CREST_SPAN,
  CHAMPION_CREST_STAGES,
  CHAMPION_CREST_URL_MAX,
} from '@/config/constants'
import {
  circle,
  clampSpriteDpr,
  createSpriteCache,
  mix,
  newSpriteCanvas,
  rayGradient,
  rgba,
  spike,
  type Rgb,
} from '@/utils/fx/spaceBody'

export type CrestDetail = 0 | 1

/** Unter CHAMPION_CREST_ORNAMENT_MIN_SIZE trägt der Kranz nur Reif und Nieten. */
export function championCrestDetail(px: number): CrestDetail {
  return px >= CHAMPION_CREST_ORNAMENT_MIN_SIZE ? 1 : 0
}

/** Kante des Sprites, auf CHAMPION_CREST_PX_STEP gerastet. */
export function championCrestPx(px: number): number {
  return Math.max(
    CHAMPION_CREST_PX_STEP,
    Math.round(px / CHAMPION_CREST_PX_STEP) * CHAMPION_CREST_PX_STEP,
  )
}

/**
 * Kante des Kranzes in CSS-px. Der Slot im DOM muss GENAU diese Kante haben,
 * sonst sitzt der Reif nicht auf der Portraitkante: prozentuale `inset` rechnen
 * gegen die Padding-Box des Avatars, dieser Sprite gegen seine Border-Box.
 */
export function championCrestSpan(px: number): number {
  return Math.round(championCrestPx(px) * CHAMPION_CREST_SPAN)
}

function crestBacking(px: number, dpr: number): { span: number; dpr: number } {
  const span = Math.round(px * CHAMPION_CREST_SPAN)
  const d = Math.min(clampSpriteDpr(dpr), CHAMPION_CREST_MAX_BACKING_PX / Math.max(1, span))
  return { span, dpr: Math.max(0.25, Math.floor(d * 100) / 100) }
}

export function championCrestSpriteKey(
  stage: number,
  rgb: Rgb,
  px: number,
  dpr: number,
  detail: CrestDetail,
): string {
  return `${stage}|${rgb[0]},${rgb[1]},${rgb[2]}|${px}|${dpr}|${detail}`
}

/* ── Der Painter ──────────────────────────────────────────────────────────── */

/** Vier Klingen sitzen auf den Diagonalen, acht auf allen Achtelpunkten. */
function bladeAngles(count: number): number[] {
  const out: number[] = []
  const step = (Math.PI * 2) / count
  const off = count === 4 ? Math.PI / 4 : 0
  for (let i = 0; i < count; i++) out.push(off + i * step)
  return out
}

/** Der Kronensektor, in dem weder Klinge noch Kranzzacke stehen darf. */
function underCrown(a: number): boolean {
  const d = a + Math.PI / 2
  return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < CHAMPION_CREST_CROWN_GAP
}

export function paintChampionCrest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rgb: Rgb,
  stage: number,
  u: number,
  detail: CrestDetail,
): void {
  const s = CHAMPION_CREST_STAGES[stage]
  if (!s || s.rim <= 0) return

  const metal = mix(rgb, 255, s.heat)
  const lite = mix(rgb, 255, Math.min(1, s.heat + 0.42))
  const deep = mix(rgb, 0, 0.58)

  const rim = s.rim * u
  const band = r + s.rimGap * u + rim / 2
  const ornate = detail === 1

  // Strahlen liegen ganz hinten und laufen weich aus.
  if (ornate && s.rays > 0) {
    const from = band + rim
    const to = from + 9 * u
    ctx.fillStyle = rayGradient(ctx, cx, cy, to, lite, from / to, 1, 0.34)
    const step = (Math.PI * 2) / s.rays
    for (let i = 0; i < s.rays; i++) {
      spike(ctx, cx, cy, i * step + step / 2, from, to, 0.9 * u)
      ctx.fill()
    }
  }

  // Der Sternkranz schliesst den Reif — aber gezackt, nicht als Kreislinie.
  if (ornate && s.wreath > 0) {
    const step = (Math.PI * 2) / s.wreath
    const from = band + rim * 0.42
    for (let i = 0; i < s.wreath; i++) {
      const a = i * step
      if (s.crown && underCrown(a)) continue
      const long = i % 2 === 0
      spike(ctx, cx, cy, a, from, from + (long ? 2 : 1.2) * u, 0.8 * u)
      ctx.fillStyle = rgba(long ? lite : metal, long ? 0.9 : 0.66)
      ctx.fill()
    }
  }

  if (ornate && s.blades > 0) {
    const from = band + rim * 0.4
    const base = (s.blades === 4 ? 7 : 5.5) * u
    const angles = bladeAngles(s.blades)
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i]
      if (s.crown && underCrown(a)) continue
      const to = from + base * (s.bladeLong && i % 2 === 0 ? 1.75 : 1)
      spike(ctx, cx, cy, a, from, to, 1.5 * u)
      ctx.fillStyle = rgba(metal, 0.92)
      ctx.fill()
      // Der Grat macht aus dem Dreieck ein gemeisseltes Blatt.
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * from, cy + Math.sin(a) * from)
      ctx.lineTo(cx + Math.cos(a) * to, cy + Math.sin(a) * to)
      ctx.strokeStyle = rgba(deep, 0.7)
      ctx.lineWidth = Math.max(0.5, 0.42 * u)
      ctx.stroke()
    }
  }

  // Der Reif selbst.
  circle(ctx, cx, cy, band)
  ctx.lineWidth = rim
  if (s.bevel) {
    const g = ctx.createLinearGradient(cx, cy - band, cx, cy + band)
    g.addColorStop(0, rgba(lite, 0.95))
    g.addColorStop(0.5, rgba(metal, 0.85))
    g.addColorStop(1, rgba(deep, 0.9))
    ctx.strokeStyle = g
  } else {
    ctx.strokeStyle = rgba(metal, 0.78)
  }
  ctx.stroke()

  circle(ctx, cx, cy, band + rim / 2)
  ctx.lineWidth = Math.max(0.5, 0.6 * u)
  ctx.strokeStyle = rgba(deep, 0.5)
  ctx.stroke()

  if (s.groove) {
    circle(ctx, cx, cy, band)
    ctx.lineWidth = Math.max(0.5, rim * 0.28)
    ctx.strokeStyle = rgba(deep, 0.55)
    ctx.stroke()
  }

  if (s.studs > 0) {
    const step = (Math.PI * 2) / s.studs
    const sr = rim * 0.7
    for (let i = 0; i < s.studs; i++) {
      const a = i * step
      const x = cx + Math.cos(a) * band
      const y = cy + Math.sin(a) * band
      circle(ctx, x, y, sr)
      ctx.fillStyle = rgba(metal, 0.95)
      ctx.fill()
      circle(ctx, x - sr * 0.3, y - sr * 0.3, sr * 0.4)
      ctx.fillStyle = rgba(lite, 0.9)
      ctx.fill()
    }
  }

  // Zwei Bögen an den Flanken — sie heben den Reif, ohne ihn zu schliessen.
  if (ornate && s.sweep) {
    ctx.lineWidth = rim * 0.9
    ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(lite, 0.5)
    for (const mid of [0, Math.PI]) {
      ctx.beginPath()
      ctx.arc(cx, cy, band, mid - 0.44, mid + 0.44)
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
  }

  if (ornate && s.crown) {
    const top = -Math.PI / 2
    // Fassung: ein Bogenstück, auf dem die Zacken sitzen.
    ctx.beginPath()
    ctx.arc(cx, cy, band, top - 0.46, top + 0.46)
    ctx.lineWidth = rim * 1.9
    ctx.strokeStyle = rgba(metal, 0.95)
    ctx.stroke()

    const from = band + rim * 0.7
    const spires = [top - 0.33, top, top + 0.33]
    for (let i = 0; i < spires.length; i++) {
      const a = spires[i]
      const mid = i === 1
      const to = from + (mid ? 12.5 : 8) * u
      spike(ctx, cx, cy, a, from, to, 2.2 * u)
      ctx.fillStyle = rgba(mid ? lite : metal, 0.96)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * from, cy + Math.sin(a) * from)
      ctx.lineTo(cx + Math.cos(a) * to, cy + Math.sin(a) * to)
      ctx.strokeStyle = rgba(deep, 0.55)
      ctx.lineWidth = Math.max(0.5, 0.4 * u)
      ctx.stroke()
    }

    if (s.gem) {
      const gr = 1.9 * u
      const gy = cy - (band + rim * 0.2)
      circle(ctx, cx, gy, gr)
      ctx.fillStyle = rgba(lite, 1)
      ctx.fill()
      circle(ctx, cx - gr * 0.28, gy - gr * 0.28, gr * 0.42)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fill()
    }
  }
}

/* ── Bau, Cache, Mount ────────────────────────────────────────────────────── */

const cache = createSpriteCache(CHAMPION_CREST_CANVAS_MAX)

export function buildChampionCrestSprite(
  stage: number,
  rgb: Rgb,
  px: number,
  dpr: number,
  detail: CrestDetail,
): HTMLCanvasElement | null {
  if (stage <= 0 || px < CHAMPION_CREST_MIN_SIZE) return null
  const s = CHAMPION_CREST_STAGES[stage]
  if (!s || s.rim <= 0) return null

  const backing = crestBacking(px, dpr)
  const key = championCrestSpriteKey(stage, rgb, px, backing.dpr, detail)
  const hit = cache.get(key)
  if (hit) return hit

  const made = newSpriteCanvas(backing.span, backing.dpr)
  if (!made) return null
  paintChampionCrest(
    made.ctx,
    backing.span / 2,
    backing.span / 2,
    px / 2,
    rgb,
    stage,
    px / CHAMPION_CREST_BASE_SIZE,
    detail,
  )
  cache.set(key, made.cv)
  return made.cv
}

const urlCache = new Map<string, string>()
const urlPending = new Map<string, Promise<string>>()

function rememberUrl(key: string, url: string): void {
  urlCache.set(key, url)
  while (urlCache.size > CHAMPION_CREST_URL_MAX) {
    const oldest = urlCache.keys().next().value
    if (oldest === undefined) break
    const gone = urlCache.get(oldest)
    urlCache.delete(oldest)
    if (gone) URL.revokeObjectURL(gone)
  }
}

function spriteUrl(key: string, sprite: HTMLCanvasElement | null): Promise<string> {
  if (!sprite) return Promise.resolve('')
  const hit = urlCache.get(key)
  if (hit) {
    urlCache.delete(key)
    urlCache.set(key, hit)
    return Promise.resolve(hit)
  }
  const pending = urlPending.get(key)
  if (pending) return pending
  const job = new Promise<string>((resolve) => {
    sprite.toBlob((blob) => {
      urlPending.delete(key)
      if (!blob) {
        resolve('')
        return
      }
      const url = URL.createObjectURL(blob)
      rememberUrl(key, url)
      resolve(url)
    })
  })
  urlPending.set(key, job)
  return job
}

/**
 * Hängt den Kranz in den Slot — idempotent über `dataset.crestKey`, denn eine
 * Funktions-Ref feuert bei jedem Patch des VNodes.
 *
 * Beim Stufenwechsel bleibt das alte Bild stehen und das neue blendet darüber;
 * ein harter Tausch mitten in der Bahn liest sich als Flackern.
 */
export function mountChampionCrest(
  slot: HTMLElement,
  stage: number,
  rgb: Rgb,
  px: number,
  dpr: number,
): void {
  const qpx = championCrestPx(px)
  const detail = championCrestDetail(qpx)
  const backing = crestBacking(qpx, dpr)
  const key = championCrestSpriteKey(stage, rgb, qpx, backing.dpr, detail)
  if (slot.dataset.crestKey === key) return
  slot.dataset.crestKey = key

  const sprite = buildChampionCrestSprite(stage, rgb, qpx, dpr, detail)
  if (!sprite) {
    slot.replaceChildren()
    return
  }

  void spriteUrl(key, sprite).then((src) => {
    if (slot.dataset.crestKey !== key || !src) return
    const prev = slot.firstElementChild as HTMLElement | null
    const img = document.createElement('img')
    img.alt = ''
    img.draggable = false
    img.decoding = 'async'
    img.src = src
    if (!prev) {
      slot.replaceChildren(img)
      return
    }
    img.style.opacity = '0'
    img.style.transition = `opacity ${CHAMPION_CREST_CROSSFADE_MS}ms ease`
    slot.appendChild(img)
    requestAnimationFrame(() => {
      img.style.opacity = ''
    })
    window.setTimeout(() => {
      if (prev.isConnected) prev.remove()
    }, CHAMPION_CREST_CROSSFADE_MS + 50)
  })
}

export function clearChampionCrestSpriteCache(): void {
  cache.clear()
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
}
