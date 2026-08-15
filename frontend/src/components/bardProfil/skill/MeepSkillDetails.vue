<script setup lang="ts">
/**
 * Das Detail-Blatt neben der Orbit-Bühne.
 *
 * Sein Zweck ist eine einzige Frage: **was ändert sich, wenn ich das kaufe?**
 * Vorher stand die Antwort nur im nativen `title`-Tooltip als Fliesstext, und
 * der Kauf lag auf demselben Klick, mit dem man den Knoten ansah.
 *
 * Die Vorher/Nachher-Zeilen sind EXAKT, nicht geschätzt:
 * `cpsMult`/`cpcMult` tragen ein `liveStat` und skalieren einen bereits
 * gecachten Spielwert — weil der Faktor in `shopStore.calculateTotalCPS/CPC()`
 * multiplikativ eingeht, ist `Wert × Faktor` das echte Ergebnis. Alle übrigen
 * zeigen den gefalteten BAUM-Wert selbst; das ist der ehrliche Beitrag des
 * Baums und braucht keine Nachsimulation fremder Systeme.
 *
 * **Warum es hier fast kein eigenes Aussehen mehr gibt.** Die Fläche, der
 * Rahmen, die Karten, der Kostenblock und der Kaufknopf kommen aus derselben
 * Quelle wie die Forge-Spalte im Shop: die globalen `.fc-*`-Klassen in
 * `assets/rpg-theme.css`. Das Blatt ist die zweite Detail-Schiene des
 * Bard-Profils, nicht eine dritte Art von Oberfläche daneben — und was der
 * Shop an seiner Kartensprache ändert, gilt hier ohne Zutun mit. Scoped bleibt
 * nur, was der Baum als Einziger hat: Zweigfarbe, Gabel-Hinweis und Bilanz.
 */
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  MEEP_TREE_BADGE_ICON,
  MEEP_TREE_NODE_INDEX,
  MEEP_TREE_PATH_NODES,
  MEEP_TREE_TIERS_PER_BRANCH,
} from '@/config/progression/meepTree'
import {
  FORGE_DETAIL_ICON_SIZE,
  MEEP_TREE_EFFECT_ROWS,
  MEEP_TREE_TOTAL_COST,
} from '@/config/constants'
import { formatMeepEffect } from '@/utils/game/meepTreeFx'
import { formatNumberCompact } from '@/config/ui/numberFormat'

