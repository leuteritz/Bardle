<template>
  <section v-if="vaultEntries.length > 0" class="fv">
    <button
      class="fc-archive"
      :class="{ 'fc-archive--open': open }"
      :style="{ '--arch-c': FORGE_VAULT_COLOR }"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="fc-archive-chevron">{{ chevron }}</span>
      <Icon :icon="FORGE_VAULT_ICON" width="17" height="17" class="fc-archive-ico" />
      <span class="fc-archive-num">{{ vaultEntries.length }}</span>
      <span class="fc-archive-label">{{ FORGE_VAULT_LABEL }}</span>
    </button>

    <template v-if="open">
      <div
        v-for="entry in vaultEntries"
        :key="entry.id"
        class="fc-row fv-row"
        :class="entry.state === 'locked' ? 'fc-row--locked' : 'fc-row--done'"
        :title="entry.desc"
      >
        <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />

        <div class="fc-row-body">
          <span class="fc-row-name" :style="entry.state === 'done' ? { color: entry.color } : {}">
            {{ entry.name }}
          </span>
          <span v-if="entry.state === 'locked'" class="fc-row-meta">
            <Icon :icon="FORGE_LOCK_ICON" width="14" height="14" />
            {{ entry.lockReason }}
          </span>
          <span v-else class="fc-row-meta fc-row-meta--gain">{{ entry.desc }}</span>
        </div>

        <span v-if="entry.state === 'locked'" class="fc-row-num">
          {{ entry.have }}/{{ entry.need }}
        </span>
        <span v-else class="fc-badge" :class="{ 'fc-badge--forged': entry.kind === 'constellation' }">
          {{ entry.badge }}
        </span>

        <!-- Der Balken liegt an der Unterkante der Zeile, damit sie so hoch
             bleibt wie ihre Nachbarn — dasselbe Muster wie bei einer gesperrten
             Upgrade-Zeile. -->
        <div v-if="entry.state === 'locked'" class="fc-track fv-track">
          <i :style="{ transform: `scaleX(${entry.progress})` }" />
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * Die zweite Schublade der Shop-Spalte: was NICHT im Streifen darüber steht.
 *
 * Gesperrte Relikte samt dem Weg dorthin („Grow Moon Orbit to Lv 3"),
 * ausgebaute (`✦ MAX`) und fusionierte Konstellationen (`✦ FUSED`). Sie standen
 * bis zum Umbau als Kompaktzeilen in ihrer jeweiligen Abteilung; mit der Rail
 * wäre auch dieser Ort verschwunden.
 *
 * Ganz wegzulassen ging nicht: dass ein Relikt AUS DEM NICHTS auftaucht, sobald
 * sein Knoten hoch genug ist, nimmt dem Spieler die Möglichkeit, darauf
 * hinzuarbeiten — und der Fortschrittsbalken ist genau diese Auskunft. Zugeklappt
 * als Vorgabe, weil hier nichts zu entscheiden ist.
 *
 * Die Zeilenoptik ist die geteilte `.fc-row`-Familie aus `rpg-theme.css`, die
 * Schaltzeile die geteilte `.fc-archive` — beide dieselben, die die Upgrade-Liste
 * darüber benutzt.
 */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import {
  FORGE_LOCK_ICON,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
  FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN,
  FORGE_VAULT_COLOR,
  FORGE_VAULT_ICON,
  FORGE_VAULT_LABEL,
} from '@/config/constants'

const { vaultEntries } = useForgeOffers()

const open = ref(false)

const chevron = computed(() =>
  open.value ? FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN : FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED,
)
</script>

<style scoped>
.fv {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Der Balken braucht eine Kante, an der er sitzen kann. `.fc-row` bringt
   Polsterung und Grund mit; hier kommt nur das Verhältnis der Kinder dazu. */
.fv-row {
  position: relative;
  padding-bottom: 13px;
}

.fv-track {
  position: absolute;
  left: 13px;
  right: 13px;
  bottom: 7px;
}

@media (max-height: 1100px) {
  .fv {
    gap: 6px;
  }
}
</style>
