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
        class="fc-row fv-row fc-row--done"
        :title="entry.desc"
      >
        <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />

        <div class="fc-row-body">
          <span class="fc-row-name" :style="{ color: entry.color }">{{ entry.name }}</span>
          <span class="fc-row-meta fc-row-meta--gain">{{ entry.desc }}</span>
        </div>

        <span class="fc-badge" :class="{ 'fc-badge--forged': entry.kind === 'constellation' }">
          {{ entry.badge }}
        </span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * Die zweite Schublade der Shop-Spalte: was aus dem Streifen darüber
 * HERAUSGEWACHSEN ist — voll ausgebaute Relikte (`✦ MAX`) und fusionierte
 * Konstellationen (`✦ FUSED`). Sie standen bis zum Umbau als Kompaktzeilen in
 * ihrer jeweiligen Abteilung; mit der Rail wäre auch dieser Ort verschwunden.
 *
 * Zugeklappt als Vorgabe, weil hier nichts zu entscheiden ist — die Schublade
 * ist ein Beleg, keine Auslage.
 *
 * Sie führte einmal auch GESPERRTE Einträge, mit Sperrsatz und
 * Fortschrittsbalken. Die Begründung dafür war, dass ein Relikt sonst aus dem
 * Nichts auftauche, sobald sein Knoten hoch genug sei. Genau das ist jetzt so
 * gewollt: die Detailspalte beantwortet „was kann ich kaufen", und der Weg zu
 * einem noch gesperrten Relikt steht vollständig am Baum, wo sein Knoten die
 * Bedingungen ohnehin trägt.
 *
 * Die Zeilenoptik ist die geteilte `.fc-row`-Familie aus `rpg-theme.css`, die
 * Schaltzeile die geteilte `.fc-archive` — beide dieselben, die die Upgrade-Liste
 * darüber benutzt.
 */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeOffers } from '@/composables/ui/useForgeOffers'
import {
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

/* Was am Zeiger steht, ist der Wirkungssatz selbst (`:title="entry.desc"`).
   Hier stand dafuer eine Funktion, solange eine gesperrte Zeile zusaetzlich
   ihre Bedingungen ins Attribut haengte — mit ihnen ist sie gefallen. */
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

@media (max-height: 1100px) {
  .fv {
    gap: 6px;
  }
}
</style>
