import type { EncyclopediaCategory } from './types'

export const augmentsCategory: EncyclopediaCategory = {
  id: 'augments',
  title: 'Augmente',
  icon: '✨',
  entries: [
    {
      id: 'augment-system',
      name: 'Augment-System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Bei jedem Level-Up erscheinen 3 zufällige Augmente zur Auswahl. ' +
        'Das gewählte Augment gilt für den gesamten laufenden Run und stapelt sich mit anderen Augmenten. ' +
        'Die Auswahl basiert auf gewichteter Zufälligkeit: ' +
        'Common = 60, Rare = 25, Epic = 12, Legendary = 3.',
      lore: 'Kosmische Kräfte, die sich mit jedem Aufstieg verstärken.',
      formula:
        'Gesamtgewicht = 100 (60+25+12+3)\n' +
        'Chance Common ≈ 60% | Rare ≈ 25% | Epic ≈ 12% | Legendary ≈ 3%\n' +
        'RARITY_WEIGHTS = { common:60, rare:25, epic:12, legendary:3 }',
    },
    {
      id: 'augments-common',
      name: 'Augmente: Common',
      icon: '⚪',
      description:
        'Häufige Augmente (≈60% Chance). Moderate Boni:\n' +
        '• Melodic Surge: +30% CPS\n' +
        '• Resonant Strike: +50% CPC\n' +
        "• Warrior's Beat: +200 Power pro Fähigkeitsstufe\n" +
        '• Frugal Harmony: −15% Gebäudekosten\n' +
        '• Meep Bargain: −20% Meep-Kosten\n' +
        "• Wanderer's Luck: +25% Expeditions-Belohnung\n" +
        '• Balanced Chord: +20% CPS & CPC\n' +
        '• Meep Empowerment: +50% Meep-Kampfkraft\n' +
        '• Caffeine Rush: +10% CPS\n' +
        '• Steady Hands: +5% CPC\n' +
        '• Lucky Penny: +8% Expeditions-Belohnung',
      lore: 'Kleine Geschenke des Schicksals – einzeln schwach, in Summe mächtig.',
      formula: 'Gewicht = 60 | Gesamtpool = 11 Common-Augmente',
    },
    {
      id: 'augments-rare',
      name: 'Augmente: Rare',
      icon: '🔵',
      description:
        'Seltene Augmente (≈25% Chance). Starke Boni:\n' +
        '• Harmonic Cascade: +70% CPS\n' +
        '• Thunder Chime: +100% CPC\n' +
        '• Battle Hymn: +500 Power pro Fähigkeitsstufe\n' +
        '• Master Builder: −30% Gebäudekosten\n' +
        "• Fortune's Compass: +50% Expeditions-Belohnung\n" +
        '• Combat Rhythm: +40% CPS & +300 Power/Level\n' +
        '• Double Tap: Jeder 10. Klick zählt doppelt\n' +
        '• Coin Magnet: +15% CPS\n' +
        '• Overclock: CPS ×2 für 30 s nach Level-Up',
      lore: 'Seltene Harmonien aus fernen Galaxien.',
      formula: 'Gewicht = 25 | Gesamtpool = 9 Rare-Augmente',
    },
    {
      id: 'augments-epic-legendary',
      name: 'Augmente: Epic & Legendary',
      icon: '🟣',
      description:
        'Episch (≈12% Chance):\n' +
        '• Eternal Melody: +150% CPS\n' +
        '• Cosmic Click: +200% CPC\n' +
        "• Warlord's Anthem: +1 000 Power pro Fähigkeitsstufe\n" +
        '• Grand Crescendo: +80% CPS & CPC\n' +
        '• Time Warp: Alle Cooldowns halbiert\n\n' +
        'Legendär (≈3% Chance): Mächtigste Augmente im Spiel mit transformativen Effekten.',
      lore: 'Kräfte jenseits des Begreifbaren – nur wenige Auserwählte erleben sie.',
      formula:
        'Epic-Gewicht = 12 | Legendary-Gewicht = 3\n' +
        'Stapeln sich mit allen anderen Augmenten und Modifikatoren',
    },
  ],
}

