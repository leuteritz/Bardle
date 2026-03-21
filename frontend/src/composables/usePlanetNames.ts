const PREFIXES = [
  'Kor',
  'Vel',
  'Zar',
  'Nox',
  'Aer',
  'Syn',
  'Dor',
  'Kel',
  'Vex',
  'Myr',
  'Tal',
  'Rix',
  'Pho',
  'Qel',
  'Wyn',
  'Bra',
  'Cyn',
  'Dex',
  'Fal',
  'Gron',
  'Hyn',
  'Irr',
  'Jov',
  'Kael',
  'Lyr',
  'Mor',
  'Neth',
  'Orr',
  'Pryx',
  'Rael',
  'Sol',
  'Thyr',
  'Unn',
  'Vor',
  'Wyx',
  'Xan',
  'Yel',
  'Zan',
  'Ath',
  'Bel',
]

const MIDDLES = [
  'ara',
  'el',
  'on',
  'ir',
  'un',
  'eth',
  'al',
  'or',
  'yn',
  'av',
  'em',
  'ix',
  'ul',
  'an',
  'oth',
  'er',
  'in',
  'os',
  'ur',
  'aen',
]

const SUFFIXES = [
  'ion',
  'us',
  'ara',
  'ix',
  'on',
  'ael',
  'or',
  'an',
  'era',
  'ax',
  'is',
  'um',
  'eth',
  'el',
  'os',
  'yn',
  'oth',
  'ur',
  'iel',
  'eon',
  'ax',
  'uun',
  'orr',
  'ynn',
  'ath',
  'ex',
  'yl',
  'orn',
  'iss',
  'ark',
]

// Optional decorative additions
const PREFIXES_NOBLE = ['Prime ', 'New ', 'Old ', 'Greater ', 'Lesser ']
const SUFFIXES_ROMAN = [' I', ' II', ' III', ' IV', ' V', ' VI', ' VII']

const usedNames = new Set<string>()
let fallbackCounter = 0

type NameStyle = 'short' | 'medium' | 'long' | 'noble' | 'roman'

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateCandidate(): string {
  // Weighted style distribution
  const roll = Math.random()
  let style: NameStyle

  if (roll < 0.3)
    style = 'short' // Prefix + Suffix
  else if (roll < 0.6)
    style = 'medium' // Prefix + Middle + Suffix
  else if (roll < 0.75)
    style = 'long' // Prefix + Middle + Middle + Suffix
  else if (roll < 0.88)
    style = 'noble' // "Prime Korion" etc.
  else style = 'roman' // "Velara III" etc.

  const p = pickRandom(PREFIXES)
  const s = pickRandom(SUFFIXES)
  const m1 = pickRandom(MIDDLES)
  const m2 = pickRandom(MIDDLES)

  switch (style) {
    case 'short':
      return p + s
    case 'medium':
      return p + m1 + s
    case 'long':
      return p + m1 + m2 + s
    case 'noble':
      return pickRandom(PREFIXES_NOBLE) + p + s
    case 'roman':
      return p + s + pickRandom(SUFFIXES_ROMAN)
  }
}

export function generateUniquePlanetName(): string {
  const MAX_ATTEMPTS = 1000

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const name = generateCandidate()
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
  }

  // Fallback – praktisch nie erreichbar bei dieser Kombinationsvielfalt
  const fallback = `Planet-${++fallbackCounter}`
  usedNames.add(fallback)
  return fallback
}

export function releasePlanetName(name: string): void {
  usedNames.delete(name)
}
