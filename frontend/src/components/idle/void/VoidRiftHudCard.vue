<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useHudCardColumn } from '@/composables/ui/useHudCardColumn'
import { getVoidRift } from '@/config/world/void'
import { VOID_CARD_ICON } from '@/config/constants'

/**
 * Die Bedrohungslage — als Fokus der Kartenspalte.
 *
 * Sie zeigt bewusst NICHT alles, was unterwegs ist, sondern das VORDERSTE: das
 * ist auch das Ziel des Orbit-Beschusses, und es ist die einzige Frage, die
 * gerade zählt („was erreicht die Sonne zuerst?"). Wie viele insgesamt kommen,
 * steht als Zahl daneben — ein Dutzend Zeilen untereinander wäre eine Liste,
 * die niemand liest, während etwas heranrückt.
 *
 * Im Rang der Spalte steht sie als `threat` HINTER dem Flüchtigen, und das ist
 * kein Versehen: bei 26–44 s Nachschub und 46 s Reisezeit ist fast immer etwas
 * unterwegs. Bekäme sie den Aufriss nach Bedrohungsgrad, hielte sie ihn fast
 * immer und die Faltung zeigte nie etwas anderes. Erst jenseits von
 * `VOID_URGENT_FRAC` steigt sie auf `emergency` und schlägt alles ausser der
 * Wahl am Cairn.
 *
 * Zustand und Uhr kommen aus `useHudCardColumn` — die EINE Uhr der Spalte.
 */
const { voidCard } = useHudCardColumn()

const def = computed(() => (voidCard.value ? getVoidRift(voidCard.value.defId) : undefined))

const headline = computed(() => {
  const v = voidCard.value
  if (!v) return ''
  if (v.state === 'slain') return 'Void slain'
  if (v.state === 'impact') return 'It reached the sun'
  return v.severityLabel
})

/** Wie weit das Wesen schon heruntergeprügelt ist. */
const slainPct = computed(() => Math.round((1 - (voidCard.value?.hpRatio ?? 1)) * 100))
</script>

<template>
  <div
    v-if="voidCard && def"
    class="hc vhc"
    :class="`vhc--${voidCard.state}`"
    :style="{ '--hc-color': voidCard.severityColor, '--vhc-body': def.color }"
    role="status"
  >
    <div class="hc-head">
      <Icon :icon="VOID_CARD_ICON" width="1.05em" height="1.05em" class="hc-glyph" />
      <span class="hc-label vhc-label">{{ headline }}</span>

      <!-- Wie viele insgesamt unterwegs sind. Steht auch im Ergebniszustand,
           denn genau dann will man wissen, was noch kommt. -->
      <span v-if="voidCard.swarm > 1" class="hc-chip" :title="`${voidCard.swarm} inbound`">
        ×{{ voidCard.swarm }}
      </span>

      <span
        v-if="voidCard.state === 'inbound'"
        class="hc-clock"
        :class="{ 'hc-clock--urgent': voidCard.urgent }"
        :title="`${voidCard.remainingSeconds}s until it reaches the sun`"
      >
        <span class="hc-clock__num">{{ voidCard.remainingSeconds }}</span>
        <span class="hc-clock__unit">s</span>
      </span>
      <span
        v-else
        class="hc-mark"
        :class="voidCard.state === 'slain' ? 'hc-mark--good' : 'hc-mark--bad'"
      >
        {{ voidCard.state === 'slain' ? '✓' : '✕' }}
      </span>
    </div>

    <div class="hc-main">
      <span class="hc-stage vhc-stage">
        <Icon :icon="def.icon" width="1.9em" height="1.9em" />
      </span>

      <span class="hc-body">
        <span class="hc-name vhc-name">{{ def.name }}</span>
        <span class="hc-effect vhc-effect">
          {{ voidCard.state === 'slain' ? def.boonLine : def.drainLine }}
        </span>
      </span>
    </div>

    <!-- Der eigene Fortschritt am Wesen. -->
    <div v-if="voidCard.state === 'inbound'" class="hc-gauge">
      <span class="hc-gauge__lbl">Worn down</span>
      <span class="hc-gauge__pct">{{ slainPct }}%</span>
      <span class="hc-gauge__track">
        <span
          class="hc-gauge__fill"
          :style="{ transform: `scaleX(${1 - voidCard.hpRatio})` }"
        ></span>
      </span>
    </div>

    <!-- Sein Weg zur Sonne, bündig am Kartenfuss. Er FÜLLT sich, während die
         anderen Karten der Spalte leerlaufen — hier wächst eine Gefahr, statt
         dass eine Gelegenheit vergeht. -->
    <span class="hc-bar">
      <span class="hc-bar__fill" :style="{ transform: `scaleX(${voidCard.progress})` }"></span>
    </span>
  </div>
</template>

<style scoped>
/* Fläche, Rahmen, Skala und alle Bausteine kommen aus `.hc-*` (rpg-theme.css).
   Hier steht nur die eine Eigenheit dieser Karte: sie führt ZWEI Farben. Die
   Schwere trägt die Kante und das Gattungswort, die Art des Wesens seine Bühne
   und seinen Namen. Zwei Aussagen, zwei Träger. */
.vhc-label {
  color: var(--hc-color);
}

.vhc-stage {
  color: var(--vhc-body);
  border-color: color-mix(in srgb, var(--vhc-body) 45%, var(--hc-well-border));
}

.vhc-name {
  color: var(--vhc-body);
}

.vhc-effect {
  font-size: 0.88em;
  font-weight: 400;
  color: #b8a878;
}

/* Der Ausgang schlägt auf die Kante durch — grün gebannt, rot durchgekommen. */
.vhc--slain {
  --hc-color: #52b830;
}

.vhc--impact {
  --hc-color: #cc6050;
}
</style>
