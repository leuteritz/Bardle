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
  MEEP_TREE_EFFECT_ROWS,
  MEEP_TREE_TOTAL_COST,
  SKILL_TREE_ASIDE_WIDTH,
} from '@/config/constants'
import { formatMeepEffect } from '@/utils/game/meepTreeFx'
import { formatNumberCompact } from '@/config/ui/numberFormat'

const props = defineProps<{ nodeId: string | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()
const { showToast } = useActionToast()

/**
 * Die Spalte scrollt. Ohne das hier bliebe sie beim Wechsel auf einen anderen
 * Knoten — oder zurück auf die allgemeine Ansicht — mitten im vorigen Text
 * stehen, und die neue Seite begänne unsichtbar oberhalb.
 */
const rootEl = ref<HTMLElement | null>(null)

watch(
  () => props.nodeId,
  () => rootEl.value?.scrollTo({ top: 0 }),
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

function buy(): void {
  const n = node.value
  if (!n || !canBuy.value) return
  if (meepTree.buyNode(n.id)) showToast(`${n.name} learned!`, 'perk')
}
</script>

<template>
  <aside ref="rootEl" class="msd-root" :style="{ width: `${SKILL_TREE_ASIDE_WIDTH}px` }">
    <!-- Der Wechsel läuft über EINEN Wrapper mit `mode="out-in"`, gekeyt auf die
         Knoten-ID: so blendet auch Knoten → Knoten über, und es steht nie mehr
         als ein Zustand in der Spalte — sonst spränge die Bilanz unten, die per
         `margin-top: auto` am Rand hängt. -->
    <Transition name="msd-swap" mode="out-in">
      <div :key="node?.id ?? 'empty'" class="msd-view">
        <!-- Nichts gewählt: die Bühne bedienen, nicht ins Leere starren -->
        <div v-if="!node || !branch" class="msd-empty">
          <Icon icon="game-icons:orbital" width="40" height="40" class="msd-empty__icon" />
          <p class="msd-empty__title">Pick a skill</p>
          <p class="msd-empty__hint">
            Choose any node on the orbit to see what it changes before you spend a single meep.
          </p>
          <div v-if="suggestions.length > 0" class="msd-suggest">
            <span class="msd-section">Next worth taking</span>
            <button
              v-for="s in suggestions"
              :key="s.node.id"
              class="msd-suggest-row"
              :style="{ '--branch-color': s.branch.color }"
              @click="emit('select', s.node.id)"
            >
              <Icon :icon="s.node.icon" width="20" height="20" class="msd-suggest-row__icon" />
              <span class="msd-suggest-row__name">{{ s.node.name }}</span>
              <span class="msd-suggest-row__cost">
                <img :src="MEEP_TREE_BADGE_ICON" alt="" class="msd-meep-icon" />
                {{ s.node.cost }}
              </span>
            </button>
          </div>
        </div>

        <template v-else>
          <!-- ── Kopf ── -->
          <header class="msd-hero" :style="{ '--branch-color': branch.color }">
            <div class="msd-hero__glyph">
              <Icon :icon="node.icon" width="34" height="34" />
            </div>
            <div class="msd-hero__text">
              <span class="msd-hero__branch">
                {{ branch.name }} · Rank {{ branchRank }} of {{ MEEP_TREE_TIERS_PER_BRANCH }}
              </span>
              <h3 class="msd-hero__name">{{ node.name }}</h3>
              <span class="msd-hero__effect">{{ node.effect }}</span>
            </div>
          </header>

          <p class="msd-flavour">{{ node.desc }}</p>

          <!-- ── Gabel ── -->
          <div
            v-if="rivals.length > 0"
            class="msd-fork"
            :class="{ 'msd-fork--sealed': state === 'blocked' }"
          >
            <Icon icon="game-icons:path-distance" width="18" height="18" />
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
          <section class="msd-block">
            <span class="msd-section">What it changes</span>
            <div v-for="c in changes" :key="c.key" class="msd-change">
              <span class="msd-change__label">{{ c.label }}</span>
              <span class="msd-change__values">
                <span class="msd-change__from">{{ c.from }}</span>
                <span class="msd-change__arrow">→</span>
                <span class="msd-change__to" :class="c.good ? 'is-good' : 'is-bad'">{{ c.to }}</span>
              </span>
            </div>
            <div v-if="tags.length > 0" class="msd-tags">
              <span v-for="t in tags" :key="t.label" class="msd-tag">
                <Icon :icon="t.icon" width="13" height="13" />
                {{ t.label }}
              </span>
            </div>
          </section>

          <!-- ── Weg dorthin ── -->
          <section v-if="prerequisites.length > 0" class="msd-block">
            <span class="msd-section">Still needed first</span>
            <button
              v-for="p in prerequisites"
              :key="p.id"
              class="msd-suggest-row"
              :style="{ '--branch-color': branch.color }"
              @click="emit('select', p.id)"
            >
              <Icon :icon="p.icon" width="20" height="20" class="msd-suggest-row__icon" />
              <span class="msd-suggest-row__name">{{ p.name }}</span>
              <span class="msd-suggest-row__cost">
                <img :src="MEEP_TREE_BADGE_ICON" alt="" class="msd-meep-icon" />
                {{ p.cost }}
              </span>
            </button>
          </section>
        </template>
      </div>
    </Transition>

    <!-- ── Bilanz ──
         Sie steht in BEIDEN Zuständen und immer am unteren Rand: seit die
         Kopfleiste über der Bühne weg ist, ist das die einzige Stelle, an der
         der Fortschritt des Baums als Zahl steht. -->
    <section class="msd-block msd-totals">
      <span class="msd-section">Tree totals</span>
      <div class="msd-total-row">
        <span>Skills learned</span>
        <span class="msd-total-row__val">
          {{ meepTree.boughtCount }} / {{ MEEP_TREE_PATH_NODES }}
        </span>
      </div>
      <div class="msd-total-row">
        <span>Meeps invested</span>
        <span class="msd-total-row__val">
          {{ formatNumberCompact(spentOnTree) }} / {{ formatNumberCompact(MEEP_TREE_TOTAL_COST) }}
        </span>
      </div>
      <div class="msd-total-row">
        <span>Meeps available</span>
        <span class="msd-total-row__val msd-total-row__val--held">
          <img :src="MEEP_TREE_BADGE_ICON" alt="" class="msd-meep-icon" />
          {{ formatNumberCompact(gameStore.meeps) }}
        </span>
      </div>
    </section>

    <!-- ── Fußzeile: hier und nur hier wird gekauft ──
         Sie steht bewusst AUSSERHALB des Wrappers oben, sonst rutschte sie über
         die Bilanz. Ihr Einblenden wartet um die Ausblendzeit des Wrappers, damit
         sie nicht vor der Seite auftaucht, zu der sie gehört. Beim Wechsel von
         Knoten zu Knoten bleibt sie stehen und tauscht nur ihren Text — der
         Lernknopf soll beim Durchklicken nicht blinken. -->
    <Transition name="msd-foot">
      <footer v-if="node" class="msd-buy">
        <div class="msd-buy__price" :class="{ 'is-short': state === 'reachable' }">
          <img :src="MEEP_TREE_BADGE_ICON" alt="Meeps" class="msd-meep-icon msd-meep-icon--big" />
          <span v-ink-center>{{ node.cost }}</span>
          <span v-if="pathCost !== null && pathCost > node.cost" class="msd-buy__path">
            · {{ pathCost }} with prerequisites
          </span>
        </div>
        <button
          v-if="state !== 'bought' && state !== 'blocked'"
          class="msd-buy__btn"
          :disabled="!canBuy"
          @click="buy"
        >
          {{ canBuy ? 'Learn skill' : `Need ${node.cost - gameStore.meeps} more` }}
        </button>
        <span v-else-if="state === 'bought'" class="msd-buy__done">✓ Learned</span>
        <span v-else class="msd-buy__sealed">Sealed</span>
      </footer>
    </Transition>
  </aside>
</template>

<style scoped>
/* Die Breite kommt inline aus `SKILL_TREE_ASIDE_WIDTH` — sie geht zugleich in
   den Design-Kasten des Tab-Roots ein, und zwei Zahlen dafür liefen still
   auseinander. */
.msd-root {
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  overflow-y: auto;
  background: #1a1008;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* Der Wrapper hält die Flex-Spalte, die die beiden Zustände vorher direkt von
   `.msd-root` geerbt haben. Er wächst NICHT — dadurch bleibt `.msd-totals` per
   `margin-top: auto` weiterhin am unteren Rand. */
.msd-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

/* Die Verzögerung entspricht der Ausblendzeit des Wrappers. */
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
  gap: 6px;
  padding-top: 34px;
  text-align: center;
}

.msd-empty__icon {
  color: var(--rpg-gold-dim);
  opacity: 0.6;
}

.msd-empty__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--rpg-gold);
}

