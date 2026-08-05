<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  computePlanetMaxHp,
  isPlanetDown,
} from '@/stores/world/planetShopStore'
import type { PlanetSlot } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { MATERIALS } from '@/config/economy/materials'
import {
  MATERIAL_RARITY_COLOR,
  PLANET_RESPAWN_MS,
  PLANET_TAB_SUN_MAX_DIAMETER,
  STAR_PHASE_FINAL_INDEX,
} from '@/config/constants'
import { hpTier, hpPercentOf, planetBonusTextFor } from '@/utils/orbit/planetStatus'
import { useActionToast } from '@/composables/ui/useActionToast'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import BlackHoleDisc from '@/components/idle/sun/BlackHoleDisc.vue'
import PlanetTargetPickerModal from './PlanetTargetPickerModal.vue'

const props = defineProps<{
  planet: PlanetSlot
  /** Planet steht hinter der Sonne — aus derselben rAF-Quelle wie das Command Panel. */
  orbitBehind: boolean
  /** Initiale Bahnposition; der rAF-Loop des Tabs schreibt danach direkt aufs Element. */
  orbitPhaseStyle: Record<string, string>
  /** Farb- und Größen-Variablen der aktuellen Sonnenphase. */
  phaseStyle: Record<string, string>
  /** Gemeinsamer Zeitstempel des Tabs (500 ms) — Basis der Respawn-Anzeige. */
  now: number
}>()

const store = usePlanetShopStore()
const solarStore = useSolarUpgradeStore()
const shopStore = useShopStore()
const { showToast } = useActionToast()

/** Orbit-Wrapper — der Tab-Loop setzt hier pro Frame `--orbit-delay`. */
const orbitEl = ref<HTMLElement | null>(null)
defineExpose({ orbitEl })

/** Endphase: der Stern ist kollabiert, statt der Plasmascheibe steht hier das
 *  Schwarze Loch — mit demselben Footprint, damit der Planet weiter dahinter
 *  vorbeizieht. */
const isCollapsed = computed(
  () => !solarStore.isCometState && solarStore.starPhase >= STAR_PHASE_FINAL_INDEX,
)

const role = computed(() => props.planet.role!)
const roleName = computed(() => PLANET_ROLES[role.value].name)
const roleColor = computed(() => PLANET_ROLES[role.value].color)
const roleImage = computed(() => PLANET_ROLES[role.value].image)

// ── Zerstörter Planet: Ausfallzeit bis zur Rückkehr ────────────────────────
const down = computed(() => isPlanetDown(props.planet))
const downSecsLeft = computed(() =>
  Math.max(0, Math.ceil((props.planet.downUntilMs - props.now) / 1000)),
)
const downProgress = computed(() => {
  if (!down.value) return 0
  const remaining = Math.max(0, props.planet.downUntilMs - props.now)
  return Math.max(0, Math.min(1, 1 - remaining / PLANET_RESPAWN_MS))
})

const hpPercent = computed(() => hpPercentOf(props.planet.currentHp, props.planet.maxHp))
const activeHpTier = computed(() => hpTier(props.planet.currentHp, props.planet.maxHp))
const bonusText = computed(() => planetBonusTextFor(role.value, props.planet.level))

// ── Per-planet leveling ────────────────────────────────────────────────────
const levelUpCost = computed(() => store.getPlanetLevelUpCost(props.planet.id))
const levelUpReqPhase = computed(() => store.getPlanetLevelRequiredPhase(props.planet.id))
const levelUpReason = computed(() => store.planetLevelUpBlockReason(props.planet.id))

// ── Max attune (the only buy action) ───────────────────────────────────────
const maxAffordableCount = computed(() => store.getMaxAffordableLevelCount(props.planet.id))
const maxCost = computed(() =>
  store.getBulkLevelUpCost(props.planet.id, maxAffordableCount.value),
)

// ── Upgrade preview ────────────────────────────────────────────────────────
// The single "Max" buy attunes as many levels as affordable, so the preview
// shows the state AFTER that buy. With nothing affordable it falls back to a
// +1 preview so the player still sees what the next attunement would bring.
const previewLevelGain = computed(() => Math.max(1, maxAffordableCount.value))
const nextBonusText = computed(() =>
  planetBonusTextFor(role.value, (props.planet.level ?? 1) + previewLevelGain.value),
)
const currentMaxHp = computed(() => computePlanetMaxHp(props.planet.level ?? 1))
const nextMaxHp = computed(() =>
  computePlanetMaxHp((props.planet.level ?? 1) + previewLevelGain.value),
)

// ── HP-bar hover preview ────────────────────────────────────────────────────
// Hovering the upgrade button previews the post-level-up state: the effect chip
// pops up and the HP bar extends. On level-up the store grows currentHp by the
// exact Max-HP delta (see planetShopStore levelUpPlanetTimes), so the gained HP
// is always nextMaxHp − currentMaxHp. We render it as a bright "ghost" segment
// appended to the current fill, both scaled to the NEW max so the bar visibly
// lengthens even at full health.
const previewHover = ref(false)

// Hinter der Sonne oder zerstört: Level-Up gesperrt.
const levelUpBlocked = computed(() => props.orbitBehind || down.value)

// Bei gesperrtem Level-Up wäre eine Vorschau auf den Zugewinn irreführend, also
// bleiben Effekt und HP-Bar auf den Ist-Werten.
const previewActive = computed(() => previewHover.value && !levelUpBlocked.value)

const hpGainAmount = computed(() => Math.max(0, nextMaxHp.value - currentMaxHp.value))
const hpPreviewCurrent = computed(() => props.planet.currentHp + hpGainAmount.value)

// Solid part of the preview fill (existing current HP), scaled to the new max.
const hpSolidPreviewPct = computed(() => {
  if (nextMaxHp.value === 0) return 0
  return Math.max(0, Math.min(100, (props.planet.currentHp / nextMaxHp.value) * 100))
})

// Ghost extension (the HP gained), sitting right after the solid part.
const hpGhostPreviewPct = computed(() => {
  if (nextMaxHp.value === 0) return 0
  const raw = (hpGainAmount.value / nextMaxHp.value) * 100
  return Math.max(0, Math.min(100 - hpSolidPreviewPct.value, raw))
})

const hpPreviewPct = computed(() =>
  Math.round(Math.min(100, (hpPreviewCurrent.value / (nextMaxHp.value || 1)) * 100)),
)

const levelBtnTitle = computed(() => {
  if (down.value) return `Destroyed — rebuilding, back in ${downSecsLeft.value}s`
  if (props.orbitBehind) return 'Behind the Sun — level-up paused until the planet returns'
  if (maxAffordableCount.value > 0) return 'Level up as much as you can afford'
  return levelUpReason.value === 'phase'
    ? `Requires Sun Phase ${levelUpReqPhase.value}`
    : 'Not enough Chimes'
})

