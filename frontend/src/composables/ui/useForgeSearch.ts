import { computed, ref, type ComputedRef, type Ref } from 'vue'
import {
  FORGE_AXIS_SEARCH_ALIAS,
  FORGE_FAMILY_LABEL,
  FORGE_SEARCH_RECENT_MAX,
  FORGE_SEARCH_STATE_CHIPS,
  FORGE_UPGRADE_TIER_LABELS,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_NODES } from '@/config/progression/starForge'
import { forgeNodeAxis } from '@/utils/game/solarSignature'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import type { ForgeAxisId, ForgeEffectFamily, ForgeUpgradeEntry } from '@/types'

/**
 * Die Suche über das Sternennetz — Freitext plus drei Facetten.
 *
 * Modulweiter Zustand wie `useForgeSpotlight`, und aus demselben Grund: Baum
 * links und Liste rechts sind zwei Bilder DESSELBEN Bestands, und die beiden
 * Leser sind keine Geschwister. Eine Suche, die nur eines von beiden filtert,
 * liesse den Spieler zweimal suchen.
 *
 * Kein Store, kein Spielstand: was gesucht wird, überlebt den Tab-Wechsel, aber
 * nicht den Reload — es ist eine Frage, kein Fortschritt.
 */

export type ForgeSearchStateId = (typeof FORGE_SEARCH_STATE_CHIPS)[number]['id']

export interface ForgeSearchChipCounts {
  axis: Record<string, number>
  family: Record<string, number>
  state: Record<string, number>
}

interface ForgeSearchRecord {
  id: string
  /** Kleingeschrieben, einmal gebaut. */
  haystack: string
  axis: ForgeAxisId | null
  family: ForgeEffectFamily | null
}

/**
 * Der Index wird EINMAL aus dem Katalog gebaut und nie wieder angefasst.
 *
 * Das ist die Trennung, die die Suche billig hält: Name, Wirkungssatz, Familie
 * und Achse ändern sich zur Laufzeit nie. Läge der Volltext an einem computed
 * über `upgradeEntries`, würfe ihn der 1-Sekunden-Tick jede Sekunde weg.
 */
function buildIndex(): ForgeSearchRecord[] {
  const axisById = new Map(SOLAR_BRANCHES.map((b) => [b.id as ForgeAxisId, b]))
  const out: ForgeSearchRecord[] = SOLAR_BRANCHES.map((b) => ({
    id: b.id,
    axis: b.id as ForgeAxisId,
    family: null,
    /* OHNE `statLabel`: `flightSpeed` heisst dort „CpS Mult." und wäre damit
       der erste Treffer für „cps". */
    haystack:
      `${b.name} ${FORGE_AXIS_SEARCH_ALIAS[b.id as ForgeAxisId]} ${FORGE_UPGRADE_TIER_LABELS.root}`.toLowerCase(),
  }))

  for (const node of FORGE_NODES) {
    const axis = forgeNodeAxis(node.id) ?? null
    const axisName = axis ? (axisById.get(axis)?.name ?? '') : ''
    const alias = axis ? FORGE_AXIS_SEARCH_ALIAS[axis] : ''
    out.push({
      id: node.id,
      axis,
      family: node.family,
      haystack:
        `${node.name} ${node.desc} ${FORGE_UPGRADE_TIER_LABELS[node.tier]} ${FORGE_FAMILY_LABEL[node.family]} ${axisName} ${alias}`.toLowerCase(),
    })
  }
  return out
}

let index: ForgeSearchRecord[] | null = null

function searchIndex(): ForgeSearchRecord[] {
  index ??= buildIndex()
  return index
}

const query = ref('')
const activeAxis = ref<ForgeAxisId | null>(null)
const activeFamily = ref<ForgeEffectFamily | null>(null)
const activeStates = ref<Set<ForgeSearchStateId>>(new Set())
const recent = ref<string[]>([])

const normalizedQuery = computed(() => query.value.toLowerCase().trim())

const searchActive = computed(
  () =>
    normalizedQuery.value !== '' ||
    activeAxis.value !== null ||
    activeFamily.value !== null ||
    activeStates.value.size > 0,
)

const facetActive = computed(
  () => activeAxis.value !== null || activeFamily.value !== null || activeStates.value.size > 0,
)

interface ForgeSearchFilter {
  q: string
  axis: ForgeAxisId | null
  family: ForgeEffectFamily | null
  states: Set<ForgeSearchStateId>
}

function matchesState(
  id: string,
  states: Set<ForgeSearchStateId>,
  entries: Map<string, ForgeUpgradeEntry>,
): boolean {
  if (states.size === 0) return true
  const entry = entries.get(id)
  if (!entry) return false
  if (states.has('ready') && entry.canBuy) return true
  if (states.has('locked') && entry.state === 'locked') return true
  if (states.has('maxed') && entry.state === 'maxed') return true
  return false
}

function matches(
  rec: ForgeSearchRecord,
  f: ForgeSearchFilter,
  entries: Map<string, ForgeUpgradeEntry>,
): boolean {
  if (f.q !== '' && !rec.haystack.includes(f.q)) return false
  if (f.axis !== null && rec.axis !== f.axis) return false
  if (f.family !== null && rec.family !== f.family) return false
  return matchesState(rec.id, f.states, entries)
}

