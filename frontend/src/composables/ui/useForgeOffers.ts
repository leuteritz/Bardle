import { computed, type ComputedRef } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useForgeHerald } from '@/composables/ui/useForgeHerald'
import { useHerald } from '@/composables/ui/useHerald'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'
import { forgeCostItems } from '@/utils/game/forgeCost'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
  forgeNodeName,
  getForgeConstellation,
} from '@/config/progression/starForge'
import type {
  ForgeBargainDef,
  ForgeConstellationDef,
  ForgeCostItem,
  ForgeOffer,
  ForgeOfferReq,
  ForgeNodeRequirement,
  ForgeVaultEntry,
} from '@/types'
import {
  FORGE_DESC_PERCENT_TOKEN,
  FORGE_DESC_VALUE_TOKEN,
  FORGE_OFFER_TAG_CONSTELLATION,
  FORGE_OFFER_VERB_BARGAIN,
  FORGE_OFFER_VERB_CONSTELLATION,
  FORGE_OFFER_VERB_RELIC,
  FORGE_OFFER_VERB_UPGRADE,
  FORGE_PANEL_SECTIONS,
  FORGE_VAULT_FUSED_BADGE,
  FORGE_VAULT_MAX_BADGE,
  MS_PER_SECOND,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@/config/constants'

/**
 * Alles Kaufbare AUSSERHALB des Sternbaums, fertig zum Anzeigen — Relikte,
 * Konstellationen und der kosmische Handel in EINER Fassung.
 *
 * Dieselbe Rolle, die `useForgeUpgrades` für den Baum spielt, und aus demselben
 * Grund ausgelagert: seit die Abteilungs-Rail gestrichen ist, lesen ZWEI
 * Komponenten diese Rechnungen — der Streifen über der Liste
 * (`ForgeOfferStrip`) und das Archiv darunter (`ForgeVaultSection`). Sie lagen
 * bis dahin als lokale `computed` in `StarForgePanel.vue`, wo genau eine
 * Ansicht sie brauchte.
 *
 * ── Die Regel, die den Streifen trägt ───────────────────────────────────────
 * Ob ein Angebot ERSCHEINT, hängt allein an seiner Freischaltung; ob es kaufbar
 * AUSSIEHT, allein am Geldbeutel. Die Trennung ist nicht kosmetisch: eine
 * Sichtbarkeit am Chime-Bestand ließe Zeilen unter dem Zeiger auftauchen und
 * verschwinden, während die Chimes jede Sekunde ticken — derselbe Fehler, gegen
 * den `frozenBuckets` in `ForgeUpgradesSection` schon einmal gebaut wurde.
 *
 *   • Relikt        — im Streifen, sobald `relicRequirementMet` und nicht maxed
 *   • Konstellation — im Streifen, sobald `constellationRequirementMet` und
 *                     nicht fusioniert
 *   • Handel        — gar nicht im Streifen, sondern als `bargainOffer` im
 *                     festen Kopf der Spalte (`ForgeBargainBar`): er ist der
 *                     einzige mit einer laufenden Uhr, und die soll man sehen,
 *                     ohne zu rollen
 *
 * Alles andere sinkt ins Archiv. Ganz wegzulassen ging nicht: der
 * Fortschrittsbalken „Moon Orbit 2/3" ist die einzige Auskunft, auf die der
 * Spieler HINARBEITEN kann.
 *
 * ── Was hier NICHT steht ────────────────────────────────────────────────────
 * Kein Store-Zustand. Jede Zahl kommt aus vorhandenen Gettern des
 * `starForgeStore`; dieses Modul ordnet sie nur und übersetzt sie in eine Form,
 * die drei verschiedene Kataloge gemeinsam tragen können.
 */

/** Die Leitfarbe des Handels — er ist der einzige ohne eigene im Katalog. */
const BARGAIN_COLOR =
  FORGE_PANEL_SECTIONS.find((section) => section.id === 'bargain')?.accent ?? '#e8c040'

/** Die Einheit eines Stufenwerts steckt im Beschreibungstext seiner Definition. */
function valueUnit(desc: string): string {
  return desc.includes(FORGE_DESC_PERCENT_TOKEN) ? '%' : ''
}

/**
 * Was für ein Handel das ist — der Chip neben seinem Namen.
 *
 * Der Satz darunter erklärt, dieser Chip ordnet ein: „Timed blessing · 2 h" sagt
 * vor dem Lesen, ob man es mit einem Vorrat oder mit einer laufenden Uhr zu tun
 * hat.
 */
export function bargainKindLabel(def: ForgeBargainDef): string {
  switch (def.kind) {
    case 'buff': {
      const minutes = Math.round((def.durationMs ?? 0) / (MS_PER_SECOND * SECONDS_PER_MINUTE))
      const hours = (def.durationMs ?? 0) / (MS_PER_SECOND * SECONDS_PER_HOUR)
      return hours >= 1 ? `Timed blessing · ${hours} h` : `Timed blessing · ${minutes} min`
    }
    case 'materials':
      return 'Material crate'
    case 'gold':
      return 'Trade'
    case 'dwellSkip':
      return 'Phase skip'
    case 'heal':
      return 'Instant repair'
    case 'voidPurge':
      return 'Rift purge'
    case 'meeps':
      return 'Meep caravan'
  }
  return ''
}

/** Was der Handel zusätzlich zu einer normalen Zeile zeigt — nur fürs Kärtchen. */
export interface ForgeBargainExtras {
  /** Der Inhalt eines Materialkastens. */
  rewards: ForgeCostItem[]
  /** Materialien, die ein Tausch VERLANGT (`kind: 'gold'`). */
  costs: ForgeCostItem[]
  /** Der Rest des Sortiments — die Frage, die ein Reroll in Wahrheit stellt. */
  wares: { id: string; name: string; kind: string }[]
  /** Der ungerabattierte Preis, wenn es einen Abzug gibt; sonst `0`. */
  basePrice: number
  goldReward: number
}

export function useForgeOffers(): {
  offers: ComputedRef<ForgeOffer[]>
  offerById: ComputedRef<Map<string, ForgeOffer>>
  pursuedOffer: ComputedRef<ForgeOffer | null>
  pursuedId: ComputedRef<string | null>
  vaultEntries: ComputedRef<ForgeVaultEntry[]>
  bargainOffer: ComputedRef<ForgeOffer | null>
  bargainExtras: ComputedRef<ForgeBargainExtras>
  freshIds: ComputedRef<Set<string>>
  buyOffer: (id: string) => boolean
  rerollBargain: () => boolean
  canReroll: ComputedRef<boolean>
} {
  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  const forgeStore = useStarForgeStore()
  const { heraldRelic, heraldConstellation, heraldBargain } = useForgeHerald()
  const { announceReceipt } = useHerald()
  const { pursuitId } = useForgeSpotlight()

  function costItems(cost: Record<string, number>): ForgeCostItem[] {
    return forgeCostItems(cost, inventoryStore.collectedMaterials)
  }

  // ── Relikte ────────────────────────────────────────────────────────────────
  /**
   * Der Wirkungssatz mit eingesetztem Wert. Auf Stufe 0 zeigt er den Wert der
   * ERSTEN Stufe — sonst stünde dort „+0%", und das ist keine Auskunft darüber,
   * was der Kauf bringt.
   */
  function relicDesc(id: string): string {
    const def = FORGE_RELICS.find((relic) => relic.id === id)
    if (!def) return ''
    const level = Math.max(1, forgeStore.relicLevel(id))
    return def.desc.replace(FORGE_DESC_VALUE_TOKEN, String(level * def.effectPerLevel))
  }

  const relicOffers = computed<ForgeOffer[]>(() =>
    FORGE_RELICS.filter(
      (def) =>
        forgeStore.relicRequirementMet(def.id) && forgeStore.relicLevel(def.id) < def.maxLevel,
    ).map((def) => {
      const level = forgeStore.relicLevel(def.id)
      const gold = forgeStore.relicGoldCost(def.id)
      const unit = valueUnit(def.desc)
      return {
        id: def.id,
        kind: 'relic' as const,
        name: def.name,
        icon: def.icon,
        color: def.color,
        tag: def.rarity.toUpperCase(),
        // Eine zweite Stufe ist ein Ausbau, keine Schmiedung — das Verb sagt es.
        verb: level === 0 ? FORGE_OFFER_VERB_RELIC : FORGE_OFFER_VERB_UPGRADE,
        desc: relicDesc(def.id),
        level,
        maxLevel: def.maxLevel,
        nowText: level === 0 ? '—' : `+${level * def.effectPerLevel}${unit}`,
        nextText: `+${(level + 1) * def.effectPerLevel}${unit}`,
        gold,
        goldOk: gameStore.chimes >= gold,
        materials: costItems(forgeStore.relicMaterialCost(def.id)),
        ready: forgeStore.canForgeRelic(def.id),
        reqs: [],
        restockMs: null,
        sold: false,
        discountPct: 0,
      }
    }),
  )

  // ── Der Vault — Relikte und Konstellationen ─────────────────────────
  /**
   * Eine Bedingung mit Fortschritt, für das Kärtchen am Zeiger.
   *
   * Hiess `constellationReq(nodeId)` und las die Stufe aus einer globalen
   * Konstante — damals war sie fuer alle zehn Konstellationen dieselbe. Seit
   * Relikt und Konstellation dieselbe `requires`-Liste fuehren, kommt sie vom
   * Eintrag.
   *
   * `forgeNodeName` statt `getForgeNode(id)?.name`: die Liste darf einen
   * Strahl (Ring 1) nennen, und der steht nicht in `FORGE_NODES`.
   */
  function vaultReq(req: ForgeNodeRequirement): ForgeOfferReq {
    const have = forgeStore.anyNodeLevel(req.id)
    const need = req.level
    return {
      id: req.id,
      name: forgeNodeName(req.id) || req.id,
      have,
      need,
      met: have >= need,
      progress: need <= 0 ? 1 : Math.min(1, have / need),
    }
  }

  /**
   * Ein Katalogeintrag als Zeile — OHNE Rueckfrage, ob seine Tore offen sind.
   *
   * Herausgezogen, weil der Verfolgungs-Block dieselbe Zeile fuer ein noch
   * gesperrtes Upgrade braucht. Die Freischaltung entscheidet weiter darueber,
   * wer im STREIFEN steht; sie gehoert damit in den Filter und nicht hierher.
   */
  function constellationOffer(def: ForgeConstellationDef): ForgeOffer {
    return {
      id: def.id,
      kind: 'constellation' as const,
      name: def.name,
      icon: def.icon,
      color: def.color,
      tag: FORGE_OFFER_TAG_CONSTELLATION,
      verb: FORGE_OFFER_VERB_CONSTELLATION,
      // Konstellations-Beschreibungen tragen keinen Platzhalter, sie sind schon
      // fertige Sätze („+18% Chimes/Sec.").
      desc: def.desc,
      level: 0,
      maxLevel: 0,
      nowText: '',
      nextText: '',
      gold: def.goldCost,
      goldOk: gameStore.chimes >= def.goldCost,
      materials: costItems(def.materialCost),
      ready: forgeStore.canForgeConstellation(def.id),
      // Im Streifen sind sie der Beleg, dass die Zeile freigeschaltet ist; im
      // Verfolgungs-Block sind sie der Weg dorthin.
      reqs: def.requires.map(vaultReq),
      restockMs: null,
      sold: false,
      discountPct: 0,
    }
  }

  const constellationOffers = computed<ForgeOffer[]>(() =>
    FORGE_CONSTELLATIONS.filter(
      (def) =>
        forgeStore.constellationRequirementMet(def.id) && !forgeStore.constellationForged(def.id),
    ).map(constellationOffer),
  )

  /**
   * Was gerade VERFOLGT wird — der eine Vault-Eintrag, auf den von aussen
   * gezeigt wurde.
   *
   * Ohne den Freischaltungs-Filter: beim Sprung von der gesperrten
   * Send-All-Kachel sind die Tore per Definition noch zu, und genau dann muss
   * die Zeile stehen. `ready` bleibt `canForgeConstellation` und ist damit
   * `false` — die Zeile zeigt, sie kauft nicht.
   *
   * `offers` und `offerById` bleiben unberuehrt: der Streifen fuehrt weiter nur
   * Kaufbares, und `buyOffer()` schlaegt in `offerById` nach — ein gesperrter
   * Eintrag steht dort nicht und kann deshalb gar nicht durchrutschen.
   */
  const pursuedOffer = computed<ForgeOffer | null>(() => {
    const id = pursuitId.value
    if (id === null) return null
    const def = getForgeConstellation(id)
    // Fusioniertes wird nicht verfolgt — es liegt im Archiv.
    if (!def || forgeStore.constellationForged(id)) return null
    return constellationOffer(def)
  })

  /** Wen der Streifen deshalb NICHT zeigen darf — zweimal in einer Spalte wäre ein Fehler. */
  const pursuedId = computed(() => pursuedOffer.value?.id ?? null)

  // ── Der kosmische Handel ───────────────────────────────────────────────────
  /**
   * Die EINE Zeile des festen Kopfes, getrennt von `offers`.
   *
   * Er war die erste Zeile des Streifens und rollte dort weg — ausgerechnet das
   * einzige Angebot mit einer ablaufenden Uhr. Jetzt steht er über allem
   * (`ForgeBargainBar`), und die Trennung an dieser Stelle ist der Grund, warum
   * der Streifen darunter nichts davon wissen muss.
   *
   * In `offerById` bleibt er trotzdem: `buyOffer(id)` schlägt dort nach.
   */
  const bargainOffer = computed<ForgeOffer | null>(() => {
    const def = forgeStore.activeDeal
    if (!def) return null
    const price = forgeStore.bargainPrice(def)
    return {
      id: forgeStore.bargainDealId,
      kind: 'bargain' as const,
      name: def.name,
      icon: forgeStore.activeDealIcon,
      color: BARGAIN_COLOR,
      tag: bargainKindLabel(def),
      verb: FORGE_OFFER_VERB_BARGAIN,
      desc: def.desc,
      level: 0,
      maxLevel: 0,
      nowText: '',
      nextText: '',
      gold: price,
      goldOk: gameStore.chimes >= price,
      // Ein Tausch verlangt Material, ein Kasten liefert es — nur das
      // Verlangte gehört ins Kostenband.
      materials: def.kind === 'gold' && def.materials ? costItems(def.materials) : [],
      ready: forgeStore.canBuyBargain,
      reqs: [],
      restockMs: forgeStore.bargainRestockRemainingMs,
      sold: forgeStore.bargainPurchased,
      discountPct: def.discountPct,
    }
  })

  const bargainExtras = computed<ForgeBargainExtras>(() => {
    const def = forgeStore.activeDeal
    return {
      rewards: def?.kind === 'materials' && def.materials ? costItems(def.materials) : [],
      costs: def?.kind === 'gold' && def.materials ? costItems(def.materials) : [],
      wares: FORGE_BARGAINS.filter((ware) => ware.id !== forgeStore.bargainDealId).map((ware) => ({
        id: ware.id,
        name: ware.name,
        kind: bargainKindLabel(ware),
      })),
      basePrice: def && def.discountPct > 0 ? def.basePrice : 0,
      goldReward: def?.kind === 'gold' ? (def.goldReward ?? 0) : 0,
    }
  })

  // ── Die Reihenfolge des Streifens ──────────────────────────────────────────
  /**
   * Erst alles Kaufbare, dann was noch spart — Relikte und Konstellationen.
   *
   * Der Handel steht NICHT darin; er hat seinen eigenen Platz über der Spalte.
   *
   * Innerhalb der beiden Töpfe bleibt die Katalogreihenfolge stehen: sie ändert
   * sich nie, während die Kaufbarkeit mit jedem Chime-Tick kippen kann. Sortiert
   * wird nach ZUSTAND, nicht nach Preis — sonst tauschten zwei Zeilen den Platz,
   * sobald eine von ihnen erschwinglich wird.
   */
  const offers = computed<ForgeOffer[]>(() => {
    const rest = [...relicOffers.value, ...constellationOffers.value]
    return [...rest.filter((offer) => offer.ready), ...rest.filter((offer) => !offer.ready)]
  })

  /**
   * Alles Kaufbare unter seiner ID — der Streifen UND der Handel.
   *
   * Er ist weiter drin, obwohl er nicht mehr in `offers` steht: `buyOffer(id)`
   * schlägt hier nach, und ein Kauf, der die Art des Angebots erst am Eintrag
   * abliest, braucht ihn.
   */
  const offerById = computed(() => {
    const deal = bargainOffer.value
    const all = deal ? [...offers.value, deal] : offers.value
    return new Map(all.map((offer) => [offer.id, offer]))
  })

  // ── Das Archiv ─────────────────────────────────────────────────────────────
  /**
   * Was aus dem Streifen HERAUSGEWACHSEN ist: voll ausgebaute Relikte und
   * fusionierte Konstellationen. Ein Beleg, kein Ausblick.
   *
   * Gesperrtes stand hier einmal mit daneben — mit Sperrsatz, Zahlenpaar und
   * Fortschrittsbalken, damit der Spieler darauf hinarbeiten konnte. Das ist
   * gefallen: die Detailspalte zeigt nur noch, was freigeschaltet ist, und ein
   * Relikt, dessen Knoten noch fehlt, taucht jetzt wirklich erst auf, wenn es
   * so weit ist. Wer den Weg dorthin sehen will, liest ihn am Baum ab — dort
   * trägt jeder gesperrte Knoten seine Bedingungen weiterhin.
   */
  const vaultEntries = computed<ForgeVaultEntry[]>(() => {
    const out: ForgeVaultEntry[] = []

    for (const def of FORGE_RELICS) {
      if (!forgeStore.relicRequirementMet(def.id)) continue
      if (forgeStore.relicLevel(def.id) < def.maxLevel) continue

      out.push({
        id: def.id,
        kind: 'relic',
        name: def.name,
        icon: def.icon,
        color: def.color,
        desc: relicDesc(def.id),
        badge: FORGE_VAULT_MAX_BADGE,
      })
    }

    for (const def of FORGE_CONSTELLATIONS) {
      if (!forgeStore.constellationForged(def.id)) continue

      out.push({
        id: def.id,
        kind: 'constellation',
        name: def.name,
        icon: def.icon,
        color: def.color,
        desc: def.desc,
        badge: FORGE_VAULT_FUSED_BADGE,
      })
    }

    return out
  })

  /**
   * Was seit dem letzten Blick des Spielers erreichbar wurde — der azurne
   * Rahmen. Die Wahrheit dahinter liegt im Store, weil sie den Reload überlebt.
   */
  const freshIds = computed(() => new Set(forgeStore.shopFreshIds))

  // ── Kaufen ─────────────────────────────────────────────────────────────────
  /**
   * EIN Kaufweg für alle drei Arten — die Zeile weiß nicht, was sie kauft.
   *
   * Der Wortlaut der Quittung kommt aus `useForgeHerald`, damit alle sechs
   * Kaufwege der Forge gleich sprechen und unter demselben
   * Verdichtungsschlüssel laufen.
   */
  function buyOffer(id: string): boolean {
    const offer = offerById.value.get(id)
    if (!offer) return false

    if (offer.kind === 'relic') {
      const def = FORGE_RELICS.find((relic) => relic.id === id)
      if (!def || !forgeStore.forgeRelic(id)) return false
      // Der Wirkungssatz der NEUEN Stufe: `relicDesc` liest die Stufe frisch.
      heraldRelic(def, forgeStore.relicLevel(id), relicDesc(id))
      return true
    }

    if (offer.kind === 'constellation') {
      const def = FORGE_CONSTELLATIONS.find((con) => con.id === id)
      if (!def || !forgeStore.forgeConstellation(id)) return false
      heraldConstellation(def)
      return true
    }

    const def = forgeStore.activeDeal
    if (!def) return false
    // Das Zeichen VOR dem Kauf greifen: danach gilt der Handel als gekauft, und
    // der Getter würfelt beim nächsten Restock ein anderes.
    const icon = forgeStore.activeDealIcon
    if (!forgeStore.buyBargain()) return false
    heraldBargain(def, icon)
    return true
  }

  /** Der Reroll kauft nichts und ist deshalb keine Kaufquittung. */
  function rerollBargain(): boolean {
    if (!forgeStore.rerollBargain()) return false
    announceReceipt({
      kind: 'info',
      eyebrow: 'COSMIC BARGAIN',
      headline: 'Bargain rerolled',
      subline: forgeStore.activeDeal?.name,
      mergeKey: 'bargain/reroll',
    })
    return true
  }

  const canReroll = computed(() => forgeStore.canRerollBargain)

  return {
    offers,
    offerById,
    pursuedOffer,
    pursuedId,
    vaultEntries,
    bargainOffer,
    bargainExtras,
    freshIds,
    buyOffer,
    rerollBargain,
    canReroll,
  }
}
