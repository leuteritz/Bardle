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
import { formatPercentValue, toRoman } from '@/utils/ui/format'
import type { ChronicleTrackView } from '@/types'
import StatsColumnHeader from './StatsColumnHeader.vue'

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
 * Der Kopf ist derselbe `StatsColumnHeader` wie über den anderen Panels des
 * Decks, ohne Suchfeld: acht Bahnen stehen ohnehin alle gleichzeitig auf dem
 * Schirm — eine Suche über acht sichtbare Kacheln ist ein Feld, das nichts
 * findet, was das Auge nicht schon sieht.
 *
 * An seiner Stelle stehen die zwei Zahlen, die das Panel als Ganzes beschreiben,
 * und zwar BESCHRIFTET: „Unwritten" und „0/40" allein sagten niemandem, dass das
 * ein Rang und ein Stand ist. Jede trägt jetzt ihre Überschrift über sich und
 * die doppelte Schriftgröße.
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

const shownId = computed(() => hoverId.value ?? pinnedId.value ?? autoFocusId.value)
const shown = computed(() => tracks.value.find((t) => t.id === shownId.value) ?? tracks.value[0])

/** Rabatt-Bahnen zählen nach unten; das Vorzeichen gehört zur Aussage. */
const shownSign = computed(() => (shown.value?.effect.includes('−{v}') ? '−' : '+'))

/**
 * Der Wert einer Stufe, wie er WIRKLICH wirkt: Grundwert mal Rang-Verstärker.
 * Das Panel zeigt damit nirgends eine Zahl an, die das Spiel nicht rechnet —
 * dieselbe Formel steht im Store in `bonusPct`, samt derselben Rundung.
 */
function effective(base: number): string {
  return formatPercentValue(base * store.rankMult)
}

/**
 * Wie viele Prozentpunkte des angezeigten Werts vom Rang kommen — die Antwort
 * auf „und was bringt mir der Rang HIER?". Erst runden, dann abziehen: sonst
 * stünde neben „+19.5 %" ein Anteil von 4.499999999999996.
 */
function rankShare(base: number): string {
  return formatPercentValue(Math.round(base * store.rankMult * 10) / 10 - base)
}

/**
 * Der Wert, den der Store für die gezeigte Bahn TATSÄCHLICH einsetzt. Für eine
 * gefallene Stufe wird er nicht nachgerechnet, sondern aus `bonusPct` gelesen —
 * derselbe Aufruf, aus dem auch der Effekt-Getter dieser Bahn speist. Nur die
 * Vorschau auf Stufe I und die Stufenleiter brauchen `effective`, weil es zu
 * ungeschriebenen Stufen im Store nichts zu lesen gibt.
 */
const shownApplied = computed(() =>
  shown.value && shown.value.stage > 0 ? store.bonusPct(shown.value.bonus) : 0,
)

/** Trägt die gezeigte Bahn überhaupt einen Rang-Anteil? */
const shownHasShare = computed(() => !!shown.value && shown.value.stage > 0 && store.rankMult > 1)

/** „1.30" — der Verstärker, wie er im Balken und am Fokusfeld steht. */
function multLabel(mult: number): string {
  return mult.toFixed(2)
}

const shownEffect = computed(() => {
  if (!shown.value) return ''
  if (shown.value.stage > 0) {
    return shown.value.effect.replace('{v}', formatPercentValue(shownApplied.value))
  }
  return shown.value.effect.replace('{v}', effective(shown.value.stages[0].value))
})

/** Die Leiter der gezeigten Bahn: jede Stufe mit Schwelle und Wert. */
const ladder = computed(() =>
  (shown.value?.stages ?? []).map((stage, i) => ({
    numeral: toRoman(i + 1),
    threshold: stage.threshold,
    value: effective(stage.value),
    done: i < (shown.value?.stage ?? 0),
    next: i === (shown.value?.stage ?? 0),
  })),
)

const totalProgress = computed(() => store.unlockedStageCount / CHRONICLE_TOTAL_STAGES)
const nextRank = computed(() => CHRONICLE_RANKS.find((r) => r.min > store.unlockedStageCount))
const toNextRank = computed(() =>
  nextRank.value ? nextRank.value.min - store.unlockedStageCount : 0,
)

/**
 * Tooltip eines Wappens. Er trägt die Wirkung mit, weil die Reihe der acht nur
 * Zeichen und Zahlzeichen zeigt — was eine Bahn EINBRINGT, stand sonst erst im
 * Fokusfeld, also nur für die eine gerade gezeigte.
 */
