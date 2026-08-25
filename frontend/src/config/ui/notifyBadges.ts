// Die eine Beschreibung aller Notify-Marken.
//
// Vorher lag jede Marke dreifach im Code: ihre Zahl in der Komponente, ihr Titel
// in NOTIFY_BADGE_TITLE, ihre Farbe im Herold. Der Expeditions-Zähler stand
// wortgleich an sechs Stellen. Hier steht jede Marke einmal — Farbe, Ziel,
// Fundstellen; die Zahl liefert `composables/ui/useNotifyBadges.ts`.
//
// `sites` ist der Vertrag der Guard-Spec (`__tests__/config/notifyBadges.spec.ts`):
// kein Markup ohne Eintrag, kein Eintrag ohne Markup. Wer eine neue Marke baut,
// wird von ihr hierher geschickt — und ist damit im Badge Lab.

import {
  BADGE_ACCENT_CHAMPIONS,
  BADGE_ACCENT_CHRONICLE,
  BADGE_ACCENT_LEVEL,
  BADGE_HERALD_ACCENT_EXPEDITION,
  BADGE_HERALD_ACCENT_PLANET,
  BADGE_HERALD_ACCENT_SHOP,
  BADGE_HERALD_ACCENT_SKILL,
  BADGE_HERALD_ACCENT_SUN,
  CHRONICLE_RANK_ICON,
  HEADER_GEM_ICONS,
  NOTIFY_BADGE_TITLE,
} from '@/config/constants'
import type { NotifyBadgeDef, NotifyBadgeKind } from '@/types'

const HEADER_ARC = 'Header arc'
const PROFILE_TABS = 'Profile tab strip'

