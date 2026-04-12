import type { EncyclopediaCategory } from './types'

export const resourcesCategory: EncyclopediaCategory = {
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
}

export const levelingCategory: EncyclopediaCategory = {
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
        'Schwelle für Level N = ceil(2000 × N^2.2)\n' +
        'LEVEL_BASE = 2000 | LEVEL_EXPONENT = 2.2\n' +
        'Beispiel: Level 5 → ceil(2000 × 5^2.2) = ceil(2000 × 21.11) ≈ 42 220 Chimes\n' +
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
}
