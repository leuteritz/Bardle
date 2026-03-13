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
          'Die primaere Waehrung im Spiel. Chimes werden durch Klicken oder passive Gebaeude-Produktion (CPS) verdient. Sie werden zum Kaufen von Gebaeuden, Beschwören von Meeps und fuer den Universum-Fortschritt verwendet.',
        lore: 'Kosmische Klaenge, die durch die Dimensionen hallen. Jeder Chime traegt ein Fragment der universellen Harmonie in sich.',
        formula: 'Manuell: Chimes pro Klick (CPC) | Passiv: Chimes pro Sekunde (CPS)',
      },
      {
        id: 'meeps',
        name: 'Meeps',
        icon: '/img/BardAbilities/BardMeep.png',
        description:
          'Kleine kosmische Begleiter, die automatisch erscheinen wenn genuegend Chimes gesammelt wurden. Jeder Meep gibt +100 Kampfkraft und kann auf Expeditionen geschickt werden.',
        lore: 'Treue Geister aus dem Raum zwischen den Welten. Sie folgen dem Ruf der Chimes und sammeln sich um ihren Meister.',
        formula: 'Kosten: 20 × Meeps^1.2 (reduziert durch E-Faehigkeit)',
      },
      {
        id: 'gold',
        name: 'Gold',
        icon: '/img/BardGold.png',
        description:
          'Wird durch gewonnene Kaempfe verdient. Gold dient zum Rekrutieren neuer Champions fuer das Kampf-Team.',
        lore: 'Die Waehrung der Schlachtfelder. Geschmiedet aus dem Triumph ueber wuerdige Gegner.',
      },
    ],
  },
  {
    id: 'buildings',
    title: 'Gebaeude',
    icon: '🏗️',
    entries: [
      {
        id: 'chimeClicker',
        name: 'Klicker',
        icon: '/img/ChimesPerClick.png',
        description:
          'Erhoeht die Chimes pro Klick (CPC). Jedes Level gibt +1 Basis-CPC, skaliert mit dem R-Ability-Multiplikator.',
        lore: 'Ein mechanischer Verstaerker, der die Resonanz jedes Klicks durch die kosmischen Frequenzen amplifiziert.',
        formula: 'Kosten: 50 × 1.2^Level | Effekt: +1 CPC pro Level',
      },
      {
        id: 'glockenturm',
        name: 'Glockenturm',
        icon: '/img/Glockenturm.png',
        description:
          'Das guenstigste CPS-Gebaeude. Produziert automatisch 1 Chime pro Sekunde pro Level.',
        lore: 'Uralte Tuerme, deren Glocken in Frequenzen schwingen, die nur kosmische Wesen hoeren koennen.',
        formula: 'Kosten: 25 × 1.15^Level | Effekt: +1 CPS pro Level',
      },
      {
        id: 'klanggenerator',
        name: 'Klang Generator',
        icon: '/img/KlangGenerator.png',
        description:
          'Mittlere Produktionsstufe. Erzeugt 3 Chimes pro Sekunde pro Level.',
        lore: 'Maschinen, die die natuerlichen Harmonien der Sternennebel einfangen und in reine Chime-Energie umwandeln.',
        formula: 'Kosten: 100 × 1.2^Level | Effekt: +3 CPS pro Level',
      },
      {
        id: 'harmoniewerk',
        name: 'Harmonie Werk',
        icon: '/img/HarmonieWerk.png',
        description:
          'Fortgeschrittene Produktionseinheit mit 5 CPS pro Level.',
        lore: 'Riesige Fabriken der Klangschmiede, wo rohe kosmische Energie in perfekte Harmonien geformt wird.',
        formula: 'Kosten: 500 × 1.25^Level | Effekt: +5 CPS pro Level',
      },
      {
        id: 'sphaerenMusik',
        name: 'Sphaeren Musik',
        icon: '/img/SphaerenMusik.png',
        description:
          'Hochwertige Einheit. Produziert 10 Chimes pro Sekunde pro Level.',
        lore: 'Die Musik der Sphaeren selbst, eingefangen in kristallinen Resonanzkammern jenseits von Raum und Zeit.',
        formula: 'Kosten: 2500 × 1.3^Level | Effekt: +10 CPS pro Level',
      },
      {
        id: 'zeitEcho',
        name: 'Zeit Echo',
        icon: '/img/ZeitEcho.png',
        description:
          'Die staerkste Produktionseinheit. 25 Chimes pro Sekunde pro Level, aber mit hohen Kosten.',
        lore: 'Echos aus der Zukunft, die durch Risse in der Zeit zurueckhallen und dabei Chimes aus noch ungeschriebenen Melodien formen.',
        formula: 'Kosten: 10000 × 1.4^Level | Effekt: +25 CPS pro Level',
      },
    ],
  },
  {
    id: 'abilities',
    title: 'Faehigkeiten',
    icon: '⚡',
    entries: [
      {
        id: 'ability-q',
        name: 'Q - Kosmischer Klang',
        icon: '/img/BardAbilities/BardQ.png',
        description:
          'Erhoeht die Chimes pro Sekunde (CPS) um +15% pro Level. Wirkt als Multiplikator auf die gesamte passive Produktion.',
        lore: 'Der erste Ton der Schoepfung, verstaerkt durch jahrhundertelange Meditation in den Sternen.',
        formula: 'CPS-Multiplikator: 1 + (Level × 0.15) | Max Level 5 = +75% CPS',
      },
      {
        id: 'ability-w',
        name: 'W - Sternenschild',
        icon: '/img/BardAbilities/BardW.png',
        description:
          'Gibt +300 Kampfkraft pro Level. Erhoeht direkt die Power fuer Kaempfe und verbessert die Gewinnchance.',
        lore: 'Ein Schutzschild aus verdichtetem Sternenlicht, das sowohl verteidigt als auch die innere Staerke entfesselt.',
        formula: 'Power-Bonus: Level × 300 | Max Level 5 = +1500 Power',
      },
      {
        id: 'ability-e',
        name: 'E - Portal-Resonanz',
        icon: '/img/BardAbilities/BardE.png',
        description:
          'Reduziert die Kosten fuer neue Meeps um 10% pro Level. Minimum 50% der Originalkosten.',
        lore: 'Die Portale zwischen den Welten schwingen in Resonanz und machen es leichter, Meeps aus dem Zwischenraum zu rufen.',
        formula: 'Kosten-Multiplikator: max(0.5, 1 - Level × 0.1) | Max Level 5 = -50%',
      },
      {
        id: 'ability-r',
        name: 'R - Bardischer Einklang',
        icon: '/img/BardAbilities/BardR.png',
        description:
          'Erhoeht die Chimes pro Klick (CPC) um +25% pro Level. Wirkt als Multiplikator auf manuelle Klicks und Klicker-Gebaeude.',
        lore: 'Die ultimative Harmonie zwischen Bard und dem Kosmos. Jede Beruehrung hallt durch alle Dimensionen.',
        formula: 'CPC-Multiplikator: 1 + (Level × 0.25) | Max Level 5 = +125% CPC',
      },
    ],
  },
  {
    id: 'battle',
    title: 'Kampfsystem',
    icon: '⚔️',
    entries: [
      {
        id: 'mmr',
        name: 'MMR (Matchmaking Rating)',
        icon: '/img/BardBattle.png',
        description:
          'Versteckter Wert, der die Staerke eines Spielers bestimmt. Steigt bei Siegen und faellt bei Niederlagen. Bestimmt Rang und Gegner-Schwierigkeit.',
        lore: 'Die kosmische Waage, die die Staerke jedes Kaempfers misst und wuerdige Gegner zusammenfuehrt.',
        formula: 'ELO-System: K-Faktor=32, Rating-Skala=400',
      },
      {
        id: 'lp',
        name: 'LP (League Points)',
        icon: '/img/BardBattle.png',
        description:
          'Sichtbare Punkte innerhalb einer Division. Bei 100 LP erfolgt eine Befoerderung in die naechste Division. Bei 0 LP droht ein Abstieg.',
        lore: 'Leuchtende Punkte auf dem Weg zum Gipfel der kosmischen Rangliste.',
      },
      {
        id: 'ranks',
        name: 'Raenge',
        icon: '/img/RankBorder/RankGold.png',
        description:
          'Von Iron bis Challenger: 10 Raenge mit je 4 Divisionen (IV-I). Der Rang bestimmt sich durch die MMR und steigt durch gewonnene Kaempfe.',
        lore: 'Die ewige Hierarchie der Kaempfer, geschmiedet in den Feuern unzaehliger Schlachten.',
      },
      {
        id: 'power',
        name: 'Kampfkraft (Power)',
        icon: '/img/BardAbilities/BardChimeMeep.png',
        description:
          'Meeps × 100 + W-Ability-Bonus. Bestimmt die Gewinnwahrscheinlichkeit gegen Gegner.',
        lore: 'Die gebuendelte Kraft aller Meeps und kosmischen Faehigkeiten, kanalisiert fuer den Kampf.',
        formula: 'Power = (Meeps × 100) + (W-Level × 300)',
      },
      {
        id: 'winProbability',
        name: 'Gewinnwahrscheinlichkeit',
        icon: '/img/BardBattle.png',
        description:
          'Berechnet sich aus dem Unterschied zwischen eigener Power und Gegner-Power. Ein Gluecksfaktor von ±7.5% sorgt fuer Ueberraschungen.',
        lore: 'Selbst die Sterne koennen den Ausgang eines Kampfes nicht mit Sicherheit vorhersagen.',
        formula: 'Win% = 1 / (1 + 10^(-PowerDiff/400)) ± 7.5% Glueck',
      },
    ],
  },
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
          'Rekrutiere Champions mit Gold fuer dein 5v5-Kampf-Team. Jeder Champion hat individuelle Staerken. Ein volles Team von 5 Champions maximiert die Kampfkraft.',
        lore: 'Helden aus allen Dimensionen, die dem Ruf des kosmischen Wanderers folgen und an seiner Seite kaempfen.',
      },
      {
        id: 'champion-team',
        name: 'Team-Aufstellung',
        icon: '/img/minimap.png',
        description:
          'Stelle ein Team aus 5 Champions zusammen. Die Teamstaerke beeinflusst die Kaempfe gegen automatisch generierte Gegner-Teams.',
        lore: 'Die richtige Kombination von Kaempfern kann den Unterschied zwischen Sieg und Niederlage ausmachen.',
      },
    ],
  },
  {
    id: 'universes',
    title: 'Universen',
    icon: '🌌',
    entries: [
      {
        id: 'prestige-system',
        name: 'Prestige-System',
        icon: '/img/BardAbilities/BardChime.png',
        description:
          'Sammle genuegend Chimes um das naechste Universum zu retten. Ein Prestige setzt Chimes, Level, Meeps und Gebaeude zurueck, schaltet aber ein neues Universum frei.',
        lore: 'Jedes Universum ist ein neuer Anfang, eine neue Chance die kosmische Harmonie wiederherzustellen.',
        formula: 'Kosten verdoppeln sich mit jedem Universum (Start: 100.000)',
      },
      {
        id: 'universe-runeterra',
        name: 'Runeterra Prime',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das urspruengliche Universum. Hier beginnt die Reise des kosmischen Wanderers.',
        lore: 'Das urspruengliche Universum',
      },
      {
        id: 'universe-void',
        name: 'Void Nexus',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das zweite Universum. Die Dimension der Leere wartet auf Rettung.',
        lore: 'Dimension der Leere',
      },
      {
        id: 'universe-celestial',
        name: 'Celestial Realm',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das dritte Universum. Ein himmlisches Reich voller kosmischer Energie.',
        lore: 'Himmlisches Reich',
      },
      {
        id: 'universe-shadow',
        name: 'Shadow Isles',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das vierte Universum. Die Inseln der Schatten bergen dunkle Geheimnisse.',
        lore: 'Inseln der Schatten',
      },
      {
        id: 'universe-freljord',
        name: 'Freljord',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das fuenfte Universum. Ewige Eiswueste mit verborgener Macht.',
        lore: 'Ewige Eiswueste',
      },
      {
        id: 'universe-shurima',
        name: 'Shurima',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das sechste Universum. Eine antike Wuestenzivilisation mit vergessenen Schaetzen.',
        lore: 'Antike Wuestenzivilisation',
      },
      {
        id: 'universe-ionia',
        name: 'Ionia',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das siebte Universum. Land der Harmonie und spirituellen Balance.',
        lore: 'Land der Harmonie',
      },
      {
        id: 'universe-noxus',
        name: 'Noxus',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das achte Universum. Das Imperium der Staerke fordert den Wanderer heraus.',
        lore: 'Imperium der Staerke',
      },
      {
        id: 'universe-demacia',
        name: 'Demacia',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das neunte Universum. Ein Koenigreich der Gerechtigkeit und des Lichts.',
        lore: 'Koenigreich der Gerechtigkeit',
      },
      {
        id: 'universe-piltover',
        name: 'Piltover',
        icon: '/img/BardAbilities/BardChime.png',
        description: 'Das zehnte und letzte Universum. Die Stadt des Fortschritts und der Innovation.',
        lore: 'Stadt des Fortschritts',
      },
    ],
  },
  {
    id: 'expeditions',
    title: 'Expeditionen',
    icon: '🌀',
    entries: [
      {
        id: 'expedition-system',
        name: 'Expeditions-System',
        icon: '/img/BardAbilities/BardMeep.png',
        description:
          'Schicke Meeps durch Portale in andere Universen. Nach Ablauf der Dauer kehren sie mit Chimes zurueck. Nur eine Expedition gleichzeitig moeglich.',
        lore: 'Die Portale zwischen den Welten sind gefaehrlich, aber die Belohnungen fuer mutige Meeps sind immens.',
        formula: 'Belohnung: 50 × Meep-Kosten × Multiplikator × gesendete Meeps',
      },
      {
        id: 'exp-runeterra',
        name: 'Runeterra Prime',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Kurze Expedition (1 Min). Niedriger Multiplikator, ideal fuer den Einstieg.',
        lore: 'Ein kurzer Ausflug in die vertrauten Laender von Runeterra.',
        formula: 'Dauer: 1 Min | Multiplikator: ×1',
      },
      {
        id: 'exp-void',
        name: 'Void Nexus',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Mittlere Expedition (3 Min). Doppelter Multiplikator.',
        lore: 'Die Leere verschlingt alles - aber belohnt jene, die zurueckkehren.',
        formula: 'Dauer: 3 Min | Multiplikator: ×2',
      },
      {
        id: 'exp-shadow',
        name: 'Shadow Isles',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Expedition in die Schatten (5 Min). Dreifacher Multiplikator.',
        lore: 'Nebel und Dunkelheit verbergen reiche Schaetze fuer die Mutigen.',
        formula: 'Dauer: 5 Min | Multiplikator: ×3',
      },
      {
        id: 'exp-freljord',
        name: 'Freljord',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Lange Expedition in die Eiswueste (10 Min). Fuenffacher Multiplikator.',
        lore: 'Die eisigen Winde tragen kostbare Kristalle aus vergessenen Zeitaltern.',
        formula: 'Dauer: 10 Min | Multiplikator: ×5',
      },
      {
        id: 'exp-shurima',
        name: 'Shurima',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Wuestenexpedition (20 Min). Achtfacher Multiplikator.',
        lore: 'Unter dem endlosen Sand liegen die Schaetze einer untergegangenen Zivilisation.',
        formula: 'Dauer: 20 Min | Multiplikator: ×8',
      },
      {
        id: 'exp-ionia',
        name: 'Ionia',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Spirituelle Reise (30 Min). Zwoelffacher Multiplikator.',
        lore: 'Die Harmonie Ionias verstaerkt die Chime-Resonanz der Meeps.',
        formula: 'Dauer: 30 Min | Multiplikator: ×12',
      },
      {
        id: 'exp-noxus',
        name: 'Noxus',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Gefaehrliche Expedition ins Imperium (45 Min). 17-facher Multiplikator.',
        lore: 'Das Imperium der Staerke testet jeden Eindringling - und belohnt die Ueberlebenden.',
        formula: 'Dauer: 45 Min | Multiplikator: ×17',
      },
      {
        id: 'exp-demacia',
        name: 'Demacia',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Koenigliche Expedition (1 Std). 25-facher Multiplikator.',
        lore: 'Das Licht Demacias segnet die Rueckkehrenden mit reichen Gaben.',
        formula: 'Dauer: 1 Std | Multiplikator: ×25',
      },
      {
        id: 'exp-celestial',
        name: 'Celestial Realm',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Himmlische Reise (1.5 Std). 40-facher Multiplikator.',
        lore: 'Die himmlischen Sphaeren uebergiessen die Meeps mit reiner kosmischer Energie.',
        formula: 'Dauer: 1.5 Std | Multiplikator: ×40',
      },
      {
        id: 'exp-piltover',
        name: 'Piltover',
        icon: '/img/BardAbilities/BardMeep.png',
        description: 'Laengste Expedition (2 Std). Hoechster Multiplikator von ×60.',
        lore: 'Die technologische Hauptstadt belohnt Geduld mit unvorstellbaren Reichtümern.',
        formula: 'Dauer: 2 Std | Multiplikator: ×60',
      },
    ],
  },
  {
    id: 'progression',
    title: 'Fortschritt',
    icon: '📈',
    entries: [
      {
        id: 'level-system',
        name: 'Level-System',
        icon: '/img/BardAbilities/Bard.png',
        description:
          'Das Level steigt mit gesammelten Chimes. Alle 2 Level gibt es einen Skillpunkt fuer Faehigkeiten-Upgrades.',
        lore: 'Jede gesammelte Melodie bringt den Wanderer naeher an die kosmische Erleuchtung.',
        formula: 'Chimes fuer Level N: 10 × N^1.2 | Skillpunkt alle 2 Level',
      },
      {
        id: 'skill-points',
        name: 'Skillpunkte',
        icon: '/img/BardAbilities/Bard.png',
        description:
          'Werden alle 2 Level verdient. Koennen in die vier Faehigkeiten (Q/W/E/R) investiert werden, jeweils bis maximal Level 5.',
        lore: 'Punkte der Erkenntnis, die dem Wanderer neue Kraefte verleihen.',
      },
      {
        id: 'ingame-time',
        name: 'Spielzeit',
        icon: '/img/BardAbilities/Bard.png',
        description:
          'Zaehlt die Sekunden seit Spielbeginn. Wird oben rechts angezeigt. Laeuft auch waehrend Auto-Battles und Expeditionen weiter.',
        lore: 'Die Zeit fliesst anders in den kosmischen Weiten - aber der Wanderer vergisst nie, wie lange er schon unterwegs ist.',
      },
    ],
  },
]