.msd-empty__hint {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--rpg-text-muted);
  max-width: 260px;
}

.msd-suggest {
  width: 100%;
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: left;
}

/* ── Kopf ─────────────────────────────────────────────────── */
.msd-hero {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rpg-border-row);
}

.msd-hero__glyph {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--branch-color);
  border: 2px solid var(--branch-color);
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--branch-color) 22%, var(--rpg-bg-dark)),
    var(--rpg-bg-dark) 75%
  );
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--branch-color) 20%, transparent);
}

.msd-hero__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.msd-hero__branch {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

.msd-hero__name {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--rpg-text);
}

.msd-hero__effect {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--branch-color);
}

.msd-flavour {
  font-size: 0.8rem;
  line-height: 1.45;
  font-style: italic;
  color: var(--rpg-text-muted);
}

/* ── Gabel-Hinweis ────────────────────────────────────────── */
.msd-fork {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--bp-radius);
  border: 1px solid #5a3a7a;
  background: #1c1226;
  color: #c9a8e8;
  font-size: 0.76rem;
  line-height: 1.4;
}

.msd-fork--sealed {
  border-color: #4a3a2a;
  background: #1a1610;
  color: var(--rpg-text-muted);
}

.msd-fork strong {
  color: #e0c8f8;
  font-weight: 700;
}

