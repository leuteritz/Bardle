<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { MISSIONS, MISSION_CHAPTERS } from '@/config/progression/missions'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
// Der Skill-Tree-Tab trägt selbst keine Admin-Leiste mehr — die beiden Knöpfe
// dafür stehen hier bei allen anderen Abkürzungen.
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MATERIALS } from '@/config/economy/materials'
import { useNebulaTrigger } from '@/composables/orbit/useNebulaTrigger'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
// Die Kader-Befüllung teilen sich zwei Knöpfe (hier und "Max Everything") und
// lebt deshalb in utils/game statt zweimal als Kopie in je einer Komponente.
import { fillTeamWithRandomChampions } from '@/utils/game/maxEverything'
// Dieselbe Rechnung wie beim Spielstand-Laden — eine zweite Fassung im Panel
// zeigte Zahlen, die kein echter Offline-Zeitraum ergibt.
import { openOfflineWindow } from '@/utils/game/offlineWindow'
import {
  ADMIN_QUICK_RESOURCE_AMOUNT,
  GALAXY_BOSS_SPAWN_ANIM_MS,
  ADMIN_FIELD_FLASH_MS,
  ADMIN_CHIMES_STEP,
  ADMIN_FILL_MATERIAL_AMOUNT,
  ADMIN_OFFLINE_WINDOW_HOURS,
  ADMIN_OFFLINE_WINDOW_MIN_CHIMES,
  SECONDS_PER_HOUR,
} from '@/config/constants'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const gameStore = useGameStore()
const battleStore = useBattleStore()
const starGroupStore = useStarGroupStore()
const omenStore = useOmenStore()
const missionStore = useMissionStore()
const inventoryStore = useInventoryStore()
const galaxyStore = useGalaxyStore()
const meepTree = useMeepTreeStore()
const { triggerNow: triggerNebula } = useNebulaTrigger()
const planetBossStore = usePlanetBossStore()

const editingKey = ref<string | null>(null)
const editingValue = ref<string>('')
const flashKey = ref<string | null>(null)

const quickFields = [
  {
    key: 'chimes',
    label: 'Chimes',
    icon: 'game-icons:windchimes',
    defaultStep: 100,
    min: 0,
    float: true,
  },
  {
    key: 'meeps',
    label: 'Meeps',
    icon: 'game-icons:alien-egg',
    defaultStep: 1,
    min: 0,
    float: false,
  },
  {
    key: 'level',
    label: 'Level',
    icon: 'game-icons:star-medal',
    defaultStep: 1,
    min: 1,
    float: false,
  },
  {
    key: 'skillPoints',
    label: 'Skill Points',
    icon: 'game-icons:star-cycle',
    defaultStep: 1,
    min: 0,
    float: false,
  },
] as const

type QuickKey = (typeof quickFields)[number]['key']

// Konfigurierbare Schrittweiten – pro Feld individuell
const steps = reactive<Record<QuickKey, number>>({
  chimes: ADMIN_CHIMES_STEP,
  meeps: 1,
  level: 1,
  skillPoints: 1,
})

function getFieldMeta(key: QuickKey) {
  return quickFields.find((f) => f.key === key)!
}

function getValue(key: QuickKey): number {
  if (key === 'chimes') return gameStore.chimes
  if (key === 'meeps') return gameStore.meeps
  if (key === 'level') return gameStore.level
  return gameStore.skillPoints
}

function setValue(key: QuickKey, raw: string | number) {
  const meta = getFieldMeta(key)
  const parsed = meta.float ? parseFloat(String(raw)) : parseInt(String(raw))
  if (isNaN(parsed)) return
  const clamped = Math.max(meta.min, parsed)
  if (key === 'chimes') gameStore.chimes = clamped
  else if (key === 'meeps') gameStore.meeps = clamped
  else if (key === 'level') gameStore.adminSetLevel(clamped)
  else if (key === 'skillPoints') gameStore.skillPoints = clamped
}

function startEditing(key: QuickKey) {
  editingKey.value = `qa_${key}`
  editingValue.value = String(getValue(key))
}

function commitEdit(key: QuickKey) {
  setValue(key, editingValue.value)
  editingKey.value = null
  triggerFlash(key)
}

function cancelEdit() {
  editingKey.value = null
}

