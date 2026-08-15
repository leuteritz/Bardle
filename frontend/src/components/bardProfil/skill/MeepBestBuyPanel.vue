<script setup lang="ts">
/**
 * Was als Nächstes zu lernen lohnt — der Kopf der Detailschiene.
 *
 * Er beantwortet EINE Frage und tritt in den Ruhezustand, sobald sie keine
 * Antwort mehr hat. Gezeigt wird `bestBuyId` aus `useMeepSkills`: der
 * günstigste Knoten, den der Meep-Bestand gerade deckt — derselbe, den die
 * Orbit-Bühne links als BEST BUY umringt. Nach einem Kauf rückt die Empfehlung
 * ohne Zutun auf den nächstbesten.
 *
 * **„Günstigster" und nicht „stärkster"** — die Wirkungen des Baums stehen in
 * Prozent, HP, Stunden und Chimes nebeneinander, und es gibt keine Einheit, in
 * der man sie rangieren könnte. Die Herleitung steht an `bestBuyId` und an
 * `MEEP_BEST_BUY_LABEL`.
 *
 * Seine Höhe ist reserviert und inhaltsunabhängig
 * (`MEEP_BEST_BUY_PANEL_MIN_PX`): das Panel sitzt ÜBER der scrollenden Liste,
 * und was es zeigt, hängt an Zahlen, die sich ohne Zutun ändern. Ohne die
 * Klammer schöbe jede davon die Liste darunter.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepSkills } from '@/composables/ui/useMeepSkills'
import { useMeepSpotlight } from '@/composables/ui/useMeepSpotlight'
import { useActionToast } from '@/composables/ui/useActionToast'
import { MEEP_TREE_BADGE_ICON, MEEP_TREE_TIERS_PER_BRANCH } from '@/config/progression/meepTree'
import {
  MEEP_BEST_BUY_ACT_LABEL,
  MEEP_BEST_BUY_HINT,
  MEEP_BEST_BUY_ICON,
  MEEP_BEST_BUY_ICON_SIZE,
  MEEP_BEST_BUY_IDLE,
  MEEP_BEST_BUY_IDLE_ICON,
  MEEP_BEST_BUY_PANEL_FRACTION,
  MEEP_BEST_BUY_PANEL_MAX_PX,
  MEEP_BEST_BUY_PANEL_MIN_PX,
  MEEP_BEST_BUY_TITLE,
  MEEP_SKILL_FLASH_MS,
} from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import type { MeepSkillEntry } from '@/types'

/* Die Dauer steht in den Konstanten und wird von CSS und Timer aus derselben
   Quelle gelesen; den KEYFRAME-Namen setzt weiterhin die CSS-Klasse. */
const flashDuration = `${MEEP_SKILL_FLASH_MS}ms`

/* Die reservierte Fläche — Herleitung an den Konstanten. Ein fertiger String
   statt dreier `v-bind`, damit die Regel unten in EINEM Stück lesbar bleibt. */
const panelHeight = `clamp(${MEEP_BEST_BUY_PANEL_MIN_PX}px, ${MEEP_BEST_BUY_PANEL_FRACTION * 100}%, ${MEEP_BEST_BUY_PANEL_MAX_PX}px)`

const gameStore = useGameStore()
const { entryById, bestBuyId, detailFor, buySkill } = useMeepSkills()
const { listHovering } = useMeepSpotlight()
const { showToast } = useActionToast()

/**
 * Ob das Panel eine Empfehlung zeigt.
 *
 * Es folgt `bestBuyId`, aber NICHT, solange der Zeiger die Liste hält: ein
 * Wechsel in genau dem Moment tauschte den Inhalt unter der Hand. Nachgezogen
 * wird beim Loslassen — dasselbe Motiv wie `frozenBuckets` in `MeepSkillList`.
 *
 * Eingefroren wird nur, WELCHER Knoten gezeigt wird; die Fläche steht ohnehin.
 */
const shownId = ref<string | null>(bestBuyId.value)

watch(
  [bestBuyId, listHovering],
  ([id, hovering]) => {
    if (!hovering) shownId.value = id
  },
  { immediate: true },
)

const shown = computed<MeepSkillEntry | null>(() =>
  shownId.value === null ? null : (entryById.value.get(shownId.value) ?? null),
)

/* Nur für den EINEN gezeigten Knoten gerechnet. */
const detail = computed(() => (shown.value ? detailFor(shown.value.id) : null))

/** „Vigil · Rank 1 of 5" */
const metaLine = computed(() => {
  const e = shown.value
  if (!e) return ''
  return `${e.branchName} · Rank ${e.rank} of ${MEEP_TREE_TIERS_PER_BRANCH}`
})

/** Quittung des Kaufs. Rein visuell, daher reale Zeit. */
const flashed = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

function learn(): void {
  const e = shown.value
  if (!e || !e.canBuy) return
  if (!buySkill(e.id)) return
  showToast(`${e.name} learned!`, 'perk')
  flashed.value = true
  if (flashTimer !== null) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashed.value = false
  }, MEEP_SKILL_FLASH_MS)
}