const props = defineProps<{ nodeId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()
const { showToast } = useActionToast()

/**
 * Der Körper scrollt. Ohne das hier bliebe er beim Wechsel auf einen anderen
 * Knoten — oder zurück auf die allgemeine Ansicht — mitten im vorigen Text
 * stehen, und die neue Seite begänne unsichtbar oberhalb.
 */
const bodyEl = ref<HTMLElement | null>(null)

watch(
  () => props.nodeId,
  () => bodyEl.value?.scrollTo({ top: 0 }),
)

const entry = computed(() => (props.nodeId ? MEEP_TREE_NODE_INDEX[props.nodeId] : undefined))
const node = computed(() => entry.value?.node ?? null)
const branch = computed(() => entry.value?.branch ?? null)
const state = computed(() => (props.nodeId ? meepTree.nodeState(props.nodeId) : null))

/* ── Was sich ändert ─────────────────────────────────────────────────────── */

const LIVE_VALUE = {
  chimesPerSecond: () => gameStore.chimesPerSecond,
  chimesPerClick: () => gameStore.chimesPerClick,
} as const

const UNIT = { chimesPerSecond: '/s', chimesPerClick: '' } as const

/**
 * Eine Zeile je Effektschlüssel des Knotens, in der Reihenfolge der Tabelle.
 * Neutral kann hier nichts sein — ein Knoten trägt nur Schlüssel, die er auch
 * bewegt.
 */
const changes = computed(() => {
  const n = node.value
  if (!n || !props.nodeId) return []
  const before = meepTree.fx as unknown as Record<string, number>
  const after = meepTree.previewFx(props.nodeId) as unknown as Record<string, number>

  return MEEP_TREE_EFFECT_ROWS.filter((row) => row.key in n.effects).map((row) => {
    if (row.liveStat) {
      // Der Faktor greift multiplikativ auf einen gecachten Wert — also ist
      // „aktuell × Zuwachs" der echte neue Wert, kein Näherungswert.
      const live = LIVE_VALUE[row.liveStat]()
      const grow = after[row.key] / (before[row.key] || 1)
      return {
        key: row.key,
        label: row.label,
        tag: row.tag,
        from: `${formatNumberCompact(live)}${UNIT[row.liveStat]}`,
        to: `${formatNumberCompact(live * grow)}${UNIT[row.liveStat]}`,
        good: grow > 1,
      }
    }
    const from = formatMeepEffect(row.kind, before[row.key])
    const to = formatMeepEffect(row.kind, after[row.key])
    return {
      key: row.key,
      label: row.label,
      tag: row.tag,
      from: from?.value ?? '—',
      to: to?.value ?? '—',
      // Bei `lower` ist kleiner besser — die Richtung steckt schon im `kind`.
      good: row.kind === 'lower' ? after[row.key] < before[row.key] : after[row.key] > before[row.key],
    }
  })
})

/** Ein Chip je berührtem System, ohne Wiederholung. */
const tags = computed(() => {
  const seen = new Set<string>()
  return changes.value
    .map((c) => c.tag)
    .filter((t) => (seen.has(t.label) ? false : (seen.add(t.label), true)))
})

/* ── Weg dorthin ─────────────────────────────────────────────────────────── */

const chain = computed(() => (props.nodeId ? meepTree.pathTo(props.nodeId) : null))

/** Was ausser dem Knoten selbst noch davor liegt. */
const prerequisites = computed(() =>
  (chain.value ?? [])
    .filter((id) => id !== props.nodeId)
    .map((id) => MEEP_TREE_NODE_INDEX[id]?.node)
    .filter((n): n is NonNullable<typeof n> => Boolean(n)),
)

const pathCost = computed(() => (props.nodeId ? meepTree.meepsToReach(props.nodeId) : null))

/** Das versiegelte Gegenstück — nur an einer Gabel besetzt. */
const rivals = computed(() =>
  (entry.value?.excl ?? [])
    .map((id) => MEEP_TREE_NODE_INDEX[id]?.node)
    .filter((n): n is NonNullable<typeof n> => Boolean(n)),
)

/* ── Vorschläge und Bilanz ───────────────────────────────────────────────── */

const suggestions = computed(() =>
  meepTree
    .suggestedNodeIds()
    .filter((id) => id !== props.nodeId)
    .map((id) => MEEP_TREE_NODE_INDEX[id])
    .filter((e): e is NonNullable<typeof e> => Boolean(e)),
)

const branchRank = computed(() => (node.value ? node.value.tier + 1 : 0))

const spentOnTree = computed(() =>
  meepTree.bought.reduce((sum, id) => sum + (MEEP_TREE_NODE_INDEX[id]?.node.cost ?? 0), 0),
)

/* ── Kauf ────────────────────────────────────────────────────────────────── */

const canBuy = computed(() => state.value === 'buyable')

/** Reicht der Bestand für DIESEN Knoten — unabhängig davon, ob er offen ist. */
const canAfford = computed(() => gameStore.meeps >= (node.value?.cost ?? 0))

/**
 * Ein gesperrter Knoten bekommt seinen eigenen Satz. Vorher stand dort
 * `Need ${cost - meeps} more`, und bei vollem Beutel und fehlender Vorbedingung
 * war das eine negative Zahl.
 */
const buyLabel = computed(() => {
  if (canBuy.value) return 'Learn skill'
  if (state.value === 'locked') return 'Prerequisites first'
  const missing = Math.max(0, (node.value?.cost ?? 0) - gameStore.meeps)
  return `Need ${formatNumberCompact(missing)} more`
})

function buy(): void {
  const n = node.value
  if (!n || !canBuy.value) return
  if (meepTree.buyNode(n.id)) showToast(`${n.name} learned!`, 'perk')
}
</script>

<template>
  <aside class="msd-root">
    <!-- Das Kopfband steht in BEIDEN Zuständen gleich da, damit der Wechsel
         Knoten ↔ leer nichts verschiebt. Der Bestand gehört hierher und nicht
         in die Bilanz unten: er ist die Zahl, gegen die der Preis in der
         Fusszeile gelesen wird. -->
    <header class="msd-head">
      <span class="msd-head-title">Meep Skill Tree</span>
      <span class="msd-head-held">
        <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msd-meep-icon msd-meep-icon--head" />
        <span class="fc-cost-gold">{{ formatNumberCompact(gameStore.meeps) }}</span>
      </span>
    </header>

    <div ref="bodyEl" class="msd-body">
      <!-- Der Wechsel läuft über EINEN Wrapper mit `mode="out-in"`, gekeyt auf
           die Knoten-ID: so blendet auch Knoten → Knoten über, und es steht nie
           mehr als ein Zustand in der Spalte. -->
      <Transition name="msd-swap" mode="out-in">
        <div :key="node?.id ?? 'empty'" class="msd-view">
          <!-- Nichts gewählt: die Bühne bedienen, nicht ins Leere starren -->
          <div v-if="!node || !branch" class="msd-empty">
            <Icon icon="game-icons:orbital" width="40" height="40" class="msd-empty__icon" />
            <p class="msd-empty__title">Pick a skill</p>
            <p class="msd-empty__hint">
              Choose any node on the orbit to see what it changes before you spend a single meep.
            </p>

            <section v-if="suggestions.length > 0" class="msd-block msd-suggest">
              <header class="msd-section">
                <span class="msd-section-title">Next worth taking</span>
              </header>
              <button
                v-for="s in suggestions"
                :key="s.node.id"
                class="fc-row msd-jump"
                :style="{ '--branch-color': s.branch.color }"
                @click="emit('select', s.node.id)"
              >
                <Icon :icon="s.node.icon" width="27" height="27" class="msd-jump__icon" />
                <span class="fc-row-body">
                  <span class="fc-row-name">{{ s.node.name }}</span>
                  <span class="fc-row-meta">{{ s.branch.name }}</span>
                </span>
                <span class="fc-row-num msd-jump__cost">
                  <img :src="MEEP_TREE_BADGE_ICON" alt="" class="msd-meep-icon" />
                  {{ s.node.cost }}
                </span>
              </button>
            </section>
          </div>

          <template v-else>
            <!-- ── Identität ── -->
            <header class="msd-id" :style="{ '--node-c': branch.color }">
              <div class="fc-ico">
                <Icon
                  :icon="node.icon"
                  :width="FORGE_DETAIL_ICON_SIZE"
                  :height="FORGE_DETAIL_ICON_SIZE"
                  :style="{ color: branch.color }"
                />
              </div>
              <div class="msd-id-text">
                <span class="msd-id-branch">
                  {{ branch.name }} · Rank {{ branchRank }} of {{ MEEP_TREE_TIERS_PER_BRANCH }}
                </span>
                <h3 class="fc-name msd-id-name" :style="{ color: branch.color }">{{ node.name }}</h3>
                <span class="msd-id-effect" :style="{ color: branch.color }">{{ node.effect }}</span>
              </div>
            </header>

            <p class="fc-desc">{{ node.desc }}</p>

            <!-- ── Gabel ── -->
            <div
              v-if="rivals.length > 0"
              class="msd-fork"
              :class="{ 'msd-fork--sealed': state === 'blocked' }"
            >
              <Icon icon="game-icons:path-distance" width="20" height="20" class="msd-fork__icon" />
              <p v-if="state === 'blocked'">
                Sealed — you took <strong>{{ rivals.map((r) => r.name).join(', ') }}</strong> at this
                rank. The choice holds for this universe.
              </p>
              <p v-else>
                A choice: learning this seals
                <strong>{{ rivals.map((r) => r.name).join(', ') }}</strong> for good. Rank
                {{ MEEP_TREE_TIERS_PER_BRANCH }} opens either way.
              </p>
            </div>

            <!-- ── Wirkung ── -->
            <section class="msd-block" :style="{ '--group-c': branch.color }">
              <header class="msd-section">
                <span class="msd-section-title">What it changes</span>
              </header>
              <div class="msd-changes">
                <div v-for="c in changes" :key="c.key" class="msd-change">
                  <span class="msd-change__label">{{ c.label }}</span>
                  <span class="fc-delta-value">{{ c.from }}</span>
                  <span class="fc-delta-arrow">→</span>
                  <span
                    class="fc-delta-value fc-delta-value--next"
                    :class="{ 'msd-change__to--bad': !c.good }"
                  >
                    {{ c.to }}
                  </span>
                </div>
              </div>
              <div v-if="tags.length > 0" class="msd-tags">
                <span
                  v-for="t in tags"
                  :key="t.label"
                  class="fc-chip msd-tag"
                  :style="{ '--chip-c': branch.color }"
                >
                  <Icon :icon="t.icon" width="14" height="14" />
                  {{ t.label }}
                </span>
              </div>
            </section>

            <!-- ── Weg dorthin ── -->
            <section
              v-if="prerequisites.length > 0"
              class="msd-block"
              :style="{ '--group-c': branch.color }"
            >
              <header class="msd-section">
                <span class="msd-section-title">Still needed first</span>
              </header>
              <button
                v-for="p in prerequisites"
                :key="p.id"
                class="fc-row msd-jump"
                :style="{ '--branch-color': branch.color }"
                @click="emit('select', p.id)"
              >
                <Icon :icon="p.icon" width="27" height="27" class="msd-jump__icon" />
                <span class="fc-row-body">
                  <span class="fc-row-name">{{ p.name }}</span>
                </span>
                <span class="fc-row-num msd-jump__cost">
                  <img :src="MEEP_TREE_BADGE_ICON" alt="" class="msd-meep-icon" />
                  {{ p.cost }}
                </span>
              </button>
            </section>
          </template>
        </div>
      </Transition>
    </div>

    <!-- ── Bilanz ──
         Sie steht in BEIDEN Zuständen und ausserhalb des Scrollbereichs: seit
         die Kopfleiste über der Bühne weg ist, ist das die einzige Stelle, an
         der der Fortschritt des Baums als Zahl steht. -->
    <section class="msd-totals">
      <div class="msd-total-row">
        <span class="msd-total-row__label">Skills learned</span>
        <span class="msd-total-row__val">
          {{ meepTree.boughtCount }} / {{ MEEP_TREE_PATH_NODES }}
        </span>
      </div>
      <div class="msd-total-row">
        <span class="msd-total-row__label">Meeps invested</span>
        <span class="msd-total-row__val">
          {{ formatNumberCompact(spentOnTree) }} / {{ formatNumberCompact(MEEP_TREE_TOTAL_COST) }}
        </span>
      </div>
    </section>

    <!-- ── Fusszeile: hier und nur hier wird gekauft ──
         Ihr Einblenden wartet um die Ausblendzeit des Körpers, damit sie nicht
         vor der Seite auftaucht, zu der sie gehört. Beim Wechsel von Knoten zu
         Knoten bleibt sie stehen und tauscht nur ihren Text — der Lernknopf soll
         beim Durchklicken nicht blinken. -->
    <Transition name="msd-foot">
      <footer v-if="node" class="msd-foot">
        <!-- „habe / brauche" statt einer nackten Zahl, mit der goldenen
             Linkskante, die bei Mangel auf Rot kippt, und ✓/✕ als
             Zweitkodierung — die Kostensemantik des Shops, unverändert. -->
        <div class="fc-cost" :class="{ 'fc-cost--short': !canAfford }">
          <span class="fc-cost-label">Cost</span>
          <div class="fc-cost-row">
            <span class="fc-cost-pair" :class="{ 'fc-cost-pair--missing': !canAfford }">
              <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="fc-cost-img" />
              <span class="fc-cost-qty">
                {{ formatNumberCompact(gameStore.meeps)
                }}<span class="fc-cost-need">/{{ node.cost }}</span>
              </span>
              <span class="fc-cost-state" aria-hidden="true">{{ canAfford ? '✓' : '✕' }}</span>
            </span>
            <span v-if="pathCost !== null && pathCost > node.cost" class="msd-path">
              {{ pathCost }} with prerequisites
            </span>
          </div>
        </div>

        <button
          v-if="state !== 'bought' && state !== 'blocked'"
          class="fc-act"
          :disabled="!canBuy"
          @click="buy"
        >
          {{ buyLabel }}
        </button>
        <span v-else-if="state === 'bought'" class="msd-state msd-state--done">✦ Learned</span>
        <span v-else class="msd-state msd-state--sealed">✦ Sealed</span>
      </footer>
    </Transition>
  </aside>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   SCHIENE
   Dieselbe Fläche und dieselbe Naht wie die Forge-Spalte im Shop (.sf-panel):
   eine Detail-Schiene im Bard-Profil ist EINE Art von Ort, nicht eine je Reiter.
   Die Breite kommt von aussen (`SkillTreeComponent`), damit beide Reiter
   dieselbe Zahl lesen.
══════════════════════════════════════════════════ */
.msd-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
  border-left: 2px solid #5c3310;
}