export const battleCategory: EncyclopediaCategory = {
  id: 'battle',
  title: 'Kampfsystem',
  icon: '⚔️',
  entries: [
    {
      id: 'auto-battle',
      name: 'Auto-Kampf',
      icon: '/img/BardBattle.png',
      description:
        'Kämpfe laufen vollautomatisch alle 45 Sekunden Echtzeit. ' +
        'Jeder Kampf dauert ebenfalls 45 Sekunden (simuliert). ' +
        'Sieg oder Niederlage wird anhand von Kampfkraft und ELO-Wahrscheinlichkeit berechnet.',
      lore: 'Die Schlachten toben unaufhörlich. Bard und seine Meeps kämpfen ohne Pause.',
      formula:
        'AUTO_BATTLE_INTERVAL_MS = 45 000 ms (45 Sekunden)\n' +
        'BATTLE_REAL_DURATION_SECONDS = 45',
    },
    {
      id: 'power',
      name: 'Kampfkraft (Power)',
      icon: '/img/BardAbilities/BardChimeMeep.png',
      description:
        'Die Kampfkraft bestimmt die Gewinnwahrscheinlichkeit. ' +
        'Setzt sich zusammen aus: Meeps × 100 + W-Fähigkeit × 300 + Augment-Boni. ' +
        'Gegner-Power wird aus deren MMR berechnet (MMR × 1.5 als Basiswert).',
      lore: 'Die gebündelte Kraft aller Meeps und kosmischen Fähigkeiten, kanalisiert für den Kampf.',
      formula:
        'Power = (Meeps × 100) + (W-Level × 300) + AugmentBoni\n' +
        'Gegner-Power ≈ gegnerMMR × 1.5\n' +
        'MMR_TO_POWER_MULTIPLIER = 1.5',
    },
    {
      id: 'win-probability',
      name: 'Gewinnwahrscheinlichkeit',
      icon: '/img/BardBattle.png',
      description:
        'Berechnet sich nach dem ELO-Prinzip aus dem Power-Unterschied. ' +
        'Ein Glücksfaktor von ±15% sorgt für Überraschungen. ' +
        'K-Faktor bestimmt, wie stark sich das MMR nach einem Kampf verändert (32 = Standard-ELO).',
      lore: 'Selbst die Sterne können den Ausgang eines Kampfes nicht mit Sicherheit vorhersagen.',
      formula:
        'Win% = 1 / (1 + 10^(−PowerDiff / 400))\n' +
        'ELO_K_FACTOR = 32 | ELO_RATING_SCALE = 400\n' +
        'ELO_LUCK_FACTOR = 0.15 (±15% Zufallsabweichung)\n' +
        'Gegner-MMR-Streuung: OPPONENT_MMR_VARIANCE = 200',
    },
    {
      id: 'mmr',
      name: 'MMR (Matchmaking Rating)',
      icon: '/img/BardBattle.png',
      description:
        'Versteckter Wert, der die Stärke und den Rang bestimmt. ' +
        'Steigt bei Siegen (K-Faktor 32) und fällt bei Niederlagen. ' +
        'Jeder Rang-Tier beginnt bei einer bestimmten MMR-Schwelle.',
      lore: 'Die kosmische Waage, die die Stärke jedes Kämpfers misst.',
      formula:
        'MMR-Schwellen:\n' +
        'Iron IV = 0 | Bronze IV = 500 | Silver IV = 1 000\n' +
        'Gold IV = 1 500 | Platinum IV = 2 000 | Diamond IV = 2 500\n' +
        'Master I = 3 000 | Grandmaster I = 3 500 | Challenger I = 4 000+',
    },
    {
      id: 'lp',
      name: 'LP (League Points)',
      icon: '/img/BardBattle.png',
      description:
        'Sichtbare Punkte innerhalb einer Division. Standard-Änderung: ±20 LP pro Kampf. ' +
        'Bei 100 LP erfolgt eine Beförderung. Bei 75 LP oder weniger droht Abstieg. ' +
        'Master/Grandmaster/Challenger haben höhere Schwellen.',
      lore: 'Leuchtende Punkte auf dem Weg zum Gipfel der kosmischen Rangliste.',
      formula:
        'LP_BASE_CHANGE = 20 (pro Kampf)\n' +
        'Normal-Beförderung: LP ≥ 100 → LP_NORMAL_PROMOTION_THRESHOLD\n' +
        'Master-Beförderung: LP ≥ 500 → LP_MASTER_PROMOTION_THRESHOLD\n' +
        'Grandmaster-Beförderung: LP ≥ 1 000 → LP_GRANDMASTER_PROMOTION_THRESHOLD\n' +
        'Abstiegsrisiko: LP ≤ 75 (LP_DEMOTION_VALUE)\n' +
        'Master-Abstieg: LP ≤ 400 | Grandmaster-Abstieg: LP ≤ 900',
    },
    {
      id: 'battle-stats',
      name: 'Kampf-Statistiken',
      icon: '/img/minimap.png',
      description:
        'Nach jedem Kampf werden K/D/A-Werte zufällig generiert. ' +
        'Kill-Chance: 50%, Death-Chance: 30%, Assist-Chance: 70%. ' +
        'Max pro Kampf: 3 Kills, 2 Deaths, 7 Assists.',
      lore: 'Zahlen, die von kosmischen Chronisten aufgezeichnet werden.',
      formula:
        'STAT_KILL_CHANCE = 0.5 | STAT_DEATH_CHANCE = 0.3 | STAT_ASSIST_CHANCE = 0.7\n' +
        'STAT_MAX_KILLS = 3 | STAT_MAX_DEATHS = 2 | STAT_MAX_ASSISTS = 7',
    },
    {
      id: 'ranks',
      name: 'Ränge',
      icon: '/img/RankBorder/RankGold.png',
      description:
        'Von Iron bis Challenger: 9 Rang-Tier, jeweils mit Divisionen IV bis I. ' +
        'Iron–Diamond haben je 4 Divisionen (IV, III, II, I). ' +
        'Master, Grandmaster und Challenger haben nur Division I und höhere LP-Schwellen.',
      lore: 'Die ewige Hierarchie der Kämpfer, geschmiedet in den Feuern unzähliger Schlachten.',
      formula:
        'RANK_TIERS = [Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster, Challenger]\n' +
        'RANK_DIVISIONS = [IV, III, II, I]',
    },
  ],
}

