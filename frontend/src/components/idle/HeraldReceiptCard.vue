<script setup lang="ts">
import { computed } from 'vue'
import HeraldBanner from './HeraldBanner.vue'
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

/** Die Uhr in der unteren Haarlinie leert sich exakt über die Standzeit — eine
 *  Quelle, kein Duplikat. */
const holdMs = computed(() => props.receipt.holdMs ?? HERALD_RECEIPT_HOLD_MS)

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
  <!-- Die Karte ist dasselbe Banner wie die Zeremonie, nur im kleinen Maßstab:
       Auslauf statt Rahmen, Akzent-Haarlinie oben und unten, Kreis-Medaillon,
       einmaliger Glanz. Was sie ZUSÄTZLICH trägt, steht im Meta-Schlitz —
       Zähler und Zahlenfeld — und in der unteren Linie, die hier als Uhr
       abläuft, während sie beim Meilenstein stillsteht. -->
  <HeraldBanner
    size="receipt"
    :accent="accent"
    :eyebrow="eyebrow"
    :headline="receipt.headline"
    :subline="receipt.subline"
    :image-src="receipt.portraitSrc"
    :icon="icon"
    :round="receipt.imageRound ?? true"
    :hold-ms="holdMs"
    :line-key="receipt.seq"
  >
    <template #meta>
      <!-- `--ac` und die `--hb-*`-Maße erbt der Schlitz vom Banner — kein
           zweites Setzen hier, sonst gäbe es zwei Quellen für eine Farbe. -->
      <div class="hr-meta">
        <!-- `:key` am Chip, NICHT am Medaillon: bei fünf Klicks pro Sekunde
             wären das fünf Icon-Remounts je Sekunde für reine Deko. Ein span
             ist gratis. -->
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
    </template>
  </HeraldBanner>
</template>

<style scoped>
/* Die Maße hängen an denselben `--hb-*`, die das Banner setzt — deshalb
   braucht diese Spalte KEINE eigenen Breakpoints: sie wächst und schrumpft
   mit dem Rest der Karte mit. */
.hr-meta {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 4px;
  align-items: flex-end;
}

/* Kein Kasten mehr, sondern Bannergrammatik: die Zahl steht in der
   Akzentfarbe, gehalten von einer Haarlinie unter ihr — dieselbe Linie, die
   oben und unten das Banner fasst. */
.hr-count {
  padding-bottom: 2px;
  font-size: calc(var(--hb-headline) * 0.62);
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--ac));
  border-bottom: 1px solid rgba(var(--ac), 0.55);
  text-shadow: 0 0 10px rgba(var(--ac), 0.6);
  font-variant-numeric: tabular-nums;
  animation: hr-count-pop 0.3s cubic-bezier(0.2, 1.6, 0.4, 1);
}

/* Tabellenziffern: sonst wandert die Summe bei jedem Klick um ein paar Pixel. */
.hr-delta {
  font-size: var(--hb-sub);
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

@keyframes hr-count-pop {
  from {
    transform: scale(1.5);
  }

  to {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hr-count {
    animation: none;
  }
}
</style>