function onKeydown(e: KeyboardEvent, key: QuickKey) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit(key)
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function stepValue(key: QuickKey, direction: 1 | -1) {
  const meta = getFieldMeta(key)
  const current = getValue(key)
  const next = Math.max(meta.min, current + direction * steps[key])
  setValue(key, next)
  triggerFlash(key)
}

function onStepInput(key: QuickKey, raw: string) {
  const parsed = parseFloat(raw)
  if (!isNaN(parsed) && parsed > 0) steps[key] = parsed
}

function triggerFlash(key: string) {
  flashKey.value = key
  setTimeout(() => {
    flashKey.value = null
  }, ADMIN_FIELD_FLASH_MS)
}

/** Ans nächste Kapitel der Leiter, ohne auszuzahlen — vom letzten wieder an den
 *  Anfang, sonst hätte der Knopf ab Kapitel VII keine Wirkung mehr. */
function jumpMissionChapter() {
  const current = MISSIONS[Math.min(missionStore.index, MISSIONS.length - 1)]?.chapter
  const i = MISSION_CHAPTERS.findIndex((c) => c.id === current)
  const next = MISSION_CHAPTERS[(i + 1) % MISSION_CHAPTERS.length]
  missionStore.adminJumpToChapter(next.id)
}

// ── Star Spawn ────────────────────────────────────────────────────────────────

function spawnStar() {
  starGroupStore.forceSpawnResourceStar()
}

// Springt ans Ende der aktuellen Galaxie: alle Rettungssterne gelten als
// gerettet, das Schiff steht am Galaxiekern und die komplette Boss-Mechanik
// (Bossstern + Eskorten-Wellen) startet sofort. Erneuter Klick setzt die
// Bossphase zurück und startet sie frisch — zum schnellen Testen.
function startBossPhase() {
  // Laufende Kämpfe schließen und alle aktiven Sterne samt Bossen entfernen
  starGroupStore.closeStarFightModal()
  for (const star of starGroupStore.activeStars) {
    for (const slot of star.planetSlots) planetBossStore.removeBoss(slot.planetId)
  }
  starGroupStore.clearAll()

  // Alle Rettungssterne der Galaxie gelten als gerettet (Minimap: ✦-Marker)
  galaxyStore.starsRescued = galaxyStore.starsRequired
  galaxyStore.attemptResults = Array.from(
    { length: galaxyStore.starsRequired },
    () => 'rescued' as const,
  )

  // Reise-/Rollenzustand beenden — das Schiff steht direkt am Galaxiekern
  galaxyStore.pendingRoleSelection = false
  galaxyStore.travelPendingAfterRotation = false
  galaxyStore.rescueRotationPhase = 'idle'
  galaxyStore.championTravelState = 'idle'
  galaxyStore.travelingToGalaxyBoss = false
  galaxyStore.resourceStarElapsedMs = 0
  galaxyStore.resourceStarNextIntervalMs = 0
  galaxyStore.pendingChampionStar = false
  galaxyStore.galaxyBossDefeated = false

  // Bossphase einleiten — wie tickChampionTravel bei der Kern-Ankunft.
  // Zuerst kommen die Eskorten-Wellen; der Bossstern erscheint als Finale
  // automatisch (useStarSystem-Watcher), sobald alle Eskorten besiegt sind.
  galaxyStore.initBossWave()
  galaxyStore.pendingGalaxyBoss = true
  galaxyStore.galaxyBossJustSpawned = true
  setTimeout(() => {
    galaxyStore.galaxyBossJustSpawned = false
  }, GALAXY_BOSS_SPAWN_ANIM_MS)
  starGroupStore.spawnBossEscortWave()
}

