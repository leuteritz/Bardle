<template>
  <Transition name="obj-pop">
    <div v-if="show" ref="overlayEl" class="objective-overlay">
      <div ref="modalEl" class="objective-modal" :style="modalStyle">
        <RpgFrame />
        <!-- Gold accent bar -->
        <div class="accent-bar" />

        <!-- Spawn banner header with instant-resolve buttons -->
        <div class="obj-header">
          <button
            class="force-btn force-btn--ally"
            :disabled="battleStore.objectiveResult !== null"
            title="Instantly slay — your team takes it"
            @click="battleStore.forceResolveObjective(1)"
          >
            SECURE ✦
          </button>
          <div class="obj-title-wrap">
            <span class="obj-title">{{ objectiveTitle }}</span>
            <!-- Reward preview lives up here so the arena below gets the full height -->
            <div class="obj-rewards">
              <span class="reward reward--own">You +{{ winBonusPercent }}%</span>
              <span class="reward-divider">·</span>
              <span class="reward reward--enemy">Enemy +{{ loseBonusPercent }}%</span>
              <template v-if="effectText">
                <span class="reward-divider">·</span>
                <span class="reward-effect" :title="effectText">{{ effectText }}</span>
              </template>
            </div>
          </div>
          <button
            class="force-btn force-btn--enemy"
            :disabled="battleStore.objectiveResult !== null"
            title="Instantly slay — enemy team takes it"
            @click="battleStore.forceResolveObjective(2)"
          >
            ✦ CONCEDE
          </button>
        </div>

        <!-- Alive-count strip: the fight is locked at these numbers -->
        <div class="alive-strip">
          <span class="alive-pips">
            <span
              v-for="f in fightersOwn"
              :key="'op' + f.idx"
              class="alive-pip alive-pip--own"
              :class="{ 'alive-pip--out': !isStanding(f) }"
            />
          </span>
          <span class="alive-versus">
            <span class="alive-count alive-count--own">{{ aliveOwn }}</span>
            <span class="alive-versus-label">VS</span>
            <span class="alive-count alive-count--enemy">{{ aliveEnemy }}</span>
          </span>
          <span class="alive-pips alive-pips--enemy">
            <span
              v-for="f in fightersEnemy"
              :key="'ep' + f.idx"
              class="alive-pip alive-pip--enemy"
              :class="{ 'alive-pip--out': !isStanding(f) }"
            />
          </span>
        </div>

        <!-- Arena row: own fighters | boss | enemy fighters -->
        <div class="arena-row">
          <div class="fighters-col">
            <div
              v-for="(f, i) in fightersOwn"
              :key="'f1' + f.idx"
              class="fighter-card fighter-card--own"
              :class="[
                {
                  'fighter-card--dead': !f.alive || f.down,
                  'attacking attacking--own': isAttacking(f),
                  'card--casting': isAbilityActive(f) && !isTaunted(f, 'own'),
                  'card--taunted': isTaunted(f, 'own'),
                  'card--buffed': isBuffed(f, 'own') && !isTaunted(f, 'own'),
                },
                cardRankClass(f, 'own'),
                cardFlashClass('own' + f.idx),
              ]"
              :style="cardStyle(f, i, false)"
            >
              <!-- Status pills: every active effect on THIS fighter, with the
                   caster's portrait/sprite and a draining duration bar -->
              <TransitionGroup name="fx" tag="div" class="fx-tray">
                <div
                  v-for="fx in fighterEffects(f, 'own')"
                  :key="fx.key"
                  class="fx-pill"
                  :style="{ '--fx-color': fx.color }"
                >
                  <img v-if="fx.img" :src="fx.img" class="fx-img" :alt="fx.label" />
                  <span class="fx-label">{{ fx.label }}</span>
                  <img
                    v-for="t in fx.targets ?? []"
                    :key="t.name"
                    :src="battleStore.getChampionImage(t.name)"
                    class="fx-target"
                    :alt="t.name"
                  />
                  <span
                    v-if="fx.remaining !== null"
                    class="fx-timer"
                    :style="{ width: fx.remaining * 100 + '%' }"
                  />
                </div>
              </TransitionGroup>
              <!-- full-height portrait bleeding to the card's team-colored edge -->
              <div
                class="fighter-portrait-wrap"
                :class="{ 'portrait--taunting': isTaunting(f), 'portrait--buffed': isBuffed(f, 'own') }"
              >
                <img
                  :src="battleStore.getChampionImage(f.name)"
                  class="fighter-portrait"
                  :class="{ 'fighter-portrait--dead': !f.alive || f.down }"
                  :alt="f.name"
                />
                <span v-if="!f.alive" class="fighter-dead-badge">✕</span>
                <span v-else-if="f.down" class="fighter-down-badge">DOWN</span>
                <TransitionGroup name="hpfl" tag="div" class="hpfl-layer">
                  <span
                    v-for="h in hpFloatsFor('own' + f.idx)"
                    :key="'h' + h.id"
                    class="hpfl"
                    :class="h.value < 0 ? 'hpfl--dmg' : 'hpfl--heal'"
                  >{{ h.value > 0 ? '+' : '' }}{{ h.value }}</span>
                </TransitionGroup>
              </div>
              <div class="fighter-body">
                <div class="fighter-main">
                  <span class="fighter-name">{{ f.name }}</span>
                  <div
                    v-if="f.alive"
                    class="skill-btn"
                    :class="{
                      'skill-btn--active': isAbilityActive(f),
                      'skill-btn--cooling': !isAbilityActive(f) && abilityCdLeft(f) > 0,
                      'skill-btn--off': f.down,
                    }"
                    :title="abilityTooltip(f)"
                  >
                    <img :src="roleImage(f)" class="skill-img" :alt="abilityOf(f).name" />
                    <span v-if="!isAbilityActive(f) && abilityCdLeft(f) > 0" class="skill-cd-text">
                      {{ Math.ceil(abilityCdLeft(f)) }}
                    </span>
                  </div>
                  <div class="stat-block">
                    <span class="stat-big-row">
                      <span class="stat-mini-label">DMG</span>
                      <span :key="damageBumps['own' + f.idx] ?? 0" class="stat-big fighter-damage--bump">
                        {{ fmt(displayedDamage(f, 'own')) }}
                      </span>
                    </span>
                    <span class="stat-small-row">
                      <span class="stat-mini-label">DPS</span>
                      <span class="stat-small">{{ isStanding(f) ? fighterDps(f, battleStore.objectiveOwnDpsMult) + '/s' : '—' }}</span>
                    </span>
                  </div>
                </div>
                <div v-if="f.alive" class="fighter-hp-row">
                  <div class="fight-hp">
                    <div class="fight-hp-fill" :class="hpStage(f)" :style="{ width: hpPct(f) + '%' }" />
                  </div>
                  <span class="fight-hp-num" :class="hpStage(f)">{{ Math.ceil(f.fightHp) }}/{{ f.fightMaxHp }}</span>
                </div>
              </div>
              <!-- Strike floats anchored beside THIS fighter's card — damage is attributable -->
              <TransitionGroup name="fdmg" tag="div" class="card-dmg-layer card-dmg-layer--own">
                <span
                  v-for="fl in fighterFloatsFor('own' + f.idx)"
                  :key="'fd' + fl.id"
                  class="fdmg fdmg--own"
                  :class="{ 'fdmg--crit': fl.crit }"
                >
                  <Icon icon="game-icons:quick-slash" :width="fl.crit ? 17 : 13" :height="fl.crit ? 17 : 13" class="fdmg-icon" />
                  -{{ fl.value }}{{ fl.crit ? '!' : '' }}
                </span>
              </TransitionGroup>
            </div>
          </div>

          <!-- Center column: boss HP bar on top, arena below -->
          <div class="boss-col">
          <div class="boss-hp" :class="{ 'boss-hp--shake': hpShake }">
            <div class="boss-hp-track">
              <div class="boss-hp-fill" :style="{ width: hpFraction * 100 + '%' }" />
            </div>
            <span class="boss-hp-num">{{ fmt(Math.ceil(battleStore.objectiveHP)) }} / {{ fmt(battleStore.objectiveMaxHP) }}</span>
          </div>

          <!-- The boss claws every standing fighter each second -->
          <div class="boss-aoe" title="The objective strikes every standing fighter each second">
            <Icon icon="game-icons:claw-slashes" width="12" height="12" class="boss-aoe-icon" />
            <span class="boss-aoe-dps">{{ aoeDps }}/s</span>
            <span class="boss-aoe-label">to every fighter</span>
          </div>

          <!-- Arena: aura + rune ring + embers + boss -->
          <div
            class="boss-arena"
            @click="handleClick"
            @mousedown="imgPressed = true"
            @mouseup="imgPressed = false"
            @mouseleave="imgPressed = false"
          >
          <div class="arena-aura" />
          <div class="rune-ring rune-ring--outer" />
          <div class="rune-ring rune-ring--inner" />
          <span v-for="e in 6" :key="e" class="ember" :class="`ember--${e}`" />

          <img
            :src="isDrake ? '/img/dragon.png' : '/img/baron.png'"
            class="boss-img"
            :class="{ 'boss-img--pressed': imgPressed }"
            :alt="objectiveTitle"
          />
          <div v-if="hitFlash" class="hit-flash" />

          <!-- Floating crit numbers -->
          <TransitionGroup name="dmg-float" tag="div" class="dmg-floats">
            <span v-for="f in damageFloats" :key="f.id" class="dmg-float" :style="{ '--rot': f.rot + 'deg', left: f.left + '%' }">
              -{{ f.value }}
            </span>
          </TransitionGroup>

          <!-- Hex Curse: modern debuff badge per side — team dot, stack pips
               (diamonds; ×N beyond 5) and the running damage tally -->
          <template v-for="s in CURSE_SIDES" :key="'curse' + s">
            <div
              v-if="curseStacks(s) > 0"
              class="curse-badge"
              :class="s === 'own' ? 'curse-badge--own' : 'curse-badge--enemy'"
            >
              <span :key="curseStacks(s)" class="curse-count">
                <Icon icon="game-icons:burning-skull" width="13" height="13" class="curse-icon" />
                ×{{ curseStacks(s) }}
              </span>
              <span class="curse-dmg">
                −{{ fmt(Math.round(battleStore.objectiveCurseDamage[s])) }}
              </span>
            </div>
          </template>

          </div>
          </div>

          <div class="fighters-col fighters-col--enemy">
            <div
              v-for="(f, i) in fightersEnemy"
              :key="'f2' + f.idx"
              class="fighter-card fighter-card--enemy"
              :class="[
                {
                  'fighter-card--dead': !f.alive || f.down,
                  'attacking attacking--enemy': isAttacking(f),
                  'card--casting': isAbilityActive(f) && !isTaunted(f, 'enemy'),
                  'card--taunted': isTaunted(f, 'enemy'),
                  'card--buffed': isBuffed(f, 'enemy') && !isTaunted(f, 'enemy'),
                },
                cardRankClass(f, 'enemy'),
                cardFlashClass('enemy' + f.idx),
              ]"
              :style="cardStyle(f, i, true)"
            >
              <!-- Status pills: every active effect on THIS fighter, with the
                   caster's portrait/sprite and a draining duration bar -->
              <TransitionGroup name="fx" tag="div" class="fx-tray">
                <div
                  v-for="fx in fighterEffects(f, 'enemy')"
                  :key="fx.key"
                  class="fx-pill"
                  :style="{ '--fx-color': fx.color }"
                >
                  <img v-if="fx.img" :src="fx.img" class="fx-img" :alt="fx.label" />
                  <span class="fx-label">{{ fx.label }}</span>
                  <img
                    v-for="t in fx.targets ?? []"
                    :key="t.name"
                    :src="battleStore.getChampionImage(t.name)"
                    class="fx-target"
                    :alt="t.name"
                  />
                  <span
                    v-if="fx.remaining !== null"
                    class="fx-timer"
                    :style="{ width: fx.remaining * 100 + '%' }"
                  />
                </div>
              </TransitionGroup>
              <div class="fighter-body">
                <div class="fighter-main fighter-main--enemy">
                  <div class="stat-block stat-block--enemy">
                    <span class="stat-big-row">
                      <span :key="damageBumps['enemy' + f.idx] ?? 0" class="stat-big fighter-damage--bump">
                        {{ fmt(displayedDamage(f, 'enemy')) }}
                      </span>
                      <span class="stat-mini-label">DMG</span>
                    </span>
                    <span class="stat-small-row">
                      <span class="stat-small">{{ isStanding(f) ? fighterDps(f, battleStore.objectiveEnemyDpsMult) + '/s' : '—' }}</span>
                      <span class="stat-mini-label">DPS</span>
                    </span>
                  </div>
                  <div
                    v-if="f.alive"
                    class="skill-btn"
                    :class="{
                      'skill-btn--active': isAbilityActive(f),
                      'skill-btn--cooling': !isAbilityActive(f) && abilityCdLeft(f) > 0,
                      'skill-btn--off': f.down,
                    }"
                    :title="abilityTooltip(f)"
                  >
                    <img :src="roleImage(f)" class="skill-img" :alt="abilityOf(f).name" />
                    <span v-if="!isAbilityActive(f) && abilityCdLeft(f) > 0" class="skill-cd-text">
                      {{ Math.ceil(abilityCdLeft(f)) }}
                    </span>
                  </div>
                  <span class="fighter-name">{{ f.name }}</span>
                </div>
                <div v-if="f.alive" class="fighter-hp-row fighter-hp-row--enemy">
                  <span class="fight-hp-num" :class="hpStage(f)">{{ Math.ceil(f.fightHp) }}/{{ f.fightMaxHp }}</span>
                  <div class="fight-hp">
                    <div class="fight-hp-fill fight-hp-fill--enemy" :class="hpStage(f)" :style="{ width: hpPct(f) + '%' }" />
                  </div>
                </div>
              </div>
              <!-- full-height portrait bleeding to the card's team-colored edge -->
              <div
                class="fighter-portrait-wrap"
                :class="{ 'portrait--taunting': isTaunting(f), 'portrait--buffed': isBuffed(f, 'enemy') }"
              >
                <img
                  :src="battleStore.getChampionImage(f.name)"
                  class="fighter-portrait"
                  :class="{ 'fighter-portrait--dead': !f.alive || f.down }"
                  :alt="f.name"
                />
                <span v-if="!f.alive" class="fighter-dead-badge">✕</span>
                <span v-else-if="f.down" class="fighter-down-badge">DOWN</span>
                <TransitionGroup name="hpfl" tag="div" class="hpfl-layer">
                  <span
                    v-for="h in hpFloatsFor('enemy' + f.idx)"
                    :key="'h' + h.id"
                    class="hpfl"
                    :class="h.value < 0 ? 'hpfl--dmg' : 'hpfl--heal'"
                  >{{ h.value > 0 ? '+' : '' }}{{ h.value }}</span>
                </TransitionGroup>
              </div>
              <!-- Strike floats anchored beside THIS fighter's card — damage is attributable -->
              <TransitionGroup name="fdmg" tag="div" class="card-dmg-layer card-dmg-layer--enemy">
                <span
                  v-for="fl in fighterFloatsFor('enemy' + f.idx)"
                  :key="'fd' + fl.id"
                  class="fdmg fdmg--enemy"
                  :class="{ 'fdmg--crit': fl.crit }"
                >
                  <Icon icon="game-icons:quick-slash" :width="fl.crit ? 17 : 13" :height="fl.crit ? 17 : 13" class="fdmg-icon" />
                  -{{ fl.value }}{{ fl.crit ? '!' : '' }}
                </span>
              </TransitionGroup>
            </div>
          </div>
        </div>

        <!-- Damage race: most total damage secures it — no last-hit steals -->
        <div class="race-section">
          <div class="race-labels">
            <span class="race-label race-label--own">YOUR TEAM {{ fmt(ownDamage) }} · {{ ownDps }}/s</span>
            <span class="race-label race-label--enemy">ENEMY {{ fmt(enemyDamage) }} · {{ enemyDps }}/s</span>
          </div>
          <div class="race-track">
            <div class="race-own" :style="{ width: ownShare + '%' }">
              <div class="race-player" :style="{ width: playerShareOfOwn + '%' }" />
            </div>
            <div class="race-midmark" />
          </div>
          <div class="race-caption">
            <span v-if="playerDamage > 0" class="race-caption-player">
              Your clicks: +{{ fmt(playerDamage) }} ({{ playerPercentOfOwn }}% of team dmg)
            </span>
            <span v-else class="race-caption-idle">Most total damage secures it — no steals!</span>
          </div>
        </div>

        <!-- Post-fight summary overlay -->
        <Transition name="result-pop">
          <ObjectiveResultSummary v-if="battleStore.objectiveResult !== null" />
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ObjectiveFighter } from '@/types'
import { useBattleStore } from '@/stores/battleStore'
import { useFitScale } from '@/composables/useFitScale'
import ObjectiveResultSummary from './ObjectiveResultSummary.vue'
import RpgFrame from '@/components/ui/RpgFrame.vue'
import {
  OBJECTIVE_BASE_DPS_PER_CHAMP,
  OBJECTIVE_BARON_WIN_BONUS,
  DRAKE_OCEAN_LOSS_PENALTY_MULT,
  OBJECTIVE_LUNGE_CYCLE_S,
  OBJECTIVE_LUNGE_STAGGER_S,
  OBJECTIVE_LUNGE_ENEMY_OFFSET_S,
  OBJECTIVE_LUNGE_STRIKE_FRACTION,
  OBJECTIVE_FIGHTER_FLOAT_LIFETIME_MS,
  OBJECTIVE_ROLE_ABILITIES,
  OBJECTIVE_ADC_CRIT_CHANCE,
  OBJECTIVE_ADC_CRIT_MULT,
  OBJECTIVE_MID_CURSE_DPS,
  OBJECTIVE_SUPPORT_MEND_HEAL,
  OBJECTIVE_JUNGLE_BUFF_MULT,
  OBJECTIVE_TOP_TAUNT_TARGETS,
  OBJECTIVE_FIGHTER_FLOAT_TICK_MS,
  OBJECTIVE_ABILITY_DURATION_S,
  OBJECTIVE_AOE_DPS_DRAKE,
  OBJECTIVE_AOE_DPS_BARON,
  ROLE_BY_KEY,
} from '@/config/constants'
import { DRAKE_TYPES, BARON_BUFF } from '@/config/drakes'

