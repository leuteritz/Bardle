<script setup lang="ts">
/**
 * Was hinter einem Angebotsportal liegt — das Ziel und die Vorsehung, unter der
 * man dort reisen wuerde.
 *
 * Die Gestalt kommt vollstaendig aus den `.tip-*`-Bausteinen in
 * `assets/rpg-theme.css`; hier steht nur, was DIESE Karte unterscheidet.
 *
 * Sie ist der Nachfolger von `PrestigeOfferCard` und erbt deren Begruendung:
 * verglichen werden ZWEI ZAHLEN, alles andere stand nur zwischen Blick und
 * Entscheidung. Der Wert steht deshalb UEBER seinem Label und gross — `+145 %`
 * ist die Antwort, `Champion DPS` nur die Frage dazu —, und der Pfeil traegt
 * dieselbe Aussage wie die Farbe, weil er als einziger auch ohne Farbsehen
 * ankommt.
 *
 * Was die Karte NICHT mehr traegt: den Universumsnamen (es gibt keinen, siehe
 * `universeLabel`) und eine Beschreibung. Was das Portal tut, sagt der letzte
 * Satz — und weil der Klick SOFORT reist, ist dieser Satz die einzige Ansage,
 * die es davor gibt.
 */
import { Icon } from '@iconify/vue'
import { providenceEffectLines, PROVIDENCE_DOMAIN_LABELS } from '@/config/progression/providences'
import { PRESTIGE_CARD_UNIVERSE_ICON_PX } from '@/config/constants'
import { universeLabel } from '@/utils/ui/format'
import type { RolledProvidence, UniverseConfig } from '@/types'

defineProps<{
  universe: UniverseConfig
  /** Frisch gewuerfelt, nicht aus einem Katalog: Achse, Richtung und Hoehe
   *  entstehen im Moment, in dem das Universum gerettet ist. */
  providence: RolledProvidence
  tint: string
}>()
</script>

<template>
  <div class="fot" :style="{ '--tip-color': tint }">
    <header class="tip-head tip-head--banded">
      <Icon
        :icon="universe.icon"
        :width="PRESTIGE_CARD_UNIVERSE_ICON_PX"
        :height="PRESTIGE_CARD_UNIVERSE_ICON_PX"
        class="fot-crest"
        aria-hidden="true"
      />
      <span class="tip-name">{{ universeLabel(universe.id) }}</span>
      <span class="tip-state">{{ PROVIDENCE_DOMAIN_LABELS[providence.domain] }}</span>
    </header>

    <!-- Der Grund, warum die Karte aufgeht: unter welcher Vorsehung der ganze
         naechste Durchlauf stuende. -->
    <div class="tip-effect fot-line">{{ providence.name }}</div>

    <div class="fot-effects">
      <div
        v-for="(line, i) in providenceEffectLines(providence)"
        :key="i"
        class="fot-effect"
        :class="line.positive ? 'fot-effect--up' : 'fot-effect--down'"
      >
        <span class="fot-value">
          <span class="fot-arrow">{{ line.positive ? '▲' : '▼' }}</span>
          {{ line.value }}
        </span>
        <span class="fot-label">{{ line.label }}</span>
      </div>
    </div>

    <!-- Kein `.tip-act`: die Karte traegt `pointer-events: none`, die Geste
         sitzt am Portal. Dieser Satz ist die EINZIGE Ansage vor dem Klick —
         der reist sofort, es gibt keine zweite Stufe, die noch etwas sagen
         koennte. -->
    <div class="tip-hint fot-cta">↗ Click to depart</div>
  </div>
</template>

<style scoped>
/* Alles in `em` gegen `--tip-u`: das ist die EINE Schriftskala der Sprache. */
.fot {
  display: flex;
  flex-direction: column;
  gap: 0.72em;
  padding: 0 1.16em 1.05em;
}

/* Der Kopf sitzt buendig an der Akzentleiste — das Polster kommt von der Karte. */
.fot .tip-head {
  margin: 0 -1.16em;
}

.fot-crest {
  flex-shrink: 0;
  color: var(--tip-color);
}

.fot-line {
  text-transform: none;
}

.fot-effects {
  display: flex;
  flex-direction: column;
  gap: 0.42em;
}

/* Buff und Debuff tragen ihre Farbe als KANTE, nicht als Flaeche: zwei farbige
   Kaesten in einer Karte, die selbst schon eine Akzentleiste hat, waeren drei
   Farbtraeger uebereinander. */
.fot-effect {
  padding: 0.42em 0.55em;
  background: rgba(0, 0, 0, 0.32);
  border-left: 3px solid;
  border-radius: 4px;
}

.fot-effect--up {
  border-left-color: #52b830;
}

.fot-effect--down {
  border-left-color: #cc6050;
}

.fot-value {
  display: block;
  font-size: 1.3em;
  font-weight: 700;
  line-height: 1.1;
}

/* Klein gesetzt, damit er den Wert nicht verdraengt: verglichen wird die Zahl,
   der Pfeil ordnet sie nur ein. */
.fot-arrow {
  font-size: 0.62em;
  vertical-align: 0.16em;
  opacity: 0.85;
}

.fot-effect--up .fot-value {
  color: #7fc95e;
}

.fot-effect--down .fot-value {
  color: #d9755f;
}

.fot-label {
  display: block;
  margin-top: 0.1em;
  font-size: 0.68em;
  letter-spacing: 0.06em;
  color: #8a7a5c;
  text-transform: uppercase;
}

.fot-cta {
  color: var(--tip-color);
}
</style>
