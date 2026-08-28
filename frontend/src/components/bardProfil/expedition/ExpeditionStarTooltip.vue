<script setup lang="ts">
/**
 * Was ein Stern hergab — die ganze Karte, nicht mehr ihr Fuss.
 *
 * Hier stand einmal `ExpeditionMarkTooltip` darüber: Sternname, „STAR FREED"
 * und drei Chips (`FREED`, `2ND STAR`, `2 OF 3 CHARTED`). Das war die Karte,
 * BEVOR es ein Manifest gab; seither war es Vorspann, und der eigentliche
 * Inhalt musste sich den Rest teilen. Der Kopf ist deshalb ganz entfallen und
 * sein Platz in die Zahlen gegangen — die Karte ist dabei kürzer geworden.
 *
 * Was der Kopf trug, tragen jetzt vier Zeichen, die ohnehin da sind: die
 * Akzentleiste der Hülle (`--tip-color`), das Portrait (farbig gegen
 * entsättigt), die Notiz und der Füllstand der Uhr.
 *
 * Jeder Baustein kommt aus der Tooltip-Sprache (`.tip-*` in `rpg-theme.css`).
 * KEIN Rahmen, KEIN Schatten, KEINE eigene Skala — die liefert `RpgBadgeTooltip`.
 * Die Polsterung dagegen schon: `.rpg-btt` hat keine, sie kam bisher aus den
 * Blöcken von `ExpeditionMarkTooltip`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getChampionIconPath } from '@/utils/game/champions'
import { formatMinuteClock } from '@/utils/ui/format'
import {
  MS_PER_SECOND,
  ROLE_BY_KEY,
  STAR_MANIFEST_ART_SIZE,
  UNIVERSE_TOOLTIP_IMAGES,
} from '@/config/constants'
import type { StarManifest } from '@/types'

const props = defineProps<{
  manifest: StarManifest
  lost: boolean
  accent: string
}>()

const role = computed(() => (props.manifest.role ? ROLE_BY_KEY[props.manifest.role] : null))

/**
 * Wer an diesem Stern hing.
 *
 * Ohne Champion ist der Stern trotzdem befreit: sind die freigeschalteten Tiers
 * leergeräumt, gibt der Heimatplanet keinen mehr her (`planetBossStore`). Das
 * Schloss ist derselbe Glyph, den gesperrte Zustände im ganzen Spiel tragen.
 */
const champion = computed(() => {
  const name = props.manifest.champion
  if (!name) return { name: 'No champion aboard', note: 'All unlocked tiers claimed' }
  return {
    name,
    art: getChampionIconPath(name, STAR_MANIFEST_ART_SIZE),
    note: props.lost ? 'Never reached' : 'Recruit unlocked',
  }
})

const clock = (sec: number) => formatMinuteClock(sec * MS_PER_SECOND)

/** Wie voll die Uhr lief. Beim verlorenen Stern immer ganz — er ging verloren,
 *  WEIL das Fenster ablief. */
const spent = computed(() => {
  const w = props.manifest.windowSec
  return w > 0 ? Math.min(1, props.manifest.heldSec / w) : 1
})
</script>

<template>
  <div class="stt" :style="{ '--tip-color': accent }">
    <div class="tip-effect stt-champ" :class="{ 'stt-champ--lost': lost }">
      <img v-if="champion.art" class="stt-art" :src="champion.art" alt="" />
      <Icon v-else icon="lucide:lock" width="24" height="24" class="stt-lock" />
      <span class="stt-who">
        <b class="stt-name">{{ champion.name }}</b>
        <span class="tip-meta stt-note">
          <template v-if="role"
            ><span class="stt-role" :style="{ color: role.color }">{{ role.label }}</span> ·
          </template>
          {{ champion.note }}
        </span>
      </span>
    </div>

    <div class="tip-read tip-read--lg">
      <span class="tip-read-cell">
        <span class="tip-read-k">Planets</span>
        <span class="tip-read-v">
          {{ manifest.cleared }}<span class="tip-read-sep">/</span>{{ manifest.planets }}
        </span>
      </span>
      <span class="tip-read-cell">
        <span class="tip-read-k">Chimes</span>
        <span class="tip-read-v">
          <img class="stt-chime" :src="UNIVERSE_TOOLTIP_IMAGES.chimes" alt="" aria-hidden="true" />
          {{ $formatNumber(manifest.chimes) }}
        </span>
      </span>
    </div>

    <div class="stt-clock">
      <div class="stt-clock-head">
        <span class="tip-read-k">Clock</span>
        <span class="tip-figures">
          <span class="tip-have">{{ clock(manifest.heldSec) }}</span>
          <span class="tip-sep">/</span>
          <span class="tip-need">{{ clock(manifest.windowSec) }}</span>
        </span>
      </div>
      <div class="tip-bar">
        <i class="tip-bar-fill tip-bar-fill--tinted" :style="{ transform: `scaleX(${spent})` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stt {
  display: flex;
  flex-direction: column;
  gap: 0.83em;
  padding: 1.07em 1.24em 1.16em;
}

/* Fläche, linke Kante und Schriftgrösse kommen aus `.tip-effect`. Hier steht
   nur, was den Champion vom Fliesstext unterscheidet: sein Bild daneben. */
.stt-champ {
  display: flex;
  align-items: center;
  gap: 0.66em;
}

.stt-art,
.stt-lock {
  flex-shrink: 0;
  width: 3.4em;
  height: 3.4em;
  border: 1px solid var(--rpg-wood-inner);
  border-radius: 4px;
}

.stt-lock {
  padding: 0.9em;
  background: var(--rpg-bg-icon);
  color: rgba(232, 220, 192, 0.5);
}

/* Statischer Zustand, keine laufende Animation — ein Champion, den der Stern
   verschluckt hat, ist gesperrt wie jeder gesperrte Eintrag im Spiel. */
.stt-champ--lost .stt-art {
  filter: grayscale(70%);
  opacity: 0.62;
}

.stt-who {
  display: flex;
  flex-direction: column;
  gap: 0.1em;
  min-width: 0;
}

.stt-name {
  font-size: 1.35em;
  font-weight: 900;
  line-height: 1.15;
}

.stt-role {
  font-weight: 700;
}

/* Das ECHTE Chime-Artwork, nicht ein Iconify-Ersatz — dieselbe Währung soll
   überall gleich aussehen, und die drei Nachbarn im Reiter zeigen es schon.
   Die Grösse in `em`, damit sie neben der 1.7em-Zahl mitwächst: gemessen 17,5 px
   auf Full HD und 23 px auf 2K, beides unter der 34-px-Schwelle der 128er-Stufe. */
.stt-chime {
  flex-shrink: 0;
  width: 0.85em;
  height: 0.85em;
  object-fit: contain;
}

.stt-clock {
  display: flex;
  flex-direction: column;
  gap: 0.33em;
}

/* Beschriftung und Ablesung auf einer Zeile, an den Rändern — die Uhr bekommt
   die volle Breite, weil sie von den dreien die längste Zahl trägt. */
.stt-clock-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.66em;
}
</style>
