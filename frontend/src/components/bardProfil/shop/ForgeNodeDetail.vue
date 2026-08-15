<template>
  <section class="fd-panel" :style="{ '--node-c': entry?.color ?? '#7a4e20' }">
    <!-- Goldlinie an der Oberkante — Projektstandard für jede Modalkante. -->
    <div class="fd-goldline" aria-hidden="true" />
    <div class="fd-flash" :class="{ 'fd-flash--on': flashed }" aria-hidden="true" />

    <!-- ══ Leerzustand ═══════════════════════════════════════════════
         In DERSELBEN Höhe wie die gefüllte Fassung. Ein Kopf, der beim ersten
         Hover aufklappt, schöbe die ganze Liste darunter nach unten — und zwar
         genau in dem Moment, in dem der Zeiger auf eine Zeile zielt. -->
    <template v-if="!entry">
      <header class="fd-head">
        <span class="fd-chip fd-chip--muted">{{ FORGE_DETAIL_EMPTY_TITLE }}</span>
        <span class="fd-hint">{{ FORGE_DETAIL_HOVER_HINT }}</span>
      </header>
      <div class="fd-empty">
        <Icon :icon="FORGE_PATH_ROOT_ICON" width="34" height="34" class="fd-empty-ico" />
        <p class="fd-empty-text">{{ FORGE_DETAIL_EMPTY_HINT }}</p>
      </div>
    </template>

    <template v-else>
      <header class="fd-head">
        <span class="fd-chip">
          {{ entry.tierLabel }}
          <template v-if="!Number.isFinite(entry.maxLevel)"> · {{ FORGE_ENDLESS_SYMBOL }}</template>
        </span>
        <span class="fd-hint">{{ pinned ? FORGE_DETAIL_PIN_HINT : FORGE_DETAIL_HOVER_HINT }}</span>
        <button v-if="pinned" class="fd-unpin" aria-label="Unpin" @click="setPinned(null)">
          {{ FORGE_DETAIL_UNPIN_GLYPH }}
        </button>
      </header>

      <div class="fd-id">
        <div class="fd-ico">
          <Icon
            :icon="entry.icon"
            :width="FORGE_DETAIL_ICON_SIZE"
            :height="FORGE_DETAIL_ICON_SIZE"
            :style="{ color: entry.color }"
          />
        </div>
        <div class="fd-id-text">
          <div class="fd-name" :style="{ color: entry.color }">{{ entry.name }}</div>
          <div class="fd-meta">{{ metaLine }}</div>
        </div>
      </div>

      <div class="fd-body">
        <p class="fd-desc">{{ entry.desc }}</p>

        <!-- Now → After: die Werte kommen fertig aus `useForgeUpgrades`, hier
             wird nichts nachgerechnet. -->
        <div v-if="!maxed" class="fd-delta">
          <div class="fd-delta-cell">
            <span class="fd-delta-label">Now</span>
            <span class="fd-delta-value">{{ entry.level === 0 ? '—' : entry.nowText }}</span>
          </div>
          <span class="fd-delta-arrow">→</span>
          <div class="fd-delta-cell fd-delta-cell--next">
            <span class="fd-delta-label">After growing</span>
            <span class="fd-delta-value fd-delta-value--next">{{ entry.nextText }}</span>
          </div>
        </div>

        <!-- Wo im Baum der Knoten hängt. Dieselbe Kette, die der Baum als
             Lichtstrahl zeichnet — nur in Worten, weil die Spalte den Baum
             nicht sieht. -->
        <div class="fd-path">
          <div class="fd-path-title">{{ FORGE_DETAIL_PATH_TITLE }}</div>
          <div class="fd-path-chain">
            <span
              v-for="(step, i) in pathChain"
              :key="step.id"
              class="fd-path-pill"
              :class="{ 'fd-path-pill--self': i === pathChain.length - 1 }"
              :style="{ '--pill-c': step.color }"
            >
              <Icon :icon="step.icon" width="15" height="15" :style="{ color: step.color }" />
              <span class="fd-path-name">{{ step.name }}</span>
            </span>
          </div>
        </div>

        <template v-if="maxed">
          <div class="fd-state fd-state--max">✦ MAXED</div>
        </template>
        <template v-else-if="entry.state === 'locked'">
          <div class="fd-state fd-state--locked">
            <Icon icon="lucide:lock" width="15" height="15" />
            {{ entry.lockReason }}
          </div>
          <div class="fd-track">
            <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
          </div>
        </template>
        <template v-else>
          <ForgeCostRow
            :gold="entry.goldCost"
            :gold-ok="entry.goldOk"
            :materials="entry.materials"
          />
          <div v-if="bulkCount > 1" class="fd-bulk-note">
            {{ bulkCount }}{{ FORGE_AFFORDABLE_SUFFIX }}
          </div>

          <div class="fd-actions">
            <button class="fd-act" :disabled="!entry.canBuy" @click="growOne">
              {{ buttonLabel }}
            </button>
            <button v-if="bulkCount > 1" class="fd-act fd-act--bulk" @click="growMany">
              {{ bulkLabel }}
            </button>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * Ein Knoten des Sternbaums GROSS — der Kopf der rechten Spalte.
 *
 * Vorher trug jeder der bis zu fünfundvierzig Listeneinträge eine volle Karte
 * mit Icon, Beschreibung, Now-→-After, Kosten und Kaufknopf. Dieselbe Fläche
 * fünfundvierzig Mal, und keine davon groß genug, um auf einem 4K-Schirm noch
 * etwas herzumachen. Jetzt steht hier EINER in voller Größe, und die Liste
 * darunter besteht aus Zeilen.
 *
 * Gezeigt wird `detailId` aus `useForgeSpotlight`: das Angeheftete schlägt den
 * Hover (Herleitung dort). Ohne beides fällt die Anzeige auf den günstigsten
 * kaufbaren Knoten zurück — dieselbe Wahl, die der Baum als BEST BUY markiert.
 */