onUnmounted(() => {
  if (flashTimer !== null) clearTimeout(flashTimer)
})
</script>

<template>
  <section class="mbb-panel" :style="{ '--node-c': shown?.color ?? '#52b830' }">
    <div class="mbb-flash" :class="{ 'mbb-flash--on': flashed }" aria-hidden="true" />

    <header class="mbb-head">
      <span class="mbb-badge">
        <Icon :icon="MEEP_BEST_BUY_ICON" width="13" height="13" />
        {{ MEEP_BEST_BUY_TITLE }}
      </span>
      <span v-if="shown" class="mbb-hint">{{ MEEP_BEST_BUY_HINT }}</span>
    </header>

    <template v-if="shown">
      <div class="mbb-id">
        <div class="mbb-ico">
          <Icon
            :icon="shown.icon"
            :width="MEEP_BEST_BUY_ICON_SIZE"
            :height="MEEP_BEST_BUY_ICON_SIZE"
            :style="{ color: shown.color }"
          />
        </div>
        <div class="mbb-id-text">
          <div class="mbb-name" :style="{ color: shown.color }">{{ shown.name }}</div>
          <div class="mbb-meta">{{ metaLine }}</div>
        </div>
      </div>

      <div class="mbb-body">
        <p class="mbb-desc">{{ shown.desc }}</p>

        <!-- Now → After: die Werte kommen fertig aus `useMeepSkills`, hier wird
             nichts nachgerechnet. -->
        <div v-if="detail && detail.changes.length > 0" class="mbb-delta">
          <div v-for="c in detail.changes" :key="c.key" class="mbb-delta-row">
            <span class="mbb-delta-label">{{ c.label }}</span>
            <span class="mbb-delta-value">{{ c.from }}</span>
            <span class="mbb-delta-arrow">→</span>
            <span
              class="mbb-delta-value mbb-delta-value--next"
              :class="{ 'mbb-delta-value--bad': !c.good }"
            >
              {{ c.to }}
            </span>
          </div>
        </div>

        <!-- Wo der Effekt ANKOMMT, nicht nur um wie viel — die Chips stehen
             genau dafür an `MEEP_TREE_EFFECT_ROWS`. Sie füllen zugleich die
             Fläche, die für mehrzeilige Deltas reserviert ist und bei einem
             einzelnen Effekt sonst leer bliebe. -->
        <div v-if="detail && detail.tags.length > 0" class="mbb-tags">
          <span
            v-for="t in detail.tags"
            :key="t.label"
            class="fc-chip mbb-tag"
            :style="{ '--chip-c': shown.color }"
          >
            <Icon :icon="t.icon" width="13" height="13" />
            {{ t.label }}
          </span>
        </div>
      </div>

      <!-- Preis und Knopf stehen AUSSERHALB des scrollenden Körpers.
           Im Shop hängen sie als `position: sticky` darin — dort steht aber nur
           EINE Now-→-After-Zeile. Ein Baumknoten trägt bis zu drei, und der
           klebende Block deckte sie dann ab: gemessen verschwand „Chimes per
           meep −10 %" hinter dem Kostenkasten, also genau die Zahl, wegen der
           man hinsieht. Als eigene Zone kann er nichts mehr verdecken, und was
           nicht mehr hineinpasst, scrollt sauber darüber. -->
      <div class="mbb-foot">
        <!-- Preis NEBEN dem Knopf, nicht darüber: übereinander kostete die
             Fusszeile 135 der 316 Panel-Pixel, und dem Körper blieben 70 —
             zu wenig für Beschreibung UND Vorher/Nachher. Nebeneinander sind
             es 72. Die Beschriftung „Cost" entfällt dabei, weil der Knopf
             daneben schon sagt, wofür die Zahl steht; die goldene Linkskante
             und ✓/✕ bleiben, sie tragen die Aussage. -->
        <div
          class="fc-cost mbb-cost"
          :class="{ 'fc-cost--short': !shown.canAfford }"
          :title="`You hold ${gameStore.meeps} meeps · ${shown.name} costs ${shown.cost}`"
        >
          <span class="fc-cost-pair" :class="{ 'fc-cost-pair--missing': !shown.canAfford }">
            <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="fc-cost-img" />
            <span class="fc-cost-qty">
              {{ formatNumberCompact(gameStore.meeps)
              }}<span class="fc-cost-need">/{{ shown.cost }}</span>
            </span>
            <span class="fc-cost-state" aria-hidden="true">
              {{ shown.canAfford ? '✓' : '✕' }}
            </span>
          </span>
        </div>

        <button class="fc-act mbb-act" :disabled="!shown.canBuy" @click="learn">
          {{ MEEP_BEST_BUY_ACT_LABEL }}
        </button>
      </div>
    </template>

    <!-- Füllt dieselbe Fläche, damit auch dieser Moment nichts verschiebt. -->
    <div v-else class="mbb-idle">
      <Icon :icon="MEEP_BEST_BUY_IDLE_ICON" width="30" height="30" class="mbb-idle-ico" />
      <span class="mbb-idle-text">{{ MEEP_BEST_BUY_IDLE }}</span>
    </div>
  </section>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
   Reservierte, inhaltsunabhängige Fläche über der scrollenden Liste — dieselbe
   Klammer und derselbe Grund wie `.nu-panel` im Shop.
