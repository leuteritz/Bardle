<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import {
  CHRONICLE_TOTAL_STAGES,
  CHRONICLE_RANKS,
} from '@/config/progression/achievements'
import { CHRONICLE_STAGES_PER_TRACK } from '@/config/constants'
import { toRoman } from '@/utils/ui/format'
import StatsColumnHeader from './StatsColumnHeader.vue'
import type { ChronicleTrackView } from '@/types'

/**
 * The Astral Codex — der Streifen unter der Sonne im Bard-Stats-Deck. Die
 * Bahnen heißen im Code weiter `CHRONICLE_*`: die Umbenennung ist eine reine
 * Anzeigesache, und der Spielstand trägt den Schlüssel `chronicle`.
 *
 * Warum Master-Detail und nicht acht Karten: der Platz hier ist gemessen
 * 422×278 px auf WUXGA (dem Engpass — die Mittelspalte ist dort SCHMALER als
 * auf Full HD, weil die Bottom-Bar-Panels mit der Höhe skalieren). Acht Karten
 * mit Balken, Stand und Wirkung bräuchten darin je 40 px Höhe und 200 px Breite;
 * beides gibt es nicht, ohne die Schrift unter das Lesbare zu drücken.
 *
 * Deshalb tragen acht Wappen den Überblick (Bahn, Stufe, Fortschritt) und EIN
 * Feld darunter die Tiefe. Das macht den Hover zum Kern der Bedienung statt zur
 * Dekoration: fahren zeigt, klicken heftet an.
 *
 * Der Kopf ist derselbe `StatsColumnHeader` wie über Journey, Galaxy Archive
 * und Buffs & Augments — der Deck-Kanon aus goldener Überschrift und
 * Kontextsuche gilt damit für alle vier durchsuchbaren Panels. Die Suche hat
 * vorher im Kopf der Spalte gestanden und von dort die Wappen gefiltert; sie
 * gehört dorthin, wo sie wirkt.
 */
const uiStore = useUiStore()
const store = useAchievementStore()

/**
 * Beim Öffnen des Stats-Tabs ist alles gesehen — das Abzeichen an der Tab-Leiste
 * erlischt. Es hängt an der SICHTBARKEIT, nicht am Mounten: die Tab-Layer
 * werden nur versteckt, ein `onMounted` würde also genau einmal je Sitzung
 * feuern und danach nie wieder.
 */
watch(
  () => uiStore.bardActiveTab === 'bard',
  (visible) => {
    if (visible) store.markSeen()
  },
  { immediate: true },
)

/** Angeheftet per Klick; überlebt das Verlassen der Reihe. */
const pinnedId = ref<string | null>(null)
/** Vorschau per Hover; hat Vorrang, solange die Maus auf einem Wappen steht. */
const hoverId = ref<string | null>(null)

const tracks = computed(() => store.trackViews)

/** Kontextsuche des Panels — hebt Treffer hervor und dimmt den Rest. */
const search = ref('')

const query = computed(() => search.value.trim().toLowerCase())

function matches(track: ChronicleTrackView): boolean {
  if (!query.value) return true
  return (
    track.name.toLowerCase().includes(query.value) ||
    track.blurb.toLowerCase().includes(query.value) ||
    track.effect.toLowerCase().includes(query.value) ||
    track.unit.toLowerCase().includes(query.value)
  )
}

/**
 * Ohne Zutun zeigt das Feld die Bahn, die dem nächsten Meilenstein am nächsten
 * ist — die Antwort auf „was fällt als Nächstes". Ausgereizte Bahnen zählen
 * nicht mit; sind alle voll, steht die erste.
 */
const autoFocusId = computed(() => {
  const open = tracks.value.filter((t) => t.stage < CHRONICLE_STAGES_PER_TRACK)
  if (open.length === 0) return tracks.value[0]?.id ?? null
  return open.reduce((best, t) => (t.progress > best.progress ? t : best)).id
})

