import { defineStore } from 'pinia'
import {
  PLAYER_MAX_HP_BASE,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_LOSS_ON_ENRAGE,
  PLAYER_LOW_HP_THRESHOLD_PCT,
  DAMAGE_FLOAT_DURATION_MS,
  FORGE_CROWN_REPRIEVE_FRACTION,
} from '@/config/constants'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentHP: PLAYER_MAX_HP_BASE as number,
    maxHP: PLAYER_MAX_HP_BASE as number,
    damageFloats: [] as { id: number; value: number; expiresAt: number }[],
    _nextFloatId: 0,
    // ── Lifetime counters (Bard Stats catalog) ──
    /** HP the sun ever lost after mitigation. */
    totalDamageTaken: 0,
    /** HP ever restored by passive regeneration. */
    totalHpRegenerated: 0,
    /** How often the sun was driven down to 0 HP. */
    timesDowned: 0,
    /**
     * Sonnenphase, in der Warden's Reprieve (Star-Forge-Krone) zuletzt gegriffen
     * hat. `-1` heisst „noch nie".
     *
     * Der Aufschub gilt EINMAL JE PHASE, und die Phase ist der richtige Takt
     * dafür: sie ist die einzige Uhr im Spiel, die von selbst weiterläuft, ohne
     * dass der Spieler etwas tut, und sie überlebt das Prestige — genau wie die
     * Krone. Ein Timer stattdessen hätte an `onGameSpeedChange` hängen müssen
     * und wäre eine zweite Zeitachse neben einer, die es schon gibt.
     *
     * Liegt im Spielstand: ohne Persistenz gäbe ein Neuladen den Aufschub in
     * derselben Phase ein zweites Mal her.
     */
    reprieveUsedInPhase: -1,
  }),

  getters: {
    hpPercent(): number {
      return (this.currentHP / this.maxHP) * 100
    },
    isLow(): boolean {
      return this.hpPercent < PLAYER_LOW_HP_THRESHOLD_PCT
    },
    /**
     * HP je Spielsekunde: Grundwert + Regeneration branch / Eternal Orbit
     * (Star Forge) + Meep-Baum.
     *
     * Getter und nicht bloss eine Zeile in `regenTick()`, weil der Vitals-Cluster
     * im Kopf des Bard-Profils denselben Wert ANZEIGT. Zweimal ausgeschrieben
     * liefe die Anzeige beim nächsten Regen-Zugang still von der Rechnung weg.
     */
    regenPerSec(): number {
      return (
        PLAYER_HP_REGEN_PER_SEC +
        useStarForgeStore().hpRegenPerSec +
        useMeepTreeStore().fx.hpRegenPerSec
      )
    },
  },

  actions: {
    regenTick() {
      const before = this.currentHP
      this.currentHP = Math.min(this.maxHP, this.currentHP + this.regenPerSec)
      this.totalHpRegenerated += this.currentHP - before
    },
    /** Applies damage after mitigation and returns the amount actually dealt —
     *  callers (e.g. the sun horizon in the Star Fight Modal) display that
     *  value, so they must not recompute the mitigation themselves. */
    takeDamage(amount: number = PLAYER_HP_LOSS_ON_ENRAGE): number {
      // Aegis branch / Bulwark Pact (Star Forge): reduce incoming damage
      const reduced = Math.max(
        1,
        Math.round(
          amount * useStarForgeStore().damageTakenMult * useMeepTreeStore().fx.damageTakenMult,
        ),
      )
      const wasUp = this.currentHP > 0
      this.currentHP = Math.max(0, this.currentHP - reduced)
      this.totalDamageTaken += reduced
      if (wasUp && this.currentHP === 0) {
        this.timesDowned += 1
        // Warden's Reprieve (Star-Forge-Krone): die gefallene Sonne kehrt
        // einmal je Sonnenphase auf einen Teil ihrer Höchst-HP zurück.
        //
        // NACH dem Zähler und nach der Buchung des Schadens: der Einschlag hat
        // stattgefunden, `timesDowned` und `totalDamageTaken` sind die
        // Lebenszeit-Wahrheit darüber. Der Aufschub ist eine Antwort darauf,
        // keine Verhinderung — und alles, was am Fall hängt (Void-Meepzoll,
        // Boss-Enrage), ist zu diesem Zeitpunkt bereits gelaufen.
        this._tryReprieve()
      }
      this.damageFloats.push({
        id: this._nextFloatId++,
        value: reduced,
        // Wanduhr: die Zahl steigt per CSS-Animation auf und muss so lange
        // stehen, wie das Auge sie liest — beide Enden des Vergleichs stehen in
        // diesem Store.
        // eslint-disable-next-line no-restricted-syntax
        expiresAt: Date.now() + DAMAGE_FLOAT_DURATION_MS,
      })
      return reduced
    },
    /**
     * Holt die gefallene Sonne zurück — höchstens einmal je Sonnenphase.
     *
     * Eigene Action und keine Zeilen in `takeDamage`, weil sie einen dritten
     * Store liest (die laufende Phase) und `takeDamage` sonst drei fremde
     * Stores in einer Rechnung hätte, von denen nur zwei etwas mit Schaden zu
     * tun haben.
     */
    _tryReprieve(): void {
      if (!useStarForgeStore().sunReprieveOwned) return
      const phase = useSolarUpgradeStore().starPhase
      if (this.reprieveUsedInPhase === phase) return
      this.reprieveUsedInPhase = phase
      this.currentHP = Math.round(this.maxHP * FORGE_CROWN_REPRIEVE_FRACTION)
    },
    pruneFloats() {
      // eslint-disable-next-line no-restricted-syntax -- Wanduhr, siehe takeDamage
      const now = Date.now()
      this.damageFloats = this.damageFloats.filter((f) => f.expiresAt > now)
    },
  },
})
