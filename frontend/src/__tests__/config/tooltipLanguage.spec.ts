import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/*
 * Der Vertrag der Tooltip-Sprache: es gibt EINE Gestalt für alles, was im Spiel
 * unter dem Zeiger aufgeht, und sie steht als `.tip-*` in `rpg-theme.css`.
 *
 * Warum das eine Spec braucht: die Gestalt war einmal auf DREI Fassungen
 * verteilt — die Karte der Star Forge, die Hülle der Marken und die
 * Drachen-Karte im Rift —, dazu vier Innensprachen und drei Schriftskalen für
 * dieselbe Idee. Keine davon war falsch; sie sind nur nebeneinander entstanden,
 * weil nichts sie zusammenhielt. Genau das tut diese Spec.
 *
 * Was sie NICHT kann: eine frei benannte neue Blase (`.xy-hint`) fällt durch
 * alle Muster. Sie ist ein Netz gegen das Auseinanderlaufen, kein Beweis.
 */

const SRC = resolve(process.cwd(), 'src')
const THEME = 'assets/rpg-theme.css'

/**
 * Die Blasen, die nicht `*Tooltip*.vue` heissen. Wer eine neue baut, trägt sie
 * hier ein — und merkt dabei, dass es die Sprache schon gibt.
 */
const EXTRA_TIP_FILES = [
  'components/idle/abilities/BardAbilityBar.vue',
  'components/bardProfil/battle/rift/KillFeedTicker.vue',
  'components/bardProfil/battle/rift/DrakeBuffBadges.vue',
  'components/bardProfil/shop/ChampionShopCard.vue',
  'components/bardProfil/team/SigilDetailsPanel.vue',
  'components/bardProfil/BardProfileMenu.vue',
]

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'graphify-out' && entry.name !== 'node_modules') vueFiles(full, out)
    } else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

function load(full: string) {
  return {
    file: relative(SRC, full).replace(/\\/g, '/'),
    source: readFileSync(full, 'utf8'),
  }
}

/** Dateien, die GANZ Tooltip sind — dort gehört jede Regel der Datei. */
const PURE_TIP_FILES = vueFiles(join(SRC, 'components'))
  .filter((f) => /Tooltip.*\.vue$/.test(f))
  .map(load)

/** Dazu die Blasen, die in einer größeren Datei wohnen. Bei ihnen gilt nur,
 *  was sich eindeutig auf die Blase bezieht — ihre übrigen Maße gehören den
 *  Kacheln und Zeilen drumherum. */
const TIP_FILES = [...PURE_TIP_FILES, ...EXTRA_TIP_FILES.map((f) => load(join(SRC, f)))]

const theme = readFileSync(join(SRC, THEME), 'utf8')

describe('Tooltip-Sprache: die Gestalt steht an EINER Stelle', () => {
  it('findet die Tooltip-Dateien überhaupt', () => {
    // Ein leeres Netz fängt nichts und sähe trotzdem grün aus.
    expect(TIP_FILES.length).toBeGreaterThan(15)
  })

  it('die Sprache definiert Fläche, Rand, Schatten und Skala', () => {
    for (const token of [
      '--tip-surface:',
      '--tip-border:',
      '--tip-shadow:',
      '--tip-effect-bg:',
      '--tip-block-bg:',
      '--tip-head-bg:',
      '--tip-text:',
      '--tip-accent:',
      '--tip-u:',
    ]) {
      expect(theme, `${token} fehlt in ${THEME}`).toContain(token)
    }
  })

  it('keine Blase bringt einen eigenen Rahmen oder Schatten mit', () => {
    /* Die Signatur einer Blase, nicht jede Kante: ein `1px solid #5c3310` ist
       im Inneren eines Panels eine Zellkante und völlig in Ordnung. Getroffen
       wird der RAHMEN (2px/3px) und der Schlagschatten, den die drei früheren
       Skins gemeinsam hatten. */
    const OWN_FRAME =
      /box-shadow:\s*0 8px 24px rgba\(0, 0, 0, 0\.85\)|border:\s*[23]px solid #(?:5c3310|7a4e20)\b|background:\s*#0e0c07\b/i
    const offenders: string[] = []
    for (const { file, source } of TIP_FILES) {
      const m = source.match(OWN_FRAME)
      if (m) offenders.push(`${file}: "${m[0]}" — gehört in ${THEME} als --tip-*`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('kein Tooltip-Panel malt seine Fläche selbst', () => {
    // Nur in den Dateien, die GANZ Tooltip sind — anderswo ist dieselbe Farbe
    // die Flaeche eines Modals oder einer Kachel.
    const offenders: string[] = []
    for (const { file, source } of PURE_TIP_FILES) {
      const m = source.match(/background:\s*#(?:16140e|111008)\b/i)
      if (m) offenders.push(`${file}: "${m[0]}" — var(--tip-surface)`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('kein Tooltip-Panel setzt eine eigene Schriftskala — es gibt --tip-u', () => {
    const offenders: string[] = []
    for (const { file, source } of PURE_TIP_FILES) {
      const m = source.match(/font-size:\s*clamp\(/)
      if (m) offenders.push(`${file}: eigene clamp()-Skala statt var(--tip-u)`)
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('die Einblendung bewegt nur die Deckkraft', () => {
    /* Ein Keyframe auf `transform` überschriebe die Gegenskalierung
       `--inv-scale`, mit der die Karte im Skill Tree gegen den Bühnenzoom
       ansteht — sie stünde dort plötzlich in Bühnengrösse. */
    const block = theme.slice(theme.indexOf('@keyframes tip-in'))
    const body = block.slice(0, block.indexOf('}\n}') + 3)
    expect(body).not.toMatch(/transform|scale|translate/)
    expect(body).toContain('opacity')
  })

  it('die Radien bleiben in der 4–5px-Grenze, auch auf 4K', () => {
    /* `em` würde den Radius mit der Auflösung wachsen lassen und die Regel aus
       CLAUDE.md reissen — Rahmenstärken und Radien sind Designkonstanten. */
    const lang = theme.slice(theme.indexOf('.tip {'))
    const radii = [...lang.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(radii.length).toBeGreaterThan(0)
    for (const r of radii) {
      expect(r, `border-radius "${r}" skaliert mit der Schrift`).not.toMatch(/\d(em|rem)/)
    }
  })
})
