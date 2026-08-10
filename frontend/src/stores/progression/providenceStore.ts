import { defineStore } from 'pinia'
import { PROVIDENCES, getProvidence } from '@/config/progression/providences'
import { universes, getUniverse } from '@/config/progression/universes'
import { PROVIDENCE_OFFER_SIZE, PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'
import type { PrestigeOffer, ProvidenceDef, ProvidenceEffects, UniverseConfig } from '@/types'
import { logger } from '@/utils/logger'

/** Eine ausgelegte Karte, fertig für die Anzeige. */
export interface PrestigeOfferCard {
  universe: UniverseConfig
  providence: ProvidenceDef
}

/**
 * PROVIDENCES OF THE WANDERER
 *
 * Die Vorsehung, unter der Bard sein aktuelles Universum bereist. Gewählt wird
 * sie beim Prestige, unmittelbar nach dem Ziel-Universum, und sie gilt bis zum
 * nächsten.
 *
 * ── Warum der Store fast nichts tut ─────────────────────────────────────────
 * Kein `tick()`, keine Uhr, kein Ablauf. Anders als Drifter-Buffs oder Omen
 * läuft hier nichts weiter, das gestellt werden müsste — es gibt genau einen
 * Zustand (welche Vorsehung gilt) und der ändert sich einmal pro Durchlauf.
 * Deshalb ist auch keine reaktive `now`-Krücke nötig, wie sie `drifterStore` und
 * `omenStore` für ihre Fristgetter brauchen.
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
    activeId: null as string | null,
    /**
     * Die Karten, die im Prestige-Modal zur Wahl stehen — je ein Universum mit
     * der Vorsehung, die über ihm steht.
     *
     * Leer ausserhalb der Wahl: das Angebot wird beim Öffnen gezogen und beim
     * Wählen verbraucht, es überlebt das Modal nicht und muss darum nie
     * gespeichert werden. Ein neues Öffnen zieht neu — das ist gewollt, sonst
     * liesse sich durch Schliessen und Wiederöffnen nichts anderes erhoffen,
     * und die Ziehung wäre eine Formalie.
     */
    offer: [] as PrestigeOffer[],
  }),

  getters: {
    /** Die geltende Vorsehung, oder `null` im ersten Lauf. */
    active(state): ProvidenceDef | null {
      return state.activeId ? (getProvidence(state.activeId) ?? null) : null
    },

    /**
     * Die Effekte, die gerade gelten. Ein leeres Objekt, wenn keine Vorsehung
     * läuft ODER ihre Definition nicht mehr existiert — ein Spielstand mit einer
     * ID aus einem alten Katalog soll wirkungslos werden, nicht abstürzen.
     */
    activeEffects(): ProvidenceEffects {
      return this.active?.effects ?? {}
    },

    /** Die Karten des Angebots in Ziehreihenfolge, aufgelöst für die Anzeige.
     *  Ein Paar, dessen Katalogeintrag fehlt, fällt still heraus statt die
     *  ganze Wahl zu sprengen. */
    offerCards(state): PrestigeOfferCard[] {
      return state.offer
        .map((o) => ({
          universe: getUniverse(o.universeId),
          providence: getProvidence(o.providenceId),
        }))
        .filter((c): c is PrestigeOfferCard => !!c.universe && !!c.providence)
    },

    hasOffer(state): boolean {
      return state.offer.length > 0
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    // Jeder liest genau eine Achse und wird an genau einer Stelle multipliziert.
    // Der Neutralwert steht als Konstante, damit "was tut nichts" nicht als
    // nackte 1 an dreizehn Stellen wiederholt wird.

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
     * Ein Angebot auslegen: drei Universen, über jedem eine Vorsehung.
     *
     * Zwei Spreizungen laufen gleichzeitig — drei VERSCHIEDENE Universen und
     * drei VERSCHIEDENE Domänen. Ohne die zweite stünde regelmässig dreimal
     * dieselbe Frage zur Wahl, nur unter anderem Namen; ohne die erste zweimal
     * derselbe Ort.
     *
     * Das aktuelle Universum bleibt aussen vor: `selectPrestigeUniverse` lehnt
     * es ohnehin ab, und eine Karte anzubieten, die beim Klick nichts tut, wäre
     * schlimmer als eine Karte weniger.
     *
     * Bewusst OHNE Eignungsprüfung, anders als bei den Omen: dort kann eine
     * Karte auf ein System zeigen, das der Spieler noch nicht offen hat. Wer
     * prestiged, hat jedes System dieses Katalogs längst laufen.
     *
     * Die laufende Vorsehung bleibt unangetastet — gewechselt wird erst beim
     * Annehmen. Ein abgebrochenes Prestige darf den Spieler nicht ohne
     * Vorsehung zurücklassen.
     */
    rollOffer(currentUniverseId: number): void {
      const pickedUniverses = shuffled(universes.filter((u) => u.id !== currentUniverseId)).slice(
        0,
        PROVIDENCE_OFFER_SIZE,
      )

      const pickedProvidences: ProvidenceDef[] = []
      const usedDomains = new Set<string>()
      // Zwei Durchgänge, wie beim Omen-Angebot: erst je Domäne höchstens eine
      // Karte, dann — falls das nicht reicht — aufgefüllt ohne die Regel. Der
      // zweite Durchgang ist im heutigen Katalog toter Code (sechs Domänen bei
      // drei Karten), hält das Angebot aber vollzählig, wenn jemand später
      // Domänen zusammenlegt.
      for (const pass of [0, 1]) {
        for (const def of shuffled(PROVIDENCES.filter((d) => !pickedProvidences.includes(d)))) {
          if (pickedProvidences.length >= pickedUniverses.length) break
          if (pass === 0 && usedDomains.has(def.domain)) continue
          pickedProvidences.push(def)
          usedDomains.add(def.domain)
        }
        if (pickedProvidences.length >= pickedUniverses.length) break
      }

      this.offer = pickedUniverses.map((u, i) => ({
        universeId: u.id,
        providenceId: pickedProvidences[i].id,
      }))
      logger.info('Providence', 'Prestige offer drawn', { offer: this.offer })
    },

    /**
     * Eine Karte annehmen — die Vorsehung tritt an, das Universum reicht der
     * Aufrufer an `gameStore.selectPrestigeUniverse` weiter.
     *
     * Geprüft wird das PAAR, nicht die Vorsehung allein: sie steht in diesem
     * Angebot über genau einem Universum, und wer nur die ID der Vorsehung
     * prüfte, liesse jede beliebige Kombination durch.
     *
     * Sie gilt ab sofort, also schon während der Hyperspace-Animation vor dem
     * Reset. Die Alternative wäre ein zweites Feld, das den Antritt bis nach dem
     * Reset aufschöbe — und ein Zustand mehr, in dem ein Absturz den Spieler
     * ohne Vorsehung zurückliesse.
     */
    choose(universeId: number, providenceId: string): boolean {
      const match = this.offer.some(
        (o) => o.universeId === universeId && o.providenceId === providenceId,
      )
      if (!match) return false
      const def = getProvidence(providenceId)
      if (!def) return false

      this.activeId = providenceId
      this.offer = []
      logger.info('Providence', `Taken: ${def.name}`, { universeId, effects: def.effects })
      return true
    },

    /** Das Angebot verwerfen, ohne die laufende Vorsehung anzutasten — der
     *  Spieler hat das Prestige-Modal geschlossen. */
    clearOffer(): void {
      this.offer = []
    },

    /** Vollständiger Reset (neues Spiel). */
    clearAll(): void {
      this.activeId = null
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