const BARON_THEME = BARON_BUFF

const battleStore = useBattleStore()

const show = computed(() => battleStore.objectiveModalOpen || battleStore.objectiveResult !== null)
const isDrake = computed(() => battleStore.activeObjective === 'drake')

const drakeDef = computed(() => DRAKE_TYPES[battleStore.activeDrakeType ?? 'infernal'])

/** Theme variables driving title, aura, rings, embers, HP segments and boss glow. */
const themeVars = computed(() => {
  const t = isDrake.value ? drakeDef.value : BARON_THEME
  return { '--obj-color': t.color, '--obj-dark': t.colorDark, '--obj-glow': t.glow }
})

// The modal is a fixed 880px design; fit-scale it into the board middle so the
// whole fight is visible on every desktop resolution — no inner scrolling.
const overlayEl = ref<HTMLElement | null>(null)
const modalEl = ref<HTMLElement | null>(null)
const { scale: modalScale } = useFitScale(overlayEl, modalEl, { maxScale: 1.35, padding: 10 })

const modalStyle = computed(() => ({
  ...themeVars.value,
  transform: `scale(${modalScale.value})`,
}))

const objectiveTitle = computed(() =>
  isDrake.value ? drakeDef.value.label.toUpperCase() : 'BARON NASHOR',
)

