<template>
  <div class="loot" :class="{ 'loot--galaxy': isGalaxyBoss }">
    <!-- Eyebrow zwischen HUD-Klammerlinien — spiegelt den Bossnamen oben -->
    <div class="loot-head">
      <span class="loot-line" />
      <span v-ink-center class="loot-eyebrow">✦ Loot ✦</span>
      <span class="loot-line loot-line--right" />
    </div>

    <!-- Alles in der Reihe steht auf derselben Grundhöhe — der Champion-Preis
         ist nur breiter, nicht höher. Das hält die Zeile ruhig, egal wie
         viele Materialien der Boss fallen lässt. -->
    <div class="loot-row">
      <!-- Champion zuerst — die Hauptbelohnung -->
      <span v-if="homePlanetChampion" class="loot-prize" :title="`Champion: ${homePlanetChampion}`">
        <img
          v-if="homePlanetChampionImage"
          :src="homePlanetChampionImage"
          :alt="homePlanetChampion"
          class="loot-prize-portrait"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span class="loot-prize-text">
          <span class="loot-prize-eyebrow">Champion</span>
          <span class="loot-prize-name">{{ homePlanetChampion }}</span>
        </span>
      </span>

      <span v-if="totalChimes > 0" class="loot-slot loot-slot--chimes" title="Chimes">
        <img src="/img/BardAbilities/BardChime-256.png" alt="Chimes" class="loot-slot-icon" />
        <!-- Formatiert, anders als die Materialmengen: Chime-Beträge gehen in
             die Tausender und sprengen als rohe Ziffernfolge das Badge. -->
        <span v-ink-center.x.y class="loot-slot-count">{{ $formatNumber(totalChimes) }}</span>
      </span>

      <span
        v-for="entry in stackedMaterials"
        :key="entry.material.id"
        class="loot-slot"
        :class="`rarity--${entry.material.rarity}`"
        :title="`${entry.material.name} — ${entry.material.rarity}`"
      >
        <!-- Vier Materialien (Comet Ice, Star Iron, Plasma Core, Aether Dust)
             haben in den Stammdaten gar kein Bild — bisher stand hier ein
             leeres <img>. Sie bekommen stattdessen ein Monogramm aus ihren
             Initialen, das in der Fassung genauso sitzt wie ein Icon. -->
        <img
          v-if="entry.icon"
          :src="entry.icon"
          :alt="entry.material.name"
          class="loot-slot-icon"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <span v-else v-ink-center.x.y class="loot-slot-mono">{{ entry.monogram }}</span>
        <span v-ink-center.x.y class="loot-slot-count">{{ entry.count }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MATERIALS, materialIconMd } from '@/config/materials'
import { LOOT_MONOGRAM_MAX_CHARS } from '@/config/constants'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useBattleStore } from '@/stores/battleStore'

const bossStore = usePlanetBossStore()
const battleStore = useBattleStore()

const activeBoss = computed(() => bossStore.activeBoss)
const isGalaxyBoss = computed(() => activeBoss.value?.isGalaxyBoss ?? false)
const rewardSlots = computed(() => activeBoss.value?.rewardSlots ?? [])
const homePlanetChampion = computed(() => activeBoss.value?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return battleStore.getChampionImage(name, { size: 'md' })
})

const totalChimes = computed(() =>
  rewardSlots.value.filter((s) => s.type === 'chimes').reduce((sum, s) => sum + (s.amount ?? 0), 0),
)

const stackedMaterials = computed(() => {
  const map = new Map<string, { material: (typeof MATERIALS)[number]; count: number }>()

  for (const slot of rewardSlots.value) {
    if (slot.type !== 'material' || !slot.materialId) continue
    const mat = MATERIALS.find((m) => m.id === slot.materialId)
    if (!mat) continue
    const existing = map.get(slot.materialId)
    if (existing) {
      existing.count += slot.amount ?? 1
    } else {
      map.set(slot.materialId, { material: mat, count: slot.amount ?? 1 })
    }
  }

  // Icon-Pfad einmal hier auflösen statt im Template: die 256er-Stufe ist
  // nötig, weil die Slots mit der Auflösung auf über 50 px wachsen.
  // `image` ist im Material-Typ optional — ohne Bild trägt der Slot ein
  // Monogramm aus den Initialen.
  return Array.from(map.values()).map((e) => ({
    ...e,
    icon: e.material.image ? materialIconMd(e.material.image) : null,
    monogram: e.material.name
      .split(/\s+/)
      .map((word) => word[0] ?? '')
      .join('')
      .slice(0, LOOT_MONOGRAM_MAX_CHARS)
      .toUpperCase(),
  }))
})
</script>

