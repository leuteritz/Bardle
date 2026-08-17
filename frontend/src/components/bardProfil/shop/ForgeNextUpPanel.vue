<template>
  <!-- Es gibt dieses Panel NUR, solange es etwas zu empfehlen hat. Der Wegfall
       ist an einen Kauf oder eine Chime-Schwelle gebunden, nie an die Maus —
       deshalb kann er kein Flackern tragen. -->
  <section v-if="shown" class="nu-panel" :style="{ '--node-c': entry?.color ?? '#52b830' }">
    <div class="nu-flash" :class="{ 'nu-flash--on': flashed }" aria-hidden="true" />

    <!-- Der azurne Rahmen, wenn die Empfehlung zugleich das Neueste ist. Eigene
         Ebene mit statischem Schein auf `inset: 0` — das Panel trägt
         `overflow: hidden`, und die Goldlinie an seiner Oberkante bleibt so
         unangetastet. -->
    <div v-if="entryIsFresh" class="nu-fresh" aria-hidden="true" />

    <header class="nu-head">
      <span class="nu-badge">
        <Icon :icon="FORGE_NEXT_UP_ICON" width="13" height="13" />
        {{ FORGE_NEXT_UP_TITLE }}
      </span>
      <span v-if="entryIsFresh" class="nu-new" :aria-label="FORGE_FRESH_TITLE">
        {{ FORGE_FRESH_LABEL }}
      </span>
      <span v-if="entry" class="nu-hint">{{ FORGE_NEXT_UP_HINT }}</span>
    </header>

    <template v-if="entry">
      <!-- Nacktes Icon, grosse Stufe: dieselbe Formensprache wie die Zeilen
           darunter (`ForgeUpgradeTile`). Zwei Stilrichtungen übereinander in
           derselben Spalte lasen sich wie zwei verschiedene Bauteile. -->
      <div class="nu-id">
        <Icon
          :icon="entry.icon"
          :width="FORGE_DETAIL_ICON_SIZE"
          :height="FORGE_DETAIL_ICON_SIZE"
          class="nu-ico"
          :style="{ color: entry.color }"
        />
        <div class="nu-id-text">
          <div class="nu-name" :style="{ color: entry.color }">{{ entry.name }}</div>
          <div class="nu-meta">{{ metaLine }}</div>
        </div>
        <div class="nu-lvl">
          {{ levelParts.big }}<span class="nu-lvl-max">{{ levelParts.max }}</span>
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

        <!-- Der Kaufblock klebt an der Unterkante, und der Preis steht IM
             Knopf: ein Kaufknopf ohne den Preis daneben ist die schlechtere
             Hälfte der Auskunft, und daneben braucht er eine eigene Zeile, die
             die reservierte Fläche nicht hergibt. Verb oben auf Grün, Kasse
             darunter auf Dunkel — dasselbe Rezept wie in der Zeile, samt
             Begründung, warum die Kasse nicht auf dem Grün liegt. -->
        <div class="nu-foot">
          <div v-if="bulkCount > 1" class="nu-bulk-note">
            {{ bulkCount }}{{ FORGE_AFFORDABLE_SUFFIX }}
          </div>

          <div class="nu-actions">
            <button class="nu-act" @click="growOne">
              <span class="nu-act-verb">{{ buttonLabel }}</span>
              <ForgeCostRow
                class="nu-act-cost"
                inline
                chips
                :label="false"
                :gold="entry.goldCost"
                :gold-ok="entry.goldOk"
                :materials="entry.materials"
              />
            </button>
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
import { forgeGrowLabel, forgeLevelParts, useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
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
  FORGE_CARD_FLASH_MS,
  FORGE_DETAIL_PANEL_MIN_PX,
  FORGE_DETAIL_PANEL_FRACTION,
  FORGE_DETAIL_PANEL_MAX_PX,
  FORGE_FRESH_LABEL,
  FORGE_FRESH_TITLE,
} from '@/config/constants'

/* Die Dauer steht in den Konstanten und wird von CSS und Timer aus derselben
   Quelle gelesen; den KEYFRAME-Namen setzt weiterhin die CSS-Klasse. */
const flashDuration = `${FORGE_CARD_FLASH_MS}ms`

/* Die reservierte Fläche — Herleitung an den Konstanten. Ein fertiger String
   statt dreier `v-bind`, damit die Regel unten in EINEM Stück lesbar bleibt. */
const panelHeight = `clamp(${FORGE_DETAIL_PANEL_MIN_PX}px, ${FORGE_DETAIL_PANEL_FRACTION * 100}%, ${FORGE_DETAIL_PANEL_MAX_PX}px)`

const { entryById, bestBuyId, freshIds, buyUpgrade, affordableLevels, buyMany } =
  useForgeUpgrades()
const { listHovering } = useForgeSpotlight()

const entry = computed<ForgeUpgradeEntry | null>(() =>
  bestBuyId.value === null ? null : (entryById.value.get(bestBuyId.value) ?? null),
)