/** Erster Suchtreffer — eine Suche soll das Feld mitziehen, nicht nur dimmen. */
const searchFocusId = computed(() => {
  if (!query.value) return null
  return tracks.value.find(matches)?.id ?? null
})

const shownId = computed(
  () => hoverId.value ?? searchFocusId.value ?? pinnedId.value ?? autoFocusId.value,
)
const shown = computed(() => tracks.value.find((t) => t.id === shownId.value) ?? tracks.value[0])

/** Rabatt-Bahnen zählen nach unten; das Vorzeichen gehört zur Aussage. */
const shownSign = computed(() => (shown.value?.effect.includes('−{v}') ? '−' : '+'))

const shownEffect = computed(() => {
  if (!shown.value) return ''
  const value = shown.value.stage > 0 ? shown.value.value : shown.value.stages[0].value
  return shown.value.effect.replace('{v}', String(value))
})

/** Die Leiter der gezeigten Bahn: jede Stufe mit Schwelle und Wert. */
const ladder = computed(() =>
  (shown.value?.stages ?? []).map((stage, i) => ({
    numeral: toRoman(i + 1),
    threshold: stage.threshold,
    value: stage.value,
    done: i < (shown.value?.stage ?? 0),
    next: i === (shown.value?.stage ?? 0),
  })),
)

const totalProgress = computed(() => store.unlockedStageCount / CHRONICLE_TOTAL_STAGES)
const nextRank = computed(() => CHRONICLE_RANKS.find((r) => r.min > store.unlockedStageCount))
const toNextRank = computed(() =>
  nextRank.value ? nextRank.value.min - store.unlockedStageCount : 0,
)

/** Klick heftet an; ein zweiter Klick auf dasselbe Wappen löst wieder. */
function pin(id: string) {
  pinnedId.value = pinnedId.value === id ? null : id
}

// Eine angeheftete Bahn, die aus der Suche fällt, würde stumm weiterzeigen.
watch(query, () => {
  if (pinnedId.value) pinnedId.value = null
})
</script>

