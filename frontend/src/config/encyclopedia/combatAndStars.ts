import type { EncyclopediaCategory } from './types'

export const orbitCombatCategory: EncyclopediaCategory = {
  id: 'orbit',
  title: 'Orbit Combat',
  icon: 'game-icons:orbital-rays',
  entries: [
    {
      id: 'orbit-combat',
      name: 'Orbit Combat',
      icon: 'game-icons:sword-array',
      description:
        'Your five mains orbit the sun and automatically attack the active boss planet when it comes into range. ' +
        'Filled ally rows massively raise their damage.',
      lore: 'War, set to an orbital rhythm.',
      formula:
        'DPS per main = 40 × (1 + allies × 0.4) → ×3 with a full row\n' +
        '× synergy, Star Forge and Meep Tree multipliers',
      related: ['team-roster', 'role-abilities', 'boss-hp'],
    },
    {
      id: 'role-abilities',
      name: 'Role Abilities',
      icon: 'game-icons:juggler',
      description:
        'Each role fights its own way: Top blocks shots with Aegis Wall, Mid casts random Chaos Curses, ' +
        'ADC fires Piercing Volleys, Support heals sun and planets, and Jungle patrols to buff your worker planets.',
      lore: 'Five voices, one chorus.',
      related: ['jungle-buffs', 'champion-hp'],
    },
    {
      id: 'champion-hp',
      name: 'Champion HP',
      icon: 'game-icons:life-bar',
      description:
        'Champions have role-based HP (Top 280 down to ADC 150) growing +35% per star level. ' +
        'Downed champions revive after 8 seconds and regenerate quickly out of combat.',
      lore: 'Heroes fall. Legends stand back up.',
      related: ['boss-attacks', 'role-abilities'],
    },
    {
      id: 'boss-attacks',
      name: 'Boss Attacks',
      icon: 'game-icons:angry-eyes',
      description:
        'Bosses fight back: a Shock Nova hits everything every 5 seconds, a telegraphed Strike hits one target every 3 seconds, ' +
        'and random Rage phases double their damage. Galaxy bosses hit twice as hard.',
      lore: 'It sees you. It has always seen you.',
      related: ['champion-hp', 'sun-hp'],
    },
  ],
}

export const starFightsCategory: EncyclopediaCategory = {
  id: 'starfights',
  title: 'Star Fights',
  icon: 'game-icons:crossed-slashes',
  entries: [
    {
      id: 'star-types',
      name: 'Star Types',
      icon: 'game-icons:star-struck',
      description:
        'Four star kinds fly in: Resource stars (3 loot planets, 45 s), Champion stars (home-planet boss, 60 s), ' +
        'Galaxy boss stars and Escort waves. Miss the timer and the star despawns.',
      lore: 'Every light in the sky is an invitation.',
      related: ['star-fight-flow', 'champion-recruitment', 'galaxy-boss'],
    },
    {
      id: 'star-fight-flow',
      name: 'Fight Flow',
      icon: 'game-icons:crossed-axes',
      description:
        'Opening a star queues its planets — escorts first, the champion or galaxy boss always last. ' +
        'Clear them one by one before the despawn timer runs out.',
      lore: 'Order of battle, written in starlight.',
      formula: 'Timer warnings at 20 s and 10 s remaining',
      related: ['star-types', 'turret-salvos', 'boss-hp'],
    },
    {
      id: 'turret-salvos',
      name: 'Turret Salvos',
      icon: 'game-icons:missile-swarm',
      description:
        'Your Turret planets fire volleys at star planets, while enemy planets shoot back at your sun for 8 damage per hit.',
      lore: 'The orbit answers in kind.',
      related: ['planet-roles', 'sun-hp'],
    },
  ],
}

export const planetBossCategory: EncyclopediaCategory = {
  id: 'planetboss',
  title: 'Planet Bosses',
  icon: 'game-icons:goblin',
  entries: [
    {
      id: 'boss-hp',
      name: 'Boss HP',
      icon: 'game-icons:health-decrease',
      description:
        'Every star planet is a boss whose HP scales with your level, CPS, power, slotted champion stars, ' +
        'the section and the galaxy — the stronger you are, the tougher the fight.',
      lore: 'The cosmos matches your stride.',
      formula:
        'HP = 200 × (1 + lvl/10) × (1 + CPS/50) × (1 + power/5000)\n' +
        '× section × (1 + Σ champion stars × 0.1)\n' +
        '× (1 + (galaxy − 1) × 0.2)\n' +
        'Click dmg = CPC · Passive DPS = 10% of CPS',
      related: ['boss-enrage', 'boss-rewards', 'orbit-combat'],
    },
    {
      id: 'boss-enrage',
      name: 'Enrage',
      icon: 'game-icons:fire-breath',
      description:
        'Beat the boss before the enrage timer or it escapes: you take damage and lose 5% CPS for 30 seconds. ' +
        'Champion, escort and galaxy bosses never enrage.',
      lore: 'Patience is not a cosmic virtue.',
      formula: 'Timer = min(30 + ⌊level/5⌋ × 5, 60) s × section mult, min 10 s',
      related: ['boss-hp', 'sun-hp'],
    },
    {
      id: 'boss-rewards',
      name: 'Boss Rewards',
      icon: 'game-icons:present',
      description:
        'Defeated bosses drop up to 3 reward slots — Chimes always, materials at 50% per extra slot. ' +
        '30% of Chime rewards also fill your universe progress.',
      lore: 'Victory pays in more than pride.',
      related: ['materials', 'prestige'],
    },
  ],
}
