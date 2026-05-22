import type { EncyclopediaCategory } from './types'

export const buildingsCategory: EncyclopediaCategory = {
  id: 'buildings',
  title: 'Buildings',
  icon: '🏗️',
  entries: [
    {
      id: 'chimeClicker',
      name: 'Clicker',
      icon: '/img/ChimesPerClick.png',
      description:
        'Increases Chimes per Click (CPC). Each level gives +1 base CPC. ' +
        'Starting cost: 50 Chimes. Scales with the R-Ability multiplier and all CPC modifiers.',
      lore: 'A mechanical amplifier that resonates every click through the cosmic frequencies.',
      formula:
        'Cost Level N = ceil(50 × 1.2^N)\n' +
        'baseCost = 50 | baseCPC = 1 | costMultiplier = 1.2\n' +
        'CPC contribution = baseCPC × level × all CPC multipliers',
    },
    {
      id: 'glockenturm',
      name: 'Bell Tower',
      icon: '/img/Glockenturm.png',
      description:
        'The cheapest CPS building. Automatically produces +1 Chime per second per level. ' +
        'Costs only 25 Chimes at level 0 — ideal for early game.',
      lore: 'Ancient towers whose bells ring at frequencies only cosmic beings can hear.',
      formula:
        'Cost Level N = ceil(25 × 1.15^N)\n' +
        'baseCost = 25 | baseCPS = 1 | costMultiplier = 1.15\n' +
        'CPS contribution = 1 × level × all CPS multipliers',
    },
    {
      id: 'klanggenerator',
      name: 'Sound Generator',
      icon: '/img/KlangGenerator.png',
      description:
        'Mid-tier production with +3 CPS per level. ' +
        'Good value for the mid-game phase.',
      lore: 'Machines that capture the natural harmonies of star nebulae and convert them into pure Chime energy.',
      formula:
        'Cost Level N = ceil(100 × 1.2^N)\n' +
        'baseCost = 100 | baseCPS = 3 | costMultiplier = 1.2',
    },
    {
      id: 'harmoniewerk',
      name: 'Harmony Works',
      icon: '/img/HarmonieWerk.png',
      description:
        'Advanced production unit with +5 CPS per level. ' +
        'Starts at 500 Chimes and scales at ×1.25 per level.',
      lore: 'Vast sound-forge factories where raw cosmic energy is shaped into perfect harmonies.',
      formula:
        'Cost Level N = ceil(500 × 1.25^N)\n' +
        'baseCost = 500 | baseCPS = 5 | costMultiplier = 1.25',
    },
    {
      id: 'sphaerenMusik',
      name: 'Sphere Music',
      icon: '/img/SphaerenMusik.png',
      description:
        'High-quality unit with +10 CPS per level. ' +
        'Base cost 2,500 Chimes — for advanced players.',
      lore: 'The music of the spheres itself, captured in crystalline resonance chambers beyond space and time.',
      formula:
        'Cost Level N = ceil(2500 × 1.3^N)\n' +
        'baseCost = 2 500 | baseCPS = 10 | costMultiplier = 1.3',
    },
    {
      id: 'zeitEcho',
      name: 'Time Echo',
      icon: '/img/ZeitEcho.png',
      description:
        'The most powerful production building with +25 CPS per level, but the highest costs. ' +
        'Scales especially steeply (×1.4 per level) — only worth it in the late game.',
      lore: 'Echoes from the future reverberating through cracks in time, shaping Chimes from melodies not yet written.',
      formula:
        'Cost Level N = ceil(10 000 × 1.4^N)\n' +
        'baseCost = 10 000 | baseCPS = 25 | costMultiplier = 1.4',
    },
  ],
}

