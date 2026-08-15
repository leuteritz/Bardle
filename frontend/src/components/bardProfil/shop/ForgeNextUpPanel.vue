<template>
  <!-- Es gibt dieses Panel NUR, solange es etwas zu empfehlen hat. Der Wegfall
       ist an einen Kauf oder eine Chime-Schwelle gebunden, nie an die Maus —
       deshalb kann er kein Flackern tragen. -->
  <section v-if="shown" class="nu-panel" :style="{ '--node-c': entry?.color ?? '#52b830' }">
    <div class="nu-flash" :class="{ 'nu-flash--on': flashed }" aria-hidden="true" />

    <header class="nu-head">
      <span class="nu-badge">
        <Icon :icon="FORGE_NEXT_UP_ICON" width="13" height="13" />
        {{ FORGE_NEXT_UP_TITLE }}
      </span>
      <span v-if="entry" class="nu-hint">{{ FORGE_NEXT_UP_HINT }}</span>
    </header>

    <template v-if="entry">
      <div class="nu-id">
        <div class="nu-ico">
          <Icon
            :icon="entry.icon"
            :width="FORGE_DETAIL_ICON_SIZE"
            :height="FORGE_DETAIL_ICON_SIZE"
            :style="{ color: entry.color }"
          />
        </div>
        <div class="nu-id-text">
          <div class="nu-name" :style="{ color: entry.color }">{{ entry.name }}</div>
          <div class="nu-meta">{{ metaLine }}</div>
        </div>
      </div>

      <div class="nu-body">
        <p class="nu-desc">{{ entry.desc }}</p>

        <!-- Now → After: die Werte kommen fertig aus `useForgeUpgrades`, hier
             wird nichts nachgerechnet. -->
        <div class="nu-delta">
          <div class="nu-delta-cell">
            <span class="nu-delta-label">Now</span>
            <span class="nu-delta-value">{{ entry.level === 0 ? '—' : entry.nowText }}</span>
          </div>
          <span class="nu-delta-arrow">→</span>
          <div class="nu-delta-cell nu-delta-cell--next">
            <span class="nu-delta-label">After growing</span>
            <span class="nu-delta-value nu-delta-value--next">{{ entry.nextText }}</span>
          </div>
        </div>

        <!-- Preis und Knopf kleben an der Unterkante: ein Kaufknopf ohne den
             Preis daneben ist die schlechtere Hälfte der Auskunft. -->
        <div class="nu-foot">
          <ForgeCostRow
            :gold="entry.goldCost"
            :gold-ok="entry.goldOk"
            :materials="entry.materials"
          />
          <div v-if="bulkCount > 1" class="nu-bulk-note">
            {{ bulkCount }}{{ FORGE_AFFORDABLE_SUFFIX }}
          </div>

          <div class="nu-actions">
            <button class="nu-act" @click="growOne">{{ buttonLabel }}</button>
            <button v-if="bulkCount > 1" class="nu-act nu-act--bulk" @click="growMany">
              {{ bulkLabel }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Nur zu sehen, solange der Zeiger die Liste hält und die letzte kaufbare
         Sache dabei wegfällt. Füllt dieselbe Fläche, damit auch dieser Moment
         nichts verschiebt. -->
    <div v-else class="nu-idle">
      <Icon :icon="FORGE_NEXT_UP_IDLE_ICON" width="30" height="30" class="nu-idle-ico" />
      <span class="nu-idle-text">{{ FORGE_NEXT_UP_IDLE }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Was als Nächstes zu wachsen lohnt — der Kopf der rechten Shop-Spalte.
 *
 * Er beantwortet EINE Frage und verschwindet, sobald sie keine Antwort mehr
 * hat. Gezeigt wird `bestBuyId` aus `useForgeUpgrades`: der günstigste Knoten,
 * den Chimes UND Lager gerade decken — derselbe, den der Baum links als BEST
 * BUY umringt. Nach einem Kauf rückt die Empfehlung ohne Zutun auf den
 * nächstbesten; gibt es keinen mehr, geht das Panel und die Liste bekommt den
 * Platz.
 *
 * Vorher stand hier ein Hover-Detail mit Anheftung. Das war ein zweiter Weg zu
 * denselben Zahlen, die die Zeile darunter schon trägt. Was der Zeiger streift,
 * sagt jetzt `ForgeRowTooltip` — außerhalb des Flusses, damit es die Liste
 * nicht verschieben kann.
 *
 * Seine Höhe ist reserviert und inhaltsunabhängig (`FORGE_DETAIL_PANEL_MIN_PX`):
 * das Panel sitzt ÜBER der scrollenden Liste, und der Stapelknopf („Buy ×8")
 * hängt an den Chimes — ohne die Klammer käme er sekündlich dazu und wieder weg
 * und schöbe die Liste jedes Mal mit.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_DETAIL_ICON_SIZE,
  FORGE_NEXT_UP_TITLE,
  FORGE_NEXT_UP_HINT,
  FORGE_NEXT_UP_IDLE,
  FORGE_NEXT_UP_ICON,
  FORGE_NEXT_UP_IDLE_ICON,
  FORGE_DETAIL_ENDLESS_META,
  FORGE_DETAIL_PARENT_PREFIX,
  FORGE_AFFORDABLE_SUFFIX,
  FORGE_BUY_MANY_LABEL,
  FORGE_COUNT_TOKEN,
  FORGE_GROW_LABEL,
  FORGE_GROW_NEXT_PREFIX,
  FORGE_CARD_FLASH_MS,
  FORGE_DETAIL_PANEL_MIN_PX,
  FORGE_DETAIL_PANEL_FRACTION,
  FORGE_DETAIL_PANEL_MAX_PX,
} from '@/config/constants'

/* Die Dauer steht in den Konstanten und wird von CSS und Timer aus derselben
   Quelle gelesen; den KEYFRAME-Namen setzt weiterhin die CSS-Klasse. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`

/* Die reservierte Fläche — Herleitung an den Konstanten. Ein fertiger String
   statt dreier `v-bind`, damit die Regel unten in EINEM Stück lesbar bleibt. */
const panelHeight = `clamp(${FORGE_DETAIL_PANEL_MIN_PX}px, ${FORGE_DETAIL_PANEL_FRACTION * 100}%, ${FORGE_DETAIL_PANEL_MAX_PX}px)`

const { entryById, bestBuyId, buyUpgrade, affordableLevels, buyMany } = useForgeUpgrades()
const { listHovering } = useForgeSpotlight()

const entry = computed<ForgeUpgradeEntry | null>(() =>
  bestBuyId.value === null ? null : (entryById.value.get(bestBuyId.value) ?? null),
)

/**
 * Ob das Panel überhaupt da ist.
 *
 * Es folgt `bestBuyId`, aber NICHT, solange der Zeiger die Liste hält: die
 * Chimes ticken jede Sekunde, und ein Erscheinen in genau dem Moment schöbe die
 * Liste um dreihundert Pixel unter dem Zeiger weg. Nachgezogen wird beim
 * Loslassen — dasselbe Motiv wie `frozenBuckets` in `ForgeUpgradesSection`.
 *
 * Eingefroren wird nur die SICHTBARKEIT, nicht der Inhalt: ein Wechsel
 * innerhalb der reservierten Fläche verschiebt nichts und darf sofort
 * durchschlagen.
 */
const shown = ref(bestBuyId.value !== null)

watch(
  [bestBuyId, listHovering],
  ([id, hovering]) => {
    if (!hovering) shown.value = id !== null
  },
  { immediate: true },
)

// ── Metazeile ────────────────────────────────────────────────────────────────
/**
 * „ROOT · Lv 3 / 6 · hangs on Wayfinder's Cache".
 *
 * Ein Bough trägt `Infinity` als Höchststufe — ein gerendertes „Lv 25 / Infinity"
 * wäre der rohe JavaScript-Wert, deshalb der Satz statt der Zahl.
 */
const metaLine = computed(() => {
  const e = entry.value
  if (!e) return ''
  const parts = [
    e.tierLabel,
    Number.isFinite(e.maxLevel)
      ? `Lv ${e.level} / ${e.maxLevel}`
      : `Lv ${e.level} · ${FORGE_DETAIL_ENDLESS_META}`,
  ]
  if (e.parentName !== '') parts.push(`${FORGE_DETAIL_PARENT_PREFIX}${e.parentName}`)
  return parts.join(' · ')
})

// ── Kaufen ───────────────────────────────────────────────────────────────────
/**
 * Wie viele Stufen Vorrat und Lager gerade hergeben. Die Schleife dahinter
 * läuft höchstens `FORGE_BULK_BUY_CAP` Runden und nur für DIESEN einen Knoten —
 * als computed kostet sie einmal je Chime-Änderung, und der Knopf stimmt nach
 * einem Kauf ohne Zutun wieder.
 */
const bulkCount = computed(() => (entry.value ? affordableLevels(entry.value.id) : 0))

const bulkLabel = computed(() =>
  FORGE_BUY_MANY_LABEL.replace(FORGE_COUNT_TOKEN, String(bulkCount.value)),
)

/**
 * Kein „zu wenig Chimes" mehr auf dem Knopf: was hier steht, ist per Definition
 * kaufbar (`bestBuyId` prüft Kasse UND Lager). Die Begründungen, warum etwas
 * NICHT geht, stehen dort, wo das Nicht-Gehende steht — in der Zeile und in
 * ihrem Kärtchen.
 */
const buttonLabel = computed(() => {
  const e = entry.value
  if (!e) return ''
  return e.level === 0 ? FORGE_GROW_LABEL : `${FORGE_GROW_NEXT_PREFIX}${e.level + 1}`
})

/** Quittung des Kaufs. Rein visuell, daher reale Zeit. */
const flashed = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

function acknowledge(): void {
  flashed.value = false
  // Ein Frame Pause, sonst läuft der Keyframe beim zweiten Kauf nicht neu an.
  requestAnimationFrame(() => {
    flashed.value = true
  })
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashed.value = false
  }, FORGE_CARD_FLASH_MS)
}