export const championsCategory: EncyclopediaCategory = {
  id: 'champions',
  title: 'Champions',
  icon: '🛡️',
  entries: [
    {
      id: 'champion-system',
      name: 'Champion-System',
      icon: '/img/BardAbilities/Bard.png',
      description:
        'Rekrutiere Champions mit Gold für dein 5v5-Kampf-Team. ' +
        'Jeder Champion startet mit 50 Basis-Power und gewinnt +10 Power pro Level. ' +
        'Ein volles Team aus 5 Champions maximiert die Kampfkraft.',
      lore: 'Helden aus allen Dimensionen, die dem Ruf des kosmischen Wanderers folgen.',
      formula:
        'Champion-Power = CHAMPION_BASE_POWER + (Level × CHAMPION_POWER_PER_LEVEL)\n' +
        'CHAMPION_BASE_POWER = 50 | CHAMPION_POWER_PER_LEVEL = 10',
    },
    {
      id: 'champion-team',
      name: 'Team-Aufstellung',
      icon: '/img/minimap.png',
      description:
        'Stelle ein Team aus 5 Champions zusammen. Die Teamstärke beeinflusst Kämpfe gegen automatisch generierte Gegner-Teams. ' +
        'Ein unvollständiges Team (< 5) reduziert die effektive Kampfkraft.',
      lore: 'Die richtige Kombination von Kämpfern kann den Unterschied ausmachen.',
      formula: 'Optimale Teamgröße = 5 Champions',
    },
  ],
}