/* ── Kopfband ─────────────────────────────────────────────── */
.msd-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

.msd-head-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #c89040;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msd-head-held {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

/* ── Körper ───────────────────────────────────────────────── */
.msd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 13px 18px 18px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.msd-body::-webkit-scrollbar {
  width: 4px;
}

.msd-body::-webkit-scrollbar-track {
  background: #111;
}

.msd-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.msd-view {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

/* Karten mit `overflow: hidden` würde die Flex-Spalte sonst zu Streifen
   zusammendrücken — dieselbe Klammer wie `.sf-body > *` im Shop. */
.msd-view > * {
  flex-shrink: 0;
}

/* Nur `opacity` und `transform` — der Wechsel darf nichts rastern. */
.msd-swap-enter-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.msd-swap-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.msd-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.msd-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Die Verzögerung entspricht der Ausblendzeit des Körpers. */
.msd-foot-enter-active {
  transition: opacity 0.16s ease 0.12s;
}

.msd-foot-leave-active {
  transition: opacity 0.12s ease;
}

.msd-foot-enter-from,
.msd-foot-leave-to {
  opacity: 0;
}

/* ── Leerzustand ──────────────────────────────────────────── */
.msd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 26px;
  text-align: center;
}

.msd-empty__icon {
  color: #c89040;
  opacity: 0.6;
}

