import { describe, it, expect } from 'vitest'
import { DRIFTERS, DRIFTER_FX_STAGES, drifterFxStage } from '@/config/world/drifters'
import {
  DRIFTER_RARITY_ORDER,
  DRIFTER_ORNAMENT_MIN_SIZE,
  DRIFTER_AURA_SHELL_SCALES,
  DRIFTER_AURA_SHELL_ALPHAS,
} from '@/config/constants'
import type { DrifterRarity } from '@/types'

/**
 * The rank axis of a flying drifter.
 *
 * This spec exists because the property it guards is invisible in a diff: the
 * escalation lives in a table of numbers, and nothing in the type system stops
 * somebody from making `rare` louder than `legendary` while tuning a single
 * row. Before this table there WAS no rank axis — the only rarity-dependent
 * value in flight was an aura alpha, and escalation ran along the type axis
 * instead, backwards: the rare Coronal Surge carried seven running animations,
 * the legendary Star Leviathan five.
 */

/** Rarities from cheapest to richest, straight off the spawn ordering. */
const BY_RANK = (Object.keys(DRIFTER_RARITY_ORDER) as DrifterRarity[]).sort(
  (a, b) => DRIFTER_RARITY_ORDER[a] - DRIFTER_RARITY_ORDER[b],
)

describe('DRIFTER_FX_STAGES', () => {
  it('covers every rarity the spawn ordering knows, exactly once', () => {
    expect(BY_RANK.length).toBeGreaterThan(0)
    for (const rarity of BY_RANK) {
      expect(DRIFTER_FX_STAGES[rarity]).toBeDefined()
      // The row names itself — a copy-paste that forgets to change the key
      // would otherwise sit there looking correct.
      expect(DRIFTER_FX_STAGES[rarity].rarity).toBe(rarity)
    }
    expect(Object.keys(DRIFTER_FX_STAGES).sort()).toEqual([...BY_RANK].sort())
  })

  it('covers every rarity actually used by a drifter in the catalogue', () => {
    for (const def of DRIFTERS) {
      expect(drifterFxStage(def.rarity)).toBeDefined()
    }
  })

  it('never gets quieter as rank goes up', () => {
    // The whole point of the table: common is plain, legendary is loud. Every
    // continuous value climbs monotonically, and none of them may stall the
    // whole way — a column of identical numbers is a column that says nothing.
    const columns = ['auraAlpha', 'auraLayers', 'motion', 'motes', 'flow'] as const
    for (const key of columns) {
      const values = BY_RANK.map((r) => DRIFTER_FX_STAGES[r][key])
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
      }
      expect(values[values.length - 1]).toBeGreaterThan(values[0])
    }
  })

  it('never takes a feature away that a lower rank already had', () => {
    // Flags are cumulative: a stage adds one new layer, it never trades one in.
    const flags = ['rim', 'pulse', 'dust', 'ring', 'herald'] as const
    for (const key of flags) {
      let seen = false
      for (const rarity of BY_RANK) {
        const on = DRIFTER_FX_STAGES[rarity][key]
        if (seen) expect(on).toBe(true)
        if (on) seen = true
      }
      // Every flag has to be reached by SOMETHING, or it is dead config.
      expect(seen).toBe(true)
    }
  })

  it('gives every step at least one new layer over the one below it', () => {
    // What keeps the escalation legible: no rank may be a louder repeat of its
    // predecessor, it has to bring something that was not there before.
    const flags = ['rim', 'pulse', 'dust', 'ring', 'herald'] as const
    for (let i = 1; i < BY_RANK.length; i++) {
      const prev = DRIFTER_FX_STAGES[BY_RANK[i - 1]]
      const cur = DRIFTER_FX_STAGES[BY_RANK[i]]
      const newFlag = flags.some((k) => cur[k] && !prev[k])
      const newShell = cur.auraLayers > prev.auraLayers
      const newMotes = cur.motes > prev.motes
      const newFlow = cur.flow > prev.flow
      expect(newFlag || newShell || newMotes || newFlow).toBe(true)
    }
  })

  it('asks for no more aura shells than there are shells defined', () => {
    // The component clamps, but a stage asking for a fourth shell means the
    // table and the geometry have drifted apart, and the clamp would hide it.
    for (const rarity of BY_RANK) {
      expect(DRIFTER_FX_STAGES[rarity].auraLayers).toBeGreaterThanOrEqual(1)
      expect(DRIFTER_FX_STAGES[rarity].auraLayers).toBeLessThanOrEqual(
        DRIFTER_AURA_SHELL_SCALES.length,
      )
    }
    // The two shell tables are read in lockstep, index by index.
    expect(DRIFTER_AURA_SHELL_ALPHAS.length).toBe(DRIFTER_AURA_SHELL_SCALES.length)
  })

  it('keeps aura shells reaching further out and growing fainter', () => {
    // They have to read as ONE soft falloff. Equal alphas at growing radii
    // would read as concentric rings instead.
    for (let i = 1; i < DRIFTER_AURA_SHELL_SCALES.length; i++) {
      expect(DRIFTER_AURA_SHELL_SCALES[i]).toBeGreaterThan(DRIFTER_AURA_SHELL_SCALES[i - 1])
      expect(DRIFTER_AURA_SHELL_ALPHAS[i]).toBeLessThan(DRIFTER_AURA_SHELL_ALPHAS[i - 1])
    }
  })

  it('keeps motion above the floor the body divides by', () => {
    // DrifterBody divides every duration by this value. A zero would produce
    // an infinite duration, which reads as a frozen body rather than a calm one.
    for (const rarity of BY_RANK) {
      expect(DRIFTER_FX_STAGES[rarity].motion).toBeGreaterThan(0.2)
      expect(DRIFTER_FX_STAGES[rarity].motion).toBeLessThanOrEqual(1)
    }
  })
})

describe('ornament threshold', () => {
  it('lets every drifter that earned ornament actually show it', () => {
    // Performance rule 7 pairs rank with SIZE: a layer under two pixels is
    // invisible and still paid for. But the pairing must not silently mute a
    // body that the table says should be loud — if a type ever ends up below
    // the threshold while carrying flags, that is a balance decision, not an
    // accident, and it should have to be made here.
    for (const def of DRIFTERS) {
      const stage = drifterFxStage(def.rarity)
      const wantsOrnament =
        stage.ring || stage.dust || stage.motes > 0 || stage.flow > 0 || stage.auraLayers > 1
      if (!wantsOrnament) continue
      expect(
        def.sizePx,
        `${def.id} (${def.rarity}) is too small to show the ornament its rank grants`,
      ).toBeGreaterThanOrEqual(DRIFTER_ORNAMENT_MIN_SIZE)
    }
  })
})