function forceCompleteGalaxy() {
  galaxyStore.starsRescued = galaxyStore.starsRequired
  // Ohne die Versuchsreihe trägt der Archiveintrag zu wenige ✦-Marker und der
  // Snapshot eine verkürzte Route — dieselbe Auffüllung wie in startBossPhase().
  galaxyStore.attemptResults = Array.from(
    { length: galaxyStore.starsRequired },
    () => 'rescued' as const,
  )
  galaxyStore.galaxyBossDefeated = true
  galaxyStore.pendingGalaxyBoss = false
  galaxyStore.bossEscortsDefeated = galaxyStore.bossEscortsTotal
  // Tier-Gate überspringen: ohne das würde die Minimap statt des
  // "» Next Galaxy «"-Buttons das TierUnlockPanel mit den Freischaltkosten
  // zeigen (requestTransition blockt bei nextTierLocked). Unbedingt anheben,
  // damit auch inkonsistente Spielstände (unlockedTier hinter currentTier)
  // sicher aufgelöst werden.
  galaxyStore.unlockedTier = Math.max(
    galaxyStore.unlockedTier,
    galaxyStore.currentTier,
    galaxyStore.nextTier,
  )
  // Reise-/Rollenzustände auflösen — pendingRoleSelection oder ein gespawnter
  // Champion pausieren sonst die Hintergrund-Animation (starsBackgroundPaused)
  // und die Warp-Animation des Next-Galaxy-Buttons würde nie starten.
  galaxyStore.pendingRoleSelection = false
  galaxyStore.travelPendingAfterRotation = false
  galaxyStore.rescueRotationPhase = 'idle'
  galaxyStore.championTravelState = 'idle'
}

function forcePrestige() {
  gameStore.prestigeAvailable = true
}

/** Öffnet das Offline-Fenster samt „The Crossing" mit vier Stunden Abwesenheit.
 *  Schließt ein offenes zuerst: `showOfflineModal` von true auf true ist keine
 *  Änderung, der Watcher im Wirt liefe nicht und die Runde bliebe stehen. */
async function triggerOfflineWindow() {
  gameStore.showOfflineModal = false
  await nextTick()
  openOfflineWindow(
    ADMIN_OFFLINE_WINDOW_HOURS * SECONDS_PER_HOUR,
    ADMIN_OFFLINE_WINDOW_MIN_CHIMES,
  )
}

function fillAllResources() {
  MATERIALS.forEach((m) => {
    inventoryStore.collectedMaterials[m.id] = ADMIN_FILL_MATERIAL_AMOUNT
  })
  gameStore.chimes += ADMIN_QUICK_RESOURCE_AMOUNT
  gameStore.meeps += ADMIN_QUICK_RESOURCE_AMOUNT
  battleStore.addAllRecruitableChampions()
}

// Reset Cooldowns lebt jetzt direkt über dem Command Panel
// (CommandPanelComponent.vue) — temporärer Admin-Knopf für schnelles Testen.
</script>