.msd-empty__title {
  font-size: 19px;
  font-weight: 900;
  color: #e8c040;
}

.msd-empty__hint {
  max-width: 300px;
  font-size: 14.5px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}

.msd-suggest {
  width: 100%;
  margin-top: 20px;
  text-align: left;
}

/* ── Abschnitte ───────────────────────────────────────────────
   Derselbe Strich wie über den Töpfen der Shop-Liste (.fu-head): getönt an der
   Kante, nach rechts auslaufend. Hier trägt er die Zweigfarbe. */
.msd-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msd-section {
  position: relative;
  display: flex;
  align-items: baseline;
  padding: 2px 2px 8px;
}

.msd-section::after {
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

.msd-section-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--group-c, #c89040);
  white-space: nowrap;
}

/* ── Identität ────────────────────────────────────────────────
   Die Icon-Box ist die eckige `.fc-ico` des Shops, nicht der frühere runde
   Ring: der Shop steht vor derselben Frage — sein Baum zeichnet ebenfalls
   Kreise — und beantwortet sie so. */
.msd-id {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 12px;
  border-bottom: 2px solid #3e200a;
}

.msd-id-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msd-id-branch {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  line-height: 1;
}

.msd-id-name {
  line-height: 1.1;
}

.msd-id-effect {
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.25;
}