function attune(count: number) {
  // Hinter der Sonne oder zerstört ist der Planet außer Reichweite — der Button
  // ist dann deaktiviert, dieser Guard fängt Tastatur-/Programmauslösung mit ab.
  if (levelUpBlocked.value) return
  const before = props.planet.level
  const gained = store.levelUpPlanetTimes(props.planet.id, count)
  if (gained > 0) {
    showToast(
      gained === 1
        ? `Planet reached Lvl ${props.planet.level}!`
        : `+${gained} Levels → Lvl ${props.planet.level} (was ${before})`,
    )
  }
}

// ── Config picker (Harvester material / Resonator building) ────────────────
const configPickerOpen = ref(false)

// Reset picker when switching slots.
watch(
  () => props.planet.id,
  () => {
    configPickerOpen.value = false
  },
)

const isConfigurableRole = computed(
  () => role.value === 'harvest_node' || role.value === 'resonance_tower',
)

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

// Descriptor for the target chip inside the effect line: what this planet
// currently harvests/boosts, plus the accent color (material → rarity tier,
// building → gold). The name has to stay short — it sits inline in a sentence,
// the longer `sub` only shows up in the chip's tooltip.
const configTarget = computed(() => {
  if (role.value === 'harvest_node') {
    const m = MATERIALS.find((mat) => mat.id === props.planet.slotConfig?.materialId) ?? null
    return {
      kicker: 'Harvesting',
      name: m?.name ?? 'Pick a material',
      sub: m ? `${capitalize(m.rarity)} material` : 'No material set yet',
      icon: m?.image ?? null,
      color: m ? (MATERIAL_RARITY_COLOR[m.rarity] ?? MATERIAL_RARITY_COLOR.common) : '#8a7a50',
      chosen: !!m,
    }
  }
  if (role.value === 'resonance_tower') {
    const b = shopStore.cpsBuildings.find((bld) => bld.id === props.planet.slotConfig?.buildingId)
    return {
      kicker: 'Boosting',
      name: b?.name ?? 'Pick a building',
      sub: b ? 'CPS booster building' : 'No building set yet',
      icon: b?.icon ?? null,
      color: b ? '#e8c040' : '#8a7a50',
      chosen: !!b,
    }
  }
  return null
})
</script>

