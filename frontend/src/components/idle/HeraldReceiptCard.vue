<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import {
  HERALD_RECEIPT_KINDS,
  HERALD_RECEIPT_HOLD_MS,
  HERALD_RECEIPT_COUNT_PREFIX,
} from '@/config/constants'
import type { HeraldReceiptView } from '@/composables/ui/useHerald'

const props = defineProps<{ receipt: HeraldReceiptView }>()

/** Die Vorgaben der Art — Sigil, Kopfzeile, Akzent. Der Aufrufer darf jedes
 *  davon überschreiben, wenn das Ding eine eigene Farbe oder ein eigenes
 *  Zeichen mitbringt (Forge-Knoten, Drifter, Item). */
const def = computed(() => HERALD_RECEIPT_KINDS[props.receipt.kind])
const accent = computed(() => props.receipt.accent ?? def.value.accent)
const icon = computed(() => props.receipt.icon ?? def.value.icon)
const eyebrow = computed(() => props.receipt.eyebrow ?? def.value.label)

/** Die Restzeitleiste leert sich exakt über die Standzeit — eine Quelle, kein
 *  Duplikat. Der Keyframe-NAME steht in der CSS-Klasse, hier nur die Dauer. */
const holdDuration = computed(() => `${props.receipt.holdMs ?? HERALD_RECEIPT_HOLD_MS}ms`)

/** Das Vorzeichen entscheidet die Farbe, nicht der Aufrufer. */
const deltaText = computed(() => {
  const delta = props.receipt.delta
  if (!delta) return ''
  const sign = delta.value > 0 ? '+' : '−'
  const amount = Math.abs(delta.value)
  const formatted = amount >= 1000 ? amount.toLocaleString('en-US') : String(amount)
  const unit = amount === 1 ? (delta.unitOne ?? delta.unit) : delta.unit
  return unit ? `${sign}${formatted} ${unit}` : `${sign}${formatted}`
})
</script>

<template>
  <div class="hr-card" :style="{ '--ac': accent }">
    <div class="hr-goldline" />
    <div class="hr-rail" />

    <div class="hr-body">
      <!-- Portrait schlägt Sigil: wo ein Champion beteiligt ist, sagt sein
           Gesicht mehr als jedes Glyph — die Karte steht mittig im Bild und
           nicht mehr neben dem Ding, auf das sie sich bezieht. -->
      <img v-if="receipt.portraitSrc" :src="receipt.portraitSrc" alt="" class="hr-portrait" />
      <span v-else class="hr-sigil">
        <Icon :icon="icon" class="hr-sigil-icon" width="30" height="30" />
      </span>

      <div class="hr-text">
        <span class="hr-eyebrow">
          <span class="hr-eyebrow-tick" />
          {{ eyebrow }}
        </span>
        <span class="hr-headline">{{ receipt.headline }}</span>
        <span v-if="receipt.subline" class="hr-sub">{{ receipt.subline }}</span>
      </div>

      <div class="hr-meta">
        <!-- `:key` am Chip, NICHT am Sigil: bei fünf Klicks pro Sekunde wären
             das fünf Icon-Remounts je Sekunde für reine Deko. Ein span ist
             gratis. -->
        <span v-if="receipt.count > 1" :key="receipt.count" class="hr-count">
          {{ HERALD_RECEIPT_COUNT_PREFIX }}{{ receipt.count }}
        </span>
        <span
          v-if="deltaText"
          class="hr-delta"
          :class="(receipt.delta?.value ?? 0) > 0 ? 'hr-delta--gain' : 'hr-delta--cost'"
        >
          {{ deltaText }}
        </span>
      </div>
    </div>

    <div class="hr-line">
      <div :key="receipt.seq" class="hr-line-fill" :style="{ animationDuration: holdDuration }" />
    </div>
  </div>
</template>

<style scoped>
/* Der Rahmen ist der des alten Toasts — der Spieler soll die Karte als dieselbe
   Stimme wiedererkennen. Eine Stufe kompakter, weil sie jetzt frei im Bild steht
   und zu dritt auftreten kann, und durchgehend DECKEND: sie erscheint sowohl
   über dem dunklen Sternenfeld als auch über den hellen Panelflächen des
   Profil-Modals. Der weiche Auslauf der Zeremonie franste dort aus. */
.hr-card {
  position: relative;
  min-width: 300px;
  max-width: min(620px, 44vw);
  overflow: hidden;
  background: #14100a;
  border: 2px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.88),
    inset 0 0 0 1px #3e200a;
}

.hr-goldline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* Der Akzent trägt die Bedeutung: Farbe = Art des Ereignisses. */
.hr-rail {
  position: absolute;
  top: 3px;
  bottom: 0;
  left: 0;
  width: 4px;
  background: rgb(var(--ac));
  box-shadow: 0 0 10px -1px rgba(var(--ac), 0.9);
}

.hr-body {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 16px 10px 18px;
}

