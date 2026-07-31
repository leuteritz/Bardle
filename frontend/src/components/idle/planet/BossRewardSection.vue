<template>
  <!-- EIN Fenster für die gesamte Belohnung: Goldlinie oben, ein Rahmen außen,
       innen nur Trennstriche. Vorher trug jede Belohnung ihre eigene Fassung —
       fünf freistehende Kästchen unter einer separaten Überschrift. Jetzt ist
       es eine geschlossene Leiste, in der das Label das erste Segment ist;
       das spart die ganze Kopfzeile und lässt die Icons entsprechend größer
       werden. Gleiche Bauform wie das LVL/HIT-Band der Champion-Karten. -->
  <div class="loot" :class="{ 'loot--galaxy': isGalaxyBoss }">
    <span class="loot-tag">
      <span v-ink-center class="loot-tag-text">Loot</span>
    </span>

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
           Initialen, das im Segment genauso sitzt wie ein Icon. -->
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
/* ── Das Belohnungsfenster ────────────────────────────────────────────────────
   Ein Rahmen, eine Goldlinie oben, innen nur Trennstriche — die Projektsprache
   der Modale, auf eine Leiste eingedampft. Alle Segmente teilen sich Höhe,
   Rahmen und Ecken; was ein Segment auszeichnet (Seltenheit, Champion), zeigt
   sich innerhalb davon, nicht als eigener Kasten drumherum.

   `--loot-u` (rpg-theme.css) ist der einzige Maßstab: Schriften, Segmentgrößen
   und Icons sind `em` dagegen und wachsen gemeinsam mit der Auflösung. */
.loot {
  position: relative;
  font-size: var(--loot-u);
  display: flex;
  align-items: stretch;
  width: auto;
  max-width: 100%;
  border-radius: 4px;
  border: 1px solid #5c3310;
  /* Beschneidet die Segment-Hintergründe auf die Rundung des Fensters —
     ohne das ragen sie in den Ecken über den Rahmen hinaus. */
  overflow: hidden;
  background: #14100a;
  box-shadow:
    inset 0 0 0 1px rgba(232, 192, 64, 0.12),
    0 6px 18px rgba(0, 0, 0, 0.7);
  animation: loot-reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
}

/* Goldlinie oben — dieselbe Verlaufsfolge wie an jedem Modal des Projekts */
.loot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 1;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

/* Trennstriche statt Einzelrahmen — die Segmente bleiben eine Einheit */
.loot > * + * {
  border-left: 1px solid #3f2810;
}

.loot--galaxy {
  border-color: #4a2168;
  box-shadow:
    inset 0 0 0 1px rgba(200, 100, 255, 0.14),
    0 6px 18px rgba(0, 0, 0, 0.7);
}

.loot--galaxy::before {
  background: linear-gradient(
    to right,
    #3a1a54,
    #8a44c8,
    #dd99ff,
    #a052e0,
    #8a44c8,
    #3a1a54
  );
}

.loot--galaxy > * + * {
  border-left-color: #34184a;
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

/* ── Label-Segment — das "LOOT" ist die erste Zelle der Leiste ────────────────
   Bewusst die stillste Zelle: kein eigener Hintergrund, kein Glow, kein
   Zierzeichen. Es benennt das Fenster, es ist keine Belohnung — mit gefülltem
   Reiter stand es als Blickfang vor den Dingen, um die es geht. Der
   Trennstrich rechts genügt, um es abzusetzen. */
.loot-tag {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  padding: 0 0.95em;
}

.loot-tag-text {
  font-size: 0.82em;
  font-weight: 900;
  letter-spacing: 0.22em;
  /* letter-spacing setzt CSS auch hinter das letzte Zeichen — ohne den
     Ausgleich stünde das Wort sichtbar links seiner Zelle */
  text-indent: 0.22em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(200, 144, 64, 0.78);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.loot--galaxy .loot-tag-text {
  color: rgba(190, 130, 230, 0.8);
}

/* ── Belohnungs-Segment ───────────────────────────────────────────────────────
   Kein eigener Kasten mehr: die Zelle sitzt im Fenster, ihre Seltenheit zeigt
   sich als Farbschimmer im Hintergrund und als Farbkante an der UNTERKANTE.
   Unten deshalb, weil die Oberkante des Fensters der Goldlinie gehört — so
   stehen sich beide nie im Weg. Rein statisch, kein Filter, keine Animation. */
.loot-slot {
  --rar: #c8c8c8;
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 3.4em;
  height: 3.4em;
  background:
    linear-gradient(
      to top,
      color-mix(in srgb, var(--rar) 34%, transparent) 0 2px,
      transparent 2px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--rar) 13%, transparent),
      transparent 72%
    );
}

.loot-slot-icon {
  width: 2.4em;
  height: 2.4em;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
}

/* Ersatz für fehlende Material-Bilder — Initialen in der Rarity-Farbe.
   Das Padding unten hebt die Buchstaben aus der Badge-Ecke: anders als ein
   Icon, das dort ohnehin transparent ausläuft, säße das Monogramm mitten
   unter der Mengenangabe. */
.loot-slot-mono {
  padding-bottom: 0.5em;
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
  /* Innerhalb des Segments statt über dessen Kante hinaus — das Fenster
     beschneidet jetzt, ein überstehendes Badge würde abgeschnitten. */
  right: 0.16em;
  bottom: 0.2em;
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
   Dasselbe Segment wie ein Material, nur breiter: gleiche Höhe, gleiche
   Unterkante, kein eigener Rahmen. Die blaue Signatur trägt es innen. */
.loot-prize {
  --rar: #82b9ff;
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  height: 3.4em;
  padding: 0 0.85em 0 0;
  background:
    linear-gradient(
      to top,
      color-mix(in srgb, var(--rar) 42%, transparent) 0 2px,
      transparent 2px
    ),
    linear-gradient(to right, rgba(28, 52, 92, 0.55), rgba(10, 16, 30, 0.3));
}

.loot-prize-portrait {
  width: 3.4em;
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-right: 1px solid color-mix(in srgb, var(--rar) 38%, #14203a);
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