onUnmounted(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
})

function growOne(): void {
  const e = entry.value
  if (!e || !buyUpgrade(e.id)) return
  acknowledge()
}

function growMany(): void {
  const e = entry.value
  if (!e || buyMany(e.id, bulkCount.value) === 0) return
  acknowledge()
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════════ */
/* Die Höhe ist RESERVIERT, nicht inhaltsabhängig — das ist die ganze Regel
   dieses Panels. Es sitzt über dem scrollenden `.sf-body`; wüchse es mit seinem
   Inhalt, schöbe der Stapelknopf die Liste bei jedem Chime-Tick weg.
   Herleitung an `FORGE_DETAIL_PANEL_MIN_PX`. */
.nu-panel {
  position: relative;
  flex: 0 0 v-bind(panelHeight);
  height: v-bind(panelHeight);
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

/* Kaufquittung: eine eigene Ebene, deren DECKKRAFT läuft — kein `filter` und
   kein `box-shadow` in der Animation (Performance-Regel 2). */
.nu-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.22);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
}

.nu-flash--on {
  animation: nu-flash v-bind(flashDuration) ease-out;
}

@keyframes nu-flash {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nu-flash--on {
    animation: none;
  }
}

/* ══════════════════════════════════════════════════
   KOPFZEILE
   Grün wie die BEST-BUY-Marke im Baum: beide meinen denselben Knoten, und der
   Spieler soll das sehen, ohne es zu lesen.
══════════════════════════════════════════════════ */
.nu-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 18px 0;
}