import { computed, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import ForgeCostRow from './ForgeCostRow.vue'
import { FORGE_NODES } from '@/config/progression/starForge'
import type { ForgeUpgradeEntry } from '@/types'
import {
  SOLAR_BRANCHES,
  FORGE_ENDLESS_SYMBOL,
  FORGE_DETAIL_ICON_SIZE,
  FORGE_DETAIL_PIN_HINT,
  FORGE_DETAIL_HOVER_HINT,
  FORGE_DETAIL_EMPTY_TITLE,
  FORGE_DETAIL_EMPTY_HINT,
  FORGE_DETAIL_UNPIN_GLYPH,
  FORGE_DETAIL_PATH_TITLE,
  FORGE_DETAIL_ENDLESS_META,
  FORGE_DETAIL_PARENT_PREFIX,
  FORGE_PATH_ROOT_LABEL,
  FORGE_PATH_ROOT_ICON,
  FORGE_AFFORDABLE_SUFFIX,
  FORGE_BUY_MANY_LABEL,
  FORGE_COUNT_TOKEN,
  FORGE_SPOTLIGHT_MAX_LIMBS,
  FORGE_SHORT_CHIMES_LABEL,
  FORGE_SHORT_MATERIAL_PREFIX,
  FORGE_GROW_LABEL,
  FORGE_GROW_NEXT_PREFIX,
  FORGE_CARD_FLASH_MS,
} from '@/config/constants'

/* Die Dauer steht in den Konstanten und wird von CSS und Timer aus derselben
   Quelle gelesen; den KEYFRAME-Namen setzt weiterhin die CSS-Klasse. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`

const { entryById, bestBuyId, buyUpgrade, affordableLevels, buyMany } = useForgeUpgrades()
const { detailId, pinnedId, setPinned } = useForgeSpotlight()

const entry = computed<ForgeUpgradeEntry | null>(() => {
  const id = detailId.value ?? bestBuyId.value
  return id === null ? null : (entryById.value.get(id) ?? null)
})

const pinned = computed(() => pinnedId.value !== null && pinnedId.value === entry.value?.id)

const maxed = computed(() => entry.value?.state === 'maxed')

// ── Metazeile ────────────────────────────────────────────────────────────────
/**
 * „Lv 25 · no final level · hangs on Wayfinder's Cache".
 *
 * Ein Bough trägt `Infinity` als Höchststufe — ein gerendertes „Lv 25 / Infinity"
 * wäre der rohe JavaScript-Wert, deshalb der Satz statt der Zahl.
 */
const metaLine = computed(() => {
  const e = entry.value
  if (!e) return ''
  const parts = [
    Number.isFinite(e.maxLevel)
      ? `Lv ${e.level} / ${e.maxLevel}`
      : `Lv ${e.level} · ${FORGE_DETAIL_ENDLESS_META}`,
  ]
  if (e.parentName !== '') parts.push(`${FORGE_DETAIL_PARENT_PREFIX}${e.parentName}`)
  return parts.join(' · ')
})

// ── Der Weg im Baum ──────────────────────────────────────────────────────────
interface PathStep {
  id: string
  name: string
  icon: string
  color: string
}

/** Name, Glyph und Farbe je Id — Strahlen und Baumknoten in EINER Tabelle,
 *  damit die Kette nicht bei jedem Glied eine Weiche braucht. */
const NODE_META = new Map<string, PathStep>([
  ...SOLAR_BRANCHES.map(
    (branch) =>
      [branch.id, { id: branch.id, name: branch.name, icon: branch.icon, color: branch.color }] as [
        string,
        PathStep,
      ],
  ),
  ...FORGE_NODES.map(
    (node) =>
      [node.id, { id: node.id, name: node.name, icon: node.icon, color: node.color }] as [
        string,
        PathStep,
      ],
  ),
])

/** Eltern-Id je Knoten. Strahlen haben keine — dort endet die Kette am Stern. */
const PARENT_OF = new Map(FORGE_NODES.map((node) => [node.id, node.parentId]))

/**
 * Stern → Wurzel → … → Knoten. Läuft über `parentId` nach innen und dreht
 * anschliessend um; die Bremse ist dieselbe wie beim Lichtstrahl im Baum
 * (`FORGE_SPOTLIGHT_MAX_LIMBS`), damit ein fehlerhaft verketteter Katalog die
 * Schleife nicht offen lässt.
 */
const pathChain = computed<PathStep[]>(() => {
  const e = entry.value
  if (!e) return []
  const chain: PathStep[] = []
  let cursor: string | undefined = e.id
  while (cursor !== undefined && chain.length <= FORGE_SPOTLIGHT_MAX_LIMBS) {
    const meta = NODE_META.get(cursor)
    if (!meta) break
    chain.unshift(meta)
    cursor = PARENT_OF.get(cursor)
  }
  return [
    { id: '__star', name: FORGE_PATH_ROOT_LABEL, icon: FORGE_PATH_ROOT_ICON, color: '#d9b6ff' },
    ...chain,
  ]
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
 * Warum der Knopf nicht geht, steht AUF ihm. Ein bloßes `disabled` ließe den
 * Spieler raten, ob die Kasse oder das Lager leer ist — beides steht direkt
 * darüber, aber der Knopf ist die Stelle, auf die er schaut.
 */
const buttonLabel = computed(() => {
  const e = entry.value
  if (!e) return ''
  if (e.state === 'capped') return e.lockReason
  if (!e.goldOk) return FORGE_SHORT_CHIMES_LABEL
  const short = e.materials.find((mat) => !mat.ok)
  if (short) return `${FORGE_SHORT_MATERIAL_PREFIX}${short.need - short.have} ${short.name}`
  if (e.level === 0) return FORGE_GROW_LABEL
  return `${FORGE_GROW_NEXT_PREFIX}${e.level + 1}`
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
.fd-panel {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

.fd-goldline {
  flex-shrink: 0;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* Kaufquittung: eine eigene Ebene, deren DECKKRAFT läuft — kein `filter` und
   kein `box-shadow` in der Animation (Performance-Regel 2). */
.fd-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.22);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
}

.fd-flash--on {
  animation: fd-flash v-bind(flashDuration) ease-out;
}

@keyframes fd-flash {
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
  .fd-flash--on {
    animation: none;
  }
}

/* ══════════════════════════════════════════════════
   KOPFZEILE
══════════════════════════════════════════════════ */
.fd-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 18px 0;
}

.fd-chip {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--node-c, #c89040) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--node-c, #c89040) 55%, #3e200a);
  color: var(--node-c, #e8c040);
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.fd-chip--muted {
  background: #1c1c18;
  border-color: #3e200a;
  color: rgba(200, 144, 64, 0.7);
}

.fd-hint {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.36);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fd-unpin {
  flex-shrink: 0;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: rgba(200, 144, 64, 0.55);
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease;
}

.fd-unpin:hover {
  color: #e8c040;
}

/* ══════════════════════════════════════════════════
   IDENTITÄT
══════════════════════════════════════════════════ */
.fd-id {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px 14px;
  border-bottom: 2px solid #3e200a;
}

.fd-ico {
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

.fd-id-text {
  min-width: 0;
}

.fd-name {
  font-size: 23px;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fd-meta {
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
.fd-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 18px 16px;
  background: #111008;
}

.fd-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: rgba(232, 220, 192, 0.82);
}

/* ── Now → After ─────────────────────────────────────────────── */
.fd-delta {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 13px 16px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.fd-delta-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fd-delta-cell--next {
  align-items: flex-end;
}

.fd-delta-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.fd-delta-value {
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  color: #e8dcc0;
}

.fd-delta-value--next {
  color: #7ad0a0;
}

.fd-delta-arrow {
  align-self: center;
  font-size: 19px;
  color: rgba(200, 144, 64, 0.6);
}

/* ── Weg im Baum ─────────────────────────────────────────────── */
.fd-path {
  padding: 11px 15px 13px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.fd-path-title {
  margin-bottom: 9px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.fd-path-chain {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.fd-path-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 3px;
  background: #1c1c18;
  border: 1px solid #3e200a;
}

/* Das letzte Glied ist der gezeigte Knoten selbst — er trägt seine eigene
   Randfarbe, damit die Kette ein Ziel hat und nicht nur eine Aufzählung ist. */
.fd-path-pill--self {
  border-color: var(--pill-c, #c89040);
}

.fd-path-name {
  font-size: 12px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.8);
  white-space: nowrap;
}

.fd-path-pill--self .fd-path-name {
  color: var(--pill-c, #e8c040);
}

/* ── Zustände ohne Kauf ──────────────────────────────────────── */
.fd-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.fd-state--max {
  justify-content: center;
  background: rgba(232, 192, 64, 0.1);
  border: 1px solid #5c3310;
  color: #e8c040;
}

.fd-state--locked {
  background: #1c1408;
  border: 1px solid #4a3010;
  color: rgba(255, 200, 80, 0.72);
}

.fd-track {
  height: 7px;
  border-radius: 4px;
  background: #241708;
  overflow: hidden;
}

.fd-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

/* ── Kaufen ──────────────────────────────────────────────────── */
.fd-bulk-note {
  margin-top: -4px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(122, 208, 160, 0.8);
  font-variant-numeric: tabular-nums;
}

.fd-actions {
  display: flex;
  gap: 10px;
}

.fd-act {
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

.fd-act:disabled {
  border-color: #4a3a1c;
  background: #241a0c;
  color: rgba(232, 216, 176, 0.55);
  cursor: not-allowed;
}

.fd-act--bulk {
  flex: 0 0 136px;
  border-color: #4a8a28;
  background: #16210c;
  color: #9fe062;
  font-size: 15px;
}

.fd-act--bulk:hover {
  border-color: #6ec040;
  background: #1c2e10;
}

/* ══════════════════════════════════════════════════
   LEERZUSTAND
   Höhe absichtlich in derselben Größenordnung wie die gefüllte Fassung.
══════════════════════════════════════════════════ */
.fd-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 18px 22px;
  background: #111008;
}

.fd-empty-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.35);
}

.fd-empty-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(232, 220, 192, 0.42);
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fd-head {
    padding: 10px 15px 0;
  }

  .fd-id {
    gap: 12px;
    padding: 10px 15px 11px;
  }

  .fd-ico {
    width: 52px;
    height: 52px;
  }

  .fd-name {
    font-size: 20px;
  }

  .fd-body {
    gap: 10px;
    padding: 11px 15px 13px;
  }

  .fd-desc {
    font-size: 14px;
  }

  .fd-delta {
    padding: 10px 13px;
  }

  .fd-delta-value {
    font-size: 19px;
  }

  .fd-act {
    padding: 12px 0;
    font-size: 15px;
  }
}
</style>