<template>
  <div class="cr-zone">
    <!-- Derselbe Kopf wie über den anderen Deck-Panels, nur mit zwei Ablesungen
         zwischen Überschrift und Suche: der erreichte Rang und der Stand. -->
    <StatsColumnHeader
      v-model="search"
      class="cr-head"
      title="Astral Codex"
      placeholder="Search tracks…"
    >
      <template #meta>
        <span class="cr-rank">{{ store.rankTitle }}</span>
        <span class="cr-count">
          <span class="cr-count-num">{{ store.unlockedStageCount }}</span>
          <span class="cr-count-sep">/</span>{{ CHRONICLE_TOTAL_STAGES }}
        </span>
      </template>
    </StatsColumnHeader>

    <!-- Gesamtleiter mit Rang-Kerben -->
    <div class="cr-meter">
      <div class="cr-meter-track">
        <div class="cr-meter-fill" :style="{ transform: `scaleX(${totalProgress})` }" />
        <span
          v-for="rank in CHRONICLE_RANKS.filter((r) => r.min > 0)"
          :key="rank.title"
          class="cr-meter-mark"
          :class="{ 'is-reached': store.unlockedStageCount >= rank.min }"
          :style="{ left: (rank.min / CHRONICLE_TOTAL_STAGES) * 100 + '%' }"
          :title="`${rank.title} — ${rank.min} stages`"
        />
      </div>
      <span v-if="nextRank" class="cr-meter-next">
        {{ toNextRank }} to <strong>{{ nextRank.title }}</strong>
      </span>
      <span v-else class="cr-meter-next is-done">Book full</span>
    </div>

    <!-- Acht Wappen: Bahn, Stufe, Fortschritt -->
    <div class="cr-crests">
      <button
        v-for="track in tracks"
        :key="track.id"
        type="button"
        class="cr-crest"
        :class="{
          'is-shown': track.id === shownId,
          'is-pinned': track.id === pinnedId,
          'is-maxed': track.stage >= CHRONICLE_STAGES_PER_TRACK,
          'is-dormant': track.stage === 0,
          'is-dimmed': !matches(track),
        }"
        :style="{ '--tc': track.color }"
        :title="`${track.name} — stage ${track.stage} of ${CHRONICLE_STAGES_PER_TRACK}`"
        @mouseenter="hoverId = track.id"
        @mouseleave="hoverId = null"
        @focus="hoverId = track.id"
        @blur="hoverId = null"
        @click="pin(track.id)"
      >
        <Icon :icon="track.icon" width="24" height="24" class="cr-crest-icon" />
        <span class="cr-crest-stage">
          <template v-if="track.stage > 0">{{ toRoman(track.stage) }}</template>
          <template v-else>—</template>
        </span>
        <!-- Fortschritt zur nächsten Stufe als Sockel des Wappens -->
        <span class="cr-crest-bar">
          <span class="cr-crest-bar-fill" :style="{ transform: `scaleX(${track.progress})` }" />
        </span>
      </button>
    </div>

    <!-- Das Feld: alles zur gezeigten Bahn. Feste Höhe, damit ein Wechsel
         nichts verschiebt. -->
    <div v-if="shown" class="cr-focus" :style="{ '--tc': shown.color }">
      <div class="cr-focus-head">
        <span class="cr-focus-crest">
          <Icon :icon="shown.icon" width="22" height="22" />
        </span>
        <span class="cr-focus-titles">
          <span class="cr-focus-name">{{ shown.name }}</span>
          <span class="cr-focus-blurb">{{ shown.blurb }}</span>
        </span>
        <span class="cr-focus-stage">
          <span class="cr-focus-stage-num">
            <template v-if="shown.stage > 0">{{ toRoman(shown.stage) }}</template>
            <template v-else>—</template>
          </span>
          <span class="cr-focus-stage-of">{{ shown.stage }}/{{ CHRONICLE_STAGES_PER_TRACK }}</span>
        </span>
      </div>

      <div class="cr-focus-effect">
        <span class="cr-focus-effect-text">{{ shownEffect }}</span>
        <span v-if="shown.stage === 0" class="cr-focus-pending">at I</span>
      </div>

      <div class="cr-focus-count">
        <template v-if="shown.nextThreshold === null">
          {{ $formatNumber(shown.current) }} {{ shown.unit }} · complete
        </template>
        <template v-else>
          {{ $formatNumber(shown.current) }}
          <span class="cr-focus-sep">/</span>
          {{ $formatNumber(shown.nextThreshold) }}
          <span class="cr-focus-unit">{{ shown.unit }}</span>
        </template>
      </div>

      <div class="cr-ladder">
        <span
          v-for="step in ladder"
          :key="step.numeral"
          class="cr-step"
          :class="{ 'is-done': step.done, 'is-next': step.next }"
        >
          <span class="cr-step-num">{{ step.numeral }}</span>
          <span class="cr-step-goal">{{ $formatNumber(step.threshold) }}</span>
          <span class="cr-step-val">{{ shownSign }}{{ step.value }}%</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   CHRONICLE — Wappenreihe plus Fokusfeld, unter der Sonne im Stats-Deck.

   Höhenbudget ist knapp (278 px auf den flachen Viewports), deshalb hat jede
   Ebene eine feste Aufgabe: Rubrik, Gesamtleiter, acht Wappen, ein Feld. Das
   Feld ist der einzige flexible Teil — es nimmt, was übrig bleibt.

   Alles Bewegte ist `transform` oder `opacity`; die Wappen wechseln ihren
   Zustand über Farbe und Deckkraft, nie über Schatten oder Filter, denn es
   stehen immer acht davon gleichzeitig auf dem Schirm.
