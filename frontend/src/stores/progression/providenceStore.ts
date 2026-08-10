import { defineStore } from 'pinia'
import { PROVIDENCES, getProvidence } from '@/config/progression/providences'
import { PROVIDENCE_OFFER_SIZE, PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'
import type { ProvidenceDef, ProvidenceEffects } from '@/types'
import { logger } from '@/utils/logger'

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
 * ── Warum die Effekte hier hängen und nicht in `activeModifier` ─────────────
 * Der gameStore hat mit `ModifierEffects` bereits eine Modifikatoren-Schicht —
 * die des Universums. Sie in dieselbe Struktur zu schieben wäre naheliegend und
 * falsch: die beiden Schichten haben verschiedene Lebensdauern (das Universum
 * steht im Katalog, die Vorsehung im Spielstand) und verschiedene Zuständigkeiten
 * (Wirtschaft gegen Kosmos). Zusammengelegt liesse sich später an keiner
 * Anzeige mehr sagen, welcher Faktor woher kam. Stattdessen dasselbe Muster wie
 * bei `omenStore`, `drifterStore` und `achievementStore`: je ein Getter pro
 * Einbaustelle, und an der Zielstelle genau eine Multiplikation.
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
    /** IDs der Karten, die im Prestige-Modal zur Wahl stehen. Leer ausserhalb
     *  der Wahl — das Angebot wird beim Öffnen gezogen und beim Wählen
     *  verbraucht, es überlebt das Modal nicht und muss darum nie gespeichert
     *  werden. */
    offer: [] as string[],
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

    /** Die Karten des Angebots in Ziehreihenfolge. */
    offerCards(state): ProvidenceDef[] {
      return state.offer
        .map((id) => getProvidence(id))
        .filter((d): d is ProvidenceDef => d !== undefined)
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
     * Ein Angebot auslegen — je eine Karte aus einer anderen Domäne.
     *
     * Bewusst OHNE Eignungsprüfung, anders als bei den Omen: dort kann eine
     * Karte auf ein System zeigen, das der Spieler noch gar nicht offen hat.
     * Eine Vorsehung wird erst beim Prestige gestellt, und wer prestiged, hat
     * jedes System dieses Katalogs längst laufen.
     *
     * Die laufende Vorsehung bleibt dabei unangetastet: gewechselt wird erst,
     * wenn der Spieler eine der Karten annimmt. Ein abgebrochenes Prestige darf
     * ihn nicht ohne Vorsehung zurücklassen.
     */
    rollOffer(): void {
      const picked: ProvidenceDef[] = []
      const usedDomains = new Set<string>()
      // Zwei Durchgänge, wie beim Omen-Angebot: erst je Domäne höchstens eine
      // Karte, dann — falls das nicht reicht — aufgefüllt ohne die Regel. Der
      // zweite Durchgang ist im heutigen Katalog toter Code (fünf Domänen bei
      // drei Karten), aber er hält das Angebot vollzählig, wenn jemand später
      // Domänen zusammenlegt.
      for (const pass of [0, 1]) {
        for (const def of shuffled(PROVIDENCES.filter((d) => !picked.includes(d)))) {
          if (picked.length >= PROVIDENCE_OFFER_SIZE) break
          if (pass === 0 && usedDomains.has(def.domain)) continue
          picked.push(def)
          usedDomains.add(def.domain)
        }
        if (picked.length >= PROVIDENCE_OFFER_SIZE) break
      }

      this.offer = picked.map((d) => d.id)
      logger.info('Providence', 'Offer drawn', { providences: this.offer })
    },

    /**
     * Eine Vorsehung antreten. Sie gilt ab sofort — also schon während der
     * Hyperspace-Animation, die dem Reset vorausläuft. Das ist gewollt: die
     * Alternative wäre ein zweites Feld, das den Antritt bis nach dem Reset
     * aufschöbe, und ein Zustand mehr, in dem ein Absturz den Spieler ohne
     * Vorsehung zurückliesse.
     */
    choose(id: string): boolean {
      if (!this.offer.includes(id)) return false
      const def = getProvidence(id)
      if (!def) return false

      this.activeId = id
      this.offer = []
      logger.info('Providence', `Taken: ${def.name}`, { effects: def.effects })
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