<style scoped>
/* ── Loot unter dem Boss: rahmenlos, weich verschmolzen ──────────────────
   Kein hartes Panel: ein warmer Gold-Schleier läuft zu allen Seiten in den
   Planeten-Hintergrund aus und hebt die Rewards trotzdem klar hervor —
   gleiche Design-Sprache wie die Threat-Anzeige unter der HP-Leiste */
.loot {
  position: relative;
  /* Ein Maßstab für das ganze Banner (--loot-u, rpg-theme.css): Schriften,
     Fassungen, Icons und Abstände sind `em` dagegen und wachsen gemeinsam mit
     der Auflösung. Ersetzt das frühere `transform: scale(0.8)` auf Full HD,
     das alles weichgezeichnet hat, statt es kleiner zu setzen. */
  font-size: var(--loot-u);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45em;
  width: auto;
  /* Untergrenze, damit ein Boss mit nur einer Belohnung keinen einsamen
     Kasten ergibt — der Kopf spannt dann trotzdem über eine ruhige Breite. */
  min-width: 15em;
  max-width: 100%;
  padding: 0.5em 2.6em 0.6em;
  /* Radien BEWUSST unter 50 %: der Schleier läuft damit innerhalb der Box aus.
     Vorher stand hier `ellipse 100% 130%` mit Stopp bei 74 % — das heißt, der
     Verlauf war an der Boxkante erst bei 74 % seines Radius angekommen und
     wurde dort hart abgeschnitten. Sichtbar war ein dunkles Rechteck mit
     scharfen Kanten statt eines weichen Übergangs in den Planetenhintergrund. */
  background: radial-gradient(
    ellipse 58% 62% at 50% 50%,
    rgba(34, 22, 6, 0.62) 0%,
    rgba(22, 14, 4, 0.34) 52%,
    transparent 92%
  );
  animation: loot-reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
}

/* Feine Goldlinie darunter, die zu den Rändern hin ausläuft */
.loot::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 16%;
  right: 16%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.5), transparent);
}

.loot--galaxy {
  background: radial-gradient(
    ellipse 58% 62% at 50% 50%,
    rgba(30, 12, 44, 0.62) 0%,
    rgba(18, 8, 28, 0.34) 52%,
    transparent 92%
  );
}

.loot--galaxy::after {
  background: linear-gradient(to right, transparent, rgba(200, 100, 255, 0.5), transparent);
}

@keyframes loot-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Eyebrow zwischen dünnen Klammerlinien ────────────────────────────────── */
.loot-head {
  display: flex;
  align-items: center;
  gap: 0.7em;
  /* Klammerlinien laufen über die volle Bandbreite statt über eine feste
     Pixelbreite — der Kopf rahmt damit genau die Reihe, die darunter steht,
     egal ob ein Champion dabei ist oder nur zwei Materialien. */
  align-self: stretch;
}

.loot-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(232, 192, 64, 0.62));
}

.loot-line--right {
  background: linear-gradient(to left, transparent, rgba(232, 192, 64, 0.62));
}