export const permanentUpgradesCategory: EncyclopediaCategory = {
  id: 'permanentUpgrades',
  title: 'Permanent Upgrades',
  icon: '🔧',
  entries: [
    {
      id: 'perm-cpc',
      name: 'CPC Upgrades',
      icon: '/img/ChimesPerClick.png',
      description:
        'Three permanent upgrades that increase the Chimes-per-Click multiplier. Purchased once and active for the rest of the run. ' +
        '1) Click Training: 200 Chimes → ×1.1 CPC (+10%) | ' +
        '2) Golden Rhythm: 1,500 Chimes → ×1.5 CPC (+50%) | ' +
        '3) Master Click: 8,000 Chimes → ×2.0 CPC (×2)',
      lore: 'Knowledge engraved into the fingers. Once learned, never forgotten.',
      formula:
        'Click Training: cost=200, cpcMultiplier=1.1\n' +
        'Golden Rhythm: cost=1 500, cpcMultiplier=1.5\n' +
        'Master Click: cost=8 000, cpcMultiplier=2.0\n' +
        'Total CPC multiplier = product of all active cpcMultipliers',
    },
    {
      id: 'perm-cps',
      name: 'CPS Upgrades',
      icon: '/img/Glockenturm.png',
      description:
        'Three permanent upgrades for the passive Chime production of all buildings. ' +
        '1) Rhythm Boost: 500 Chimes → ×1.15 CPS (+15%) | ' +
        '2) Chime Resonance: 3,000 Chimes → ×1.25 CPS (+25%) | ' +
        '3) Bardic Reverberation: 75,000 Chimes → ×2.0 CPS (×2)',
      lore: 'The buildings learn from each other. Their sounds merge into an unstoppable stream.',
      formula:
        'Rhythm Boost: cost=500, cpsMultiplier=1.15\n' +
        'Chime Resonance: cost=3 000, cpsMultiplier=1.25\n' +
        'Bardic Reverberation: cost=75 000, cpsMultiplier=2.0\n' +
        'Total CPS multiplier = product of all active cpsMultipliers',
    },
    {
      id: 'perm-buildings',
      name: 'Building-specific Upgrades',
      icon: '/img/HarmonieWerk.png',
      description:
        'Upgrades that double the production of individual buildings. Require a minimum level of the respective building. ' +
        'Bell Tower Resonance: 2,000 Chimes, min. Level 10 → ×2 Bell Tower CPS | ' +
        'Sound Sync: 8,000 Chimes, min. Level 10 → ×2 Sound Generator CPS | ' +
        'Harmony Amplification: 30,000 Chimes, min. Level 10 → ×2 Harmony Works CPS | ' +
        'Sphere Resonance: 100,000 Chimes, min. Level 10 → ×2 Sphere Music CPS | ' +
        'Chrono Echo: 300,000 Chimes, min. Level 10 → ×2 Time Echo CPS',
      lore: 'Synergy — when like resonates with like, something greater than the sum of its parts emerges.',
      formula:
        'Each building upgrade: effect = { type: buildingBoost, value: 2, buildingId: ... }\n' +
        'Requirement: requirement.minLevel = 10',
    },
  ],
}

export const abilitiesCategory: EncyclopediaCategory = {
  id: 'abilities',
  title: 'Abilities',
  icon: '⚡',
  entries: [
    {
      id: 'ability-q',
      name: 'Q – Cosmic Sound',
      icon: '/img/BardAbilities/BardQ.png',
      description:
        'Increases total CPS production by +15% per level. ' +
        'Acts as a global multiplier on all passive buildings. ' +
        'Meep unlock cost: 3 Meeps (unlocks immediately to MAX_ABILITY_LEVEL=5).',
      lore: 'The first note of creation, amplified by centuries of meditation among the stars.',
      formula:
        'CPS multiplier = 1 + (Q-Level × 0.15)\n' +
        'Level 1 = +15% | Level 5 = +75% CPS\n' +
        'MAX_ABILITY_LEVEL = 5',
    },
    {
      id: 'ability-w',
      name: 'W – Star Shield',
      icon: '/img/BardAbilities/BardW.png',
      description:
        'Grants +300 Combat Power per level. Directly increases Power for battles. ' +
        'Meep unlock cost: 8 Meeps.',
      lore: 'A shield of condensed starlight that both defends and unleashes inner strength.',
      formula:
        'Power bonus = W-Level × 300\n' +
        'Level 1 = +300 | Level 5 = +1,500 Power\n' +
        'Added to: Power = (Meeps × 100) + W bonus',
    },
    {
      id: 'ability-e',
      name: 'E – Portal Resonance',
      icon: '/img/BardAbilities/BardE.png',
      description:
        'Reduces the cost of new Meeps by 10% per level. ' +
        'Minimum: 50% of original cost (Level 5 = maximum reduction). ' +
        'Meep unlock cost: 20 Meeps.',
      lore: 'The portals between worlds vibrate in resonance, making it easier to call Meeps from the in-between.',
      formula:
        'Cost multiplier = max(0.5, 1 − E-Level × 0.1)\n' +
        'Level 1 = −10% | Level 5 = −50% (= 50% of original cost)\n' +
        'Multiplied with the base cost of the next Meep',
    },
    {
      id: 'ability-r',
      name: 'R – Bardic Harmony',
      icon: '/img/BardAbilities/BardR.png',
      description:
        'Increases Chimes per Click (CPC) by +25% per level. ' +
        'Acts as a multiplier on manual clicks and the Clicker building. ' +
        'Meep unlock cost: 45 Meeps.',
      lore: 'The ultimate harmony between Bard and the cosmos. Every touch echoes through all dimensions.',
      formula:
        'CPC multiplier = 1 + (R-Level × 0.25)\n' +
        'Level 1 = +25% | Level 5 = +125% CPC\n' +
        'Multiplied with baseChimesPerClick and Clicker contribution',
    },
  ],
}
