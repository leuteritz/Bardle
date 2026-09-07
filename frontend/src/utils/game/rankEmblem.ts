import { RANK_EMBLEM_IMAGES, RANK_TIER_COLOR_FALLBACK, RANK_TIER_COLORS } from '@/config/constants'

// Emblem und Tierfarbe standen wortgleich in Scoreboard, Ladder und Herald —
// vier Kopien derselben Zeile laufen auseinander, sobald ein Tier dazukommt.

/** Das Emblem des Tiers; ein unbekanntes Tier faellt auf Iron zurueck. */
export function rankEmblemImage(tier: string): string {
  return RANK_EMBLEM_IMAGES[tier] ?? RANK_EMBLEM_IMAGES.Iron
}

/** Die Leuchtfarbe des Tiers. */
export function rankTierColor(tier: string): string {
  return RANK_TIER_COLORS[tier] ?? RANK_TIER_COLOR_FALLBACK
}
