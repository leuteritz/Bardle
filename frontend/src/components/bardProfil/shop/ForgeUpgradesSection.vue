<template>
  <!-- Ein einziges `mouseleave` am Rahmen statt eines je Eintrag: zwischen zwei
       Karten liegen 11px Lücke, und fünfundzwanzig Einzelhandler ließen den
       Spotlight bei jedem Übergang kurz ausgehen. -->
  <div ref="wrapEl" class="fu-wrap" @mouseleave="setListHover(null)">
    <section
      v-for="group in groups"
      :key="group.tier"
      class="fu-group"
      :style="{ '--group-c': group.accent }"
    >
      <header class="fu-head">
        <Icon :icon="group.icon" width="22" height="22" class="fu-head-ico" />
        <span class="fu-head-title">{{ group.title }}</span>
        <span class="fu-head-hint">{{ group.hint }}</span>
      </header>

      <template v-for="entry in group.entries" :key="entry.id">
        <!-- Gesperrt: ein Einzeiler mit dem Grund und dem Weg dorthin. Eine
             volle Karte für etwas, das man nicht kaufen kann, verdrängt nur
             die, die man kaufen kann. -->
        <div
          v-if="entry.state === 'locked'"
          class="fc-row fc-row--locked"
          :class="spotClasses(entry.id)"
          :style="{ '--node-c': entry.color }"
          :data-forge-id="entry.id"
          :title="entry.desc"
          @mouseenter="setListHover(entry.id)"
        >
          <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />
          <div class="fc-row-body">
            <span class="fc-row-name">{{ entry.name }}</span>
            <span class="fc-row-meta">
              <Icon icon="lucide:lock" width="14" height="14" />
              {{ entry.lockReason }}
            </span>
          </div>
          <div class="fc-track">
            <i :style="{ transform: `scaleX(${entry.unlockProgress})` }" />
          </div>
        </div>

        <!-- Ausgewachsen: nur noch, was er bringt. -->
        <div
          v-else-if="entry.state === 'maxed'"
          class="fc-row fc-row--max"
          :class="spotClasses(entry.id)"
          :style="{ '--node-c': entry.color }"
          :data-forge-id="entry.id"
          :title="entry.desc"
          @mouseenter="setListHover(entry.id)"
        >
          <Icon :icon="entry.icon" width="27" height="27" :style="{ color: entry.color }" />
          <div class="fc-row-body">
            <span class="fc-row-name" :style="{ color: entry.color }">{{ entry.name }}</span>
            <span class="fc-row-meta fc-row-meta--gain">{{ entry.desc }}</span>
          </div>
          <span class="fc-badge">✦ MAX</span>
        </div>

        <article
          v-else
          class="fc-card"
          :class="[
            {
              'fc-card--ready': entry.canBuy,
              'fc-card--owned': entry.level > 0 && !entry.canBuy,
            },
            spotClasses(entry.id),
          ]"
          :style="{ '--node-c': entry.color }"
          :data-forge-id="entry.id"
          @mouseenter="setListHover(entry.id)"
        >
          <div v-if="entry.canBuy" class="fc-glow" aria-hidden="true" />
          <div class="fc-flash" :class="{ 'fc-flash--on': flashedId === entry.id }" aria-hidden="true" />

          <header class="fc-card-head">
            <div class="fc-ico">
              <Icon :icon="entry.icon" width="38" height="38" :style="{ color: entry.color }" />
            </div>
            <div class="fc-id">
              <div class="fc-name-row">
                <span class="fc-name" :style="{ color: entry.color }">{{ entry.name }}</span>
                <span class="fc-chip" :style="{ '--chip-c': group.accent }">{{ entry.tierLabel }}</span>
              </div>
              <div class="fc-lvl-row">
                <span class="fc-pips">
                  <i
                    v-for="step in entry.maxLevel"
                    :key="step"
                    class="fc-pip"
                    :class="{ 'fc-pip--on': step <= entry.level }"
                  />
                </span>
                <span class="fc-lvl">Lv {{ entry.level }} / {{ entry.maxLevel }}</span>
              </div>
            </div>
          </header>

          <p class="fc-desc">{{ entry.desc }}</p>

          <div class="fc-delta">
            <div class="fc-delta-cell">
              <span class="fc-delta-label">Now</span>
              <span class="fc-delta-value">{{ entry.level === 0 ? '—' : entry.nowText }}</span>
            </div>
            <span class="fc-delta-arrow">→</span>
            <div class="fc-delta-cell fc-delta-cell--next">
              <span class="fc-delta-label">After growing</span>
              <span class="fc-delta-value fc-delta-value--next">{{ entry.nextText }}</span>
            </div>
          </div>

          <ForgeCostRow :gold="entry.goldCost" :gold-ok="entry.goldOk" :materials="entry.materials" />

          <!-- Warum der Knopf nicht geht, steht AUF ihm — siehe buttonLabel(). -->
          <button class="fc-act" :disabled="!entry.canBuy" @click="grow(entry)">
            {{ buttonLabel(entry) }}
          </button>
        </article>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Der erste Reiter der Forge-Spalte: alles Kaufbare des Sternbaums als Liste.
 *
 * Vorher war jeder der 25 Knoten nur als Kreis auf der Leinwand erreichbar —
 * man musste zoomen, hovern und einen Tooltip lesen, einen Knoten nach dem
 * anderen. Es gab keine Stelle, an der stand, was gerade bezahlbar ist.
 *
 * Alle Zahlen kommen aus `useForgeUpgrades()`, derselben Quelle, aus der der
 * Baum links liest: ein Kauf hier färbt den Kreis dort im selben Frame, weil
 * beide Seiten dieselben Pinia-Getter lesen und nichts zwischenspeichern.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import ForgeCostRow from './ForgeCostRow.vue'