<template>
  <div
    class="admin-quick-actions"
    :class="dashboard ? 'admin-quick-actions--card' : 'px-5 py-3 admin-quick-actions--strip'"
  >
    <div v-if="dashboard" class="qa-card-header">
      <Icon icon="game-icons:lightning-arc" width="18" height="18" class="qa-card-icon" />
      <span class="qa-card-title">Quick Actions</span>
    </div>

    <div :class="{ 'qa-card-body': dashboard }">
    <div v-if="!dashboard" class="mb-2 admin-section-label">Quick Actions</div>

    <!-- Inline Editable Values + Stepper -->
    <div
      :class="
        dashboard
          ? 'qa-fields--dashboard'
          : 'grid grid-cols-2 mb-3 gap-x-3 gap-y-3 sm:grid-cols-4'
      "
    >
      <div
        v-for="qf in quickFields"
        :key="qf.key"
        class="admin-field-col"
        :class="{ 'admin-field-col--flash': flashKey === qf.key }"
      >
        <!-- Label -->
        <label class="admin-field-label">
          <Icon v-if="qf.icon.includes(':')" :icon="qf.icon" class="admin-field-icon" />
          <span v-else>{{ qf.icon }}</span> {{ qf.label }}
        </label>

        <!-- Value Stepper -->
        <div class="admin-stepper">
          <button
            class="admin-stepper-btn"
            :disabled="getValue(qf.key) <= qf.min"
            tabindex="-1"
            @click="stepValue(qf.key, -1)"
          >
            −
          </button>
          <input
            type="number"
            :min="qf.min"
            :value="editingKey === `qa_${qf.key}` ? editingValue : getValue(qf.key)"
            class="admin-stepper-input"
            @focus="startEditing(qf.key)"
            @input="editingValue = ($event.target as HTMLInputElement).value"
            @blur="commitEdit(qf.key)"
            @keydown="onKeydown($event, qf.key)"
          />
          <button class="admin-stepper-btn" tabindex="-1" @click="stepValue(qf.key, 1)">+</button>
        </div>

        <!-- Step Size Config -->
        <div class="admin-step-config">
          <span class="admin-step-label">±</span>
          <input
            type="number"
            :min="qf.float ? 0.01 : 1"
            :step="qf.float ? 0.01 : 1"
            :value="steps[qf.key]"
            class="admin-step-input"
            @change="onStepInput(qf.key, ($event.target as HTMLInputElement).value)"
            @blur="onStepInput(qf.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- Spawn / Action Buttons -->
    <div :class="dashboard ? 'qa-actions--dashboard' : 'flex flex-wrap gap-2'">
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="spawnStar"
      >
        <img src="/img/star-128.png" alt="★" class="star-icon" /> Spawn Star
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--material flex items-center gap-1.5 px-3 py-1.5"
        @click="fillAllResources"
      >
        <Icon icon="game-icons:diamond-hard" class="admin-btn-icon" /> +9999 Materials & Resources
      </button>
      <!-- Drifters live in AdminDrifterPanel now — every type spawns by name
           there, which the two buttons that used to sit here cannot do. -->
      <!-- Ein Vorzeichen-Trio sofort auslegen; ein laufendes wird dabei
           verworfen, sonst käme das Angebot gar nicht erst auf den Schirm. -->
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="omenStore.forceOffer()"
      >
        <Icon icon="game-icons:star-swirl" class="admin-btn-icon" /> Offer Omens
      </button>
      <!-- Offline-Fenster samt „The Crossing". Sonst nur über ein zurückdatiertes
           `savedAt` und einen Reload zu erreichen. -->
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="triggerOfflineWindow"
      >
        <Icon icon="game-icons:dungeon-gate" class="admin-btn-icon" /> Offline Window
      </button>
      <!-- Wayfinder. Einlösen zahlt sofort aus; nach „Reset Ladder" läuft die
           Leiter sich selbst ab, eine Stufe je Takt. -->
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="missionStore.adminClaimNow()"
      >
        <Icon icon="game-icons:direction-signs" class="admin-btn-icon" /> Claim Mission
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="jumpMissionChapter"
      >
        <Icon icon="game-icons:stairs-goal" class="admin-btn-icon" /> Next Chapter
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--neutral flex items-center gap-1.5 px-3 py-1.5"
        @click="missionStore.adminResetLadder()"
      >
        <Icon icon="game-icons:backward-time" class="admin-btn-icon" /> Reset Ladder
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy-boss flex items-center gap-1.5 px-3 py-1.5"
        @click="startBossPhase"
      >
        <Icon icon="game-icons:alien-bug" class="admin-btn-icon" /> Start Boss Phase
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--galaxy flex items-center gap-1.5 px-3 py-1.5"
        @click="forceCompleteGalaxy"
      >
        <Icon icon="game-icons:galaxy" class="admin-btn-icon" /> Complete Galaxy
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--prestige flex items-center gap-1.5 px-3 py-1.5"
        @click="forcePrestige"
      >
        <img src="/img/star-128.png" alt="★" class="star-icon" /> Force Prestige
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--champion flex items-center gap-1.5 px-3 py-1.5"
        @click="battleStore.unlockAllChampions()"
      >
        <Icon icon="game-icons:laurel-crown" class="admin-btn-icon" /> Unlock All Champions
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--nebula flex items-center gap-1.5 px-3 py-1.5"
        @click="triggerNebula()"
      >
        <Icon icon="game-icons:orbital-rays" class="admin-btn-icon" /> Trigger Nebula
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--team-fill flex items-center gap-1.5 px-3 py-1.5"
        @click="fillTeamWithRandomChampions"
      >
        <Icon icon="lucide:dices" class="admin-btn-icon" /> Random Team Fill
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--meep flex items-center gap-1.5 px-3 py-1.5"
        @click="meepTree.adminUnlockAll()"
      >
        <Icon icon="lucide:unlock" class="admin-btn-icon" /> Learn All Skills
      </button>
      <button
        class="admin-spawn-btn admin-spawn-btn--meep-reset flex items-center gap-1.5 px-3 py-1.5"
        @click="meepTree.adminResetAll()"
      >
        <Icon icon="lucide:rotate-ccw" class="admin-btn-icon" /> Unlearn All Skills
      </button>
      <!-- Rank Up lives on the battle landing page now (BattleLandingScreen.vue),
           right next to the rank band it manipulates. -->
    </div>
    </div>
  </div>