/** Boss AoE: damage the objective deals per second to every standing fighter. */
const aoeDps = computed(() =>
  isDrake.value ? OBJECTIVE_AOE_DPS_DRAKE : OBJECTIVE_AOE_DPS_BARON,
)

/** A fighter lunges at the pit while standing and the fight is still running. */
function isAttacking(f: ObjectiveFighter): boolean {
  return isStanding(f) && battleStore.objectiveResult === null
}

// ── Role abilities: panel copy + live cooldown state ────────────────────────
const ABILITY_LABELS: Record<string, string> = {
  top: 'TAUNT',
  jungle: `RALLY +${Math.round((OBJECTIVE_JUNGLE_BUFF_MULT - 1) * 100)}%`,
  mid: `CURSE ${OBJECTIVE_MID_CURSE_DPS}/s · +STACK`,
  adc: `CRIT ${Math.round(OBJECTIVE_ADC_CRIT_CHANCE * 100)}% · ×${OBJECTIVE_ADC_CRIT_MULT}`,
  support: `MEND +${OBJECTIVE_SUPPORT_MEND_HEAL}`,
}

function abilityOf(f: ObjectiveFighter) {
  return OBJECTIVE_ROLE_ABILITIES[f.role]
}

/** Role color/image from the central role registry — the skill button speaks the role's language. */
function roleColor(f: ObjectiveFighter): string {
  return ROLE_BY_KEY[f.role].color
}

function roleImage(f: ObjectiveFighter): string {
  return ROLE_BY_KEY[f.role].image
}

function abilityTooltip(f: ObjectiveFighter): string {
  return `${abilityOf(f).name} — ${ABILITY_LABELS[f.role]}`
}

const jungleImage = ROLE_BY_KEY.jungle.image
const midImage = ROLE_BY_KEY.mid.image
const CURSE_SIDES = ['own', 'enemy'] as const
const rallyPercent = Math.round((OBJECTIVE_JUNGLE_BUFF_MULT - 1) * 100)

/** Ticking clock (100ms via the float scheduler) so ability windows render reactively. */
const nowMs = ref(Date.now())

function isAbilityActive(f: ObjectiveFighter): boolean {
  return isStanding(f) && f.abilityActiveUntil > nowMs.value
}

function isTaunting(f: ObjectiveFighter): boolean {
  return f.role === 'top' && isAbilityActive(f)
}

function isBuffed(f: ObjectiveFighter, side: 'own' | 'enemy'): boolean {
  return isStanding(f) && battleStore.objectiveBuffTarget[side] === f.idx
}

/** Cooldown remaining in seconds; 0 when ready/active. */
function abilityCdLeft(f: ObjectiveFighter): number {
  return Math.max(0, (f.abilityCooldownUntil - nowMs.value) / 1000)
}

/** Hex Curse stacks on the boss: 0 = mid out, otherwise the fight's accumulated stack count. */
function curseStacks(side: 'own' | 'enemy'): number {
  const mid = _rawSide(side).find((f) => f.role === 'mid')
  if (!mid || !isStanding(mid)) return 0
  return battleStore.objectiveCurseStacks[side]
}

function hpPct(f: ObjectiveFighter): number {
  if (f.fightMaxHp <= 0) return 0
  return Math.max(0, Math.min(100, (f.fightHp / f.fightMaxHp) * 100))
}

function hpStage(f: ObjectiveFighter): string {
  const p = hpPct(f)
  if (p > 60) return 'hp--high'
  if (p > 35) return 'hp--mid'
  return 'hp--low'
}

/** Lunge delay of the fighter at `i` in its sorted column — single source for CSS and the float scheduler. */
function lungeDelayS(i: number, enemy: boolean): number {
  return i * OBJECTIVE_LUNGE_STAGGER_S + (enemy ? OBJECTIVE_LUNGE_ENEMY_OFFSET_S : 0)
}

function lungeStyle(f: ObjectiveFighter, i: number, enemy: boolean) {
  // Focus Fire feels like an attack-speed steroid: the ADC jabs twice as fast
  const speedMult = f.role === 'adc' && isAbilityActive(f) ? 0.5 : 1
  return {
    animationDelay: lungeDelayS(i, enemy) + 's',
    animationDuration: OBJECTIVE_LUNGE_CYCLE_S * speedMult + 's',
  }
}

/** Card inline style: role color var (skill button + casting outline) + lunge timing when attacking. */
function cardStyle(f: ObjectiveFighter, i: number, enemy: boolean) {
  return {
    '--ability-color': roleColor(f),
    ...(isAttacking(f) ? lungeStyle(f, i, enemy) : {}),
  }
}

/** A fighter still fighting at the pit: alive at start and not downed by the boss. */
function isStanding(f: ObjectiveFighter): boolean {
  return f.alive && !f.down
}