<template>
  <!-- Purchased + role locked: cosmic stage with LEVEL crown above the sun,
       name + HP directly beneath it, and a bundled action dock at the bottom.
       The corners are intentionally empty — every readout the player acts on
       lives right next to the Level-Up button now. -->
  <div class="ps-stage" :style="[{ '--rc': roleColor }, phaseStyle]">
    <!-- LEVEL crown — big + modern, sits directly above the sun (bottom of
         the top balancing band). While a jungle buff is live the top-center
         banner claims this spot, so the crown fades out and returns after. -->
    <div class="ps-crown-band">
      <Transition name="ps-crown-fade">
        <div v-if="!planet.jungleBuff?.active" class="ps-crown">
          <span class="ps-crown-rule ps-crown-rule--l" aria-hidden="true" />
          <div class="ps-crown-core">
            <span class="ps-crown-label">Level</span>
            <span class="ps-crown-value">{{ planet.level }}</span>
          </div>
          <span class="ps-crown-rule ps-crown-rule--r" aria-hidden="true" />
        </div>
      </Transition>
    </div>

    <!-- Central body (comet rock or phase sun) + orbiting planet — the exact
         vertical center: crown band above and readout band below carry equal
         flex weight, so the sun is always dead-centered. -->
    <div
      class="ps-system"
      :class="{ 'ps-system--comet': solarStore.isCometState, 'ps-system--collapse': isCollapsed }"
    >
      <CometDisc v-if="solarStore.isCometState" :diameter="200" />
      <BlackHoleDisc v-else-if="isCollapsed" :diameter="PLANET_TAB_SUN_MAX_DIAMETER" />
      <div v-else class="ps-stage-sun" />
      <!-- The whole orbit wrapper is keyed per planet: the old planet fades
           out at ITS orbit position, the new one fades in at its own — no
           visible position jump. type="transition" required (the orbit
           keyframe would otherwise deadlock mode="out-in").
           The keyframe is scrubbed by the tab's rAF loop via --orbit-delay, so
           the planet passes behind the sun in lockstep with the idle orbit. -->
      <Transition name="ps-planet-swap" mode="out-in" type="transition">
        <div
          v-if="!down"
          :key="planet.id"
          ref="orbitEl"
          class="ps-planet-preview-wrap"
          :style="orbitPhaseStyle"
        >
          <img
            :src="roleImage"
            class="ps-planet-preview-img"
            :class="{ 'ps-planet-preview-img--buffed': planet.jungleBuff?.active }"
            alt="Planet"
          />
        </div>
      </Transition>

      <!-- Zerstört: Der Planet ist aus der Bahn — an seiner Stelle steht
           ein Wrack-Emblem auf der Sonne, umlegt von einem Ring, der die
           Ausfallzeit abfährt. Größter Blickfang der Stage, weil es die
           einzige Information ist, auf die der Spieler warten kann. -->
      <div v-if="down" class="ps-down-core" aria-live="polite">
        <svg class="ps-down-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="ps-down-ring-track" cx="50" cy="50" r="46" />
          <circle
            class="ps-down-ring-fill"
            cx="50"
            cy="50"
            r="46"
            :style="{ '--ring-progress': downProgress }"
          />
        </svg>
        <Icon icon="game-icons:fragmented-meteor" width="96" height="96" class="ps-down-icon" />
        <span class="ps-down-secs">{{ downSecsLeft }}<i>s</i></span>
      </div>

      <!-- Eclipse medallion — same emblem and same source of truth as the
           Command Panel's, sitting on the sun's face because the planet
           itself is occluded while this shows. Deliberately without a
           transition: the Command Panel switches its medallion instantly,
           and a fade here would make this one linger behind it.
           A destroyed planet suppresses it: it isn't in orbit at all,
           so "behind the sun" would be the wrong story. -->
      <span
        v-if="orbitBehind && !down"
        class="ps-eclipse-medal"
        title="Behind the Sun — out of reach"
      >
        <Icon icon="game-icons:eclipse-flare" width="104" height="104" />
      </span>
    </div>

    <!-- Name + HP unit — directly under the sun (top of the bottom balancing
         band). Hovering the upgrade button extends the HP bar with a bright
         ghost segment showing the HP the next level-up would grant. -->
    <div class="ps-readout-band">
      <div
        class="ps-planet-readout"
        :class="{
          'ps-planet-readout--eclipsed': orbitBehind && !down,
          'ps-planet-readout--down': down,
        }"
        :style="{ '--rc': roleColor }"
      >
        <div class="ps-planet-role-label">{{ roleName }}</div>

        <!-- Permanent planet effect — always visible, label-free: the value
             alone carries the line. It flips to the post-upgrade value (in
             confirm-green) while the upgrade button is hovered. -->
        <div
          class="ps-planet-effect"
          :class="{
            'ps-planet-effect--preview': previewActive,
            'ps-planet-effect--targeted': isConfigurableRole && !!configTarget,
          }"
        >
          <span class="ps-planet-effect-value">{{
            previewActive ? nextBonusText : bonusText
          }}</span>

          <!-- Configurable roles (Harvester / Resonator) carry their target
               INSIDE the effect line instead of in a separate dock card:
               "1 Material every 30s › Ashen Ore" reads as one sentence, and
               the target sits where the player already looks for what this
               planet does. Clicking the chip opens the picker. -->
          <template v-if="isConfigurableRole && configTarget">
            <span class="ps-effect-arrow" aria-hidden="true">›</span>
            <button
              class="ps-effect-target"
              :class="{ 'ps-effect-target--empty': !configTarget.chosen }"
              :style="{ '--tc': configTarget.color }"
              :title="`${configTarget.kicker}: ${configTarget.name} — ${configTarget.sub}. Click to change.`"
              @click="configPickerOpen = true"
            >
              <span class="ps-effect-target-medal">
                <img
                  v-if="configTarget.icon"
                  :src="configTarget.icon"
                  class="ps-effect-target-icon"
                  alt=""
                />
                <span v-else class="ps-effect-target-icon-missing">?</span>
              </span>
              <span class="ps-effect-target-name">{{ configTarget.name }}</span>
              <span class="ps-effect-target-swap" aria-hidden="true">⟳</span>
            </button>
          </template>
        </div>

        <div
          v-if="planet.maxHp > 0"
          class="ps-planet-hp"
          :class="[`ps-planet-hp--${activeHpTier}`, { 'ps-planet-hp--preview': previewActive }]"
        >
          <div class="ps-planet-hp-text">
            <span class="ps-hp-values"
              >{{ previewActive ? hpPreviewCurrent : planet.currentHp }} /
              {{ previewActive ? nextMaxHp : planet.maxHp }}</span
            >
            <span class="ps-hp-pct">{{ previewActive ? hpPreviewPct : Math.round(hpPercent) }}%</span>
          </div>
          <div class="ps-hp-bar-track">
            <div
              class="ps-hp-bar-fill"
              :style="{ width: (previewActive ? hpSolidPreviewPct : hpPercent) + '%' }"
            >
              <span class="ps-hp-bar-shine" aria-hidden="true" />
            </div>
            <div
              v-if="previewActive && hpGhostPreviewPct > 0"
              class="ps-hp-bar-ghost"
              :style="{ left: hpSolidPreviewPct + '%', width: hpGhostPreviewPct + '%' }"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <!-- Status banner — states why the readout is dimmed and the
           Level-Up button is locked. Lives in the free space between the
           readout and the action dock, so nothing above it shifts.
           Destruction outranks the eclipse: it is the harder state and
           the one with a timer attached. -->
      <div v-if="down" class="ps-eclipse-banner ps-eclipse-banner--down">
        <span class="ps-eclipse-banner-line" aria-hidden="true" />
        <div class="ps-eclipse-banner-core">
          <span class="ps-eclipse-banner-title">✦ Planet Destroyed ✦</span>
          <span class="ps-eclipse-banner-sub">
            Rebuilding — returns at full HP in {{ downSecsLeft }}s
          </span>
        </div>
        <span class="ps-eclipse-banner-line ps-eclipse-banner-line--right" aria-hidden="true" />
      </div>
      <Transition v-else name="ps-eclipse-fade">
        <div v-if="orbitBehind" class="ps-eclipse-banner">
          <span class="ps-eclipse-banner-line" aria-hidden="true" />
          <div class="ps-eclipse-banner-core">
            <span class="ps-eclipse-banner-title">✦ Behind the Sun ✦</span>
            <span class="ps-eclipse-banner-sub">Out of reach until it comes back around</span>
          </div>
          <span class="ps-eclipse-banner-line ps-eclipse-banner-line--right" aria-hidden="true" />
        </div>
      </Transition>
    </div>

    <!-- Action dock — pinned to the stage bottom so the sun stays centered.
         Hovering the button previews the upgrade directly on the two
         permanent readouts above (effect value + HP bar) — no popover. -->
    <div class="ps-action-dock">
      <!-- Only the Level-Up CTA lives here — the harvest/resonance target moved
           up into the effect line, where the player already reads what this
           planet does. -->
      <div
        class="ps-dock-buy ps-hero-buy"
        @mouseenter="previewHover = true"
        @mouseleave="previewHover = false"
      >
        <button
          class="ps-level-btn"
          :class="{ 'ps-level-btn--locked': maxAffordableCount === 0 || levelUpBlocked }"
          :disabled="maxAffordableCount === 0 || levelUpBlocked"
          :title="levelBtnTitle"
          @click="attune(maxAffordableCount)"
        >
          <span class="ps-level-btn-main">
            <template v-if="down">
              <Icon
                icon="game-icons:fragmented-meteor"
                width="18"
                height="18"
                class="ps-level-req-icon"
              />
              Destroyed
            </template>
            <template v-else-if="orbitBehind">
              <Icon
                icon="game-icons:eclipse-flare"
                width="18"
                height="18"
                class="ps-level-req-icon"
              />
              Behind the Sun
            </template>
            <template v-else>
              ✦ Level Up<template v-if="maxAffordableCount > 0"> +{{ maxAffordableCount }}</template>
            </template>
          </span>
          <span
            class="ps-level-btn-cost"
            :class="{ 'ps-level-btn-cost--req': levelUpReason === 'phase' || levelUpBlocked }"
          >
            <template v-if="down">Back in {{ downSecsLeft }}s</template>
            <template v-else-if="orbitBehind">Out of reach</template>
            <template v-else-if="levelUpReason === 'phase'">
              <Icon icon="game-icons:sun" width="16" height="16" class="ps-level-req-icon" />
              Requires Phase {{ levelUpReqPhase }}
            </template>
            <template v-else>
              <img src="/img/BardAbilities/BardChime-128.png" class="ps-level-chime" alt="" />
              {{ $formatNumber(maxAffordableCount > 0 ? maxCost : levelUpCost) }}
            </template>
          </span>
        </button>
        <span v-if="maxAffordableCount > 0 && !levelUpBlocked" class="ps-buy-badge" aria-hidden="true">{{
          maxAffordableCount
        }}</span>
      </div>
    </div>
  </div>

  <Transition name="ps-pop">
    <PlanetTargetPickerModal
      v-if="configPickerOpen"
      :planet="planet"
      @close="configPickerOpen = false"
    />
  </Transition>