import type { ForgeUpgradeEntry } from '@/types'
import {
  FORGE_UPGRADE_GROUPS,
  FORGE_UPGRADE_STATE_ORDER,
  FORGE_CARD_FLASH_MS,
  FORGE_SHORT_CHIMES_LABEL,
  FORGE_SHORT_MATERIAL_PREFIX,
  FORGE_GROW_LABEL,
  FORGE_GROW_NEXT_PREFIX,
  FORGE_SPOTLIGHT_SCROLL_DELAY_MS,
} from '@/config/constants'

const { upgradeEntries, buyUpgrade } = useForgeUpgrades()
const { spotlightId, treeHoverId, setListHover } = useForgeSpotlight()

const groups = computed(() =>
  FORGE_UPGRADE_GROUPS.map((group) => {
    const entries = upgradeEntries.value.filter((entry) => entry.tier === group.tier)
    // Stabil sortiert: innerhalb eines Rangs bleibt die Katalogreihenfolge
    // erhalten, und die Ränge trennen NICHT nach Bezahlbarkeit — sonst ordnet
    // sich die Liste im Sekundentakt der Chimes unter dem Mauszeiger neu.
    const sorted = [...entries].sort(
      (a, b) => FORGE_UPGRADE_STATE_ORDER[a.state] - FORGE_UPGRADE_STATE_ORDER[b.state],
    )
    return { ...group, entries: sorted }
  }),
)

/**
 * Der Eintrag unter dem Zeiger — hier oder drüben am Baum — tritt hervor, alle
 * anderen zurück. Dieselben zwei Klassen für Karte und Kompaktzeile: was sie
 * bedeuten, hängt am Eintrag, nicht an seiner Renderform.
 */
function spotClasses(id: string): Record<string, boolean> {
  return {
    'fc-spot': spotlightId.value === id,
    'fc-dimmed': spotlightId.value !== null && spotlightId.value !== id,
  }
}