// Standing counts update live as fighters go down under the boss AoE.
const aliveOwn = computed(
  () => battleStore.objectiveFighters?.t1.filter(isStanding).length ?? battleStore.objectiveAliveCounts?.own ?? 3,
)
const aliveEnemy = computed(
  () => battleStore.objectiveFighters?.t2.filter(isStanding).length ?? battleStore.objectiveAliveCounts?.enemy ?? 3,
)
const ownDps = computed(() =>
  Math.round(aliveOwn.value * OBJECTIVE_BASE_DPS_PER_CHAMP * battleStore.objectiveOwnDpsMult),
)
const enemyDps = computed(() =>
  Math.round(aliveEnemy.value * OBJECTIVE_BASE_DPS_PER_CHAMP * battleStore.objectiveEnemyDpsMult),
)

// Fixed role order (top/jungle/mid/adc/support) — no live reordering; medals show the damage ranks.
const fightersOwn = computed(() => battleStore.objectiveFighters?.t1 ?? [])
const fightersEnemy = computed(() => battleStore.objectiveFighters?.t2 ?? [])

/** Damage podium (1–3) per side, computed live without reordering the cards. */
const damageRanks = computed(() => {
  const map: Record<string, number> = {}
  const rank = (arr: ObjectiveFighter[], side: string) => {
    ;[...arr]
      .filter((f) => f.alive && f.damage > 0)
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 3)
      .forEach((f, i) => {
        map[side + f.idx] = i + 1
      })
  }
  rank(fightersOwn.value, 'own')
  rank(fightersEnemy.value, 'enemy')
  return map
})

function rankOf(f: ObjectiveFighter, side: 'own' | 'enemy'): number | null {
  return damageRanks.value[side + f.idx] ?? null
}

/** Card shell class for the podium ranks — gold pulses, silver glows, bronze is a tinted frame. */
function cardRankClass(f: ObjectiveFighter, side: 'own' | 'enemy'): string | null {
  const rank = rankOf(f, side)
  if (rank === 1) return 'fighter-card--top'
  if (rank === 2) return 'fighter-card--second'
  if (rank === 3) return 'fighter-card--third'
  return null
}

// ── Taunt visibility: who challenges whom ───────────────────────────────────
function _rawSide(side: 'own' | 'enemy'): ObjectiveFighter[] {
  return side === 'own' ? battleStore.objectiveFighters?.t1 ?? [] : battleStore.objectiveFighters?.t2 ?? []
}

/** The opposing top laner currently taunting this side, if any. */
function tauntingTopOf(side: 'own' | 'enemy'): ObjectiveFighter | null {
  const top = _rawSide(side === 'own' ? 'enemy' : 'own').find((f) => f.role === 'top')
  return top && isAbilityActive(top) ? top : null
}

/** Mirrors the store's taunt rule: first N standing fighters (idx order) while the enemy top's window runs. */
function tauntedIdxsOf(side: 'own' | 'enemy'): number[] {
  if (!tauntingTopOf(side)) return []
  return _rawSide(side)
    .filter(isStanding)
    .slice(0, OBJECTIVE_TOP_TAUNT_TARGETS)
    .map((f) => f.idx)
}

function isTaunted(f: ObjectiveFighter, side: 'own' | 'enemy'): boolean {
  return tauntedIdxsOf(side).includes(f.idx)
}

/** The fighters a taunting top (on `topSide`) is currently binding — for the mini portraits. */
function tauntedEnemiesOf(topSide: 'own' | 'enemy'): ObjectiveFighter[] {
  const victimSide = topSide === 'own' ? 'enemy' : 'own'
  const idxs = tauntedIdxsOf(victimSide)
  return _rawSide(victimSide).filter((f) => idxs.includes(f.idx))
}

// ── Status pills: everything currently affecting a fighter, attributable ────
interface FighterFx {
  key: string
  label: string
  /** Effect color = caster's role color — same language as the skill buttons. */
  color: string
  img?: string
  targets?: ObjectiveFighter[]
  /** Remaining window fraction (1 → 0) driving the pill's drain bar; null = no bar. */
  remaining: number | null
}

/** Fraction of the caster's ability window still running. */
function windowRemaining(caster: ObjectiveFighter): number {
  const dur = OBJECTIVE_ABILITY_DURATION_S[caster.role] * 1000
  return Math.max(0, Math.min(1, (caster.abilityActiveUntil - nowMs.value) / dur))
}

function fighterEffects(f: ObjectiveFighter, side: 'own' | 'enemy'): FighterFx[] {
  const fx: FighterFx[] = []
  const tauntingTop = tauntingTopOf(side)
  if (isTaunted(f, side) && tauntingTop) {
    fx.push({
      key: 'taunted',
      label: 'TAUNTED',
      color: ROLE_BY_KEY.top.color,
      img: battleStore.getChampionImage(tauntingTop.name),
      remaining: windowRemaining(tauntingTop),
    })
  }
  if (isBuffed(f, side)) {
    const jungle = _rawSide(side).find((x) => x.role === 'jungle')
    fx.push({
      key: 'rally',
      label: `RALLY +${rallyPercent}%`,
      color: ROLE_BY_KEY.jungle.color,
      img: jungleImage,
      remaining: jungle && isAbilityActive(jungle) ? windowRemaining(jungle) : null,
    })
  }
  if (isAbilityActive(f)) {
    if (f.role === 'top' && !isTaunted(f, side)) {
      fx.push({
        key: 'challenge',
        label: 'CHALLENGE',
        color: ROLE_BY_KEY.top.color,
        targets: tauntedEnemiesOf(side),
        remaining: windowRemaining(f),
      })
    }
    if (f.role === 'mid') {
      fx.push({
        key: 'curse',
        label: 'HEX CURSE +1',
        color: ROLE_BY_KEY.mid.color,
        img: midImage,
        remaining: windowRemaining(f),
      })
    }
    if (f.role === 'adc') {
      fx.push({
        key: 'focus',
        label: `FOCUS FIRE ×${OBJECTIVE_ADC_CRIT_MULT}`,
        color: ROLE_BY_KEY.adc.color,
        img: ROLE_BY_KEY.adc.image,
        remaining: windowRemaining(f),
      })
    }
    if (f.role === 'support') {
      fx.push({
        key: 'mendcast',
        label: 'MEND',
        color: ROLE_BY_KEY.support.color,
        img: ROLE_BY_KEY.support.image,
        remaining: windowRemaining(f),
      })
    }
  }
  // transient: this ally just received Mend — credit the support on the pill
  const heal = hpFloatsFor(side + f.idx).find((h) => h.value > 0)
  if (heal && f.role !== 'support') {
    fx.push({
      key: 'mended',
      label: `MEND +${heal.value}`,
      color: ROLE_BY_KEY.support.color,
      img: ROLE_BY_KEY.support.image,
      remaining: null,
    })
  }
  return fx
}

/**
 * A fighter's steady DPS share. Side weights are normalized to sum to the
 * alive count, so weight × base DPS is the exact per-fighter rate the tick
 * loop distributes (before the ±variance wobble, which averages out).
 */
function fighterDps(f: ObjectiveFighter, mult = 1): number {
  return Math.round(f.weight * OBJECTIVE_BASE_DPS_PER_CHAMP * mult)
}

const ownDamage = computed(() => Math.round(battleStore.objectiveOwnDamage))
const enemyDamage = computed(() => Math.round(battleStore.objectiveEnemyDamage))
const playerDamage = computed(() => Math.round(battleStore.objectivePlayerDamage))

const ownShare = computed(() => {
  const total = ownDamage.value + enemyDamage.value
  if (total === 0) return 50
  return Math.round((ownDamage.value / total) * 100)
})
const playerShareOfOwn = computed(() => {
  if (ownDamage.value === 0) return 0
  return Math.min(100, Math.round((playerDamage.value / ownDamage.value) * 100))
})
const playerPercentOfOwn = computed(() => playerShareOfOwn.value)

const winBonus = computed(() =>
  isDrake.value ? drakeDef.value.winDelta : OBJECTIVE_BARON_WIN_BONUS,
)
const winBonusPercent = computed(() => Math.round(winBonus.value * 100))
/** Ocean buff softens the displayed loss of later objective fights — matches the sim. */
const loseBonusPercent = computed(() => {
  const oceanHeld = battleStore.drakeBuffs.includes('ocean')
  return Math.round(winBonus.value * (oceanHeld ? DRAKE_OCEAN_LOSS_PENALTY_MULT : 1) * 100)
})
const effectText = computed(() =>
  isDrake.value ? drakeDef.value.effectText : BARON_BUFF.effectText,
)

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const hpFraction = computed(() => {
  if (battleStore.objectiveMaxHP === 0) return 0
  return Math.max(0, battleStore.objectiveHP / battleStore.objectiveMaxHP)
})