.nu-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 3px;
  background: #1e2e12;
  border: 1px solid #4a8a28;
  color: #9fe062;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.nu-hint {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.36);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════════════════════════════════════════════
   IDENTITÄT
══════════════════════════════════════════════════ */
.nu-id {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px 14px;
  border-bottom: 2px solid #3e200a;
}

.nu-ico {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--node-c, #c89040) 18%, #14120c),
    #100e08 74%
  );
  border: 1px solid color-mix(in srgb, var(--node-c, #c89040) 45%, #5c3310);
}

.nu-id-text {
  min-width: 0;
}

.nu-name {
  font-size: 23px;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nu-meta {
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════════════════════════════════════════════
   KÖRPER
══════════════════════════════════════════════════ */
/* Der Körper ist das EINZIGE, was in der reservierten Fläche atmet — passt sein
   Inhalt nicht (dreizeilige Beschreibung, zwei Kaufknöpfe), scrollt er in sich,
   statt das Panel zu dehnen. Der untere Abstand liegt am letzten Kind statt am
   Körper, damit der klebende Kaufblock ihn selbst mitbringt. */
.nu-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 18px 0;
  background: #111008;
}

.nu-body > :last-child:not(.nu-foot) {
  margin-bottom: 16px;
}

.nu-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: rgba(232, 220, 192, 0.82);
}

/* ── Now → After ─────────────────────────────────────────────── */
.nu-delta {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 13px 16px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.nu-delta-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nu-delta-cell--next {
  align-items: flex-end;
}

.nu-delta-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.nu-delta-value {
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  color: #e8dcc0;
}

.nu-delta-value--next {
  color: #7ad0a0;
}

.nu-delta-arrow {
  align-self: center;
  font-size: 19px;
  color: rgba(200, 144, 64, 0.6);
}

/* ══════════════════════════════════════════════════
   KAUFEN — klebt an der Unterkante des Körpers
══════════════════════════════════════════════════ */
.nu-foot {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  background: #111008;
}

.nu-bulk-note {
  margin-top: -4px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(122, 208, 160, 0.8);
  font-variant-numeric: tabular-nums;
}

.nu-actions {
  display: flex;
  gap: 10px;
}

.nu-act {
  flex: 1;
  padding: 14px 0;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-family: inherit;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.nu-act--bulk {
  flex: 0 0 136px;
  border-color: #4a8a28;
  background: #16210c;
  color: #9fe062;
  font-size: 15px;
}

.nu-act--bulk:hover {
  border-color: #6ec040;
  background: #1c2e10;
}

/* ══════════════════════════════════════════════════
   RUHEZUSTAND
   Füllt die reservierte Fläche restlos aus.
══════════════════════════════════════════════════ */
.nu-idle {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  background: #111008;
}

.nu-idle-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.35);
}

.nu-idle-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.42);
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .nu-head {
    padding: 10px 15px 0;
  }

  .nu-id {
    gap: 12px;
    padding: 10px 15px 11px;
  }

  .nu-ico {
    width: 52px;
    height: 52px;
  }

  .nu-name {
    font-size: 20px;
  }

  .nu-body {
    gap: 10px;
    padding: 11px 15px 0;
  }

  .nu-body > :last-child:not(.nu-foot) {
    margin-bottom: 13px;
  }

  .nu-foot {
    gap: 10px;
    padding-bottom: 13px;
  }

  .nu-desc {
    font-size: 14px;
  }

  .nu-delta {
    padding: 10px 13px;
  }

  .nu-delta-value {
    font-size: 19px;
  }

  .nu-act {
    padding: 12px 0;
    font-size: 15px;
  }
}
</style>