/**
 * Ist die Empfehlung zugleich das Neueste?
 *
 * Beides kann zusammenfallen, muss aber nicht: BEST BUY zeigt auf das billigste
 * Kaufbare, der azurne Rahmen auf das seit dem letzten Blick Dazugekommene. Nur
 * wenn beides derselbe Eintrag ist, trägt der Kopf die Marke.
 */
const entryIsFresh = computed(() => entry.value !== null && freshIds.value.has(entry.value.id))

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

// ── Stufe und Metazeile ──────────────────────────────────────────────────────
/** Die grosse Zahl rechts im Identitätsblock — dieselbe Quelle wie in der
 *  Zeile darunter und im Archiv. */
const levelParts = computed(() =>
  entry.value ? forgeLevelParts(entry.value.level, entry.value.maxLevel) : { big: '', max: '' },
)

/**
 * „ROOT · hangs on Wayfinder's Cache".
 *
 * Die Stufe stand hier einmal mit (`Lv 3 / 6`); sie steht jetzt gross daneben,
 * und zweimal dieselbe Zahl in einem Block ist eine zu viel. Ein Bough behält
 * seinen Zusatz: seine Endlosigkeit ist eine Eigenschaft des Knotens, keine
 * Stufenangabe — die grosse Zahl daneben zeigt dafür `/ ∞`.
 */
const metaLine = computed(() => {
  const e = entry.value
  if (!e) return ''
  const parts = [e.tierLabel]
  if (!Number.isFinite(e.maxLevel)) parts.push(FORGE_DETAIL_ENDLESS_META)
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
const buttonLabel = computed(() => (entry.value ? forgeGrowLabel(entry.value.level) : ''))

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

/* ── NEU SEIT DEM LETZTEN BLICK ──────────────────────────────────
   Genau EINE Ebene, weil es genau EINE Empfehlung gibt — sie darf deshalb
   deutlich sein. Statischer Schein, animiert wird allein die Deckkraft
   (Performance-Regel 2/11); `inset: 0`, weil das Panel klippt.
   Unter dem Quittungsblitz (z-index 4), damit ein Kauf weiterhin oben liegt. */
.nu-fresh {
  position: absolute;
  inset: 0;
  border: 2px solid #60a5fa;
  box-shadow: inset 0 0 26px rgba(59, 130, 246, 0.4);
  pointer-events: none;
  z-index: 3;
  animation: nu-fresh-breathe 2.2s ease-in-out infinite;
}

@keyframes nu-fresh-breathe {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.nu-new {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid #bae6fd;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: #fff;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

@media (prefers-reduced-motion: reduce) {
  .nu-flash--on {
    animation: none;
  }

  .nu-fresh {
    animation: none;
    opacity: 1;
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

/* Nackt, ohne Sockel — der gerahmte Kasten ist mit der Kachel darunter
   weggefallen; die Knotenfarbe trägt das Glyph selbst. */
.nu-ico {
  flex-shrink: 0;
}

.nu-id-text {
  flex: 1;
  min-width: 0;
}

/* Die grosse Zahl, wie in jeder Zeile darunter. `tabular-nums`, damit sie beim
   Wechsel der Empfehlung nicht springt. */
.nu-lvl {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.nu-lvl-max {
  font-size: 14px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.4);
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

/* Verb oben, Kasse darunter — ein Knopf aus zwei Zonen. Der Grünverlauf sitzt
   an der Verb-Zeile, nicht am Knopf: die Kasse müsste ihn sonst wieder
   überdecken. */
.nu-act {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: #14120b;
  font-family: inherit;
  cursor: pointer;
}

.nu-act-verb {
  flex: 0 0 auto;
  padding: 12px 0;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.15;
}

.nu-act:hover .nu-act-verb {
  filter: brightness(1.12);
}

.nu-act-cost {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.55);
}

.nu-act-cost :deep(.fc-cost-row) {
  justify-content: center;
}

.nu-act-cost :deep(.fc-cost-img),
.nu-act-cost :deep(.fc-cost-ph) {
  height: 26px;
}

.nu-act-cost :deep(.fc-cost-ph) {
  width: 26px;
}

/* Der Stapelknopf trägt nur ein Wort — er bekommt seinen Innenabstand selbst,
   und `align-self: stretch` hält ihn auf der Höhe des zweizonigen Nachbarn. */
.nu-act--bulk {
  flex: 0 0 136px;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  border-color: #4a8a28;
  background: #16210c;
  color: #9fe062;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.04em;
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

  /* Die Icon-Grösse steht als Attribut am `<Icon>`; CSS schlägt es. */
  .nu-ico {
    width: 44px;
    height: 44px;
  }

  .nu-name {
    font-size: 20px;
  }

  .nu-lvl {
    font-size: 25px;
  }

  .nu-lvl-max {
    font-size: 13px;
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

  .nu-act-verb {
    padding: 10px 0;
    font-size: 15px;
  }

  .nu-act-cost {
    padding: 6px 10px;
  }

  .nu-act-cost :deep(.fc-cost-img),
  .nu-act-cost :deep(.fc-cost-ph) {
    height: 24px;
  }

  .nu-act-cost :deep(.fc-cost-ph) {
    width: 24px;
  }

  .nu-act--bulk {
    padding: 10px 0;
  }
}
</style>