.loot-eyebrow {
  font-size: 0.85em;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #e8c040;
  white-space: nowrap;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.loot--galaxy .loot-eyebrow {
  color: #dd99ff;
  text-shadow:
    0 0 10px rgba(200, 100, 255, 0.55),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.loot--galaxy .loot-line {
  background: linear-gradient(to right, transparent, rgba(200, 100, 255, 0.45));
}

.loot--galaxy .loot-line--right {
  background: linear-gradient(to left, transparent, rgba(200, 100, 255, 0.45));
}

/* ── Reward-Reihe ─────────────────────────────────────────────────────────── */
.loot-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4em 0.55em;
  min-width: 0;
}

/* ── Belohnungs-Slot — gefasstes Icon mit Mengen-Badge ────────────────────────
   Vorher standen Icon und Zahl frei nebeneinander auf dem Hintergrund; welche
   Zahl zu welchem Bild gehörte, ergab sich nur aus der Nähe, und die Seltenheit
   steckte allein in der Textfarbe der Ziffer. Jetzt trägt jede Belohnung eine
   eigene Fassung: Farbkante oben und Rahmen in der Rarity-Farbe, die Menge als
   Badge in der Ecke. Rein statisch — kein Filter, keine Animation. */
.loot-slot {
  --rar: #c8c8c8;
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 3.4em;
  height: 3.4em;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--rar) 55%, #2a1c08);
  border-top: 2px solid color-mix(in srgb, var(--rar) 80%, transparent);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rar) 16%, rgba(10, 6, 2, 0.88)),
    rgba(8, 5, 2, 0.92)
  );
  box-shadow:
    0 0 10px color-mix(in srgb, var(--rar) 22%, transparent),
    0 3px 8px rgba(0, 0, 0, 0.7);
}

.loot-slot-icon {
  width: 2.4em;
  height: 2.4em;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

/* Ersatz für fehlende Material-Bilder — Initialen in der Rarity-Farbe */
.loot-slot-mono {
  font-size: 1.15em;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--rar) 60%, #f0e6cc);
  text-shadow:
    0 0 10px color-mix(in srgb, var(--rar) 45%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.9);
}

/* Menge als Badge in der unteren rechten Ecke — die etablierte Inventar-Sprache
   ist auf einen Blick als "Anzahl" lesbar, anders als eine Ziffer neben dem Bild */
.loot-slot-count {
  position: absolute;
  right: -0.28em;
  bottom: -0.28em;
  min-width: 1.35em;
  padding: 0.06em 0.24em;
  border-radius: 4px;
  background: rgba(6, 3, 0, 0.95);
  border: 1px solid color-mix(in srgb, var(--rar) 62%, #2a1c08);
  color: color-mix(in srgb, var(--rar) 42%, #fff);
  font-size: 0.86em;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 6px color-mix(in srgb, var(--rar) 50%, transparent);
}

.loot-slot--chimes {
  --rar: #e8c040;
}

/* ── Champion — die Hauptbelohnung ────────────────────────────────────────────
   Steht in derselben Grundhöhe wie die Slots, ist nur breiter: die Reihe bleibt
   damit eine Zeile und kippt nicht, sobald ein Champion dabei ist. */
.loot-prize {
  --rar: #82b9ff;
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  height: 3.4em;
  padding: 0 0.75em 0 0;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--rar) 45%, #14203a);
  border-top: 2px solid color-mix(in srgb, var(--rar) 75%, transparent);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--rar) 18%, rgba(6, 10, 20, 0.9)),
    rgba(6, 9, 16, 0.85)
  );
  box-shadow:
    0 0 14px color-mix(in srgb, var(--rar) 26%, transparent),
    0 3px 8px rgba(0, 0, 0, 0.7);
}

.loot-prize-portrait {
  width: 3.4em;
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 3px 0 0 3px;
  border-right: 1px solid color-mix(in srgb, var(--rar) 45%, #14203a);
}

.loot-prize-text {
  display: inline-flex;
  flex-direction: column;
  gap: 0.1em;
  min-width: 0;
}

.loot-prize-eyebrow {
  font-size: 0.6em;
  font-weight: 900;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(130, 185, 255, 0.8);
  text-shadow:
    0 0 8px rgba(74, 144, 217, 0.5),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.loot-prize-name {
  font-size: 1.3em;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9cc8ff;
  text-shadow:
    0 0 16px rgba(74, 144, 217, 0.6),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* ── Rarities — färben Fassung, Rahmen und Badge eines Slots ─────────────── */
.rarity--common {
  --rar: #c8c8c8;
}
.rarity--uncommon {
  --rar: #4dff35;
}
.rarity--rare {
  --rar: #5aabff;
}
.rarity--epic {
  --rar: #c37aff;
}

@media (prefers-reduced-motion: reduce) {
  .loot {
    animation: none;
  }
}
</style>