// ── Click feedback: crit floats + hit flash + hp shake ─────────────────────
interface DmgFloat {
  id: number
  value: number
  rot: number
  left: number
}
const damageFloats = ref<DmgFloat[]>([])
let _floatId = 0

const imgPressed = ref(false)
const hitFlash = ref(false)
const hpShake = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  if (battleStore.objectiveResult !== null) return
  battleStore.clickObjective()

  const id = ++_floatId
  damageFloats.value.push({
    id,
    value: battleStore.objectiveClickDamage,
    rot: -14 + (id % 5) * 7,
    left: 34 + (id % 4) * 11,
  })
  setTimeout(() => {
    damageFloats.value = damageFloats.value.filter((f) => f.id !== id)
  }, 750)

  hitFlash.value = false
  hpShake.value = false
  requestAnimationFrame(() => {
    hitFlash.value = true
    hpShake.value = true
  })
  if (flashTimer) clearTimeout(flashTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  flashTimer = setTimeout(() => (hitFlash.value = false), 160)
  shakeTimer = setTimeout(() => (hpShake.value = false), 220)
}

watch(show, (v) => {
  if (!v) {
    damageFloats.value = []
    hitFlash.value = false
    hpShake.value = false
  }
})

// ── Fighter strike floats: one per living fighter, timed to its lunge impact ─
interface FighterFloat {
  id: number
  value: number
  crit: boolean
  /** Card anchor (side + fighter idx) — the float renders beside exactly this card. */
  key: string
}
const fighterFloats = ref<FighterFloat[]>([])

function fighterFloatsFor(key: string): FighterFloat[] {
  return fighterFloats.value.filter((f) => f.key === key)
}
let _fighterFloatId = 0
let _floatSchedulerId: ReturnType<typeof setInterval> | null = null
/** Last lunge cycle a float was spawned for, per fighter — exactly one float per cycle. */
const _lastStrikeCycle = new Map<string, number>()
/** Damage shown on the fighter card — snapshots of f.damage taken at each strike, so the
    card jumps by exactly the float's value in the same moment. */
const shownDamage = ref<Record<string, number>>({})
/** Bumped per strike to retrigger the card counter's punch animation. */
const damageBumps = ref<Record<string, number>>({})

function _spawnFighterFloat(f: ObjectiveFighter, key: string, side: 'own' | 'enemy') {
  // Float value = real damage accrued since the last strike (≈ the card's /s figure)
  const prev = shownDamage.value[key] ?? 0
  const value = Math.round(f.damage - prev)
  if (value < 1) return
  shownDamage.value[key] = f.damage
  damageBumps.value[key] = (damageBumps.value[key] ?? 0) + 1
  // Crit styling when the second's damage clearly exceeds the expected rate — real ADC crits pop
  const mult = side === 'own' ? battleStore.objectiveOwnDpsMult : battleStore.objectiveEnemyDpsMult
  const expected = f.weight * OBJECTIVE_BASE_DPS_PER_CHAMP * mult * OBJECTIVE_LUNGE_CYCLE_S
  const crit = value >= expected * ((1 + OBJECTIVE_ADC_CRIT_MULT) / 2)
  const id = ++_fighterFloatId
  fighterFloats.value.push({ id, value, crit, key })
  setTimeout(() => {
    fighterFloats.value = fighterFloats.value.filter((x) => x.id !== id)
  }, OBJECTIVE_FIGHTER_FLOAT_LIFETIME_MS)
}

/** Spawn a float for every standing fighter whose lunge strike landed since the last tick. */
function _checkStrikes(fighters: ObjectiveFighter[], side: 'own' | 'enemy') {
  const cycleMs = OBJECTIVE_LUNGE_CYCLE_S * 1000
  const strikeMs = OBJECTIVE_LUNGE_STRIKE_FRACTION * cycleMs
  const now = Date.now()
  fighters.forEach((f, i) => {
    if (!isStanding(f)) return
    const elapsed = now - battleStore.objectiveFightStartMs - lungeDelayS(i, side === 'enemy') * 1000
    if (elapsed < 0) return
    const cycleNo = Math.floor(elapsed / cycleMs)
    const pos = elapsed - cycleNo * cycleMs
    const key = side + f.idx
    if (pos >= strikeMs && _lastStrikeCycle.get(key) !== cycleNo) {
      _lastStrikeCycle.set(key, cycleNo)
      _spawnFighterFloat(f, key, side)
    }
  })
}

// ── Fight-HP floats (boss AoE hits and support heals on the fighter cards) ──
interface HpFloat {
  id: number
  key: string
  value: number
}
const hpFloats = ref<HpFloat[]>([])
let _hpFloatId = 0
const _prevHp = new Map<string, number>()
/** Transient card flash on HP change: 'hit' (red) or 'heal' (green). */
const cardFlash = ref<Record<string, 'hit' | 'heal' | null>>({})

function hpFloatsFor(key: string): HpFloat[] {
  return hpFloats.value.filter((h) => h.key === key)
}

function _checkHpChanges(fighters: ObjectiveFighter[], side: 'own' | 'enemy') {
  for (const f of fighters) {
    const key = side + f.idx
    const prev = _prevHp.get(key)
    _prevHp.set(key, f.fightHp)
    if (prev === undefined || !f.alive) continue
    const delta = Math.round(f.fightHp - prev)
    if (delta === 0) continue
    const id = ++_hpFloatId
    hpFloats.value.push({ id, key, value: delta })
    setTimeout(() => {
      hpFloats.value = hpFloats.value.filter((x) => x.id !== id)
    }, OBJECTIVE_FIGHTER_FLOAT_LIFETIME_MS)
    // flash the card so incoming damage/healing is unmissable
    cardFlash.value[key] = delta < 0 ? 'hit' : 'heal'
    setTimeout(() => {
      if (cardFlash.value[key]) cardFlash.value[key] = null
    }, 350)
  }
}

function cardFlashClass(key: string): string | null {
  const s = cardFlash.value[key]
  if (s === 'hit') return 'card-flash-hit'
  if (s === 'heal') return 'card-flash-heal'
  return null
}

function _startFloatScheduler() {
  if (_floatSchedulerId) return
  _lastStrikeCycle.clear()
  shownDamage.value = {}
  damageBumps.value = {}
  _prevHp.clear()
  cardFlash.value = {}
  _floatSchedulerId = setInterval(() => {
    nowMs.value = Date.now()
    if (!battleStore.objectiveModalOpen || battleStore.objectiveResult !== null) return
    if (!battleStore.objectiveFighters) return
    _checkStrikes(fightersOwn.value, 'own')
    _checkStrikes(fightersEnemy.value, 'enemy')
    _checkHpChanges(fightersOwn.value, 'own')
    _checkHpChanges(fightersEnemy.value, 'enemy')
  }, OBJECTIVE_FIGHTER_FLOAT_TICK_MS)
}

function _stopFloatScheduler() {
  if (_floatSchedulerId) {
    clearInterval(_floatSchedulerId)
    _floatSchedulerId = null
  }
  _lastStrikeCycle.clear()
  _prevHp.clear()
  fighterFloats.value = []
  hpFloats.value = []
}

/** Card counter: stepped snapshot while the fight runs, real final value once resolved (or out of the fight). */
function displayedDamage(f: ObjectiveFighter, side: 'own' | 'enemy'): number {
  if (battleStore.objectiveResult !== null || !f.alive || f.down) return Math.round(f.damage)
  return Math.round(shownDamage.value[side + f.idx] ?? 0)
}

watch(show, (v) => (v ? _startFloatScheduler() : _stopFloatScheduler()), { immediate: true })
onUnmounted(_stopFloatScheduler)
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────────── */
/* Anchored inside .board-middle (RiftBattleBoard) so the fight centers within
   the tab, on the same vertical band as the left/right team scoreboards.
   ScoreTopBar and kill feed stay visible above/below — broadcast feel. */
.objective-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
}

/* ── Modal card ──────────────────────────────────────────────────────────── */
/* Fixed 880px design surface — useFitScale shrinks/grows it uniformly so the
   entire fight always fits the board without any inner scrolling. */