export const NOTIFY_BADGES: readonly NotifyBadgeDef[] = [
  {
    // ACHTUNG, und es ist kein Tippfehler: die Marken-ID heisst `shop`, ihr Ziel
    // ist `tree`. Die ID meint die Star Forge und ist so alt wie der Reiter, in
    // dem die Forge einmal wohnte; der Reiter `shop` gehoert seit der Trennung
    // dem Champion-Laden. Umbenannt ist sie nicht, weil `NotifyBadgeKind` durch
    // badgeSeed, useNotifyBadges, den Tooltip und das Badge Lab laeuft — viel
    // Diff fuer null Wirkung im Spiel. Wer sie „geradezieht", bricht den Sprung.
    id: 'shop',
    title: NOTIFY_BADGE_TITLE.shop,
    short: 'Ready to Forge',
    accent: BADGE_HERALD_ACCENT_SHOP,
    icon: HEADER_GEM_ICONS.tree,
    tab: 'tree',
    hasBadge: true,
    heralds: true,
    heraldEyebrow: 'STAR FORGE',
    heraldNoun: 'new purchase',
    sites: [
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'place="inline"',
        where: 'Skill-Tree-Reiter der Profil-Leiste',
      },
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: '<ShopReadyBadge',
        where: 'Ecktaste rechts im Header (Skill Tree)',
      },
      {
        file: 'components/bardProfil/skillTree/ForgeUpgradeTile.vue',
        marker: '<ShopReadyBadge',
        where: 'Upgrade-Zeile im Skill-Tree-Reiter',
      },
      {
        file: 'components/bardProfil/skillTree/ForgeOfferRow.vue',
        marker: '<ShopReadyBadge',
        where: 'Offer strip',
      },
      {
        file: 'components/bardProfil/skillTree/ForgeTreePanel.vue',
        marker: '<ShopReadyBadge',
        where: 'Knotenecke im Forge-Netz',
      },
    ],
    seedability: 'exact',
    reversible: 'full',
    seedNote: 'Leert die Quittungen bis auf n. Hebt vorher Chimes und Material an.',
  },
  {
    id: 'skill',
    title: NOTIFY_BADGE_TITLE.skill,
    short: 'Skill Ready',
    accent: BADGE_HERALD_ACCENT_SKILL,
    imageSrc: '/img/BardAbilities/BardMeep-128.png',
    tab: 'tree',
    hasBadge: true,
    heralds: true,
    heraldEyebrow: 'THE WANDERING',
    heraldNoun: 'skill',
    sites: [
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: 'header-notif-badge--skill',
        where: HEADER_ARC,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--skill',
        where: PROFILE_TABS,
      },
    ],
    // KEINE eigene Marke mehr im Netz und in der Schiene: seit The Wandering
    // im Star-Forge-Netz steht, trägt ein frischer Meep-Knoten dieselbe
    // `ShopReadyBadge` wie jeder andere frische Eintrag. Sie gehört dem
    // `shop`-Eintrag — zwei Registry-Einträge, die denselben Marker
    // beanspruchen, wären durch die Guard-Spec nicht mehr trennbar.
    //
    // Was dieser Marke bleibt, sind ihre ZWEI eigenen Orte: der Bogen im
    // Header und der Reiter im Profil. Beide zählen „lernbar“, nicht
    // „schmiedbar“ — deshalb bleibt sie ein eigener Eintrag mit eigenem
    // Herold-Kanal.
    extraMarkers: [],
    seedability: 'capped',
    reversible: 'full',
    // Fünf Zweige mit je einem Tier-1-Knoten — das ist die Decke auf frischem Stand.
    seedNote:
      'Hebt Meeps an, lässt n lernbare Knoten unquittiert. Frisch sind höchstens 5 lernbar.',
  },
  {
    id: 'expedition',
    title: NOTIFY_BADGE_TITLE.expedition,
    short: 'Expeditions Ready',
    accent: BADGE_HERALD_ACCENT_EXPEDITION,
    icon: 'game-icons:caravel',
    tab: 'expedition',
    hasBadge: true,
    heralds: true,
    heraldEyebrow: 'EXPEDITION',
    heraldNoun: 'crew',
    sites: [
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: 'header-notif-badge--expedition',
        where: HEADER_ARC,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--expedition',
        where: PROFILE_TABS,
      },
      {
        file: 'components/bardProfil/expedition/ExpeditionCommandBar.vue',
        marker: '<RpgNotifyBadge',
        where: 'Voyages command bar',
      },
      {
        file: 'components/bardProfil/expedition/ExpeditionSiteNode.vue',
        marker: '<RpgNotifyBadge',
        where: 'Voyages-Karte, am zurückgekehrten Hafen',
      },
    ],
    seedability: 'exact',
    reversible: 'full',
    seedNote: 'Legt n abgeschlossene Missionen an, erkennbar am ID-Präfix. Clear nimmt genau die.',
  },
  {
    id: 'planet',
    title: NOTIFY_BADGE_TITLE.planet,
    short: 'Orbit Upgrades',
    accent: BADGE_HERALD_ACCENT_PLANET,
    icon: 'game-icons:ringed-planet',
    tab: 'planets',
    hasBadge: true,
    heralds: true,
    heraldEyebrow: 'ORBIT',
    heraldNoun: 'level-up',
    sites: [
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: 'header-notif-badge--planet',
        where: HEADER_ARC,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--planet',
        where: PROFILE_TABS,
      },
      {
        file: 'components/bardProfil/planets/PlanetRailSlot.vue',
        marker: 'ps-slot-notify',
        where: 'Slot in the planet rail',
      },
      {
        file: 'components/bardProfil/planets/PlanetStagePanel.vue',
        marker: 'ps-buy-badge',
        where: 'Level-up button on the planet stage',
      },
    ],
    extraMarkers: ['ps-buy-badge'],
    seedability: 'derived',
    reversible: 'partial',
    seedNote:
      'Reine Chimes-Ableitung: setzt Chimes auf die n-te Kostenschwelle. Trifft nicht immer genau n und geht nur aus, wenn der Stand vorher ärmer war.',
  },
  {
    id: 'forge',
    title: NOTIFY_BADGE_TITLE.forge,
    short: 'Sun Evolution',
    accent: BADGE_HERALD_ACCENT_SUN,
    icon: 'game-icons:heraldic-sun',
    tab: 'bard',
    hasBadge: true,
    heralds: true,
    heraldEyebrow: 'SOLAR ASCENT',
    sites: [
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: 'header-notif-badge--forge',
        where: HEADER_ARC,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--forge',
        where: PROFILE_TABS,
      },
    ],
    seedability: 'exact',
    reversible: 'partial',
    seedNote:
      'Ja/Nein statt Zahl. Hebt die Kernstrahlen auf Phase+1 und überspringt die Verweildauer — clear sperrt nur die Verweildauer wieder, die Strahlen bleiben.',
  },
  {
    id: 'champions',
    title: NOTIFY_BADGE_TITLE.champions,
    short: 'New Champions',
    accent: BADGE_ACCENT_CHAMPIONS,
    icon: 'game-icons:crested-helmet',
    tab: 'shop',
    hasBadge: true,
    heralds: false,
    sites: [
      {
        file: 'components/header/AppHeaderComponent.vue',
        marker: 'header-notif-badge--champion',
        where: HEADER_ARC,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--champion',
        where: PROFILE_TABS,
      },
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'tone="champions"',
        where: 'Ecktaste links im Header (Shop)',
      },
      {
        file: 'components/bardProfil/shop/ChampionShopCard.vue',
        marker: '<RpgNotifyBadge',
        where: 'Karte im Champion-Shop',
      },
    ],
    seedability: 'capped',
    reversible: 'full',
    seedNote: 'Macht n echte Champions rekrutierbar. Auf vollem Roster bleibt nichts übrig.',
  },
  {
    id: 'chronicle',
    title: NOTIFY_BADGE_TITLE.chronicle,
    short: 'Codex Stages',
    accent: BADGE_ACCENT_CHRONICLE,
    icon: CHRONICLE_RANK_ICON,
    tab: 'bard',
    hasBadge: true,
    heralds: false,
    sites: [
      {
        file: 'components/bardProfil/BardProfileMenu.vue',
        marker: 'mini-badge--chronicle',
        where: PROFILE_TABS,
      },
    ],
    seedability: 'exact',
    reversible: 'full',
    seedNote: 'Markiert n Codex-Bahnen als ungesehen. Clear ist markSeen().',
  },
  {
    id: 'level',
    title: NOTIFY_BADGE_TITLE.level,
    short: 'Next Level',
    accent: BADGE_ACCENT_LEVEL,
    icon: 'ph:arrow-fat-up-fill',
    tab: null,
    // Kein Abzeichen; den Titel trägt der Kopf von LevelProgressTooltip.vue.
    // Steht hier aus demselben Grund, aus dem es in NOTIFY_BADGE_TITLE steht:
    // eine halbe Tabelle ist schlechter.
    hasBadge: false,
    heralds: false,
    sites: [],
    seedability: 'none',
    reversible: 'none',
    seedNote: 'Dauer-Anzeige des Bard-Levels, keine Marke — nichts zu befüllen.',
  },
]

export const NOTIFY_BADGE_BY_KIND = Object.fromEntries(
  NOTIFY_BADGES.map((b) => [b.id, b]),
) as Record<NotifyBadgeKind, NotifyBadgeDef>

/** Die Marken, für die der Herold sich meldet — Reihenfolge wie oben. */
export const HERALDING_BADGE_KINDS: readonly NotifyBadgeKind[] = NOTIFY_BADGES.filter(
  (b) => b.heralds,
).map((b) => b.id)

/** Was das Badge Lab anfassen kann. */
export const SEEDABLE_BADGE_KINDS: readonly NotifyBadgeKind[] = NOTIFY_BADGES.filter(
  (b) => b.seedability !== 'none',
).map((b) => b.id)