════════════════════════════════════════════════════════════════════════════ */
/* FESTE Höhe, bewusst nicht inhaltsabhängig — dieselbe Regel, unter der vorher
   das Augment-Deck hier stand: ein Layout-Anker darf nicht davon abhängen, wie
   voll etwas ist, sonst schrumpft die Sonne darüber, während der Spieler
   weiterspielt. Die Sonne nimmt (`flex: 1`), was diese Zone übrig lässt.

   Die Werte sind gegen den gemessenen Platz gerechnet: der Spaltenkörper hat
   587 px auf Full HD, 861 auf 2K und 1555 auf 4K. Was hier abgeht, bekommt der
   Dial — mit 274 px bleiben ihm auf Full HD 303 px, mehr als die 281, die er
   neben dem alten Augment-Deck hatte.

   Die Basiswerte tragen den vollen Deck-Header (50 px / 44 kompakt / 58 auf 4K)
   statt der 20 px hohen Mini-Rubrik, die hier vorher stand — jede Stufe ist um
   genau diesen Unterschied gewachsen, damit unter dem Kopf so viel Feld steht
   wie zuvor. */
.cr-zone {
  flex: 0 0 320px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  /* Die Zone ist ihr eigener Maßstab: die Mittelspalte ist 397px breit auf
     WUXGA, 470 auf Full HD, 890 auf 2K und 1156 auf 4K — und diese Breite folgt
     weder der Viewportbreite noch seiner Höhe allein (die Bottom-Bar-Panels
     skalieren mit der Höhe und verschmälern das Modal). Breiten-Media-Queries
     könnten das nicht treffen; `cqw` trifft es immer.
     Dasselbe Muster nutzt der Dial darüber mit `100cqh`. */
  container-type: inline-size;
}

/* ─ Kopf ─
   Der geteilte Deck-Header. Er zieht sich um das Polster des Spaltenkörpers
   (10px 12px) nach außen, damit seine Trennlinie wie die der anderen Panels
   von Kante zu Kante läuft, während sein eigenes 12px-Polster den Text weiter
   bündig mit dem Inhalt darunter hält. */
.cr-head {
  margin-inline: -12px;
}

/* Der Rang ist die Belohnung fürs Sammeln — er steht neben dem Namen der Zone
   und nicht als Fußnote. Er weicht als Erstes: auf der schmalsten Mittelspalte
   (WUXGA, 397px) müssen Überschrift, Stand und Suche zusammen durchpassen. */