.hr-sigil {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 46px;
  height: 46px;
  color: rgb(var(--ac));
  background: #1c1409;
  border: 2px solid rgb(var(--ac));
  border-radius: 4px;
  /* Statischer Schein, keine laufende Animation — Performance-Regel 2. */
  box-shadow:
    inset 0 0 12px rgba(0, 0, 0, 0.85),
    0 0 12px -3px rgba(var(--ac), 0.9);
  animation: hr-sigil-pop 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}

.hr-sigil-icon {
  display: block;
}

.hr-portrait {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  object-fit: cover;
  border: 2px solid rgb(var(--ac));
  border-radius: 50%;
  box-shadow: 0 0 12px -3px rgba(var(--ac), 0.9);
  animation: hr-sigil-pop 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}

.hr-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  /* Schiebt den Zähler und das Zahlenfeld an den rechten Rand. */
  flex: 1 1 auto;
}

.hr-eyebrow {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--ac));
  text-transform: uppercase;
  letter-spacing: 2.2px;
}

.hr-eyebrow-tick {
  width: 12px;
  height: 2px;
  background: rgb(var(--ac));
  opacity: 0.7;
}

.hr-headline {
  overflow: hidden;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.16;
  color: #f6e6b4;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.4px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

/* ZWEI Zeilen erlaubt, nicht eine: die Wirkungszeile eines Forge-Kaufs ist ein
   ganzer Satz („Offline earnings +20% and extends the offline cap by 4 hours.")
   und keine Kurzangabe. Einzeilig mit Ellipse endete sie mitten im Wort — das
   war schon an der abgelösten `--forged`-Fassung so und ist dort dokumentiert.
   Die Schlagzeile bleibt einzeilig, sie trägt nur einen Namen. */
.hr-sub {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.25;
  color: rgba(232, 226, 208, 0.62);
  letter-spacing: 0.6px;
}

.hr-meta {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 4px;
  align-items: flex-end;
}

.hr-count {
  padding: 2px 8px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--ac));
  background: #1c1409;
  border: 1px solid rgba(var(--ac), 0.75);
  border-radius: 4px;
  animation: hr-count-pop 0.3s cubic-bezier(0.2, 1.6, 0.4, 1);
}

/* Tabellenziffern: sonst wandert die Summe bei jedem Klick um ein paar Pixel. */
.hr-delta {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.hr-delta--cost {
  color: #cc6050;
}

.hr-delta--gain {
  color: #7ddc4a;
}

/* Standzeit als Leiste: sie leert sich über transform, bleibt also
   Compositor-Arbeit — kein width-Lauf, kein Layout pro Frame. */
.hr-line {
  height: 2px;
  background: #241708;
}

.hr-line-fill {
  height: 100%;
  background: rgb(var(--ac));
  transform-origin: left center;
  animation: hr-line linear both;
}

@keyframes hr-line {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

@keyframes hr-sigil-pop {
  from {
    transform: scale(0.55) rotate(-14deg);
  }
  to {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes hr-count-pop {
  from {
    transform: scale(1.5);
  }
  to {
    transform: scale(1);
  }
}

/* Full HD / WUXGA: flachster Viewport, und hier können drei Karten UNTER einer
   Zeremonie stehen — die Höhe ist das knappe Maß, nicht die Breite. */
@media (max-height: 1100px) {
  .hr-card {
    min-width: 260px;
    max-width: min(520px, 40vw);
  }

  .hr-body {
    gap: 11px;
    padding: 8px 13px 8px 15px;
  }

  .hr-sigil,
  .hr-portrait {
    width: 38px;
    height: 38px;
  }

  .hr-sigil-icon {
    width: 25px;
    height: 25px;
  }

  .hr-eyebrow {
    font-size: 10px;
    letter-spacing: 1.9px;
  }

  .hr-headline {
    font-size: 18px;
  }

  .hr-sub {
    font-size: 12px;
  }

  .hr-count {
    font-size: 13px;
  }

  .hr-delta {
    font-size: 13px;
  }
}

/* 4K: auf 2030 px Viewporthöhe wirkt die Standardgröße verloren. */
@media (min-height: 1600px) {
  .hr-card {
    min-width: 380px;
    max-width: min(760px, 44vw);
  }

  .hr-body {
    gap: 18px;
    padding: 14px 22px 14px 24px;
  }

  .hr-sigil,
  .hr-portrait {
    width: 58px;
    height: 58px;
  }

  .hr-sigil-icon {
    width: 38px;
    height: 38px;
  }

  .hr-eyebrow {
    font-size: 13px;
    letter-spacing: 2.6px;
  }

  .hr-headline {
    font-size: 27px;
  }

  .hr-sub {
    font-size: 16px;
  }

  .hr-count {
    font-size: 18px;
  }

  .hr-delta {
    font-size: 17px;
  }
}

/* Die Restzeitleiste bleibt bewusst STEHEN: sie ist die einzige Ablesung, wie
   lange die Karte noch da ist — kein Zierrat, sondern Information, und ein
   linearer Balken ist keine Bewegungsreizung. Nur die Auftritte entfallen. */
@media (prefers-reduced-motion: reduce) {
  .hr-sigil,
  .hr-portrait,
  .hr-count {
    animation: none;
  }
}
</style>