══════════════════════════════════════════════════ */
.mbb-panel {
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

/* Quittung des Kaufs — eine Transition auf eigener Ebene, kein Dauerläufer. */
.mbb-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 245, 220, 0.22);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
}

.mbb-flash--on {
  animation: mbb-flash v-bind(flashDuration) ease-out;
}

@keyframes mbb-flash {
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

.mbb-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 18px 0;
}

/* Das grüne Abzeichen — dieselben drei Farben wie die BEST-BUY-Marke auf der
   Orbit-Bühne und im Shop. Panel und Marke sind visuell dasselbe Ding. */
.mbb-badge {
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

.mbb-hint {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.36);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Identität ── */
.mbb-id {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px 14px;
  border-bottom: 2px solid #3e200a;
}

/* Die Bühne trägt die Zweigfarbe als STATISCHEN Verlauf — Rezept `.fc-ico`. */
.mbb-ico {
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

.mbb-id-text {
  flex: 1;
  min-width: 0;
}

.mbb-name {
  font-size: 23px;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mbb-meta {
  margin-top: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Körper ──
   Was über die reservierte Fläche hinausgeht, scrollt hier — das ist der Preis
   dafür, dass die Liste darunter nie wandert, und er trifft nur Zierrat: Preis
   und Knopf kleben. */
.mbb-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 13px 18px 2px;
  background: #111008;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.mbb-body::-webkit-scrollbar {
  width: 4px;
}

.mbb-body::-webkit-scrollbar-track {
  background: #111;
}

.mbb-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.mbb-desc {
  font-size: 15px;
  line-height: 1.45;
  color: rgba(232, 220, 192, 0.82);
}

/* ── Vorher → Nachher ──
   EIN Kasten im Rezept des Shop-Deltas (#141410 auf #32210c), nicht eine Kachel
   je Zeile: bei drei Effekten lesen sich drei gleich aussehende Kästen
   untereinander als ein einziger. */
.mbb-delta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 16px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

/* Eine ZEILE je Effekt, nicht Beschriftung über Werten: ein Knoten trägt bis
   zu drei, und übereinander gestellt kostete jeder von ihnen 38px statt 24. */
.mbb-delta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Gibt als Erstes nach, wenn die Schiene eng wird — die Zahlen rechts sind die
   Aussage, der Name links ist die Beschriftung dazu. */
.mbb-delta-label {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.52);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mbb-delta-value {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.15;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
}

/* Die eigene Marke des Ergebnisses — es ist das Ziel der Entscheidung, nicht
   ein Wert von zweien. */
.mbb-delta-value--next {
  padding: 3px 9px;
  border-radius: 3px;
  color: #7ad0a0;
  background: rgba(122, 208, 160, 0.12);
  border: 1px solid rgba(122, 208, 160, 0.35);
}

.mbb-delta-value--bad {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.35);
}

.mbb-delta-arrow {
  flex-shrink: 0;
  font-size: 15px;
  color: rgba(200, 144, 64, 0.6);
}

/* ── Berührte Systeme ── */
.mbb-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mbb-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-transform: uppercase;
}

/* ── Fusszeile ──
   Eigene Zone neben Kopf, Identität und Körper — nicht `sticky` IM Körper.
   Begründung am Markup. */
.mbb-foot {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 11px 18px 15px;
  background: #111008;
}

/* Der geteilte Kostenblock steht global als Spalte (Beschriftung über Zeile);
   hier trägt er nur die Zeile und richtet sie mittig aus. */
.mbb-cost {
  flex-shrink: 0;
  justify-content: center;
  padding: 9px 12px;
}

/* Der Knopf nimmt, was die Zahl übrig lässt — nie umgekehrt: der Preis hat
   eine feste Länge, die Beschriftung kann kürzen. */
.mbb-act {
  flex: 1;
  min-width: 0;
  width: auto;
  padding: 12px 14px;
}

/* ── Ruhezustand ── */
.mbb-idle {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  background: #111008;
}

.mbb-idle-ico {
  flex-shrink: 0;
  color: rgba(200, 144, 64, 0.35);
}

.mbb-idle-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.42);
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .mbb-head {
    padding: 10px 15px 0;
  }

  .mbb-id {
    gap: 12px;
    padding: 10px 15px 11px;
  }

  .mbb-ico {
    width: 52px;
    height: 52px;
  }

  .mbb-name {
    font-size: 20px;
  }

  .mbb-body {
    gap: 9px;
    padding: 10px 15px 2px;
  }

  .mbb-desc {
    font-size: 14px;
  }

  .mbb-delta {
    gap: 7px;
    padding: 10px 13px;
  }

  .mbb-delta-value {
    font-size: 15px;
  }

  .mbb-foot {
    gap: 9px;
    padding: 9px 15px 12px;
  }

  .mbb-cost {
    padding: 8px 11px;
  }

  .mbb-act {
    padding: 11px 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mbb-flash--on {
    animation: none;
  }
}
</style>