function crestTitle(t: ChronicleTrackView): string {
  const head = `${t.name} — stage ${t.stage} of ${CHRONICLE_STAGES_PER_TRACK}`
  if (t.stage === 0) {
    return `${head} · ${t.effect.replace('{v}', effective(t.stages[0].value))} at stage I`
  }
  const line = t.effect.replace('{v}', effective(t.value))
  if (store.rankMult <= 1) return `${head} · ${line}`
  return `${head} · ${line} — ${rankShare(t.value)}% of it from your ${store.rankTitle} rank`
}

/** Klick heftet an; ein zweiter Klick auf dasselbe Wappen löst wieder. */
function pin(id: string) {
  pinnedId.value = pinnedId.value === id ? null : id
}
</script>

<template>
  <div class="cr-zone">
    <!-- Derselbe Kopf wie über den anderen Deck-Panels. Statt einer Suche trägt
         er die zwei Zahlen des Ganzen, jede unter ihrer eigenen Überschrift. -->
    <StatsColumnHeader class="cr-head" title="Astral Codex">
      <template #meta>
        <span
          class="cr-read"
          title="Your standing in the Codex — it rises with the number of stages written and multiplies every track bonus"
        >
          <span class="cr-read-cap">Rank</span>
          <span class="cr-read-val">{{ store.rankTitle }}</span>
        </span>
        <span class="cr-read-sep" aria-hidden="true"></span>
        <span
          class="cr-read"
          title="Stages written across all eight tracks — every one of them is a permanent bonus"
        >
          <span class="cr-read-cap">Stages Written</span>
          <span class="cr-read-val">
            {{ store.unlockedStageCount }}<span class="cr-read-of"
              >/{{ CHRONICLE_TOTAL_STAGES }}</span
            >
          </span>
        </span>
      </template>
    </StatsColumnHeader>

    <!-- Rangleiter: Balken mit einer Kerbe je Rang, darunter im Klartext, was
         der erreichte Rang bringt und was der nächste bringen wird. Die Frage
         „was passiert beim Aufstieg?" darf nicht im Tooltip stehen. -->
    <div class="cr-meter">
      <div class="cr-meter-track">
        <div class="cr-meter-fill" :style="{ transform: `scaleX(${totalProgress})` }" />
        <span
          v-for="rank in CHRONICLE_RANKS.filter((r) => r.min > 0)"
          :key="rank.title"
          class="cr-meter-mark"
          :class="{ 'is-reached': store.unlockedStageCount >= rank.min }"
          :style="{ left: (rank.min / CHRONICLE_TOTAL_STAGES) * 100 + '%' }"
          :title="`${rank.title} — ${rank.min} stages · every track bonus ×${multLabel(rank.mult)}`"
        />
      </div>

      <div class="cr-meter-legend">
        <span v-if="store.rankMult > 1" class="cr-boost">
          Every track bonus <strong>×{{ multLabel(store.rankMult) }}</strong>
        </span>
        <span v-else class="cr-boost is-none">Write a stage to earn your first rank</span>

        <span v-if="nextRank" class="cr-meter-next">
          {{ toNextRank }} {{ toNextRank === 1 ? 'stage' : 'stages' }} to
          <strong>{{ nextRank.title }}</strong>
          <span class="cr-meter-next-mult">×{{ multLabel(nextRank.mult) }}</span>
        </span>
        <span v-else class="cr-meter-next is-done">Every stage written</span>
      </div>
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
        }"
        :style="{ '--tc': track.color }"
        :title="crestTitle(track)"
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

      <!-- Die Zeile zeigt, was JETZT wirkt — Grundwert mal Rang. -->
      <div class="cr-focus-effect">
        <span class="cr-focus-effect-text">{{ shownEffect }}</span>
        <span v-if="shown.stage === 0" class="cr-focus-pending">at I</span>
      </div>

      <!-- Links der Stand der Metrik, rechts beziffert, WIE VIEL von der Zahl
           darüber der Rang beisteuert. Die Aufschlüsselung steht hier und nicht
           an der Effektzeile, weil sie dort mit langen Wirkungstexten um die
           Breite kämpfen müsste („Forge node & relic material costs −30%") —
           diese Zeile ist kurz und hat den Platz übrig. -->
      <div class="cr-focus-count">
        <span class="cr-focus-count-main">
          <template v-if="shown.nextThreshold === null">
            {{ $formatNumber(shown.current) }} {{ shown.unit }} · complete
          </template>
          <template v-else>
            {{ $formatNumber(shown.current) }}
            <span class="cr-focus-sep">/</span>
            {{ $formatNumber(shown.nextThreshold) }}
            <span class="cr-focus-unit">{{ shown.unit }}</span>
          </template>
        </span>

        <span
          v-if="shownHasShare"
          class="cr-focus-share"
          :title="`${shown.value}% base × ${multLabel(store.rankMult)} from your ${store.rankTitle} rank = ${formatPercentValue(shownApplied)}%`"
        >
          <span class="cr-focus-share-lbl">from rank</span>
          <strong>+{{ rankShare(shown.value) }}%</strong>
        </span>
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

/* Zwei Ablesungen im Kopf: der erreichte Rang und der Stand. Beide standen
   vorher als blanke Werte da — „Unwritten" und „0/40" nebeneinander, elf und
   zwölf Pixel groß, ohne ein Wort dazu, was sie zählen. Jetzt trägt jede ihre
   Überschrift über sich und ihr Wert die anderthalbfache Größe.

   Rechtsbündig, weil sie an der rechten Kante des Kopfes hängen und eine
   wachsende Zahl sonst nach rechts ausfranst. */
.cr-read {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
}

.cr-read-cap {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1;
  color: #8a7a52;
  white-space: nowrap;
}

.cr-read-val {
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
  color: var(--rpg-gold);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Der Nenner tritt zurück: gelesen wird die erreichte Zahl, die 40 ist nur ihr
   Maßstab. */
.cr-read-of {
  font-size: 13px;
  color: #6b5a3c;
}

/* Haarlinie zwischen den beiden — trennt ohne einen zweiten Kasten. */
.cr-read-sep {
  flex-shrink: 0;
  width: 1px;
  height: 26px;
  background: #2c1806;
}

/* ─ Rangleiter ─
   Balken oben über die volle Breite, darunter die Beschriftung in zwei Hälften:
   links, was der Rang JETZT bringt, rechts, was der nächste bringen wird. Beides
   in Worten — die Kerben allein sagten nur, DASS dort etwas passiert. */
.cr-meter {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cr-meter-track {
  position: relative;
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

.cr-meter-legend {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

/* Die Antwort auf „was bringt mir der Rang?" — die einzige Zeile im Panel, die
   den Verstärker benennt, deshalb heller als der Rest der Leiste. */
.cr-boost {
  min-width: 0;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cr-boost strong {
  font-weight: 900;
  color: var(--rpg-gold);
}
.cr-boost.is-none {
  color: #6b5a3c;
}

.cr-meter-next {
  flex-shrink: 0;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b5a3c;
}
.cr-meter-next strong {
  font-weight: 700;
  color: var(--rpg-gold-dim);
}
/* Was der nächste Rang wert ist — steht direkt an seinem Namen, damit der
   Aufstieg einen Preis UND einen Gegenwert hat. */
.cr-meter-next-mult {
  margin-left: 4px;
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

/* Beziffert den Rang-Anteil an der Zahl eine Zeile darüber. Rechts am Rand,
   damit die Aufschlüsselung nicht mit dem Stand der Metrik verschmilzt. */
.cr-focus-share {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 7px;
  white-space: nowrap;
  background: #141008;
  border: 1px solid #3e200a;
  border-radius: 3px;
}

.cr-focus-share-lbl {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a7a52;
}

.cr-focus-share strong {
  font-size: 12px;
  font-weight: 900;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
}

.cr-focus-count {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #d8cbb0;
  font-variant-numeric: tabular-nums;
}

.cr-focus-count-main {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  /* 292 statt 274: die Legende unter dem Rangbalken kostet gemessen 17 px, und
     das Fokusfeld hatte sie nicht mehr übrig (Überlauf 15 px). Die nimmt hier
     die Zone, nicht das Feld — der Dial darüber hat auf Full HD noch 267 px und
     ist als Kreis das Element, das eine Schrumpfung am besten verträgt. */
  .cr-zone {
    flex-basis: 292px;
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
  .cr-read-cap {
    font-size: 11px;
  }
  .cr-read-val {
    font-size: 21px;
  }
  .cr-read-of {
    font-size: 16px;
  }
  .cr-read-sep {
    height: 32px;
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
  .cr-boost {
    font-size: 14px;
  }
  .cr-meter-next {
    font-size: 12px;
  }
}
</style>