.msd-fork--sealed strong {
  color: var(--rpg-text-dim);
}

/* ── Blöcke ───────────────────────────────────────────────── */
.msd-block {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.msd-section {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}

.msd-change {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--bp-radius);
  background: #1c1c18;
  font-size: 0.79rem;
}

.msd-change__label {
  color: var(--rpg-text-dim);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msd-change__values {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-weight: 700;
}

.msd-change__from {
  color: var(--rpg-text-muted);
}

.msd-change__arrow {
  color: var(--rpg-text-muted);
}

.msd-change__to.is-good {
  color: #7ad84a;
}

.msd-change__to.is-bad {
  color: #cc6050;
}

/* ── Kategorie-Chips ──────────────────────────────────────── */
.msd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.msd-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-icon);
  color: var(--rpg-text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.4;
}

/* ── Zeilen mit Sprungziel ────────────────────────────────── */
.msd-suggest-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 9px;
  border-radius: var(--bp-radius);
  border: 1px solid var(--rpg-border-row);
  background: #1c1c18;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.msd-suggest-row:hover {
  border-color: var(--branch-color);
  background: var(--rpg-bg-hover);
}

.msd-suggest-row__icon {
  flex-shrink: 0;
  color: var(--branch-color);
}

.msd-suggest-row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--rpg-text);
}

.msd-suggest-row__cost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--rpg-gold);
}

.msd-meep-icon {
  height: 15px;
  width: auto;
}

.msd-meep-icon--big {
  height: 22px;
}

/* ── Bilanz ───────────────────────────────────────────────── */
.msd-totals {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--rpg-border-row);
}

.msd-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--rpg-text-muted);
}

.msd-total-row__val {
  font-weight: 800;
  color: var(--rpg-gold);
}

/* Der Bestand steht mit Bild — er ist die Zahl, gegen die der Spieler den Preis
   in der Fusszeile hält, und hebt sich dadurch von den beiden Bilanzzeilen ab. */
.msd-total-row__val--held {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* ── Kauf-Fußzeile ────────────────────────────────────────── */
.msd-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--rpg-border-row);
}

.msd-buy__price {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--rpg-gold);
}

.msd-buy__price.is-short {
  color: var(--rpg-text-muted);
}

.msd-buy__path {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--rpg-text-muted);
}

.msd-buy__btn {
  padding: 7px 15px;
  border-radius: var(--bp-radius);
  border: 1px solid #6ec040;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;
}

.msd-buy__btn:hover:not(:disabled) {
  filter: brightness(1.15);
}

.msd-buy__btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.msd-buy__done {
  font-size: 0.88rem;
  font-weight: 700;
  color: #7ad84a;
}

.msd-buy__sealed {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
}
</style>
