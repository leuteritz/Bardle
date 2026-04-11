import type { EncyclopediaCategory } from './types'

export const buildingsCategory: EncyclopediaCategory = {
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
}

export const permanentUpgradesCategory: EncyclopediaCategory = {
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
}

export const abilitiesCategory: EncyclopediaCategory = {
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
}
