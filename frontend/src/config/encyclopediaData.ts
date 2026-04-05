export interface EncyclopediaEntry {
  id: string
  name: string
  icon: string
  description: string
  lore: string
  formula?: string
}

export interface EncyclopediaCategory {
  id: string
  title: string
  icon: string
  entries: EncyclopediaEntry[]
}

export const encyclopediaData: EncyclopediaCategory[] = [
  // ══════════════════════════════════════════════════════════════════
  // 1. RESSOURCEN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'resources',
    title: 'Ressourcen',
    icon: '💎',
    entries: [
      {
        id: 'chimes',
        name: 'Chimes',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Die primäre Währung im Spiel. Chimes werden durch Klicken (CPC) oder passive Gebäude-Produktion (CPS) verdient. ' +
          'Sie werden für den Kauf von Gebäuden, permanenten Upgrades und das Erreichen des nächsten Universums benötigt. ' +
          'Der Startwert für Chimes pro Klick beträgt 20 (baseChimesPerClick = 20).',
        lore: 'Kosmische Klänge, die durch die Dimensionen hallen. Jeder Chime trägt ein Fragment der universellen Harmonie in sich.',
        formula:
          'Manuell: Chimes += chimesPerClick pro Klick\n' +
          'Passiv: Chimes += chimesPerSecond × Δt\n' +
          'Startwert baseChimesPerClick = 20',
      },
      {
        id: 'meeps',
        name: 'Meeps',
        icon: '/img/BardAbilities/BardMeep.png',
        description:
          'Kleine kosmische Begleiter, die automatisch erscheinen, wenn genug Chimes für den nächsten Meep angesammelt wurden. ' +
          'Jeder Meep gibt +100 Kampfkraft. Meeps können auf Expeditionen geschickt werden. ' +
          'Der erste Meep kostet 20 Chimes. Mit jedem weiteren Meep steigen die Kosten exponentiell.',
        lore: 'Treue Geister aus dem Raum zwischen den Welten. Sie folgen dem Ruf der Chimes und sammeln sich um ihren Meister.',
        formula:
          'Kosten = ceil(20 × meeps^1.2)\n' +
          'MEEP_BASE_COST = 20 | MEEP_COST_EXPONENT = 1.2\n' +
          'E-Ability & Augmente können die Kosten reduzieren',
      },
      {
        id: 'gold',
        name: 'Gold',
        icon: '/img/BardGold.png',
        description:
          'Wird ausschließlich durch gewonnene Kämpfe verdient. ' +
          'Gold dient zum Rekrutieren neuer Champions im Item-Shop. ' +
          'Die Menge Gold pro Sieg skaliert mit dem MMR und dem Rang.',
        lore: 'Die Währung der Schlachtfelder. Geschmiedet aus dem Triumph über würdige Gegner.',
        formula: 'Goldgewinn pro Sieg = abhängig von MMR und Rang',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 2. LEVELING
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'leveling',
    title: 'Leveling & Skillpunkte',
    icon: '⬆️',
    entries: [
      {
        id: 'level-system',
        name: 'Level-System',
        icon: '/img/BardAbilities/Bard.png',
        description:
          'Das Level steigt automatisch, wenn die kumulierten Chimes die Schwelle für das aktuelle Level überschreiten. ' +
          'Jedes zweite Level (skillPointInterval = 2) gibt einen Skillpunkt, der zum Upgraden von Fähigkeiten genutzt wird. ' +
          'Bei jedem Level-Up erscheint die Augment-Auswahl (3 zufällige Augmente).',
        lore: 'Wachstum durch Erfahrung. Jedes neue Level öffnet Türen zu unbekannten Kräften.',
        formula:
          'Schwelle für Level N = ceil(500 × N^1.8)\n' +
          'LEVEL_BASE = 500 | LEVEL_EXPONENT = 1.8\n' +
          'Beispiel: Level 5 → ceil(500 × 5^1.8) = ceil(500 × 15.63) ≈ 7 814 Chimes\n' +
          'Skillpunkt alle 2 Level (default, kann durch Modifier verändert werden)',
      },
      {
        id: 'skill-points',
        name: 'Skillpunkte',
        icon: '/img/BardAbilities/BardQ.png',
        description:
          'Skillpunkte werden für das Upgraden der vier Fähigkeiten Q, W, E und R verwendet. ' +
          'Alternativ können Fähigkeiten auch einmalig mit Meeps freigeschaltet werden (Kosten: Q=3, W=8, E=20, R=45 Meeps). ' +
          'Maximum pro Fähigkeit: 5 Level (MAX_ABILITY_LEVEL = 5).',
        lore: 'Wissen, kristallisiert in Energie. Jeder Punkt ist ein Versprechen an die Zukunft.',
        formula:
          'Meep-Freischaltkosten (einmalig, auf Level MAX):\n' +
          'Q = 3 Meeps | W = 8 Meeps | E = 20 Meeps | R = 45 Meeps\n' +
          'SKILL_MEEP_COSTS = [3, 8, 20, 45]\n' +
          'Reihenfolge: Fähigkeiten müssen der Reihe nach freigeschaltet werden (Q → W → E → R)',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 3. GEBÄUDE
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'buildings',
    title: 'Gebäude',
    icon: '🏗️',
    entries: [
      {
        id: 'chimeClicker',
        name: 'Klicker',
        icon: '/img/ChimesPerClick.png',
        description:
          'Erhöht die Chimes pro Klick (CPC). Jedes Level gibt +1 Basis-CPC. ' +
          'Startkauf: 50 Chimes. Skaliert mit dem R-Ability-Multiplikator und allen CPC-Modifikatoren.',
        lore: 'Ein mechanischer Verstärker, der die Resonanz jedes Klicks durch die kosmischen Frequenzen amplifiziert.',
        formula:
          'Kosten Stufe N = ceil(50 × 1.2^N)\n' +
          'baseCost = 50 | baseCPC = 1 | costMultiplier = 1.2\n' +
          'CPC-Beitrag = baseCPC × level × alle CPC-Multiplikatoren',
      },
      {
        id: 'glockenturm',
        name: 'Glockenturm',
        icon: '/img/Glockenturm.png',
        description:
          'Das günstigste CPS-Gebäude. Produziert automatisch +1 Chime pro Sekunde pro Level. ' +
          'Kostet ab Stufe 0 nur 25 Chimes – ideal für den Einstieg.',
        lore: 'Uralte Türme, deren Glocken in Frequenzen schwingen, die nur kosmische Wesen hören können.',
        formula:
          'Kosten Stufe N = ceil(25 × 1.15^N)\n' +
          'baseCost = 25 | baseCPS = 1 | costMultiplier = 1.15\n' +
          'CPS-Beitrag = 1 × level × alle CPS-Multiplikatoren',
      },
      {
        id: 'klanggenerator',
        name: 'Klang Generator',
        icon: '/img/KlangGenerator.png',
        description:
          'Mittlere Produktionsstufe mit +3 CPS pro Level. ' +
          'Gutes Preis-Leistungs-Verhältnis in der Mid-Game-Phase.',
        lore: 'Maschinen, die die natürlichen Harmonien der Sternennebel einfangen und in reine Chime-Energie umwandeln.',
        formula:
          'Kosten Stufe N = ceil(100 × 1.2^N)\n' +
          'baseCost = 100 | baseCPS = 3 | costMultiplier = 1.2',
      },
      {
        id: 'harmoniewerk',
        name: 'Harmonie Werk',
        icon: '/img/HarmonieWerk.png',
        description:
          'Fortgeschrittene Produktionseinheit mit +5 CPS pro Level. ' +
          'Startet bei 500 Chimes und skaliert mit ×1.25 pro Level.',
        lore: 'Riesige Fabriken der Klangschmiede, wo rohe kosmische Energie in perfekte Harmonien geformt wird.',
        formula:
          'Kosten Stufe N = ceil(500 × 1.25^N)\n' +
          'baseCost = 500 | baseCPS = 5 | costMultiplier = 1.25',
      },
      {
        id: 'sphaerenMusik',
        name: 'Sphären Musik',
        icon: '/img/SphaerenMusik.png',
        description:
          'Hochwertige Einheit mit +10 CPS pro Level. ' +
          'Ab 2 500 Chimes Basiskosten – für fortgeschrittene Spieler.',
        lore: 'Die Musik der Sphären selbst, eingefangen in kristallinen Resonanzkammern jenseits von Raum und Zeit.',
        formula:
          'Kosten Stufe N = ceil(2500 × 1.3^N)\n' +
          'baseCost = 2 500 | baseCPS = 10 | costMultiplier = 1.3',
      },
      {
        id: 'zeitEcho',
        name: 'Zeit Echo',
        icon: '/img/ZeitEcho.png',
        description:
          'Das stärkste Produktionsgebäude mit +25 CPS pro Level, aber mit den höchsten Kosten. ' +
          'Skaliert besonders steil (×1.4 pro Level) – lohnt sich erst im Late Game.',
        lore: 'Echos aus der Zukunft, die durch Risse in der Zeit zurückhallen und dabei Chimes aus noch ungeschriebenen Melodien formen.',
        formula:
          'Kosten Stufe N = ceil(10 000 × 1.4^N)\n' +
          'baseCost = 10 000 | baseCPS = 25 | costMultiplier = 1.4',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 4. PERMANENTE UPGRADES
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'permanentUpgrades',
    title: 'Permanente Upgrades',
    icon: '🔧',
    entries: [
      {
        id: 'perm-cpc',
        name: 'CPC-Upgrades',
        icon: '/img/ChimesPerClick.png',
        description:
          'Drei dauerhafte Upgrades, die den Chimes-pro-Klick-Multiplikator erhöhen. Werden einmalig gekauft und gelten für den Rest des Runs. ' +
          '1) Klick Training: 200 Chimes → ×1.1 CPC (+10%) | ' +
          '2) Goldener Rhythmus: 1 500 Chimes → ×1.5 CPC (+50%) | ' +
          '3) Meister Klick: 8 000 Chimes → ×2.0 CPC (×2)',
        lore: 'Wissen, das sich in die Finger eingraviert. Einmal gelernt, nie vergessen.',
        formula:
          'Klick Training: cost=200, cpcMultiplier=1.1\n' +
          'Goldener Rhythmus: cost=1 500, cpcMultiplier=1.5\n' +
          'Meister Klick: cost=8 000, cpcMultiplier=2.0\n' +
          'Gesamt-CPC-Multiplikator = Produkt aller aktiven cpcMultiplier',
      },
      {
        id: 'perm-cps',
        name: 'CPS-Upgrades',
        icon: '/img/Glockenturm.png',
        description:
          'Drei dauerhafte Upgrades für die passive Chime-Produktion aller Gebäude. ' +
          '1) Rhythmus Boost: 500 Chimes → ×1.15 CPS (+15%) | ' +
          '2) Chime Resonanz: 3 000 Chimes → ×1.25 CPS (+25%) | ' +
          '3) Bardischer Nachhall: 75 000 Chimes → ×2.0 CPS (×2)',
        lore: 'Die Gebäude lernen von einander. Ihre Klänge vermischen sich zu einem unstoppbaren Strom.',
        formula:
          'Rhythmus Boost: cost=500, cpsMultiplier=1.15\n' +
          'Chime Resonanz: cost=3 000, cpsMultiplier=1.25\n' +
          'Bardischer Nachhall: cost=75 000, cpsMultiplier=2.0\n' +
          'Gesamt-CPS-Multiplikator = Produkt aller aktiven cpsMultiplier',
      },
      {
        id: 'perm-buildings',
        name: 'Gebäude-spezifische Upgrades',
        icon: '/img/HarmonieWerk.png',
        description:
          'Upgrades, die die Produktion einzelner Gebäude verdoppeln. Erfordern ein Mindest-Level des jeweiligen Gebäudes. ' +
          'Glockenturm Resonanz: 2 000 Chimes, min. Level 10 → ×2 Glockenturm-CPS | ' +
          'Klang Synchro: 8 000 Chimes, min. Level 10 → ×2 Klang-Generator-CPS | ' +
          'Harmonie Verstärkung: 30 000 Chimes, min. Level 10 → ×2 Harmonie-Werk-CPS | ' +
          'Sphären Resonanz: 100 000 Chimes, min. Level 10 → ×2 Sphären-Musik-CPS | ' +
          'Chrono Echo: 300 000 Chimes, min. Level 10 → ×2 Zeit-Echo-CPS',
        lore: 'Synergie – wenn Gleiches mit Gleichem resoniert, entsteht mehr als die Summe seiner Teile.',
        formula:
          'Jedes Gebäude-Upgrade: effect = { type: buildingBoost, value: 2, buildingId: ... }\n' +
          'Voraussetzung: requirement.minLevel = 10',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 5. FÄHIGKEITEN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'abilities',
    title: 'Fähigkeiten',
    icon: '⚡',
    entries: [
      {
        id: 'ability-q',
        name: 'Q – Kosmischer Klang',
        icon: '/img/BardAbilities/BardQ.png',
        description:
          'Erhöht die gesamte CPS-Produktion um +15% pro Level. ' +
          'Wirkt als globaler Multiplikator auf alle passiven Gebäude. ' +
          'Meep-Freischaltkosten: 3 Meeps (schaltet sofort auf MAX_ABILITY_LEVEL=5 frei).',
        lore: 'Der erste Ton der Schöpfung, verstärkt durch jahrhundertelange Meditation in den Sternen.',
        formula:
          'CPS-Multiplikator = 1 + (Q-Level × 0.15)\n' +
          'Level 1 = +15% | Level 5 = +75% CPS\n' +
          'MAX_ABILITY_LEVEL = 5',
      },
      {
        id: 'ability-w',
        name: 'W – Sternenschild',
        icon: '/img/BardAbilities/BardW.png',
        description:
          'Gibt +300 Kampfkraft (Power) pro Level. Erhöht direkt die Power für Kämpfe. ' +
          'Meep-Freischaltkosten: 8 Meeps.',
        lore: 'Ein Schutzschild aus verdichtetem Sternenlicht, das sowohl verteidigt als auch die innere Stärke entfesselt.',
        formula:
          'Power-Bonus = W-Level × 300\n' +
          'Level 1 = +300 | Level 5 = +1 500 Power\n' +
          'Wird addiert zu: Power = (Meeps × 100) + W-Bonus',
      },
      {
        id: 'ability-e',
        name: 'E – Portal-Resonanz',
        icon: '/img/BardAbilities/BardE.png',
        description:
          'Reduziert die Kosten für neue Meeps um 10% pro Level. ' +
          'Minimum: 50% der Originalkosten (Level 5 = maximale Reduktion). ' +
          'Meep-Freischaltkosten: 20 Meeps.',
        lore: 'Die Portale zwischen den Welten schwingen in Resonanz und machen es leichter, Meeps aus dem Zwischenraum zu rufen.',
        formula:
          'Kosten-Multiplikator = max(0.5, 1 − E-Level × 0.1)\n' +
          'Level 1 = −10% | Level 5 = −50% (= 50% der Originalkosten)\n' +
          'Wird multipliziert mit dem Basiskosten-Wert des nächsten Meeps',
      },
      {
        id: 'ability-r',
        name: 'R – Bardischer Einklang',
        icon: '/img/BardAbilities/BardR.png',
        description:
          'Erhöht die Chimes pro Klick (CPC) um +25% pro Level. ' +
          'Wirkt als Multiplikator auf manuelle Klicks und das Klicker-Gebäude. ' +
          'Meep-Freischaltkosten: 45 Meeps.',
        lore: 'Die ultimative Harmonie zwischen Bard und dem Kosmos. Jede Berührung hallt durch alle Dimensionen.',
        formula:
          'CPC-Multiplikator = 1 + (R-Level × 0.25)\n' +
          'Level 1 = +25% | Level 5 = +125% CPC\n' +
          'Wird multipliziert mit baseChimesPerClick und Klicker-Beitrag',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 6. AUGMENTE
  // ══════════════════════════════════════════════════════════════════
  {
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
  },

  // ══════════════════════════════════════════════════════════════════
  // 7. KAMPFSYSTEM
  // ══════════════════════════════════════════════════════════════════
  {
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
  },

  // ══════════════════════════════════════════════════════════════════
  // 8. CHAMPIONS
  // ══════════════════════════════════════════════════════════════════
  {
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
  },

  // ══════════════════════════════════════════════════════════════════
  // 9. PLANETEN-EVENTS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'planetEvents',
    title: 'Planeten-Events',
    icon: '🪐',
    entries: [
      {
        id: 'planet-spawn',
        name: 'Planeten-Erscheinung',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Planeten erscheinen zufällig alle 6–14 Sekunden. Maximal 3 Planeten gleichzeitig. ' +
          'Grundchance, dass ein Rettungs-Event ausgelöst wird: 60%. ' +
          'Mit jedem Prestige erhöht sich die Basis-Ereignischance um +35%.',
        lore: 'Welten in Not. Jede Sekunde könnte ein neuer Planet um Hilfe rufen.',
        formula:
          'PLANET_SPAWN_INTERVAL_MIN = 6 000 ms | PLANET_SPAWN_INTERVAL_MAX = 14 000 ms\n' +
          'PLANET_MAX_COUNT = 3 (gleichzeitig)\n' +
          'PLANET_EVENT_BASE_CHANCE = 0.6 (60%)\n' +
          'PLANET_EVENT_PRESTIGE_BONUS = 0.35 (pro Prestige)',
      },
      {
        id: 'planet-rescue',
        name: 'Planeten-Rettung',
        icon: '/img/BardAbilities/BardQ.png',
        description:
          'Ein Rettungs-Event erfordert 5–15 Klicks innerhalb von 5–10 Sekunden. ' +
          'Belohnung: mindestens 500 Chimes (Basis), skaliert mit Fortschritt. ' +
          '60% Chance, dass der Planet ein Material enthält.',
        lore: 'Jeder gerettete Planet dankt es dir mit kosmischen Gaben.',
        formula:
          'PLANET_RESCUE_DURATION_MIN = 5 000 ms | MAX = 10 000 ms\n' +
          'PLANET_RESCUE_CLICKS_MIN = 5 | MAX = 15\n' +
          'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
          'PLANET_MATERIAL_CHANCE = 0.6 (60% Materialien)\n' +
          'CHAMPION_HOME_PLANET_CHANCE = 0.5 (50% Champion-Heimatplanet)',
      },
      {
        id: 'planet-types',
        name: 'Planetentypen',
        icon: '/img/BardAbilities/BardW.png',
        description:
          'Es gibt 8 verschiedene Planetentypen: Felsplanet, Eisplanet, Gasriese, Lavaplanet, Ozeanplanet, Wüstenplanet, Dschungelplanet, Ringplanet. ' +
          'Der Typ beeinflusst das visuelle Erscheinungsbild, hat aber keinen Einfluss auf die Belohnungen.',
        lore: 'Jede Welt hat ihre eigene Geschichte – ihre eigene Schönheit.',
        formula:
          'PLANET_TYPE_NAMES = { rocky, ice, gas-giant, lava, ocean, desert, jungle, ringed }',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 10. PLANETEN-BOSS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'planetBoss',
    title: 'Planeten-Boss',
    icon: '👹',
    entries: [
      {
        id: 'boss-hp',
        name: 'Boss-Lebenspunkte',
        icon: '/img/BardAbilities/BardChimeMeep.png',
        description:
          'Boss-HP skalieren mit dem aktuellen Level, CPS und Kampfkraft. ' +
          'Basis: 200 HP. Jedes Level fügt +10 HP hinzu. ' +
          'Hohe CPS und hohe Power erhöhen ebenfalls den HP-Pool des Bosses.',
        lore: 'Je mächtiger der Spieler, desto furchterregender der Boss.',
        formula:
          'Boss-HP = BOSS_BASE_HP + (Level × BOSS_HP_LEVEL_SCALE) + (CPS / BOSS_HP_CPS_SCALE) + (Power / BOSS_HP_POWER_SCALE)\n' +
          'BOSS_BASE_HP = 200 | BOSS_HP_LEVEL_SCALE = 10\n' +
          'BOSS_HP_CPS_SCALE = 50 | BOSS_HP_POWER_SCALE = 5 000',
      },
      {
        id: 'boss-damage',
        name: 'Boss-Schaden (Passive DPS)',
        icon: '/img/BardAbilities/BardE.png',
        description:
          'Der Boss verursacht passiv 10% der eigenen Kampfkraft als Schaden pro Sekunde. ' +
          'Bei Sieg: Belohnung = 500 + (Schwierigkeit × 4) Chimes. ' +
          'Bei Niederlage: −5% CPS für 30 Sekunden.',
        lore: 'Der Boss lässt nicht locker. Er nutzt deine eigene Stärke gegen dich.',
        formula:
          'Passive DPS = Power × BOSS_PASSIVE_DPS_FRACTION = Power × 0.1\n' +
          'Belohnung = BOSS_BASE_REWARD + (Difficulty × BOSS_REWARD_DIFFICULTY_SCALE)\n' +
          '  = 500 + (Difficulty × 4)\n' +
          'CPS-Strafe = −BOSS_CPS_PENALTY_FRACTION = −5% für 30 000 ms',
      },
      {
        id: 'boss-enrage',
        name: 'Boss-Enrage',
        icon: '/img/BardAbilities/BardR.png',
        description:
          'Der Boss wütet (Enrage), wenn er nicht rechtzeitig besiegt wird. ' +
          'Basis-Enrage-Timer: 30 Sekunden. Alle 5 Level erhöht sich der Timer um bis zu 60 Sekunden. ' +
          'Im Enrage-Zustand steigen Schaden und Schwierigkeit erheblich.',
        lore: 'Wut ist die letzte Zuflucht des Besiegten – aber auch seine gefährlichste Waffe.',
        formula:
          'BOSS_ENRAGE_BASE_SECONDS = 30 s\n' +
          'BOSS_ENRAGE_LEVEL_STEP = 5 (alle 5 Level +1s)\n' +
          'BOSS_ENRAGE_MAX_SECONDS = 60 s',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 11. EXPEDITIONEN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'expeditions',
    title: 'Expeditionen',
    icon: '🗺️',
    entries: [
      {
        id: 'expedition-system',
        name: 'Expeditions-System',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Schicke Champions auf Expeditionen, um Belohnungen zu erhalten. ' +
          'Maximal 3 gleichzeitige Expeditionen möglich (MAX_ACTIVE_EXPEDITIONS = 3). ' +
          'Expeditions-Belohnungen können durch Augmente und Items erhöht werden.',
        lore: 'Die Weiten des Kosmos bieten unermessliche Schätze – aber nur für die Mutigen.',
        formula:
          'MAX_ACTIVE_EXPEDITIONS = 3 (gleichzeitig)\n' +
          'Champion-Expedition-Power = CHAMPION_BASE_POWER + (Level × CHAMPION_POWER_PER_LEVEL)\n' +
          '  = 50 + (Level × 10)',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 12. MATERIALIEN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'materials',
    title: 'Materialien',
    icon: '💠',
    entries: [
      {
        id: 'materials-overview',
        name: 'Material-Übersicht',
        icon: '/img/Sternenstaub.png',
        description:
          'Materialien werden bei Planeten-Rettungen (60% Chance) und Expeditionen gesammelt. ' +
          'Sie werden als Herstellungskosten für seltene Items benötigt. ' +
          'Insgesamt gibt es 6 Materialien mit unterschiedlichen Drop-Chancen.',
        lore: 'Die Rohstoffe des Kosmos – in den richtigen Händen werden sie zu Wundern.',
        formula:
          'PLANET_MATERIAL_CHANCE = 0.6 (60%)\n' +
          'Drop-Chancen relativ zur Gesamtmasse (1,00):\n' +
          'Sternstaub 35% | Mondkristall 25% | Nebelquarz 20%\n' +
          'Sonnenessenz 12% | Leerscherbe 6% | Dunkle Materie 2%',
      },
      {
        id: 'material-stardust',
        name: 'Sternstaub',
        icon: '/img/Sternenstaub.png',
        description:
          'Häufigstes Material (35% Drop). Feiner Staub von fernen Sternen. Seltenheit: Common.',
        lore: 'Feiner Staub von fernen Sternen.',
        formula: 'id = stardust | rarity = common | dropChance = 0.35 (35%)',
      },
      {
        id: 'material-moon-crystal',
        name: 'Mondkristall',
        icon: '/img/Mondkristall.png',
        description:
          'Zweithäufigstes Material (25% Drop). Ein Kristall, der im Mondlicht schimmert. Seltenheit: Common.',
        lore: 'Ein Kristall, der im Mondlicht schimmert.',
        formula: 'id = moon_crystal | rarity = common | dropChance = 0.25 (25%)',
      },
      {
        id: 'material-nebula-quartz',
        name: 'Nebelquarz',
        icon: '/img/Nebelquarz.png',
        description:
          'Uncommon-Material (20% Drop). Wird für seltene Waffen als Handwerkskosten benötigt. Seltenheit: Uncommon.',
        lore: 'Quarz aus den Tiefen eines Nebels.',
        formula: 'id = nebula_quartz | rarity = uncommon | dropChance = 0.20 (20%)',
      },
      {
        id: 'material-solar-essence',
        name: 'Sonnenessenz',
        icon: '/img/Sonnenessenz.png',
        description:
          'Seltenes Material (12% Drop). Konzentrierte Energie eines Sterns. Benötigt für Rare-Items. Seltenheit: Rare.',
        lore: 'Konzentrierte Energie eines Sterns.',
        formula: 'id = solar_essence | rarity = rare | dropChance = 0.12 (12%)',
      },
      {
        id: 'material-void-shard',
        name: 'Leerscherbe',
        icon: '/img/Leerscherbe.png',
        description:
          'Sehr seltenes Material (6% Drop). Ein Splitter aus dem Nichts. Benötigt für Epic-Items. Seltenheit: Rare.',
        lore: 'Ein Splitter aus dem Nichts.',
        formula: 'id = void_shard | rarity = rare | dropChance = 0.06 (6%)',
      },
      {
        id: 'material-dark-matter',
        name: 'Dunkle Materie',
        icon: '/img/DunkleMaterie.png',
        description:
          'Extrem seltenes Material (2% Drop). Unfassbare Materie jenseits des Sichtbaren. Benötigt für Legendary-Items. Seltenheit: Epic.',
        lore: 'Unfassbare Materie jenseits des Sichtbaren.',
        formula: 'id = dark_matter | rarity = epic | dropChance = 0.02 (2%)',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 13. ITEM-SHOP
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'items',
    title: 'Item-Shop',
    icon: '🗡️',
    entries: [
      {
        id: 'item-system',
        name: 'Item-System',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Items werden mit Gold (und teils mit Materialien) gekauft und geben permanente Multiplikatoren. ' +
          'Es gibt 4 Seltenheiten: Common, Rare, Epic, Legendary. ' +
          'Items können Kampfkraft (Power), CPS oder CPC erhöhen.',
        lore: 'Die Ausrüstung des Meisters bestimmt die Schlagkraft.',
        formula:
          'Effekttypen: powerMultiplier, cpsMultiplier, cpcMultiplier\n' +
          'Preisskala: Common ≈ 1 200–2 500 Gold | Rare ≈ 15 000–28 000 Gold\n' +
          'Epic ≈ 65 000–75 000 Gold + Materialkosten',
      },
      {
        id: 'item-swords-common',
        name: 'Waffen: Common-Schwerter',
        icon: '/img/itemShop/sword/AncientBoneSword.png',
        description:
          '• Ancient Bone Sword: 1 200 Gold → +12% Kampfkraft\n' +
          '• Crystal Shard Sword: 1 800 Gold → +10% CPS, +5% Kampfkraft\n' +
          '• Coral Cutlass: 2 500 Gold → +15% Kampfkraft',
        lore: 'Einfache, aber bewährte Klingen.',
        formula:
          'ancient_bone_sword: price=1200, powerMultiplier=1.12\n' +
          'crystal_shard_sword: price=1800, cpsMultiplier=1.1, powerMultiplier=1.05\n' +
          'coral_cutlass: price=2500, powerMultiplier=1.15',
      },
      {
        id: 'item-swords-rare',
        name: 'Waffen: Rare-Schwerter',
        icon: '/img/itemShop/sword/HolySunblade.png',
        description:
          '• Holy Sunblade: 15 000 Gold + 1× Sonnenessenz → +20% Power, +15% CPS\n' +
          '• Mechanical Gear Sword: 18 000 Gold + 2× Nebelquarz → +25% CPS, +12% Power\n' +
          '• Leaf & Vine Sword: 22 000 Gold + 1× Sonnenessenz → +20% CPS, +18% Power\n' +
          '• Lava Forge Blade: 28 000 Gold + 2× Nebelquarz → +28% Power, +8% CPS',
        lore: 'Klingen, die mit kosmischen Materialien gefertigt wurden.',
        formula:
          'holy_sunblade: price=15000, solar_essence×1, powerMultiplier=1.2, cpsMultiplier=1.15\n' +
          'mechanical_gear_sword: price=18000, nebula_quartz×2, cpsMultiplier=1.25, powerMultiplier=1.12\n' +
          'leaf_vine_sword: price=22000, solar_essence×1, cpsMultiplier=1.2, powerMultiplier=1.18\n' +
          'lava_forge_blade: price=28000, nebula_quartz×2, powerMultiplier=1.28, cpsMultiplier=1.08',
      },
      {
        id: 'item-swords-epic',
        name: 'Waffen: Epic-Schwerter',
        icon: '/img/itemShop/sword/StormBlade.png',
        description:
          '• Storm Blade: 65 000 Gold + 1× Leerscherbe → +40% Power, +12% CPS\n' +
          '• Frozen Tundra Sword: 75 000 Gold + 1× Leerscherbe → +45% Power, +8% CPS',
        lore: 'Waffen epischer Macht – jede Schwingung erschüttert den Kosmos.',
        formula:
          'storm_blade: price=65000, void_shard×1, powerMultiplier=1.4, cpsMultiplier=1.12\n' +
          'frozen_tundra_sword: price=75000, void_shard×1, powerMultiplier=1.45, cpsMultiplier=1.08',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 14. UNIVERSEN (PRESTIGE)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'universes',
    title: 'Universen & Prestige',
    icon: '🌌',
    entries: [
      {
        id: 'prestige-system',
        name: 'Prestige-System',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Sobald die Chimes für das aktuelle Universum gesammelt sind, kann ein Prestige durchgeführt werden. ' +
          'Ein Prestige setzt alle Chimes, Level, Meeps, Gebäude, Skillpunkte, Fähigkeiten und Augmente zurück. ' +
          'Die Gesamtzahl aller Klicks und verdienten Chimes bleibt erhalten.',
        lore: 'Jedes Universum ist ein neuer Anfang, eine neue Chance die kosmische Harmonie zu vollenden.',
        formula:
          'Startschwelle 1. Prestige: chimesToUniverseRescue = 100 000 Chimes\n' +
          'Nach jedem Prestige: Schwelle × 2\n' +
          'Prestige setzt zurück: chimes, level=1, meeps=0, abilityLevels=[0,0,0,0],\n' +
          '  skillPoints=0, activeAugments=[], Gebäude-Level\n' +
          'Bleibt erhalten: totalChimesEarned, totalClicks',
      },
      {
        id: 'universe-modifier',
        name: 'Universum-Modifikatoren',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Jedes neue Universum kann eigene Modifikatoren mitbringen, die das Spielgefühl verändern. ' +
          'Mögliche Modifikatoren: levelExponent, skillPointInterval, maxAbilityLevel, meepCostMultiplier u.v.m. ' +
          'Die Modifikatoren werden durch die universes.ts-Konfiguration definiert.',
        lore: 'Jedes Universum hat seine eigenen Gesetze. Passe dich an oder werde vergessen.',
        formula:
          'Modifier-Typen: levelExponent (Standard=1.8), skillPointInterval (Standard=2),\n' +
          '  maxAbilityLevel (Standard=5), meepCostMultiplier, buildingCostMultiplier,\n' +
          '  cpsMultiplier, cpcMultiplier u.a.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 15. TECHNISCHE KONSTANTEN (ÜBERSICHT)
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'constants',
    title: 'Alle Konstanten',
    icon: '🔢',
    entries: [
      {
        id: 'constants-game',
        name: 'Spiel-Kernkonstanten',
        icon: '/img/BardAbilities/Bard.png',
        description:
          'Die wichtigsten Werte, auf denen das gesamte Spiel aufbaut. Alle aus constants.ts.',
        lore: 'Die unveränderlichen Gesetze des Kosmos.',
        formula:
          'LEVEL_BASE = 500 | LEVEL_EXPONENT = 1.8\n' +
          'MEEP_BASE_COST = 20 | MEEP_COST_EXPONENT = 1.2\n' +
          'MAX_ABILITY_LEVEL = 5\n' +
          'SKILL_MEEP_COSTS = [Q:3, W:8, E:20, R:45]\n' +
          'gameSpeed = 1 000 ms (Spieltick-Interval)\n' +
          'baseChimesPerClick = 20',
      },
      {
        id: 'constants-battle',
        name: 'Kampf-Konstanten',
        icon: '/img/BardBattle.png',
        description: 'Alle Werte rund um das Kampfsystem.',
        lore: 'Die Mechanik des Krieges.',
        formula:
          'ELO_K_FACTOR = 32 | ELO_RATING_SCALE = 400 | ELO_LUCK_FACTOR = 0.15\n' +
          'AUTO_BATTLE_INTERVAL_MS = 45 000 ms\n' +
          'BATTLE_REAL_DURATION_SECONDS = 45\n' +
          'MMR_TO_POWER_MULTIPLIER = 1.5\n' +
          'OPPONENT_MMR_VARIANCE = 200\n' +
          'LP_BASE_CHANGE = 20\n' +
          'LP Beförderung: Normal=100 | Master=500 | GM=1000\n' +
          'LP Abstieg: Normal=75 | Master=400 | GM=900',
      },
      {
        id: 'constants-planets',
        name: 'Planeten-Konstanten',
        icon: '🪐',
        description: 'Alle Werte für Planeten-Events und Boss-Kämpfe.',
        lore: 'Die Gesetze der kosmischen Ereignisse.',
        formula:
          'PLANET_MAX_COUNT = 3 | SPAWN_MIN=6s | SPAWN_MAX=14s\n' +
          'PLANET_EVENT_BASE_CHANCE = 0.6 | PRESTIGE_BONUS = 0.35\n' +
          'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
          'PLANET_MATERIAL_CHANCE = 0.6 | CHAMPION_HOME_PLANET_CHANCE = 0.5\n' +
          'BOSS_BASE_HP=200 | BOSS_HP_LEVEL_SCALE=10 | BOSS_HP_CPS_SCALE=50\n' +
          'BOSS_HP_POWER_SCALE=5000 | BOSS_PASSIVE_DPS_FRACTION=0.1\n' +
          'BOSS_BASE_REWARD=500 | BOSS_REWARD_DIFFICULTY_SCALE=4\n' +
          'BOSS_CPS_PENALTY_FRACTION=0.05 | BOSS_CPS_PENALTY_DURATION=30s\n' +
          'BOSS_ENRAGE_BASE=30s | BOSS_ENRAGE_MAX=60s | BOSS_ENRAGE_STEP=5 Level',
      },
      {
        id: 'constants-expedition',
        name: 'Expeditions-Konstanten',
        icon: '🗺️',
        description: 'Alle Werte für das Expeditions-System.',
        lore: 'Das Maß aller Reisen.',
        formula:
          'MAX_ACTIVE_EXPEDITIONS = 3\n' +
          'CHAMPION_BASE_POWER = 50\n' +
          'CHAMPION_POWER_PER_LEVEL = 10',
      },
    ],
  },
]