.cr-rank {
  min-width: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-gold-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-count {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 12px;
  line-height: 1;
  color: var(--rpg-text-muted);
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

.cr-count-num {
  font-weight: 900;
  color: var(--rpg-gold);
}

.cr-count-sep {
  color: #6b5a3c;
}

/* Vier Ablesungen in einer Zeile, die auf WUXGA nur 397px breit ist: das
   Suchfeld gibt hier mehr nach als in den Seitenspalten, wo neben der
   Überschrift nichts sonst steht. */
.cr-head :deep(.sf-search-wrap) {
  flex: 0 1 150px;
  min-width: 92px;
}

/* Der Rang weicht als Erstes. Gemessen brauchen Überschrift, Rang, Stand und
   Suche zusammen 459px; die Mittelspalte ist aber auf WUXGA nur 421px breit
   (dem Engpass — sie ist dort SCHMALER als auf Full HD, weil die
   Bottom-Bar-Panels mit der Höhe skalieren), und dann ellipsierten Titel UND
   Rang zugleich. Lieber eine Ablesung ganz weglassen als zwei halbieren: der
   Name des Panels und sein Stand müssen stehen, der Rangtitel steht ohnehin
   auch im Stat-Katalog der linken Spalte.

   Die Schwelle hängt am Container, nicht am Viewport — die Breite dieser Zone
   folgt weder Viewportbreite noch -höhe allein, dasselbe Argument wie bei den
   `cqw`-Schriftgrößen unten. */
@container (max-width: 460px) {
  .cr-rank {
    display: none;
  }
}

/* ─ Gesamtleiter ─ */
.cr-meter {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.cr-meter-track {
  position: relative;
  flex: 1;
  height: 7px;
  overflow: hidden;
  background: #0d0b06;
  border: 1px solid #2c1806;
  border-radius: 3px;
}

.cr-meter-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: linear-gradient(to right, #c89040, #e8c060);
  transition: transform 0.3s ease-out;
}

/* Kerbe je Rangtitel. Eine passierte Kerbe liegt auf der Füllung und muss
   dunkel sein, um überhaupt zu erscheinen. */
.cr-meter-mark {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  margin-left: -1px;
  background: #3e2a10;
}
.cr-meter-mark.is-reached {
  background: #1a1008;
}

.cr-meter-next {
  flex-shrink: 0;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b5a3c;
}
.cr-meter-next strong {
  font-weight: 700;
  color: var(--rpg-gold-dim);
}
.cr-meter-next.is-done {
  color: var(--rpg-gold-dim);
}

/* ─ Acht Wappen ─ */
.cr-crests {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 5px;
}

.cr-crest {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px 8px;
  background: #16140e;
  border: 1px solid #2c1806;
  border-radius: 4px;
  cursor: pointer;
  /* Nur Deckkraft und Farbe wechseln — bei acht Wappen ist alles andere zu
     teuer, und ein Rahmenwechsel allein trägt die Aussage. */
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}

/* Icon und Stufe wachsen mit der Breite der Zone. Ohne das trug ein 107px
   breites Wappen auf 2K weiterhin ein 24px-Glyph und sah leer aus; die Grenzen
   der clamp() sind das, was auf der schmalsten (WUXGA) noch passt und auf der
   breitesten (4K) nicht überzeichnet. */
.cr-crest-icon {
  width: clamp(22px, 3.2cqw, 36px);
  height: clamp(22px, 3.2cqw, 36px);
  color: var(--tc);
}

.cr-crest-stage {
  font-size: clamp(12px, 1.6cqw, 17px);
  font-weight: 700;
  line-height: 1;
  color: var(--tc);
  font-variant-numeric: tabular-nums;
}

/* Sockel: wie weit die laufende Stufe gediehen ist. */
.cr-crest-bar {
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 3px;
  height: 3px;
  overflow: hidden;
  background: #0d0b06;
  border-radius: 2px;
}

.cr-crest-bar-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--tc);
  transition: transform 0.3s ease-out;
}

.cr-crest:hover,
.cr-crest.is-shown {
  background: #1e1a10;
  border-color: var(--tc);
}

/* Angeheftet: bleibt auch ohne Maus markiert. Zwei Kanten statt Schatten. */
.cr-crest.is-pinned {
  background: #221c10;
  box-shadow: inset 0 0 0 1px var(--tc);
}

.cr-crest.is-maxed {
  background: #1c1408;
  border-color: var(--tc);
}

.cr-crest.is-dormant .cr-crest-icon {
  opacity: 0.5;
}
.cr-crest.is-dormant .cr-crest-stage {
  color: #6b5a3c;
}

/* Suchtreffer heben sich ab, indem die anderen zurücktreten — die Reihe behält
   dabei ihre acht Plätze, sonst springt das Layout bei jedem Tastendruck. */
.cr-crest.is-dimmed {
  opacity: 0.32;
}

/* ─ Fokusfeld ─ */
.cr-focus {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 11px 10px;
  background: #1a1008;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--tc);
  border-radius: 4px;
}

.cr-focus-head {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.cr-focus-crest {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #141410;
  border: 1px solid #3e200a;
  border-radius: 4px;
  color: var(--tc);
}

.cr-focus-titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cr-focus-name {
  font-size: clamp(15px, 1.85cqw, 21px);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.1;
  color: var(--tc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-focus-blurb {
  font-size: 11px;
  line-height: 1.2;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-focus-stage {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.cr-focus-stage-num {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: var(--tc);
}

.cr-focus-stage-of {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #6b5a3c;
  font-variant-numeric: tabular-nums;
}

.cr-focus-effect {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.cr-focus-effect-text {
  font-size: clamp(14px, 1.8cqw, 20px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--rpg-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cr-focus-pending {
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b5a3c;
}

.cr-focus-count {
  font-size: 12px;
  color: #d8cbb0;
  font-variant-numeric: tabular-nums;
}
.cr-focus-sep {
  color: #6b5a3c;
}
.cr-focus-unit {
  color: var(--rpg-text-muted);
}

/* ─ Stufenleiter der gezeigten Bahn ─ */
.cr-ladder {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

.cr-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: 0;
  padding: 4px 2px;
  background: #141410;
  border: 1px solid #2c1806;
  border-radius: 3px;
}

.cr-step-num {
  font-size: clamp(11px, 1.25cqw, 15px);
  font-weight: 700;
  line-height: 1;
  color: #6b5a3c;
}

.cr-step-goal {
  font-size: clamp(11px, 1.25cqw, 15px);
  line-height: 1.1;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
}

.cr-step-val {
  font-size: clamp(11px, 1.25cqw, 15px);
  line-height: 1.1;
  color: #8a7a5a;
  font-variant-numeric: tabular-nums;
}

.cr-step.is-done {
  background: #1e1408;
  border-color: var(--tc);
}
.cr-step.is-done .cr-step-num,
.cr-step.is-done .cr-step-val {
  color: var(--tc);
}
.cr-step.is-done .cr-step-goal {
  color: #d8cbb0;
}

.cr-step.is-next {
  border-color: #7a4e20;
}
.cr-step.is-next .cr-step-num {
  color: var(--rpg-gold);
}

/* Full HD / WUXGA — die flachsten Viewports. Gespart wird an Luft, nicht an
   Schrift: die Wappen rücken zusammen, die Zahlen bleiben. */
@media (max-height: 1100px) {
  .cr-zone {
    flex-basis: 274px;
    gap: 6px;
  }
  .cr-crest {
    padding: 5px 2px 7px;
  }
  .cr-focus {
    gap: 5px;
    padding: 7px 10px 8px;
  }
  .cr-focus-crest {
    width: 28px;
    height: 28px;
  }
  .cr-focus-name {
    font-size: 14px;
  }
  .cr-focus-stage-num {
    font-size: 18px;
  }
}

/* 4K: hier geht es nur noch um HÖHE und Luft — die Schriftgrößen regelt die
   Container-Query oben, weil sie an der Breite hängen und die nicht an der
   Viewporthöhe ablesbar ist. */
@media (min-height: 1600px) {
  .cr-zone {
    flex-basis: 458px;
    gap: 11px;
  }
  .cr-rank {
    font-size: 13px;
  }
  .cr-count {
    font-size: 14px;
  }
  .cr-crest {
    padding: 10px 4px 13px;
    gap: 4px;
  }
  .cr-crest-bar {
    height: 4px;
  }
  .cr-focus {
    gap: 9px;
    padding: 13px 15px 14px;
  }
  .cr-focus-crest {
    width: 42px;
    height: 42px;
  }
  .cr-focus-crest svg {
    width: 28px;
    height: 28px;
  }
  .cr-focus-blurb {
    font-size: 13px;
  }
  .cr-focus-stage-num {
    font-size: 26px;
  }
  .cr-focus-count {
    font-size: 14px;
  }
  .cr-step {
    padding: 7px 3px;
  }
  .cr-meter-track {
    height: 9px;
  }
  .cr-meter-next {
    font-size: 12px;
  }
}
</style>