/* ── Gabel-Hinweis ────────────────────────────────────────────
   Das Lila ist im Profil schon als Buff-Farbe gesetzt (`.blessing-chip` im
   Shop) — es bleibt, nur die Schrift wächst auf Schienenmass. */
.msd-fork {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 4px;
  border: 1px solid #5a3a7a;
  background: #1c1226;
  color: #c9a8e8;
  font-size: 13.5px;
  line-height: 1.5;
}

.msd-fork__icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.msd-fork--sealed {
  border-color: #4a3a2a;
  background: #1a1610;
  color: rgba(232, 220, 192, 0.55);
}

.msd-fork strong {
  color: #e0c8f8;
  font-weight: 900;
}

.msd-fork--sealed strong {
  color: rgba(232, 220, 192, 0.8);
}

/* ── Vorher → Nachher ─────────────────────────────────────────
   EIN Kasten im Rezept des Shop-Deltas (#141410 auf #32210c), nicht eine Kachel
   je Zeile: bei drei Effekten lasen sich drei gleich aussehende Kästen
   untereinander als ein einziger. */
.msd-changes {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px 14px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.msd-change {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Gibt als Erstes nach, wenn die Schiene eng wird — die Zahlen rechts sind die
   Aussage, der Name links ist die Beschriftung dazu. */
.msd-change__label {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Wo es SCHLECHTER wird, trägt dieselbe Marke die Warnfarbe — die Form bleibt,
   damit das Auge die Zielspalte nicht neu suchen muss. */
.msd-change__to--bad {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.12);
  border-color: rgba(204, 96, 80, 0.35);
}

/* ── Kategorie-Chips ──────────────────────────────────────── */
.msd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.msd-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-transform: uppercase;
}

/* ── Zeilen mit Sprungziel ────────────────────────────────── */
.msd-jump {
  width: 100%;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.msd-jump:hover {
  border-color: var(--branch-color, #7a4e20);
}

.msd-jump__icon {
  flex-shrink: 0;
  color: var(--branch-color, #c89040);
}

.msd-jump__cost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #e8c040;
}

.msd-meep-icon {
  height: 18px;
  width: auto;
}

.msd-meep-icon--head {
  height: 22px;
}

/* ── Bilanz ───────────────────────────────────────────────── */
.msd-totals {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 18px;
  background: #141410;
  border-top: 1px solid #2a1a08;
}

.msd-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.msd-total-row__label {
  font-size: 13.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
}

.msd-total-row__val {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

/* ── Kauf-Fusszeile ───────────────────────────────────────── */
.msd-foot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 18px 16px;
  background: #111008;
  border-top: 2px solid #3e200a;
}

.msd-path {
  font-size: 13px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.55);
  font-variant-numeric: tabular-nums;
}

/* Steht anstelle des Knopfes, wo nichts mehr zu entscheiden ist — auf dessen
   Höhe, damit die Fusszeile beim Durchklicken nicht springt. */
.msd-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 13px 16px;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.msd-state--done {
  color: rgba(160, 255, 160, 0.75);
  background: rgba(82, 184, 48, 0.12);
  border: 1px solid rgba(82, 184, 48, 0.45);
}

.msd-state--sealed {
  color: rgba(232, 220, 192, 0.45);
  background: #1a1610;
  border: 1px solid #3a2a12;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
   Greift überhaupt erst, seit die Schiene nicht mehr im Skalierkasten der
   Bühne hängt; die Werte sind die des Shops.
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .msd-head {
    padding: 9px 15px;
  }

  .msd-body {
    padding: 11px 15px 15px;
  }

  .msd-view {
    gap: 11px;
  }

  .msd-id {
    gap: 12px;
    padding-bottom: 10px;
  }

  .msd-id-name {
    font-size: 17.5px;
  }

  .msd-empty {
    padding-top: 18px;
  }

  .msd-empty__hint,
  .msd-fork {
    font-size: 14px;
    line-height: 1.5;
  }

  .msd-changes {
    gap: 7px;
    padding: 9px 12px;
  }

  .msd-totals {
    padding: 10px 15px;
  }

  .msd-foot {
    gap: 10px;
    padding: 11px 15px 13px;
  }

  /* Zieht mit `.fc-act` mit, das im Kompaktblock auf 11px zurückgeht — sonst
     rutscht die ganze Fusszeile um 4px hoch, sobald ein gelernter Knoten den
     Knopf durch den Streifen ersetzt (gemessen 873 → 869). */
  .msd-state {
    padding: 11px 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msd-swap-enter-active,
  .msd-swap-leave-active,
  .msd-foot-enter-active,
  .msd-foot-leave-active {
    transition: none;
  }
}
</style>