/**
 * Ein gedeckelter Strahl wartet nicht auf Chimes, sondern auf seine vier
 * Geschwister — und ein Knopf, der nur `disabled` ist, lässt den Spieler raten,
 * ob die Kasse oder das Lager leer ist. Beides steht direkt darüber, aber der
 * Knopf ist die Stelle, auf die er schaut.
 */
function buttonLabel(entry: ForgeUpgradeEntry): string {
  if (entry.state === 'capped') return entry.lockReason
  if (!entry.goldOk) return FORGE_SHORT_CHIMES_LABEL
  const short = entry.materials.find((mat) => !mat.ok)
  if (short) return `${FORGE_SHORT_MATERIAL_PREFIX}${short.need - short.have} ${short.name}`
  if (entry.level === 0) return FORGE_GROW_LABEL
  return `${FORGE_GROW_NEXT_PREFIX}${entry.level + 1}`
}

/** Welche Karte gerade quittiert. Rein visuell, daher reale Zeit. */
const flashedId = ref<string | null>(null)

function grow(entry: ForgeUpgradeEntry): void {
  if (!buyUpgrade(entry.id)) return
  flashedId.value = entry.id
  setTimeout(() => {
    if (flashedId.value === entry.id) flashedId.value = null
  }, FORGE_CARD_FLASH_MS)
}

const wrapEl = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Zeigt der Spieler LINKS auf einen Knoten, rollt die Liste dessen Karte nur
 * dann ins Bild, wenn sie gerade nicht darin steht: `block: 'nearest'` tut von
 * sich aus nichts, solange das Element vollständig sichtbar ist, und nimmt
 * sonst den kürzesten Weg.
 *
 * NUR vom Baum aus. Die Karte unter dem Zeiger ist per Definition sichtbar, und
 * ein Rollen unter dem Zeiger schöbe die nächste Karte darunter — der Hover
 * spränge weiter und löste das nächste Rollen aus.
 *
 * Verzögert, damit ein Schwenk über den Baum EINEN Rollbefehl absetzt statt
 * fünfundzwanzig. Rein visuell, daher reale Zeit.
 */
watch(treeHoverId, (id) => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  if (id === null) return
  scrollTimer = setTimeout(() => {
    wrapEl.value
      ?.querySelector<HTMLElement>(`[data-forge-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, FORGE_SPOTLIGHT_SCROLL_DELAY_MS)
})

/* Der Reiterwechsel räumt diese Sektion per `v-if` ab — ein Zeiger, der dabei
   auf einer Karte stand, ließe den Knoten am Baum sonst leuchten bleiben. */
onUnmounted(() => {
  if (scrollTimer !== null) clearTimeout(scrollTimer)
  setListHover(null)
})
</script>

<style scoped>
.fu-wrap {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.fu-group {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

/* Derselbe Abschnittsstrich wie die Tier-Köpfe im Champion-Shop: getönt an der
   Kante, nach rechts auslaufend. */
.fu-head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 8px 2px 9px;
  margin-top: 5px;
}

.fu-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--group-c, #c89040),
    color-mix(in srgb, var(--group-c, #c89040) 35%, transparent) 55%,
    transparent
  );
}

/* Der erste Abschnittsstrich ist jetzt die OBERKANTE der Liste — die Luft, die
   ihn von der Zählzeile darüber trennte, hat keinen Nachbarn mehr. */
.fu-wrap > .fu-group:first-child .fu-head {
  margin-top: 0;
  padding-top: 0;
}

.fu-head-ico {
  align-self: center;
  flex-shrink: 0;
  color: var(--group-c, #c89040);
}

.fu-head-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--group-c, #c89040);
  white-space: nowrap;
}

.fu-head-hint {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.34);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-height: 1100px) {
  .fu-wrap,
  .fu-group {
    gap: 9px;
  }

  .fu-head {
    padding: 6px 2px 7px;
    margin-top: 3px;
  }

  .fu-wrap > .fu-group:first-child .fu-head {
    margin-top: 0;
    padding-top: 0;
  }
}
</style>
