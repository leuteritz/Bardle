import { defineStore } from 'pinia'
import { PROVIDENCE_DOMAINS, rollProvidence } from '@/config/progression/providences'
import { universes, getUniverse } from '@/config/progression/universes'
import { PROVIDENCE_OFFER_SIZE, PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'
import type {
  PrestigeOffer,
  ProvidenceEffects,
  RolledProvidence,
  UniverseConfig,
} from '@/types'
import { logger } from '@/utils/logger'

/** Eine ausgelegte Karte, fertig für die Anzeige. */
export interface PrestigeOfferCard {
  universe: UniverseConfig
  providence: RolledProvidence
}

/**
 * PROVIDENCES OF THE WANDERER
 *
 * Die Vorsehung, unter der Bard sein aktuelles Universum bereist, und das
 * Angebot, aus dem sie beim Prestige gewählt wurde.
 *
 * ── Warum hier ein OBJEKT liegt und keine ID ────────────────────────────────
 * Solange Vorsehungen in einem Katalog standen, genügte ihre ID im Spielstand.
 * Seit Achse und Höhe gewürfelt werden, gibt es nichts mehr aufzulösen: das
 * Ergebnis existiert nur einmal, in diesem Lauf. Es wird deshalb vollständig
 * gehalten und vollständig gespeichert — und die Achsen-SCHLÜSSEL in `effects`
 * sind damit der Save-Vertrag, den früher die ID war.
 *
 * ── Warum der Store fast nichts tut ─────────────────────────────────────────
 * Kein `tick()`, keine Uhr, kein Ablauf: es gibt genau einen Zustand und der
 * ändert sich einmal pro Durchlauf. Deshalb fehlt auch die reaktive
 * `now`-Krücke, die `drifterStore` und `omenStore` für ihre Fristgetter
 * brauchen.
 *
 * ── Warum die Vorsehung DIE Effektquelle ist ────────────────────────────────
 * Der gameStore hatte mit `ModifierEffects` eine zweite Modifikatoren-Schicht —
 * die des Universums, fest im Katalog. Zwei Schichten hiessen zwei Wahlen
 * hintereinander und zehn feste Läufe. Heute liest `gameStore.activeModifier`
 * die Effekte der gewählten Vorsehung, und beide Klassen von Achsen wohnen in
 * einem Objekt:
 *  - die geerbten Wirtschaftsachsen laufen weiter über `activeModifier` an ihre
 *    rund 25 unveränderten Lesestellen,
 *  - die Kosmos-Achsen über je einen Getter hier — dasselbe Muster wie bei
 *    `omenStore`, `drifterStore` und `achievementStore`, mit genau einer
 *    Multiplikation am Zielstore.
 */
export const useProvidenceStore = defineStore('providence', {
  state: () => ({
    /**
     * Die Vorsehung dieses Durchlaufs. `null` heisst: noch nie geprestiged —
     * der erste Lauf steht unter keiner. Alle Effektgetter geben dann 1 zurück,
     * die Multiplikationen an den Zielstellen laufen also ins Leere statt
     * überall eine Fallunterscheidung zu brauchen.
     */
    active: null as RolledProvidence | null,
    /**
     * Die Karten, die zur Wahl stehen — je ein Universum mit der Vorsehung, die
     * über ihm steht. Im Firmament ist jede davon ein PORTAL im schwarzen Raum
     * jenseits der Kartenscheibe.
     *
     * Es STEHT, und zwar im Spielstand: gewürfelt, sobald das Universum
     * gerettet ist, verbraucht beim Aufbruch. Das war einmal anders — es lebte
     * nur, solange das Prestige-Modal offen war, und jedes Wiederöffnen würfelte
     * neu, damit die Ziehung keine Formalie ist. Diese Begründung ist mit dem
     * Modal gefallen: es gibt keinen Öffnen-Schritt mehr, an den ein Reroll
     * hängen könnte, und die Stelle eines Portals hängt am Zieluniversum. Ein
     * Angebot, das bei jedem Blick neu fällt, liesse die drei Portale über die
     * Bühne springen — und ein Ort, der nicht bleibt, ist keiner.
     */
    offer: [] as PrestigeOffer[],
  }),

  getters: {
    /**
     * Die Effekte, die gerade gelten. Ein leeres Objekt, wenn keine Vorsehung
     * läuft — dann ist jeder Getter neutral und jede Multiplikation wirkungslos.
     */
    activeEffects(state): ProvidenceEffects {
      return state.active?.effects ?? {}
    },

    /** Die Karten des Angebots in Ziehreihenfolge, aufgelöst für die Anzeige.
     *  Eine Karte, deren Universum fehlt, fällt still heraus statt die ganze
     *  Wahl zu sprengen. */
    offerCards(state): PrestigeOfferCard[] {
      return state.offer
        .map((o) => ({ universe: getUniverse(o.universeId), providence: o.providence }))
        .filter((c): c is PrestigeOfferCard => !!c.universe)
    },

    hasOffer(state): boolean {
      return state.offer.length > 0
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    // Nur die Kosmos-Achsen brauchen einen: die geerbten Wirtschaftsachsen
    // laufen über `gameStore.activeModifier`, dessen Basis `activeEffects` ist.

    /** Wie lange ein Resource-Star steht (starGroupStore.spawnResourceStar). */
    starLifetimeMult(): number {
      return this.activeEffects.starLifetimeMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Chance auf Materialfall (inventoryStore). */
    materialDropMult(): number {
      return this.activeEffects.materialDropMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Schaden der Champions im Orbit (combatStore). */
    combatDpsMult(): number {
      return this.activeEffects.combatDpsMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Schaden der Turret-Planeten (planetShopStore). */
    turretDpsMult(): number {
      return this.activeEffects.turretDpsMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** HP, mit denen ein Boss erscheint (planetBossStore.spawnBoss). */
    bossHpMult(): number {
      return this.activeEffects.bossHpMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Chimes aus den Belohnungsslots eines Bosses (planetBossStore.spawnBoss). */
    bossRewardMult(): number {
      return this.activeEffects.bossRewardMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Champion-XP (championLevelStore.addXp). */
    xpMult(): number {
      return this.activeEffects.xpMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** LP je Sieg (battleStore.calculateLPChange). */
    lpGainMult(): number {
      return this.activeEffects.lpGainMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Materialkosten in der Star Forge (starForgeStore). */
    forgeMaterialCostMult(): number {
      return this.activeEffects.forgeMaterialCostMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Laufzeit einer Expedition (expeditionStore) — kleiner heisst schneller. */
    expeditionSpeedMult(): number {
      return this.activeEffects.expeditionSpeedMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Belohnung einer Expedition (expeditionStore). */
    expeditionRewardMult(): number {
      return this.activeEffects.expeditionRewardMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Abstand zweier Drifter-Spawns (drifterStore) — kleiner heisst häufiger. */
    drifterSpawnIntervalMult(): number {
      return this.activeEffects.drifterSpawnIntervalMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
    /** Laufzeit eines Drifter-Buffs (drifterStore.applyBuff). */
    drifterBuffDurationMult(): number {
      return this.activeEffects.drifterBuffDurationMult ?? PROVIDENCE_NEUTRAL_MULTIPLIER
    },
  },

  actions: {
    /**
     * Ein Angebot würfeln: drei Universen, über jedem eine frisch gezogene
     * Vorsehung.
     *
     * Zwei Spreizungen laufen gleichzeitig — drei VERSCHIEDENE Universen und
     * drei VERSCHIEDENE Domänen. Ohne die zweite stünde regelmässig dreimal
     * dieselbe Frage zur Wahl, nur unter anderem Namen; ohne die erste zweimal
     * derselbe Ort.
     *
     * Das aktuelle Universum bleibt aussen vor: `travelToUniverse` lehnt es
     * ohnehin ab, und eine Karte anzubieten, die beim Klick nichts tut, wäre
     * schlimmer als eine Karte weniger.
     *
     * Die laufende Vorsehung bleibt unangetastet — gewechselt wird erst beim
     * Annehmen. Ein abgebrochenes Prestige darf den Spieler nicht ohne
     * Vorsehung zurücklassen.
     */
    rollOffer(currentUniverseId: number): void {
      // Steht schon eines, bleibt es stehen. Der Riegel ist Pflicht, seit der
      // Aufrufer im Sekundentakt fragt (`checkPrestigeAvailability`) statt
      // einmal beim Öffnen eines Modals.
      if (this.offer.length) return

      const pickedUniverses = shuffled(universes.filter((u) => u.id !== currentUniverseId)).slice(
        0,
        PROVIDENCE_OFFER_SIZE,
      )
      const pickedDomains = shuffled(PROVIDENCE_DOMAINS).slice(0, pickedUniverses.length)

      this.offer = pickedUniverses.map((u, i) => ({
        universeId: u.id,
        providence: rollProvidence(pickedDomains[i]),
      }))
      logger.info('Providence', 'Prestige offer rolled', {
        offer: this.offer.map((o) => `${o.universeId}:${o.providence.name}`),
      })
    },

    /**
     * Eine Karte annehmen — die Vorsehung tritt an, das Universum reicht der
     * Aufrufer an `gameStore.selectPrestigeUniverse` weiter.
     *
     * Gewählt wird über das UNIVERSUM, weil das im Angebot eindeutig ist: die
     * Vorsehung hat seit der Ziehung keine ID mehr, über die man sie benennen
     * könnte, und zwei Karten könnten denselben Namen tragen.
     *
     * Sie gilt ab sofort, also schon während der Hyperspace-Animation vor dem
     * Reset. Die Alternative wäre ein zweites Feld, das den Antritt bis nach dem
     * Reset aufschöbe — und ein Zustand mehr, in dem ein Absturz den Spieler
     * ohne Vorsehung zurückliesse.
     */
    choose(universeId: number): boolean {
      const card = this.offer.find((o) => o.universeId === universeId)
      if (!card) return false

      this.active = card.providence
      this.offer = []
      logger.info('Providence', `Taken: ${card.providence.name}`, {
        universeId,
        effects: card.providence.effects,
      })
      return true
    },

    /**
     * Das Angebot verwerfen, ohne die laufende Vorsehung anzutasten.
     *
     * Aufgerufen von `executePrestigeReset`. `choose()` leert es zwar selbst,
     * und solange nur der Modalweg dorthin führte, genügte das — ein Angebot
     * ist jetzt aber gespeichert und überlebt alles. Ein Reset, der nicht über
     * `choose` lief (Admin-Sprung, künftige Aufrufer), liesse sonst eine Karte
     * für das Universum stehen, in dem man gerade angekommen ist: `rollOffer`
     * schliesst das laufende Universum aus, prüft ein STEHENDES aber nicht nach.
     */
    clearOffer(): void {
      this.offer = []
    },

    /** Vollständiger Reset (neues Spiel). */
    clearAll(): void {
      this.active = null
      this.offer = []
    },
  },
})

/** Kopie in zufälliger Reihenfolge (Fisher-Yates) — die Ziehung darf die
 *  Katalogreihenfolge nicht durchscheinen lassen. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
