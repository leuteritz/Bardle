import type { StatCategoryDef } from '@/types'

/**
 * Static metadata of the Bard-Stats catalog categories (Journey column).
 *
 * Order here IS the render order of the accordion. The accent drives the header
 * rail, the count badge and the highlight values of that section.
 */
export const STAT_CATEGORIES: StatCategoryDef[] = [
  {
    id: 'progression',
    label: 'Progression',
    blurb: 'Levels, skill points and prestige runs',
    icon: 'game-icons:progression',
    accent: '#e8c040',
  },
  {
    id: 'economy',
    label: 'Economy',
    blurb: 'Chimes earned, clicked and idled',
    icon: 'game-icons:coins-pile',
    accent: '#f0b040',
  },
  {
    id: 'autoBattle',
    label: 'Auto Battle',
    blurb: 'Ranked ladder and match record',
    icon: 'game-icons:podium-winner',
    accent: '#7ab8f0',
  },
  {
    id: 'combatRecord',
    label: 'Combat Record',
    blurb: 'Kills, deaths, sprees and multikills',
    icon: 'game-icons:crossed-swords',
    accent: '#e07868',
  },
  {
    id: 'objectives',
    label: 'Objectives & Vision',
    blurb: 'Drakes, barons, structures and wards',
    icon: 'game-icons:all-seeing-eye',
    accent: '#68c0a8',
  },
  {
    id: 'champions',
    label: 'Champions',
    blurb: 'Your roster and its career leaders',
    icon: 'game-icons:crested-helmet',
    accent: '#9a6fd0',
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    blurb: 'Stars rescued, cores freed, tiers won',
    icon: 'game-icons:galaxy',
    accent: '#88a8f0',
  },
  {
    id: 'starFights',
    label: 'Star Fights',
    blurb: 'Stars answered, planets and bosses cleared',
    icon: 'game-icons:star-skull',
    accent: '#d08858',
  },
  {
    id: 'planets',
    label: 'Planets',
    blurb: 'Orbit slots, their roles and bonuses',
    icon: 'game-icons:ringed-planet',
    accent: '#60b878',
  },
  {
    id: 'solar',
    label: 'Sun & Solar Rays',
    blurb: 'Star phase, dwell time and solar rays',
    icon: 'game-icons:heraldic-sun',
    accent: '#f09850',
  },
  {
    id: 'starForge',
    label: 'Star Forge',
    blurb: 'Branches, leaves, relics, constellations',
    icon: 'game-icons:anvil-impact',
    accent: '#c0a0e0',
  },
  {
    id: 'meepTree',
    label: 'Meep Tree',
    blurb: 'Learned skill nodes and their effects',
    icon: 'game-icons:tree-roots',
    accent: '#78c058',
  },
  {
    id: 'expeditions',
    label: 'Expeditions',
    blurb: 'Missions sent out and what returned',
    icon: 'game-icons:scout-ship',
    accent: '#d0a860',
  },
  {
    id: 'materials',
    label: 'Materials & Gear',
    blurb: 'Salvage, items owned and equipped',
    icon: 'game-icons:crystal-cluster',
    accent: '#a0b0c0',
  },
  {
    id: 'buffs',
    label: 'Buffs & Synergies',
    blurb: 'Augments, traits and active multipliers',
    icon: 'game-icons:aura',
    accent: '#e88fc0',
  },
]