.objective-modal {
  position: relative;
  width: 880px;
  flex-shrink: 0;
  background: #111008;
  /* Rahmen kommt als SVG-Overlay (RpgFrame) — kein CSS-Border mehr */
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: center center;
}
/* Soft objective-colored haze over the flat dark base */
.objective-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 32%, var(--obj-glow), transparent 60%);
  opacity: 0.1;
  pointer-events: none;
}

.accent-bar {
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  flex-shrink: 0;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.obj-header {
  position: relative;
  width: 100%;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  /* side padding keeps the title + reward line clear of the absolute force buttons */
  padding: 7px 130px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.obj-title-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

/* Reward preview under the title — replaces the old bottom reward rows.
   Hard single-line: never wraps; an over-long drake effect text gets
   ellipsized instead of pushing the header onto a second row. */
.obj-rewards {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: nowrap;
  column-gap: 8px;
  max-width: 100%;
  min-width: 0;
}
.reward {
  font-size: 11px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  flex-shrink: 0;
}
/* Team colors: blue = your team's win-chance gain, red = the enemy's if they secure */
.reward--own { color: #60a5fa; text-shadow: 0 0 8px rgba(96, 165, 250, 0.45); }
.reward--enemy { color: #f87171; text-shadow: 0 0 8px rgba(248, 113, 113, 0.45); }
.reward-divider { color: #7a6030; font-size: 11px; flex-shrink: 0; }
.reward-effect {
  font-size: 11px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  color: var(--obj-color);
  text-shadow: 0 0 8px var(--obj-glow);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Instant-resolve buttons flanking the title */
.force-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 26px;
  padding: 0 9px;
  background: rgba(13, 12, 8, 0.85);
  border: 1px solid;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  white-space: nowrap;
}
.force-btn--ally {
  left: 10px;
  border-color: rgba(96, 165, 250, 0.65);
  color: #60a5fa;
}
.force-btn--ally:hover:not(:disabled) {
  border-color: #60a5fa;
  background: rgba(20, 30, 48, 0.95);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.45);
}
.force-btn--enemy {
  right: 10px;
  border-color: rgba(248, 113, 113, 0.65);
  color: #f87171;
}
.force-btn--enemy:hover:not(:disabled) {
  border-color: #f87171;
  background: rgba(48, 18, 18, 0.95);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.45);
}
.force-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.obj-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 3px;
  white-space: nowrap;
  color: var(--obj-color);
  text-shadow: 0 0 14px var(--obj-glow);
}

/* ── Alive strip ─────────────────────────────────────────────────────────── */
/* Slim squad indicator (MOBA HUD style): flat skewed segments per standing
   fighter + a compact "N ⚔ N" readout — half the height of the old pip row. */
.alive-strip {
  width: calc(100% - 28px);
  margin: 6px 14px 0;
  padding: 3px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.alive-pips {
  display: flex;
  gap: 3px;
  flex: 1;
}
.alive-pips--enemy {
  justify-content: flex-end;
}
.alive-pip {
  width: 15px;
  height: 6px;
  border-radius: 1px;
  transform: skewX(-18deg);
}
.alive-pip--own {
  background: linear-gradient(to bottom, #6ec040, #3d8c22);
  box-shadow: 0 0 4px rgba(82, 184, 48, 0.6);
}
.alive-pip--enemy {
  background: linear-gradient(to bottom, #e07060, #a83a2a);
  box-shadow: 0 0 4px rgba(204, 96, 80, 0.6);
}

.alive-versus {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
}
.alive-versus-label {
  display: flex;
  align-items: center;
  align-self: stretch;
  /* MedievalSharp caps sit optically higher than digits — nudge down to align */
  transform: translateY(2px);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1;
  color: #e8c040;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.5);
}
.alive-count {
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.alive-count--own {
  color: #6ec040;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.5);
}
.alive-count--enemy {
  color: #e07060;
  text-shadow: 0 0 8px rgba(204, 96, 80, 0.5);
}

/* ── Arena row: fighters | boss | fighters ──────────────────────────────── */
.arena-row {
  width: calc(100% - 28px);
  margin: 8px 14px 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fighters-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Card = row: full-height portrait on the outer edge, content column beside it.
   The card's own border carries the team color — the portrait has no frame. */
.fighter-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 7px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.fighter-card--dead {
  opacity: 0.55;
}
/* portrait corners follow the card's rounding on its outer edge
   (no overflow:hidden — the status pills and strike floats sit outside) */
.fighter-card--own .fighter-portrait {
  border-radius: 3px 0 0 3px;
}
.fighter-card--enemy .fighter-portrait {
  border-radius: 0 3px 3px 0;
}

.fighter-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px 5px;
}
.fighter-card--own .fighter-body {
  padding-left: 0;
}
.fighter-card--enemy .fighter-body {
  padding-right: 0;
}

/* Team frame (blue own / red enemy, same palette as the damage floats) with a
   subtle tint fading toward the arena — podium and ability states further
   down still override border/background. */
.fighter-card--own {
  border-color: rgba(96, 165, 250, 0.55);
  background: linear-gradient(to right, rgba(96, 165, 250, 0.08), rgba(96, 165, 250, 0.02)) #1c1c18;
}
.fighter-card--enemy {
  border-color: rgba(248, 113, 113, 0.55);
  background: linear-gradient(to left, rgba(248, 113, 113, 0.08), rgba(248, 113, 113, 0.02)) #1c1c18;
}

.fighter-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fighter-main--enemy {
  justify-content: flex-end;
}
.fighter-main--enemy .fighter-name {
  text-align: right;
}

/* An ability window is firing — the card glows in the role's ability color */
.card--casting {
  border-color: var(--ability-color, #e8c040);
  box-shadow: 0 0 9px var(--ability-color, #e8c040);
}

/* This side is being challenged — bound to the enemy top laner */
.card--taunted {
  border-color: #e8a040;
  box-shadow: 0 0 8px rgba(232, 160, 64, 0.5);
}
/* ── Status pills above each card ────────────────────────────────────────── */
.fx-tray {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  z-index: 5;
  pointer-events: none;
}

.fx-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 3px;
  border-radius: 999px;
  background: rgba(16, 14, 10, 0.95);
  border: 1px solid var(--fx-color, #e8c040);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--fx-color, #e8c040) 45%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
}

.fx-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.2;
  color: var(--fx-color, #e8c040);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.fx-img,
.fx-target {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
  border: 1px solid var(--fx-color, #e8c040);
}
.fx-img {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--fx-color, #e8c040) 70%, transparent));
}
.fx-target + .fx-target {
  margin-left: -6px;
}

/* draining window bar along the pill's bottom edge */
.fx-timer {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: var(--fx-color, #e8c040);
  transition: width 0.12s linear;
}

/* pills pop in, fade out, and shift smoothly when neighbors change */
.fx-enter-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fx-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fx-enter-from {
  opacity: 0;
  transform: translateY(5px) scale(0.85);
}
.fx-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.9);
}
.fx-move {
  transition: transform 0.2s ease;
}

/* Incoming damage / healing flash — the whole card blinks so hits are unmissable */
.card-flash-hit {
  animation: card-hit 0.35s ease-out;
}
.card-flash-heal {
  animation: card-heal 0.35s ease-out;
}
@keyframes card-hit {
  0% { box-shadow: inset 0 0 0 2px rgba(224, 96, 80, 0.9), 0 0 10px rgba(204, 96, 80, 0.6); }
  100% { box-shadow: inset 0 0 0 2px rgba(224, 96, 80, 0), 0 0 0 rgba(204, 96, 80, 0); }
}
@keyframes card-heal {
  0% { box-shadow: inset 0 0 0 2px rgba(110, 224, 96, 0.8), 0 0 10px rgba(82, 184, 48, 0.55); }
  100% { box-shadow: inset 0 0 0 2px rgba(110, 224, 96, 0), 0 0 0 rgba(82, 184, 48, 0); }
}

/* Damage leader: warm gold shell with a slow breathing glow */
.fighter-card--top {
  border-color: #c89040;
  background: linear-gradient(to bottom, #26200f, #1c1c18);
  box-shadow:
    inset 0 0 0 1px rgba(232, 192, 64, 0.25),
    0 0 6px rgba(232, 192, 64, 0.15);
  animation: top-card-glow 2.6s ease-in-out infinite;
}
.fighter-card--top .fighter-name {
  color: #e8c060;
}

/* Second place: cool silver frame with a faint static glow — no motion */
.fighter-card--second {
  border-color: #8a96a4;
  background: linear-gradient(to bottom, #20222a, #1c1c18);
  box-shadow:
    inset 0 0 0 1px rgba(184, 196, 208, 0.18),
    0 0 5px rgba(184, 196, 208, 0.12);
}
.fighter-card--second .fighter-name {
  color: #d0d8e0;
}

/* Third place: bronze-tinted frame only — quietest podium step */
.fighter-card--third {
  border-color: #8a5a28;
  box-shadow: inset 0 0 0 1px rgba(205, 127, 50, 0.16);
}
.fighter-card--third .fighter-name {
  color: #cd9a66;
}
@keyframes top-card-glow {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px rgba(232, 192, 64, 0.25),
      0 0 6px rgba(232, 192, 64, 0.15);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(232, 192, 64, 0.25),
      0 0 12px rgba(232, 192, 64, 0.35);
  }
}

/* full-height, frameless portrait — much larger while the card stays the same */
.fighter-portrait-wrap {
  position: relative;
  flex-shrink: 0;
  width: 58px;
  min-height: 62px;
  display: flex;
}

/* Standing fighters periodically lunge toward the pit — the whole card moves.
   Duration comes inline from OBJECTIVE_LUNGE_CYCLE_S so the float scheduler stays in sync. */
.attacking {
  animation: ease-in-out infinite;
}
.attacking--own {
  animation-name: attack-lunge-own;
}
.attacking--enemy {
  animation-name: attack-lunge-enemy;
}
.fighter-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.fighter-portrait--dead {
  filter: grayscale(0.85) brightness(0.6);
}
.fighter-dead-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #e07060;
  background: #16140e;
  border: 1px solid #cc6050;
  border-radius: 50%;
}

/* Downed mid-fight by the boss — distinct from champions dead at fight start */
.fighter-down-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-12deg);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #e07060;
  background: rgba(22, 20, 14, 0.9);
  border: 1px solid #cc6050;
  border-radius: 3px;
  padding: 0 4px;
  pointer-events: none;
  z-index: 2;
}

/* Fight-local HP row — thick bar with numeric readout */
.fighter-hp-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fight-hp {
  flex: 1;
  height: 9px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid #3e200a;
  border-radius: 2px;
  overflow: hidden;
}
.fight-hp-fill {
  height: 100%;
  transition: width 0.3s ease;
}
.fight-hp-fill--enemy {
  margin-left: auto;
}
.fight-hp-fill.hp--high {
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  box-shadow: 0 0 5px rgba(82, 184, 48, 0.4);
}
.fight-hp-fill.hp--mid {
  background: linear-gradient(to bottom, #e8c040, #a88420);
  box-shadow: 0 0 5px rgba(232, 192, 64, 0.4);
}
.fight-hp-fill.hp--low {
  background: linear-gradient(to bottom, #e07060, #a83a2a);
  box-shadow: 0 0 5px rgba(204, 96, 80, 0.5);
}
.fight-hp-num {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 48px;
  text-align: right;
}
.fighter-hp-row--enemy .fight-hp-num {
  text-align: left;
}
.fight-hp-num.hp--high { color: #8ee060; }
.fight-hp-num.hp--mid { color: #e8c040; }
.fight-hp-num.hp--low { color: #f08070; }

/* Jungle Wild Rally target — chip + green card glow */
.card--buffed {
  border-color: #50c060;
  box-shadow: 0 0 8px rgba(80, 192, 96, 0.55);
}
/* Top laner taunt window */
.portrait--taunting .fighter-portrait {
  animation: taunt-pulse 0.6s ease-in-out infinite;
}
/* Rally target glow */
.portrait--buffed .fighter-portrait {
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.75);
}

/* HP change floats (boss AoE / support heal) above the portrait */
.hpfl-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.hpfl {
  position: absolute;
  top: -12px;
  left: 50%;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.hpfl--dmg {
  color: #f08070;
  text-shadow: 0 0 6px rgba(204, 96, 80, 0.8), 0 1px 3px rgba(0, 0, 0, 0.95);
}
.hpfl--heal {
  color: #7de89a;
  text-shadow: 0 0 6px rgba(82, 184, 48, 0.8), 0 1px 3px rgba(0, 0, 0, 0.95);
}
.hpfl-enter-active {
  animation: hpfl-rise 0.9s ease-out forwards;
}
.hpfl-leave-active {
  display: none;
}

/* Role skill button next to the name — frameless role sprite, glow speaks the role color */
.skill-btn {
  position: relative;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}
.skill-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 4px var(--ability-color, #e8c040));
}
.skill-cd-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.95), 0 1px 2px rgba(0, 0, 0, 0.95);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
/* On cooldown: dimmed sprite with the seconds on top */
.skill-btn--cooling .skill-img {
  filter: grayscale(0.7) brightness(0.55) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}
.skill-btn--active .skill-img {
  animation: skill-pulse 0.7s ease-in-out infinite;
}
.skill-btn--off {
  opacity: 0.4;
}
.skill-btn--off .skill-img {
  filter: grayscale(0.8) brightness(0.5);
}

/* Hex Curse badge — modern debuff pill flanking the boss HP bar corners:
   team dot (who cursed it), mid sprite, one diamond pip per stack, damage tally */
/* frameless two-line stack: icon + stacks on top, the damage tally below */
.curse-badge {
  position: absolute;
  /* vertically flush with the mid-laner's card (3rd of 5 = column center):
     the arena's center sits ~17px below the boss column's center (HP bar +
     AoE line above it), so lift the anchor by that amount */
  top: calc(50% - 17px);
  transform: translateY(-50%);
  /* same height as a fighter card (62px portrait + 2px borders) */
  height: 64px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 8;
}
/* team-colored: the side's curse readout speaks blue (own) or red (enemy).
   Hugging the arena's outer edges — next to the mid card, off the boss art. */
.curse-badge--own {
  left: 0;
  color: #60a5fa;
}
.curse-badge--enemy {
  right: 0;
  color: #f87171;
}

/* re-keyed per stack so it punches once when the curse deepens */
.curse-count {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.5px;
  line-height: 1;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.95);
  animation: curse-stack-pop 0.3s ease-out;
}
.curse-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}

.curse-dmg {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.95);
}

@keyframes curse-stack-pop {
  0% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.alive-pip--out {
  background: #3a382e;
  box-shadow: none;
  transition: background 0.4s ease, box-shadow 0.4s ease;
}

.fighter-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: #c0b090;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Prominent damage stats in the card's top corner */
.stat-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
}
.stat-block--enemy {
  align-items: flex-start;
}
.stat-big-row,
.stat-small-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.stat-mini-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #8a8070;
}
.stat-big {
  font-size: 16px;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.stat-small {
  font-size: 10px;
  font-weight: 700;
  color: #a09060;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
/* Replays on every strike step via :key bump — ties the counter jump to the float */
.fighter-damage--bump {
  animation: dmg-bump 0.25s ease-out;
}
@keyframes dmg-bump {
  0% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

/* ── Center column: boss HP bar above the arena ─────────────────────────── */
.boss-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  /* paints above the card-anchored strike floats so drifting numbers can
     never cover the boss HP bar */
  position: relative;
  z-index: 2;
}

.boss-hp {
  position: relative;
  width: 280px;
  z-index: 3;
}
.boss-hp--shake {
  animation: hp-shake 0.22s ease-in-out;
}
.boss-hp-track {
  height: 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #3e200a;
  border-radius: 3px;
  overflow: hidden;
}
.boss-hp-fill {
  height: 100%;
  background: linear-gradient(to bottom, var(--obj-color), var(--obj-dark));
  box-shadow: 0 0 8px var(--obj-glow);
  transition: width 0.15s ease-out;
}
.boss-hp-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.95), 0 1px 2px rgba(0, 0, 0, 0.95);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

/* AoE readout under the HP bar — frameless, quiet, objective-colored value */
.boss-aoe {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
  z-index: 3;
}
.boss-aoe-icon {
  align-self: center;
  color: var(--obj-color);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}
.boss-aoe-dps {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--obj-color);
  text-shadow: 0 0 6px var(--obj-glow), 0 1px 2px rgba(0, 0, 0, 0.9);
}
.boss-aoe-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #c8b890;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.95);
}

/* ── Arena ───────────────────────────────────────────────────────────────── */
.boss-arena {
  position: relative;
  width: 280px;
  height: 240px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arena-aura {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  filter: blur(22px);
  opacity: 0.5;
  animation: aura-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
  background: radial-gradient(circle, var(--obj-color), var(--obj-dark) 55%, transparent 78%);
}

.rune-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed var(--obj-glow);
  pointer-events: none;
}
.rune-ring--outer {
  inset: 2px;
  animation: ring-spin 14s linear infinite;
}
.rune-ring--inner {
  inset: 18px;
  border-style: dotted;
  animation: ring-spin-rev 9s linear infinite;
}

/* Rising embers */
.ember {
  position: absolute;
  bottom: 12%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  pointer-events: none;
  animation: ember-rise 2.6s ease-in infinite;
  background: var(--obj-color);
  box-shadow: 0 0 6px var(--obj-glow);
}
.ember--1 { left: 22%; animation-delay: 0s; }
.ember--2 { left: 36%; animation-delay: 0.7s; }
.ember--3 { left: 50%; animation-delay: 1.3s; }
.ember--4 { left: 62%; animation-delay: 0.4s; }
.ember--5 { left: 74%; animation-delay: 1.8s; }
.ember--6 { left: 30%; animation-delay: 2.2s; }

/* Unframed boss sprite at natural aspect ratio — the glow follows the PNG alpha contour */
.boss-img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  max-height: 220px;
  object-fit: contain;
  transition: transform 0.08s ease;
  filter: drop-shadow(0 0 14px var(--obj-glow)) drop-shadow(0 0 36px var(--obj-glow));
  animation: boss-breathe 3.2s ease-in-out infinite;
}
.boss-img--pressed {
  transform: scale(0.91) !important;
  animation: none;
}

.hit-flash {
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.55), transparent 65%);
  animation: hit-flash 0.16s ease-out forwards;
  pointer-events: none;
  z-index: 2;
}

/* Crit damage floats */
.dmg-floats {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.dmg-float {
  position: absolute;
  top: 16%;
  font-size: 22px;
  font-weight: 700;
  color: #ffd24a;
  text-shadow: 0 0 10px rgba(232, 160, 20, 0.8), 0 2px 4px rgba(0, 0, 0, 0.95);
  transform: rotate(var(--rot));
  pointer-events: none;
}

.dmg-float-enter-active {
  animation: crit-float 0.75s ease-out forwards;
}
.dmg-float-leave-active {
  display: none;
}

/* Fighter strike floats — anchored beside the striking fighter's own card,
   vertically centered, drifting toward the pit. The zero-width layer sits on
   the card's arena-facing edge, so floats ride along with the lunge motion. */
.card-dmg-layer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  pointer-events: none;
  z-index: 6;
}
.card-dmg-layer--own {
  left: 100%;
}
.card-dmg-layer--enemy {
  right: 100%;
}
.card-dmg-layer--own .fdmg {
  left: 6px;
  --fd-drift: 14px;
}
.card-dmg-layer--enemy .fdmg {
  right: 6px;
  --fd-drift: -14px;
}

.fdmg {
  position: absolute;
  top: 50%;
  margin-top: -9px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  white-space: nowrap;
}
.fdmg-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}
/* Team colors match the rest of the HUD: blue = own team, red = enemy */
.fdmg--own {
  color: #60a5fa;
  text-shadow: 0 0 8px rgba(96, 165, 250, 0.75), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.fdmg--enemy {
  color: #f87171;
  text-shadow: 0 0 8px rgba(248, 113, 113, 0.75), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.fdmg--crit {
  font-size: 21px;
  font-weight: 900;
}
.fdmg--crit.fdmg--own {
  text-shadow: 0 0 14px rgba(96, 165, 250, 0.95), 0 2px 5px rgba(0, 0, 0, 0.95);
}
.fdmg--crit.fdmg--enemy {
  text-shadow: 0 0 14px rgba(248, 113, 113, 0.95), 0 2px 5px rgba(0, 0, 0, 0.95);
}

.fdmg-enter-active {
  animation: fdmg-float 0.9s ease-out forwards;
}
.fdmg-leave-active {
  display: none;
}

/* ── Damage race ─────────────────────────────────────────────────────────── */
.race-section {
  width: calc(100% - 28px);
  /* now the last block in the modal — bottom margin closes the card cleanly */
  margin: 6px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.race-labels {
  display: flex;
  justify-content: space-between;
}
.race-label {
  font-size: 13px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.race-label--own { color: #6ec040; }
.race-label--enemy { color: #e07060; }

.race-track {
  position: relative;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #3e200a;
  background: linear-gradient(to bottom, #7a2818, #57201a);
  overflow: hidden;
}
.race-own {
  position: relative;
  height: 100%;
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
  transition: width 0.25s ease-out;
}
.race-player {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to right, #c89040, #e8c060);
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.7);
  transition: width 0.25s ease-out;
}
.race-midmark {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: #e8c040;
  opacity: 0.7;
  pointer-events: none;
}

.race-caption {
  text-align: center;
  min-height: 14px;
}
.race-caption-player {
  font-size: 13px;
  color: #e8c040;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.race-caption-idle {
  font-size: 13px;
  color: #8a8070;
  letter-spacing: 0.04em;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.obj-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.obj-pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.obj-pop-enter-from,
.obj-pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.result-pop-enter-active {
  transition: opacity 0.2s ease;
}
.result-pop-leave-active {
  transition: opacity 0.15s ease;
}
.result-pop-enter-from,
.result-pop-leave-to {
  opacity: 0;
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes aura-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.65; transform: scale(1.07); }
}

@keyframes ring-spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
@keyframes ring-spin-rev {
  0% { transform: rotate(0); }
  100% { transform: rotate(-360deg); }
}

@keyframes ember-rise {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-110px) scale(1.1); }
}

@keyframes hit-flash {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

@keyframes crit-float {
  0% { opacity: 0; transform: rotate(var(--rot)) translateY(6px) scale(1.5); }
  18% { opacity: 1; transform: rotate(var(--rot)) translateY(0) scale(1.05); }
  100% { opacity: 0; transform: rotate(var(--rot)) translateY(-46px) scale(0.9); }
}

@keyframes hp-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
}

/* transform-only: animating the drop-shadow filter forced a full sprite
   re-rasterization every frame — the static glow on .boss-img stays */
@keyframes boss-breathe {
  0%, 100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.045) translateY(-4px);
  }
}

@keyframes attack-lunge-own {
  0%, 55%, 100% { transform: translateX(0); }
  62% { transform: translateX(-2px); }
  70% { transform: translateX(6px) scale(1.015); }
  78% { transform: translateX(0); }
}
@keyframes attack-lunge-enemy {
  0%, 55%, 100% { transform: translateX(0); }
  62% { transform: translateX(2px); }
  70% { transform: translateX(-6px) scale(1.015); }
  78% { transform: translateX(0); }
}

@keyframes fdmg-float {
  0% { opacity: 0; transform: translate(0, 8px) scale(1.4); }
  16% { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: translate(var(--fd-drift), -34px) scale(0.92); }
}

@keyframes hpfl-rise {
  0% { opacity: 0; transform: translate(-50%, 6px) scale(1.2); }
  18% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -22px) scale(0.9); }
}

@keyframes taunt-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(232, 160, 64, 0.5); }
  50% { box-shadow: 0 0 14px rgba(232, 160, 64, 0.95); }
}

/* Skill sprite breathes in the role color while its window is active */
@keyframes skill-pulse {
  0%, 100% { filter: drop-shadow(0 0 3px var(--ability-color, #e8c040)); }
  50% { filter: drop-shadow(0 0 10px var(--ability-color, #e8c040)); }
}

@media (prefers-reduced-motion: reduce) {
  .arena-aura,
  .rune-ring,
  .ember,
  .boss-hp--shake,
  .boss-img,
  .attacking {
    animation: none !important;
  }
  .fdmg,
  .fdmg-enter-active {
    animation: none !important;
    opacity: 0;
  }
  .fighter-damage--bump,
  .hpfl,
  .hpfl-enter-active,
  .portrait--taunting .fighter-portrait,
  .skill-btn--active .skill-img,
  .curse-count,
  .card-flash-hit,
  .card-flash-heal {
    animation: none !important;
  }
}
</style>