interface ForgeSearchDerived {
  matchIds: ComputedRef<Set<string>>
  chipCounts: ComputedRef<ForgeSearchChipCounts>
}

let derived: ForgeSearchDerived | null = null

/* Die Live-Bindung an die Stores entsteht beim ERSTEN Aufruf und wird
   festgehalten: `useForgeUpgrades()` je Leser noch einmal aufzurufen rechnete
   `upgradeEntries` über alle 155 Knoten ein zweites Mal. */
function ensureDerived(): ForgeSearchDerived {
  if (derived) return derived
  const { entryById } = useForgeUpgrades()

  const currentFilter = (): ForgeSearchFilter => ({
    q: normalizedQuery.value,
    axis: activeAxis.value,
    family: activeFamily.value,
    states: activeStates.value,
  })

  const matchIds = computed(() => {
    const records = searchIndex()
    if (!searchActive.value) return new Set(records.map((r) => r.id))
    const f = currentFilter()
    const entries = entryById.value
    const out = new Set<string>()
    for (const rec of records) if (matches(rec, f, entries)) out.add(rec.id)
    return out
  })

  /* Jede Zahl beantwortet „wie viele blieben, wenn ich DIESEN Chip setze" — die
     eigene Facette wird dafür ersetzt, die anderen bleiben stehen. */
  const chipCounts = computed<ForgeSearchChipCounts>(() => {
    const records = searchIndex()
    const entries = entryById.value
    const base = currentFilter()
    const count = (f: ForgeSearchFilter): number => {
      let n = 0
      for (const rec of records) if (matches(rec, f, entries)) n++
      return n
    }
    const axis: Record<string, number> = {}
    for (const b of SOLAR_BRANCHES) axis[b.id] = count({ ...base, axis: b.id as ForgeAxisId })
    const family: Record<string, number> = {}
    for (const key of Object.keys(FORGE_FAMILY_LABEL) as ForgeEffectFamily[]) {
      family[key] = count({ ...base, family: key })
    }
    const state: Record<string, number> = {}
    for (const chip of FORGE_SEARCH_STATE_CHIPS) {
      state[chip.id] = count({ ...base, states: new Set([chip.id]) })
    }
    return { axis, family, state }
  })

  derived = { matchIds, chipCounts }
  return derived
}

export function useForgeSearch(): {
  query: Ref<string>
  normalizedQuery: ComputedRef<string>
  activeAxis: Readonly<Ref<ForgeAxisId | null>>
  activeFamily: Readonly<Ref<ForgeEffectFamily | null>>
  activeStates: Readonly<Ref<Set<ForgeSearchStateId>>>
  recent: Readonly<Ref<string[]>>
  searchActive: ComputedRef<boolean>
  facetActive: ComputedRef<boolean>
  matchIds: ComputedRef<Set<string>>
  matchCount: ComputedRef<number>
  totalCount: number
  chipCounts: ComputedRef<ForgeSearchChipCounts>
  setQuery: (value: string) => void
  toggleAxis: (id: ForgeAxisId) => void
  toggleFamily: (id: ForgeEffectFamily) => void
  toggleState: (id: ForgeSearchStateId) => void
  commitRecent: () => void
  clearSearch: () => void
  resetForgeSearch: () => void
} {
  const { matchIds, chipCounts } = ensureDerived()

  function setQuery(value: string): void {
    query.value = value
  }

  function toggleAxis(id: ForgeAxisId): void {
    activeAxis.value = activeAxis.value === id ? null : id
  }

  function toggleFamily(id: ForgeEffectFamily): void {
    activeFamily.value = activeFamily.value === id ? null : id
  }

  function toggleState(id: ForgeSearchStateId): void {
    const next = new Set(activeStates.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    activeStates.value = next
  }

  /** Beim Verlassen des Feldes, nicht bei jedem Tastendruck — sonst stünde jede
   *  Vorstufe eines Wortes in der Liste. */
  function commitRecent(): void {
    const q = query.value.trim()
    if (q === '') return
    const next = [q, ...recent.value.filter((entry) => entry.toLowerCase() !== q.toLowerCase())]
    recent.value = next.slice(0, FORGE_SEARCH_RECENT_MAX)
  }

  function clearSearch(): void {
    query.value = ''
    activeAxis.value = null
    activeFamily.value = null
    activeStates.value = new Set()
  }

  /* Löst auch die Store-Bindung: sie hängt an EINER Pinia, und ein Test, der
     eine neue aufsetzt, bekäme sonst die Einträge der vorigen zurück. */
  function resetForgeSearch(): void {
    clearSearch()
    recent.value = []
    derived = null
  }

  return {
    query,
    normalizedQuery,
    activeAxis,
    activeFamily,
    activeStates,
    recent,
    searchActive,
    facetActive,
    matchIds,
    matchCount: computed(() => matchIds.value.size),
    totalCount: searchIndex().length,
    chipCounts,
    setQuery,
    toggleAxis,
    toggleFamily,
    toggleState,
    commitRecent,
    clearSearch,
    resetForgeSearch,
  }
}