</template>

<style scoped>
/* ── Level crown — big, modern level readout centered above the sun ─────────── */
/* Top balancing band — equal flex weight to the readout band below the sun, so
   the sun sits dead-center between them. The crown is pinned to the BOTTOM of this
   band (justify-content: flex-end) so the level reads as sitting right above the
   sun, with a small gap. */
.ps-crown-band {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: clamp(8px, 1.4vh, 18px);
}

.ps-crown {
  display: inline-flex;
  align-items: center;
  gap: clamp(10px, 1.4vw, 22px);
}

/* Flanking accent rules in the role color — echo the name label's framed look */
.ps-crown-rule {
  width: clamp(28px, 6vw, 74px);
  height: 2px;
  border-radius: 2px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #e8c040) 50%, transparent);
}

.ps-crown-rule--l {
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 85%, transparent)
  );
}

.ps-crown-rule--r {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 85%, transparent)
  );
}

.ps-crown-core {
  display: inline-flex;
  align-items: baseline;
  gap: clamp(8px, 0.8vw, 14px);
}

.ps-crown-label {
  font-size: clamp(0.72rem, 1.2vh, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.ps-crown-value {
  font-size: clamp(2.4rem, 5.4vh, 4rem);
  font-weight: 900;
  line-height: 0.85;
  color: var(--rc, #e8c040);
  text-shadow:
    0 0 22px color-mix(in srgb, var(--rc, #e8c040) 55%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.7);
  font-variant-numeric: tabular-nums;
}

/* Crown fade — plays when the jungle-buff banner claims the top-center spot */
.ps-crown-fade-enter-active,
.ps-crown-fade-leave-active {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}

.ps-crown-fade-enter-from,
.ps-crown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* ── Action dock — Level-Up CTA pinned to the stage bottom ──────────────────── */
/* Absolutely positioned so it never affects the flex centering above it: the sun
   stays dead-center while the button floats at the bottom. Hovering the button
   previews the upgrade on the two permanent readouts (effect value + HP bar). */
.ps-action-dock {
  position: absolute;
  left: 50%;
  bottom: clamp(14px, 2.2vh, 30px);
  transform: translateX(-50%);
  z-index: 4;
  width: 100%;
  max-width: 440px;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(7px, 1vh, 12px);
}

/* Level-Up CTA — enlarged, fills the dock width. (Reuses .ps-dock-buy for the
   badge + hover-fade behaviour.) The descendant selector beats .ps-dock-buy's
   `margin-left: auto`, so the button centers instead of sticking right. */
.ps-action-dock .ps-hero-buy {
  position: relative;
  margin: 0 auto;
  min-width: 0;
  width: 100%;
  max-width: 440px;
}

.ps-hero-buy .ps-level-btn {
  padding: clamp(0.55rem, 1vh, 0.9rem) 0.9rem clamp(0.5rem, 0.9vh, 0.8rem);
}

.ps-hero-buy .ps-level-btn-main {
  font-size: clamp(1.15rem, 1.9vh, 1.6rem);
}

.ps-hero-buy .ps-level-btn-cost {
  font-size: clamp(1rem, 1.5vh, 1.22rem);
}

.ps-hero-buy .ps-level-chime {
  width: clamp(19px, 2.5vh, 25px);
  height: clamp(19px, 2.5vh, 25px);
}

/* ── Hero-Body (Planet oben, Rollen-Grid unten) ────────────────────────────── */
/* ── Stage: centered planet over a cosmic backdrop ─────────────────────────── */
.ps-stage {
  --rc: #e8c040;
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  /* Extra bottom padding reserves the band the absolute action dock floats in, so
     the flex-centered crown + sun + readout never overlap the Level-Up button. */
  padding: 0.9rem 1rem clamp(96px, 15vh, 150px);
  overflow: hidden;
}

/* Sun + orbiting planet share one centered system. Fills whatever height the
   stage has left; a container query lets the sun scale to the real free space
   instead of fixed pixels, so nothing ever overflows. */
.ps-system {
  position: relative;
  z-index: 1;
  width: 100%;
  /* Sized to the sun itself (no empty slack below it), so the equal-flex spacer
     above and hero band below can center it in the stage AND put the button at
     the exact midpoint between the sun and the name/HP unit. */
  flex: 0 0 auto;
  height: min(var(--ps-sun-d, 380px), 56vh);
  min-height: 160px;
  container-type: size;
  /* Sits between the crown band (above) and readout band (below), which carry
     equal flex weight — so the sun is always exactly vertically centered. */
}

/* Bottom balancing band — equal flex weight to the crown band above the sun, so
   the sun sits dead-center between them. The name/HP readout is pinned to the TOP
   of this band (justify-content: flex-start) so it reads as sitting right beneath
   the sun. The empty lower part is the "some space" before the action dock. */
.ps-readout-band {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: clamp(8px, 1.4vh, 18px);
}

/* Big sun rendered in the CURRENT phase's colors (mirrors SunComponent palette) */
.ps-stage-sun {
  position: absolute;
  top: 50%;
  left: 50%;
  /* Diameter scales with the current Sun-Phase (see sunPhaseStyle), capped by
     the system container's smaller edge so it always fits the free space.
     Smooth transition so phase changes grow/shrink the sun. */
  width: min(var(--ps-sun-d, 380px), 96cqmin);
  height: min(var(--ps-sun-d, 380px), 96cqmin);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  transition: width 1.2s ease, height 1.2s ease;
  background:
    radial-gradient(
      circle at 42% 38%,
      color-mix(in srgb, white 92%, var(--phase-core, #fff)) 0%,
      transparent 22%
    ),
    /* opaque inner disk (out to ~52%) so the planet is hidden when behind it */
    radial-gradient(
      circle at 50% 50%,
      var(--phase-core, #fff0e0) 0%,
      var(--phase-mid, #ffd4a3) 34%,
      var(--phase-edge, #cc5500) 52%,
      color-mix(in srgb, var(--phase-edge, #cc5500) 45%, transparent) 70%,
      transparent 86%
    );
  box-shadow:
    0 0 90px color-mix(in srgb, var(--phase-glow, #ff8c42) 55%, transparent),
    0 0 180px color-mix(in srgb, var(--phase-glow, #ff8c42) 28%, transparent);
  /* z above the planet's "far" half so the planet can pass behind the sun */
  z-index: 1;
  animation: ps-sun-pulse var(--pulse-speed, 5s) ease-in-out infinite;
}

/* ── Collapse mode: the black hole takes the sun's exact footprint ─────────── */
/* Same responsive cap as .ps-stage-sun (the component's diameter prop is static
   px), and the same z-index, so the planet's far arc still passes behind it. */
.ps-system--collapse :deep(.bh-root) {
  width: min(var(--ps-sun-d, 560px), 96cqmin);
  height: min(var(--ps-sun-d, 560px), 96cqmin);
  z-index: 1;
}

/* ── Comet mode: the origin rock replaces the sun as the central body ──────── */
/* Responsive size override (the component's diameter prop is static px);
   z-index 1 so the planet's far arc (z 0) passes BEHIND the rock. */
.ps-system--comet :deep(.comet-root) {
  width: min(200px, 62cqmin);
  height: min(200px, 62cqmin);
  z-index: 1;
}

/* The comet is far smaller than a sun — tighten the orbit and shrink the
   planet so the path visually belongs to the rock it circles. */
.ps-system--comet .ps-planet-preview-wrap {
  --orb-x: min(122px, 40cqmin);
  --orb-y: min(34px, 11cqmin);
}

.ps-system--comet .ps-planet-preview-img {
  width: min(64px, 17cqmin);
  height: min(64px, 17cqmin);
}

/* Planet revolves around the sun on a tilted ellipse, with depth (near = larger
   & in front, far = smaller & behind the sun) so it reads as a real orbit. */
.ps-planet-preview-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  /* Orbit radii shrink with the container (like the sun) so the far-arc z-swap
     always happens at the sun's rim, never outside it. */
  --orb-x: min(150px, 46cqmin);
  --orb-y: min(40px, 12.5cqmin);
  transform: translate(-50%, -50%);
  /* The keyframe is never played — it is scrubbed. tickOrbit writes the negative
     --orbit-delay that corresponds to the planet's real orbit angle, so the
     position (and the z-swap behind the sun) always matches the idle orbit.
     26s must stay in sync with PLANET_TAB_ORBIT_PERIOD_SEC in constants.ts. */
  animation: ps-planet-orbit 26s linear infinite;
  animation-delay: var(--orbit-delay, 0s);
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .ps-stage-sun {
    animation: none;
  }

/* .ps-planet-preview-wrap keeps its (paused) keyframe on purpose: it is what
     positions the planet on its orbit. tickOrbit stops advancing the angle under
     reduced motion — same as the idle orbit — so the planet simply holds still
     at its correct spot instead of snapping onto the sun's center. */
}

/* ── Zerstörter Planet — Bühne im Detailbereich ────────────────────────────── */
/* Ersetzt den orbitierenden Planeten mittig auf der Sonne: Wrack-Emblem im
   Countdown-Ring, darunter die Restzeit in großer Ziffer. Bewusst der größte
   Blickfang der Bühne — es ist die einzige Information, auf die man wartet. */
.ps-down-core {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  width: min(220px, 66cqmin);
  height: min(220px, 66cqmin);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.ps-down-core > * {
  grid-area: 1 / 1;
}

.ps-down-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ps-down-ring-track {
  fill: rgba(10, 6, 5, 0.82);
  stroke: #4a2418;
  stroke-width: 5;
}

/* stroke-dasharray über den Umfang (2πr ≈ 289) — --ring-progress füllt ihn */
.ps-down-ring-fill {
  fill: none;
  stroke: #e08070;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 289;
  stroke-dashoffset: calc(289 - 289 * var(--ring-progress, 0));
  filter: drop-shadow(0 0 6px rgba(224, 128, 112, 0.7));
  transition: stroke-dashoffset 0.5s linear;
}

.ps-down-icon {
  align-self: center;
  justify-self: center;
  width: min(96px, 30cqmin);
  height: min(96px, 30cqmin);
  color: #e08070;
  filter: drop-shadow(0 0 16px rgba(204, 96, 80, 0.8));
  transform: translateY(-11%);
  animation: ps-down-pulse 1.5s ease-in-out infinite alternate;
}

.ps-down-secs {
  align-self: end;
  justify-self: center;
  margin-bottom: 12%;
  font-size: clamp(1.5rem, 3.4vh, 2.4rem);
  font-weight: 900;
  line-height: 1;
  color: #ffd0c0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 18px rgba(224, 128, 112, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.95);
}

.ps-down-secs i {
  font-style: normal;
  font-size: 0.5em;
  opacity: 0.75;
  margin-left: 1px;
}

/* Readout während der Ausfallzeit — stärker zurückgenommen als bei der Eclipse:
   die Werte gelten gerade nicht, der Planet trägt nichts bei. */
.ps-planet-readout--down {
  opacity: 0.45;
  filter: grayscale(70%);
}

/* Banner in Rot statt Gold — Verlust, nicht bloß Pause */
.ps-eclipse-banner--down .ps-eclipse-banner-line {
  background: linear-gradient(to right, transparent, rgba(224, 128, 112, 0.7));
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}

.ps-eclipse-banner--down .ps-eclipse-banner-line--right {
  background: linear-gradient(to left, transparent, rgba(224, 128, 112, 0.7));
}

.ps-eclipse-banner--down .ps-eclipse-banner-title {
  color: #ffd0c0;
  text-shadow:
    0 0 16px rgba(224, 128, 112, 0.8),
    0 0 36px rgba(168, 64, 44, 0.45),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

.ps-eclipse-banner--down .ps-eclipse-banner-sub {
  color: rgba(240, 176, 160, 0.75);
}

.ps-down-icon {
  animation-name: ps-down-icon-pulse;
}

/* ── Eclipse — planet passing behind the sun, in sync with the idle orbit ───── */
/* Medallion sits on the sun's face: the planet itself is fully occluded while
   this shows. Same emblem and framing as rsq-eclipse / tbh-eclipse / sf-eclipse-medal. */
.ps-eclipse-medal {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 4;
  transform: translate(-50%, -50%);
  /* Deutlich auf der Sonnenscheibe: gut halb so breit wie der Sonnenkern, damit
     das Medaillon auf Full HD wie auf 4K sofort ins Auge fällt. */
  width: min(168px, 52cqmin);
  height: min(168px, 52cqmin);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.96), rgba(10, 7, 3, 0.96));
  border: 4px solid #5c3310;
  box-shadow:
    0 0 0 3px rgba(200, 144, 64, 0.4),
    0 0 44px rgba(232, 192, 64, 0.45),
    0 6px 20px rgba(0, 0, 0, 0.75);
  color: #e8c040;
  pointer-events: none;
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-eclipse-medal :deep(svg) {
  width: min(104px, 32cqmin);
  height: min(104px, 32cqmin);
  filter: drop-shadow(0 0 14px rgba(232, 192, 64, 0.65));
}

/* Readout recedes while the planet is out of reach — dimmed, never unreadable,
   so the player can still compare values during the eclipse. */
.ps-planet-readout--eclipsed {
  opacity: 0.62;
  filter: saturate(70%);
  transition:
    opacity 320ms ease,
    filter 320ms ease;
}

/* Banner in the free space between readout and action dock — states why the
   readout is dimmed and the button is locked. Same language as the Star Fight. */
.ps-eclipse-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(520px, 92%);
  margin-top: clamp(8px, 1.6vh, 20px);
}

.ps-eclipse-banner-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.65));
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.35);
}

.ps-eclipse-banner-line--right {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.65));
}

.ps-eclipse-banner-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.ps-eclipse-banner-title {
  font-size: clamp(0.95rem, 1.7vh, 1.25rem);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #ffe9b0;
  text-shadow:
    0 0 16px rgba(255, 210, 90, 0.75),
    0 0 36px rgba(232, 150, 30, 0.4),
    0 2px 3px rgba(0, 0, 0, 0.95);
  animation: ps-eclipse-breathe 1.6s ease-in-out infinite alternate;
}

.ps-eclipse-banner-sub {
  font-size: clamp(0.6rem, 1vh, 0.72rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(232, 192, 64, 0.62);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Nur das Erscheinen darf weich sein. Beim Verlassen der Sonne muss das Banner
   im selben Frame gehen wie das Medaillon (das gar keine Transition hat) —
   ein Fade-Out ließe es hinter dem wieder auftauchenden Planeten zurückhängen. */
.ps-eclipse-fade-enter-active {
  transition: opacity 0.28s ease;
}

.ps-eclipse-fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ps-eclipse-medal,
  .ps-eclipse-banner-title {
    animation: none;
  }
}

/* Name + HP form one tight unit — the type name reads as the HP bar's title */
.ps-planet-readout {
  --rc: #e8c040;
  width: 100%;
  /* No margin-top:auto — the flex spacer/band above own the free space now;
     an auto margin here would starve them and collapse the centering. */
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
}

/* ── Attunement upgrade dock (slim bar under the stage) ─────────────────────── */
/* One row: status | effect preview | buy. Frameless — integrated via a gold
   separator on top, so the stage above keeps nearly all the vertical space.
   flex-wrap + the effect zone's flex-basis make it reflow on narrow panels
   without any breakpoints. */
.ps-dock {
  --rc: #e8c040;
  position: relative; /* paints above the ps-detail cosmic backdrop */
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.5rem 1rem;
  background: #131009;
  border-top: 3px solid transparent;
  border-image: linear-gradient(
      to right,
      transparent,
      #5c3310 10%,
      #c89040 30%,
      #f0d060 50%,
      #c89040 70%,
      #5c3310 90%,
      transparent
    )
    1;
}

/* Zone 3: Max button — vertically centered in the footer band */
.ps-dock-buy {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0.25rem;
  min-width: 190px;
}

/* Footer notify badge — pulses over the Level-Up button while an upgrade is
   affordable, and steps aside (fades) the moment the button is hovered. */
.ps-buy-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  color: #06301f;
  background: linear-gradient(135deg, #34d399, #059669);
  border: 1.5px solid #6ee7b7;
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
  pointer-events: none;
  animation: ps-buy-badge-pulse 1.6s ease-in-out infinite;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.ps-dock-buy:hover .ps-buy-badge {
  opacity: 0;
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .ps-buy-badge {
    animation: none;
  }
}

.ps-level-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.4rem 0.5rem 0.36rem;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: var(--bp-radius);
  color: #fff;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ps-level-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: 0 0 10px rgba(80, 200, 40, 0.5);
}

.ps-level-btn:active {
  transform: translateY(0) scale(0.97);
}

.ps-level-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px rgba(232, 192, 64, 0.9),
    0 0 14px rgba(232, 192, 64, 0.5);
}

.ps-level-btn--locked {
  background: #1c1c18;
  border-color: #3a2a10;
  color: rgba(255, 255, 255, 0.4);
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.ps-level-btn--locked:hover {
  filter: grayscale(55%);
  transform: none;
  box-shadow: none;
}

.ps-level-btn-main {
  font-size: clamp(1.02rem, 1.5vh, 1.28rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
}

.ps-level-btn-cost {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: clamp(0.9rem, 1.3vh, 1.08rem);
  font-weight: 700;
  opacity: 0.95;
}

.ps-level-chime {
  width: clamp(17px, 2.2vh, 22px);
  height: clamp(17px, 2.2vh, 22px);
}

/* Phase-lock requirement shown inline on the button's second line (keeps the
   footer height fixed — no free-flowing hint that grows the layout). */
.ps-level-btn-cost--req {
  gap: 4px;
  white-space: nowrap;
}

.ps-level-req-icon {
  color: #ffd76a;
}

/* ── HP ────────────────────────────────────────────────────────────────────── */
.ps-planet-hp {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.ps-planet-hp--high {
  --hp-a: #2f9a24;
  --hp-b: #6ee04a;
  --hp-glow: #5ce66a;
}

.ps-planet-hp--mid {
  --hp-a: #b8860f;
  --hp-b: #f0c840;
  --hp-glow: #e8c040;
}

.ps-planet-hp--low {
  --hp-a: #b32626;
  --hp-b: #e85040;
  --hp-glow: #e84040;
}

.ps-planet-hp-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ps-hp-values {
  font-size: 1.25rem;
  font-weight: 800;
  color: #f0e6c8;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

.ps-hp-pct {
  margin-left: auto;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--hp-glow);
  text-shadow: 0 0 10px color-mix(in srgb, var(--hp-glow) 45%, transparent);
  font-variant-numeric: tabular-nums;
}

.ps-hp-bar-track {
  position: relative;
  width: 100%;
  height: 30px;
  background: #241512;
  border: 2px solid #0e0c08;
  border-radius: 5px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 1px 0 rgba(255, 255, 255, 0.04);
}

/* Segment ticks (count driven by HP_BAR_SEGMENTS via --hp-seg on the root) */
.ps-hp-bar-track::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(100% / var(--hp-seg, 8) - 1.5px),
    rgba(0, 0, 0, 0.5) calc(100% / var(--hp-seg, 8) - 1.5px),
    rgba(0, 0, 0, 0.5) calc(100% / var(--hp-seg, 8))
  );
}

.ps-hp-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to bottom, var(--hp-b), var(--hp-a));
  box-shadow: 0 0 10px color-mix(in srgb, var(--hp-glow) 55%, transparent);
  transition:
    width 0.35s ease,
    background 0.35s ease;
}

/* Glossy top shine over the fill */
.ps-hp-bar-shine {
  position: absolute;
  inset: 0;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.45),
    rgba(255, 255, 255, 0.05) 45%,
    transparent 60%
  );
  pointer-events: none;
}

.ps-planet-hp--low .ps-hp-bar-fill {
  animation: ps-hp-low-pulse 1.2s ease-in-out infinite;
}

/* ── HP-bar hover preview (extends toward the post-level-up value) ──────────── */
/* Ghost extension: a bright, striped, pulsing slice appended right after the
   current fill, representing the HP the next level-up would grant — so the bar
   visibly grows on hover even at full health. Both fill + ghost are scaled to the
   NEW max, and the fill's width transition makes the growth animate smoothly. */
.ps-hp-bar-ghost {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 0 3px 3px 0;
  background: repeating-linear-gradient(
    -45deg,
    rgba(150, 255, 170, 0.55) 0,
    rgba(150, 255, 170, 0.55) 5px,
    rgba(110, 224, 74, 0.4) 5px,
    rgba(110, 224, 74, 0.4) 10px
  );
  box-shadow:
    inset 0 0 0 1px rgba(180, 255, 190, 0.5),
    0 0 12px rgba(120, 240, 120, 0.6);
  animation: ps-hp-ghost-pulse 1.1s ease-in-out infinite;
  pointer-events: none;
}

/* Values + percent flip to confirm-green while previewing → "this is what you'll
   have after the upgrade". */
.ps-planet-hp--preview .ps-hp-values,
.ps-planet-hp--preview .ps-hp-pct {
  color: #7cf089;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .ps-hp-bar-ghost {
    animation: none;
  }
}

/* ── Planetenbild ──────────────────────────────────────────────────────────── */
/* (positioning handled by the .ps-planet-preview-wrap rule in the stage section) */
.ps-planet-preview-img {
  /* Deliberately small so the sun clearly dominates; capped alongside the sun
     so it shrinks with the free space. Orbit depth-scaling then yields a larger
     near pass and a smaller far pass. */
  width: min(var(--ps-planet-d, 96px), 24cqmin);
  height: min(var(--ps-planet-d, 96px), 24cqmin);
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55));
}

/* ── Rollenname (planet-type title above the HP bar) ───────────────────────── */
.ps-planet-role-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  font-size: clamp(1.5rem, 2.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
  line-height: 1;
  color: var(--rc, #e8c040);
  text-shadow:
    0 0 18px color-mix(in srgb, var(--rc, #e8c040) 55%, transparent),
    0 2px 4px rgba(0, 0, 0, 0.6);
}

/* Flanking accent rules on either side of the name → framed, modern title */
.ps-planet-role-label::before,
.ps-planet-role-label::after {
  content: '';
  width: clamp(24px, 5vw, 60px);
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 80%, transparent)
  );
  box-shadow: 0 0 8px color-mix(in srgb, var(--rc, #e8c040) 45%, transparent);
}

/* Right rule mirrors the gradient direction */
.ps-planet-role-label::after {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--rc, #e8c040) 80%, transparent)
  );
}

/* ── Permanent planet effect (between name and HP bar) ──────────────────────── */
/* Label-free: the effect text alone fills the pill, so it can run big without
   competing with the role title above. Always in the role color; on button hover
   value + frame flip to confirm-green (mirrors the HP bar's preview language). */
.ps-planet-effect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  margin: clamp(6px, 1.1vh, 12px) 0 clamp(5px, 0.9vh, 10px);
  padding: clamp(5px, 0.8vh, 10px) clamp(14px, 1.4vw, 22px);
  background: rgba(20, 17, 10, 0.72);
  border: 1px solid color-mix(in srgb, var(--rc, #e8c040) 40%, #3a2a10);
  border-radius: 5px;
  transition:
    border-color 180ms ease,
    background 180ms ease;
}

.ps-planet-effect-value {
  font-size: clamp(1.15rem, 2.1vh, 1.65rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
  color: var(--rc, #e8c040);
  text-shadow: 0 0 10px color-mix(in srgb, var(--rc, #e8c040) 45%, transparent);
  font-variant-numeric: tabular-nums;
  transition:
    color 180ms ease,
    text-shadow 180ms ease;
}

/* Preview: value + frame flip to confirm-green while the upgrade button is held */
.ps-planet-effect--preview {
  border-color: #5ce66a;
  background: rgba(12, 26, 14, 0.72);
}

.ps-planet-effect--preview .ps-planet-effect-value {
  color: #7cf089;
  text-shadow: 0 0 10px rgba(92, 230, 106, 0.55);
}

/* ── Harvest / Resonance target — inline inside the effect line ─────────────── */
/* The target used to be a separate card wedged between the HP bar and the buy
   button. It belongs to the SENTENCE, not to the dock: "1 Material every 30s ›
   Ashen Ore" says what the planet does and what it does it to, in one read. */
.ps-planet-effect--targeted {
  flex-wrap: wrap;
  gap: clamp(6px, 0.7vw, 12px);
  padding-right: clamp(8px, 0.9vw, 14px);
}

/* Connector — carries the eye from the effect into its target */
.ps-effect-arrow {
  flex-shrink: 0;
  font-size: clamp(1.1rem, 2vh, 1.5rem);
  font-weight: 700;
  line-height: 1;
  color: color-mix(in srgb, var(--rc, #e8c040) 55%, transparent);
  transition: color 180ms ease;
}

.ps-effect-target {
  --tc: #e8c040;
  display: inline-flex;
  align-items: center;
  gap: clamp(5px, 0.5vw, 9px);
  /* Deliberately no max-width: a percentage cap here resolves against the pill's
     own shrink-to-fit width and squeezes the chip into an ellipsis. The chip is
     allowed to take the room its name needs — if the line runs out, the pill's
     flex-wrap drops the chip onto its own row instead of truncating it. */
  flex-shrink: 0;
  padding: clamp(3px, 0.4vh, 5px) clamp(7px, 0.7vw, 11px) clamp(3px, 0.4vh, 5px)
    clamp(4px, 0.4vw, 6px);
  background: rgba(10, 9, 5, 0.7);
  border: 1px solid color-mix(in srgb, var(--tc) 45%, #3a2a10);
  border-radius: 5px;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
}

.ps-effect-target:hover {
  border-color: var(--tc);
  background: color-mix(in srgb, var(--tc) 14%, rgba(10, 9, 5, 0.8));
  box-shadow: 0 0 14px color-mix(in srgb, var(--tc) 30%, transparent);
}

.ps-effect-target:focus-visible {
  outline: none;
  border-color: var(--tc);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 70%, transparent);
}

/* Nothing picked yet — a Harvester without a material produces nothing, so the
   empty chip has to nag: dashed frame plus a slow amber breath. */
.ps-effect-target--empty {
  border-style: dashed;
  animation: ps-target-nag 2.2s ease-in-out infinite;
}

.ps-effect-target-medal {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: clamp(26px, 3.4vh, 38px);
  height: clamp(26px, 3.4vh, 38px);
  background: radial-gradient(circle at 50% 38%, #1a1710 0%, #0b0906 100%);
  border: 1px solid color-mix(in srgb, var(--tc) 55%, #3a2a10);
  border-radius: 4px;
  box-shadow: inset 0 0 8px color-mix(in srgb, var(--tc) 18%, transparent);
}

.ps-effect-target-icon {
  width: 80%;
  height: 80%;
  object-fit: contain;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tc) 55%, transparent));
}

.ps-effect-target-icon-missing {
  font-size: clamp(0.95rem, 1.6vh, 1.25rem);
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 70%, #6a5a30);
}

/* Never truncated: the target name is the answer to "what does this planet work
   on" — an ellipsis would hide exactly the word the player is looking for. It
   stays on one line for every real material/building name and may only ever
   wrap, never clip. */
.ps-effect-target-name {
  font-size: clamp(0.95rem, 1.7vh, 1.35rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--tc);
  text-shadow: 0 0 9px color-mix(in srgb, var(--tc) 35%, transparent);
  white-space: normal;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

/* Swap affordance — quiet at rest, turns on hover so the chip reads as clickable
   without a permanent "Change" label eating the line. */
.ps-effect-target-swap {
  flex-shrink: 0;
  font-size: clamp(0.85rem, 1.5vh, 1.15rem);
  line-height: 1;
  color: color-mix(in srgb, var(--tc) 60%, transparent);
  transition:
    transform 300ms ease,
    color 180ms ease;
}

.ps-effect-target:hover .ps-effect-target-swap {
  color: color-mix(in srgb, var(--tc) 90%, white);
  transform: rotate(180deg);
}

/* While the upgrade preview runs, the changed VALUE is the story — the target
   stays visible but steps back so the green number carries the line. */
.ps-planet-effect--preview .ps-effect-arrow {
  color: rgba(124, 240, 137, 0.5);
}

.ps-planet-effect--preview .ps-effect-target {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .ps-effect-target--empty {
    animation: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ps-buff-veil-edge {
    animation: none;
  }
}

/* Pulsing green glow on the orbiting planet itself — follows it on its path. */
.ps-planet-preview-img--buffed {
  animation: ps-planet-buff-glow 1.8s ease-in-out infinite;
}

/* ── Planet-Orbit-Wrapper Transition (per-slot swap) ───────────────────────── */
/* Opacity lives on the wrapper (its transform is owned by the orbit keyframes,
   so it must never be transitioned there); the scale pop targets the inner img. */
.ps-planet-swap-enter-active {
  transition: opacity 0.2s ease;
}

.ps-planet-swap-leave-active {
  transition: opacity 0.15s ease;
}

.ps-planet-swap-enter-active .ps-planet-preview-img {
  transition: transform 0.2s ease;
}

.ps-planet-swap-enter-from {
  opacity: 0;
}

.ps-planet-swap-enter-from .ps-planet-preview-img {
  transform: scale(0.82);
}

.ps-planet-swap-leave-to {
  opacity: 0;
}

/* ── Compact height (Full HD ~950px viewport) ───────────────────────────────── */
/* Shrink the sun cap, crown and dock so crown + sun + name/HP + dock all fit the
   flattest desktop viewport without overflow. 2K/4K keep the roomy defaults. */
@media (max-height: 1100px) {
  .ps-system {
    height: min(var(--ps-sun-d, 340px), 46vh);
  }

  .ps-crown-value {
    font-size: clamp(2rem, 4.6vh, 3rem);
  }

  /* Reserve a little less for the dock and tighten it on flat viewports. */
  .ps-stage {
    padding-bottom: clamp(84px, 13vh, 128px);
  }

  .ps-action-dock {
    gap: 7px;
    bottom: clamp(10px, 1.8vh, 22px);
  }
}

/* ── Narrow-window fallback ─────────────────────────────────────────────────── */
/* Below common desktop widths the three dock zones would squeeze each other —
   stack them and let the detail column scroll while the stage keeps a sane
   minimum height. */
@media (max-width: 950px) {
  .ps-stage {
    flex: none;
  }

  .ps-system {
    flex: none;
    height: clamp(240px, 42vh, 400px);
  }
}

@keyframes ps-hp-low-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.45);
  }
}

@keyframes ps-sun-pulse {
  0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
}

/* Tilted ellipse (rx = --orb-x, ry = --orb-y). Front/lower arc (in front of sun)
   takes ~70% of the loop → slow & large; back/upper arc (behind the sun) ~30% →
   fast, small, fully occluded by the opaque sun core, vanishing one side &
   reappearing the other. 0.707 ≈ cos/sin 45° on the ellipse. */
@keyframes ps-planet-orbit {
  0% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), 0) scale(1);
    z-index: 3;
  }
  17.5% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -0.707), calc(var(--orb-y) * 0.707)) scale(1.08);
    z-index: 3;
  }
  35% {
    transform: translate(-50%, -50%) translate(0, var(--orb-y)) scale(1.15);
    z-index: 3;
  }
  52.5% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * 0.707), calc(var(--orb-y) * 0.707)) scale(1.08);
    z-index: 3;
  }
  70% {
    transform: translate(-50%, -50%) translate(var(--orb-x), 0) scale(1);
    z-index: 3;
  }
  71% {
    transform: translate(-50%, -50%) translate(var(--orb-x), -1px) scale(0.98);
    z-index: 0;
  }
  82% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * 0.707), calc(var(--orb-y) * -0.707)) scale(0.78);
    z-index: 0;
  }
  90% {
    transform: translate(-50%, -50%) translate(0, calc(var(--orb-y) * -1)) scale(0.55);
    z-index: 0;
  }
  95% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -0.707), calc(var(--orb-y) * -0.707)) scale(0.72);
    z-index: 0;
  }
  99% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), -1px) scale(0.98);
    z-index: 0;
  }
  100% {
    transform: translate(-50%, -50%) translate(calc(var(--orb-x) * -1), 0) scale(1);
    z-index: 3;
  }
}

@keyframes ps-down-pulse {
  from {
    opacity: 0.6;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Das Bühnen-Emblem trägt bereits ein translateY — Puls darf es nicht wegwerfen */
@keyframes ps-down-icon-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

@keyframes ps-eclipse-breathe {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

@keyframes ps-buy-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 5px rgba(52, 211, 153, 0.5);
  }
  50% {
    transform: scale(1.18);
    box-shadow:
      0 0 12px rgba(52, 211, 153, 0.95),
      0 0 20px rgba(5, 150, 105, 0.5);
  }
}

@keyframes ps-hp-ghost-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

@keyframes ps-target-nag {
  0%,
  100% {
    border-color: color-mix(in srgb, var(--tc) 40%, #3a2a10);
    box-shadow: none;
  }
  50% {
    border-color: var(--tc);
    box-shadow: 0 0 14px color-mix(in srgb, var(--tc) 35%, transparent);
  }
}

@keyframes ps-planet-buff-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 8px #5ce66a66);
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 20px #5ce66acc);
  }
}
</style>
