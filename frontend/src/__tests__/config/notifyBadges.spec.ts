import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { NOTIFY_BADGES, NOTIFY_BADGE_BY_KIND } from '@/config/ui/notifyBadges'
import { NOTIFY_BADGE_TITLE } from '@/config/constants'

/*
 * Der Vertrag der Notify-Marken: was im Markup leuchtet, steht in der Registry —
 * und was in der Registry steht, leuchtet auch wirklich irgendwo.
 *
 * Ohne diese Spec wäre eine neue Marke still am Badge Lab vorbeigebaut: sie
 * bekäme kein Testwerkzeug, keinen Herold und keinen Tooltip-Titel, und niemand
 * bemerkte es, bis jemand sie im Spiel sucht.
 *
 * Was sie NICHT kann: eine frei benannte neue Klasse (`.xy-ready-badge`) fällt
 * durch alle Muster. Sie ist ein Netz gegen das Vergessen, kein Beweis.
 */

const SRC = resolve(process.cwd(), 'src')

/** Die beiden geteilten Marken-Komponenten definieren ihre eigenen Klassen —
 *  ihr Markup ist die Marke selbst, nicht ihre Verwendung. */
const SELF_DEFINING = ['components/ui/ShopReadyBadge.vue', 'components/ui/RpgNotifyBadge.vue']

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'graphify-out' && entry.name !== 'node_modules') vueFiles(full, out)
    } else if (entry.name.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

const rel = (full: string) => relative(SRC, full).replace(/\\/g, '/')

/**
 * Klassen, die „badge" heissen, aber nichts melden: Stufenmedaillons,
 * Kostenanzeigen, Ergebnisplaketten, Rangstempel. Sie fallen ohnehin aus den
 * Mustern unten — die Liste steht als dokumentierte Abgrenzung, damit ein
 * späteres Aufweichen der Regex nicht still Rauschen einsammelt.
 */
const NOT_A_NOTIFY_BADGE = [
  'lvl-badge', // Championstufe auf der Karte
  'level-badge',
  'tier-cost-badge', // Preis im Tier-Panel der Minimap
  'complete-badge', // Textplakette „complete" auf der Minimap
  'result-badge', // Win/Lose im Scoreboard
  'fc-badge', // Rangstempel im Forge-Tresor
  'owned-badge',
  'tier-badge',
  'card-badge',
  'boss-type-badge',
  'curse-badge',
]

interface Hit {
  file: string
  line: number
  text: string
  pattern: string
}

/** Ein Marken-Vorkommen im Template. Vier Muster plus die Sondertoken der Registry. */
function badgeHits(file: string, source: string): Hit[] {
  const extra = NOTIFY_BADGES.flatMap((b) => b.extraMarkers ?? [])
  const patterns: [string, RegExp][] = [
    ['component', /<(?:ShopReadyBadge|RpgNotifyBadge)\b/g],
    ['notify-class', /class="[^"]*\b[a-z0-9-]*notif[a-z0-9-]*\b[^"]*"/g],
    ['tab-strip', /class="[^"]*\bmini-badge--[a-z]+\b[^"]*"/g],
  ]
  for (const token of extra) {
    patterns.push(['extra-marker', new RegExp(`class="[^"]*\\b${token}\\b[^"]*"`, 'g')])
  }

  const hits: Hit[] = []
  const lines = source.split('\n')
  lines.forEach((text, i) => {
    for (const [pattern, re] of patterns) {
      re.lastIndex = 0
      if (re.test(text)) hits.push({ file, line: i + 1, text: text.trim(), pattern })
    }
  })
  return hits
}

const FILES = vueFiles(SRC)
  .map((full) => ({ file: rel(full), source: readFileSync(full, 'utf8') }))
  .filter(({ file }) => !file.startsWith('__tests__/') && !SELF_DEFINING.includes(file))

describe('Notify-Marken: Markup und Registry decken sich', () => {
  it('jede Marke im Markup hat einen Registry-Eintrag', () => {
    const orphans: string[] = []
    for (const { file, source } of FILES) {
      for (const hit of badgeHits(file, source)) {
        const covered = NOTIFY_BADGES.some((b) =>
          b.sites.some((s) => s.file === file && hit.text.includes(s.marker)),
        )
        if (!covered) orphans.push(`${file}:${hit.line} (${hit.pattern})  ${hit.text.slice(0, 90)}`)
      }
    }
    expect(
      orphans,
      'Diese Stellen zeigen eine Notify-Marke, für die kein Eintrag in ' +
        'config/ui/notifyBadges.ts steht.\n' +
        'Trage die Stelle bei der Marke ein, deren Zahl sie zeigt:\n' +
        "  sites: [{ file: '<pfad ab src/>', marker: '<textstück>', where: '<wo im Bild>' }]\n" +
        'Zeigt sie eine NEUE Art, kommt zuerst ein Kind in types/ui.ts und ' +
        'NOTIFY_BADGE_TITLE dazu.\n\n' +
        orphans.join('\n'),
    ).toEqual([])
  })

  it('jeder Registry-Eintrag findet seine Stelle wieder', () => {
    const byFile = new Map(FILES.map((f) => [f.file, f.source]))
    const stale: string[] = []
    for (const badge of NOTIFY_BADGES) {
      for (const site of badge.sites) {
        const source = byFile.get(site.file)
        if (source === undefined) stale.push(`${badge.id}: ${site.file} gibt es nicht mehr`)
        else if (!source.includes(site.marker))
          stale.push(`${badge.id}: "${site.marker}" steht nicht mehr in ${site.file}`)
      }
    }
    expect(
      stale,
      'Veraltete Fundstellen in config/ui/notifyBadges.ts:\n' + stale.join('\n'),
    ).toEqual([])
  })

  it('jedes kind von RpgBadgeTooltipBody ist ein Registry-Schlüssel', () => {
    const unknown: string[] = []
    for (const { file, source } of FILES) {
      for (const m of source.matchAll(/<RpgBadgeTooltipBody[^>]*\bkind="([a-z]+)"/g)) {
        if (!(m[1] in NOTIFY_BADGE_BY_KIND)) unknown.push(`${file}: kind="${m[1]}"`)
      }
    }
    expect(unknown).toEqual([])
  })
})

describe('Notify-Registry ist vollständig', () => {
  it('jedes Kind kommt genau einmal vor', () => {
    const ids = NOTIFY_BADGES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(Object.keys(NOTIFY_BADGE_TITLE).sort())
  })

  it('jede Marke mit hasBadge nennt mindestens eine Stelle', () => {
    for (const badge of NOTIFY_BADGES) {
      if (badge.hasBadge) expect(badge.sites.length, badge.id).toBeGreaterThan(0)
      else expect(badge.sites, badge.id).toEqual([])
    }
  })

  it('jede Marke trägt Titel, Akzent, Sinnbild und eine Seed-Notiz', () => {
    for (const badge of NOTIFY_BADGES) {
      expect(badge.title, badge.id).toBeTruthy()
      expect(badge.short, badge.id).toBeTruthy()
      expect(badge.accent, badge.id).toMatch(/^\d+, \d+, \d+$/)
      expect(Boolean(badge.icon || badge.imageSrc), `${badge.id} braucht icon oder imageSrc`).toBe(
        true,
      )
      expect(badge.seedNote, badge.id).toBeTruthy()
    }
  })

  it('jede Marke mit Herold nennt Kopfzeile und Ziel-Reiter', () => {
    for (const badge of NOTIFY_BADGES.filter((b) => b.heralds)) {
      expect(badge.heraldEyebrow, badge.id).toBeTruthy()
      expect(badge.tab, badge.id).toBeTruthy()
    }
  })

  it('nur Marken ohne Seed-Weg tragen seedability none', () => {
    for (const badge of NOTIFY_BADGES) {
      expect(badge.seedability === 'none', badge.id).toBe(!badge.hasBadge)
    }
  })

  it('die Abgrenzungsliste trifft keine echte Marke', () => {
    const markers = NOTIFY_BADGES.flatMap((b) => b.sites.map((s) => s.marker))
    for (const noise of NOT_A_NOTIFY_BADGE) {
      expect(
        markers.some((m) => m.includes(noise)),
        noise,
      ).toBe(false)
    }
  })
})