</template>

<style scoped>
.admin-quick-actions--strip {
  background: var(--rpg-bg-dark);
  border-bottom: 1px solid var(--rpg-wood-mid);
}

/* ── Dashboard-Karte (Inline-Admin-Tab) ──────────────────────────────────────── */

.admin-quick-actions--card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  overflow: hidden;
}

/* Header-Leiste im Stil von AdminCollapsiblePanel */
.qa-card-header {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  flex-shrink: 0;
  background: var(--rpg-bg-header);
  border-bottom: 2px solid var(--rpg-wood-mid);
  user-select: none;
}
.qa-card-icon {
  flex-shrink: 0;
  color: var(--rpg-gold-dim);
}
.qa-card-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-gold);
}

.qa-card-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 16px);
  padding: 12px;
}

.qa-fields--dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px 12px;
  flex-shrink: 0;
}

.qa-actions--dashboard {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: minmax(34px, 1fr);
  gap: 8px;
  /* Ventil statt abgeschnittener Knöpfe: die Karte selbst clippt (overflow:
     hidden), und unter ihrer Kante ist ein Knopf nicht mehr vorhanden. */
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
/* Buttons als Dashboard-Kacheln: Icon oben, Label darunter */
.qa-actions--dashboard .admin-spawn-btn {
  flex-direction: column;
  justify-content: center;
  gap: clamp(4px, 0.8vh, 10px);
  min-width: 0;
  padding: 8px;
  font-size: clamp(0.75rem, 1.3vh, 0.95rem);
  text-align: center;
}
.qa-actions--dashboard .admin-btn-icon,
.qa-actions--dashboard .star-icon {
  width: clamp(18px, 2.8vh, 30px);
  height: clamp(18px, 2.8vh, 30px);
}

/* Full HD und WUXGA: 14 Knöpfe in vier Spalten sind vier Reihen statt fünf, und
   die Kachel selbst wird flacher. Gemessen lief das Raster hier schon vor der
   Hero-Zeile um 56 px über — die letzten Knöpfe standen unter der Kartenkante. */
@media (max-height: 1100px) {
  .qa-actions--dashboard {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .qa-actions--dashboard .admin-spawn-btn {
    gap: 3px;
    padding: 4px 6px;
    font-size: 0.72rem;
  }
  .qa-actions--dashboard .admin-btn-icon,
  .qa-actions--dashboard .star-icon {
    width: 19px;
    height: 19px;
  }
  .qa-card-body {
    gap: 10px;
    padding: 10px;
  }
}

.admin-section-label {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* ── Field Column ─────────────────────────────────────────────────────────────── */

.admin-field-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: opacity 0.15s;
}

@keyframes admin-flash {
  0% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
.admin-field-col--flash {
  animation: admin-flash 0.28s ease-out forwards;
}

/* ── Label ───────────────────────────────────────────────────────────────────── */

.admin-field-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: #c89040;
}
.admin-btn-icon {
  width: 1rem;
  height: 1rem;
  color: #c89040;
}
.admin-field-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  color: var(--rpg-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  user-select: none;
}

/* ── Value Stepper ───────────────────────────────────────────────────────────── */

.admin-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  overflow: hidden;
}

.admin-stepper:focus-within {
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 0 2px #332810;
}

.admin-stepper-btn {
  flex: 0 0 1.625rem;
  height: 1.875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
  line-height: 1;
  transition:
    background 0.12s,
    color 0.12s;
  user-select: none;
}
.admin-stepper-btn:first-child {
  border-right: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:last-child {
  border-left: 1px solid var(--rpg-wood-mid);
}
.admin-stepper-btn:hover:not(:disabled) {
  background: #1e1a0e;
  color: var(--rpg-gold);
}
.admin-stepper-btn:active:not(:disabled) {
  background: #2a2410;
}
.admin-stepper-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.admin-stepper-input {
  flex: 1;
  min-width: 0;
  height: 1.875rem;
  background: var(--rpg-bg-deep);
  border: none;
  outline: none;
  padding: 0 0.25rem;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.875rem;
  color: var(--rpg-text);
  text-align: center;
}
.admin-stepper-input::-webkit-inner-spin-button,
.admin-stepper-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.admin-stepper-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Step Size Config ────────────────────────────────────────────────────────── */

.admin-step-config {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.admin-step-label {
  font-size: 0.625rem;
  color: var(--rpg-text-muted);
  user-select: none;
  flex-shrink: 0;
}

.admin-step-input {
  flex: 1;
  min-width: 0;
  height: 1.375rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--rpg-wood-mid) 60%, transparent);
  border-radius: 3px;
  outline: none;
  padding: 0 0.3rem;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.6875rem;
  color: var(--rpg-text-muted);
  text-align: right;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.admin-step-input:focus {
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-text);
}
.admin-step-input::-webkit-inner-spin-button,
.admin-step-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.admin-step-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* ── Spawn Buttons ───────────────────────────────────────────────────────────── */

.admin-spawn-btn {
  font-family: 'MedievalSharp', cursive;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-wood-mid);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.admin-spawn-btn--neutral {
  color: var(--rpg-text-muted);
  border-color: var(--rpg-btn-disabled-border);
}
.admin-spawn-btn--neutral:hover {
  background: #1e1c16;
  border-color: var(--rpg-text-muted);
  color: var(--rpg-text);
}
.admin-spawn-btn--material {
  color: var(--rpg-gold-dim);
  border-color: var(--rpg-wood-mid);
}
.admin-spawn-btn--material:hover {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}
.admin-spawn-btn--champion {
  color: var(--rpg-gold);
  border-color: var(--rpg-wood-mid);
}
.admin-spawn-btn--champion:hover {
  background: #1e1a10;
  border-color: var(--rpg-gold);
  color: var(--rpg-gold-bright);
}
.admin-spawn-btn--galaxy {
  color: #80c0e8;
  border-color: #1a2a3c;
}
.admin-spawn-btn--galaxy:hover {
  background: #101828;
  border-color: #4080b0;
  color: #a8d8f8;
}
.admin-spawn-btn--galaxy-boss {
  color: #d080ff;
  border-color: #3a1060;
}
.admin-spawn-btn--galaxy-boss:hover {
  background: #1a0830;
  border-color: #a040e0;
  color: #e8a0ff;
}
.admin-spawn-btn--prestige {
  background: linear-gradient(to bottom, #9060d0, #5030a0);
  border: 1px solid #b080e8;
  color: #e8d0ff;
}
.admin-spawn-btn--prestige:hover {
  background: linear-gradient(to bottom, #a070e0, #6040b0);
  border-color: #c898f0;
}
.admin-spawn-btn--nebula {
  color: #cc88ff;
  border-color: #3d1060;
  background: linear-gradient(to bottom, #1a0830, #0f0518);
}
.admin-spawn-btn--nebula:hover {
  background: linear-gradient(to bottom, #2a1048, #180828);
  border-color: #9944dd;
  color: #ee99ff;
}
/* Meep Skill Tree — dasselbe Magenta wie das Notify-Abzeichen an einem
   lernbaren Knoten (MeepSkillNode) und wie der Zähler am Tab. */
.admin-spawn-btn--meep {
  color: #f9a8d4;
  border-color: #5a1740;
  background: linear-gradient(to bottom, #2a0c1e, #180510);
}
.admin-spawn-btn--meep:hover {
  background: #3a1028;
  border-color: #ec4899;
}

.admin-spawn-btn--meep-reset {
  color: #cc6050;
  border-color: #5a221a;
}
.admin-spawn-btn--meep-reset:hover {
  background: #220f0c;
  border-color: #cc6050;
}

.admin-spawn-btn--travel {
  color: #40d8c0;
  border-color: #0a3028;
  background: linear-gradient(to bottom, #0a1e1a, #061410);
}
.admin-spawn-btn--travel:hover:not(:disabled) {
  background: linear-gradient(to bottom, #102e28, #0a1c18);
  border-color: #20a888;
  color: #60f0d8;
}
.admin-spawn-btn--team-fill {
  color: #60d8a0;
  border-color: #0a3020;
  background: linear-gradient(to bottom, #0a1e16, #061410);
}
.admin-spawn-btn--team-fill:hover {
  background: linear-gradient(to bottom, #102e22, #0a1c18);
  border-color: #20a870;
  color: #80f0c0;
}
.admin-spawn-btn--travel:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
