<template>
  <span
    class="keycap"
    :class="[
      `keycap--${size}`,
      `keycap--${tone}`,
      { 'keycap--pressed': pressed, 'keycap--lit': lit },
    ]"
  >
    <span class="keycap__face">
      <!-- MedievalSharp legt seine Glyphen asymmetrisch in die Box: das „P"
           steht fast vollständig über der Baseline und hat ein ungleiches
           Seitenlager. Zentriert man nur die Layout-Box, sitzt die sichtbare
           Tinte darin merklich zu hoch und leicht zu weit links. Die Direktive
           misst beide Abweichungen bei genau diesem Schriftgrad und schiebt sie
           über `translate` zurück.

           Sie sitzt an einer eigenen Hülle NUR um den Buchstaben, nicht am
           Deckel: der trägt Füllung, Lichtkante und den 2px-Hub, die alle
           mitwandern würden — die Taste sähe dann heruntergedrückt aus, während
           der Buchstabe darin unverändert schief bliebe.

           Der Bindungswert verwirft die Messung, wenn dieselbe Taste in einer
           anderen Größe erscheint (sm/md/lg haben eigene Schriftgrade). -->
      <span v-ink-center.x.y="size" class="keycap__ink">{{ cap }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
/**
 * Eine gezeichnete Taste. Der Körper steht durch zwei gestapelte Kanten
 * (Sockel + Deckel) plastisch da; gedrückt fährt allein der Deckel nach unten —
 * animiert wird ausschließlich `transform`, damit auch eine ganze Reihe von
 * Keycaps den Compositor nicht beschäftigt.
 */
withDefaults(
  defineProps<{
    cap: string
    /** sm = HUD-Leiste, md = Fließtext, lg = Controls-Panel. */
    size?: 'sm' | 'md' | 'lg'
    /** true zeichnet die Taste heruntergedrückt. */
    pressed?: boolean
    /** true hebt die Taste dauerhaft hervor (aktiver Zustand, z. B. Pause an). */
    lit?: boolean
    /**
     * `solid` = eigenständige Taste mit dunklem Körper (freistehend im HUD,
     * im Controls-Panel).
     * `inherit` = die Taste zieht Rahmen und Schrift aus dem `color` ihres
     * Umfelds und bleibt sonst durchscheinend — für Tasten INNERHALB eines
     * gefärbten Elements, etwa im Resume-Knopf des Pause-Overlays. Ein dunkler
     * Körper säße dort als Fremdkörper auf goldenem Grund.
     */
    tone?: 'solid' | 'inherit'
  }>(),
  { size: 'md', pressed: false, lit: false, tone: 'solid' },
)
</script>

<style scoped>
.keycap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  /* Sockel: die dunkle Kante, auf der der Deckel sitzt */
  background: #0b0906;
  border: 1px solid #5c3310;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
  user-select: none;
}

.keycap__face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  /* Deckel: heller Kopf mit Lichtkante oben, sitzt 2px über dem Sockel */
  background: linear-gradient(to bottom, #2e2419, #1a150e);
  box-shadow:
    inset 0 1px 0 rgba(255, 224, 170, 0.22),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6);
  color: #e8c040;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  transform: translateY(-2px);
  transition:
    transform 90ms cubic-bezier(0.3, 0, 0.2, 1),
    color 160ms ease;
}

/* Trägt nur den Buchstaben — kein Hintergrund, keine Kante. Alles, was hier
   verschoben wird, ist damit ausschließlich die Tinte. */
.keycap__ink {
  display: block;
}

/* Gedrückt: der Deckel sinkt auf den Sockel — nur transform bewegt sich. */
.keycap--pressed .keycap__face {
  transform: translateY(0);
}

/* Dauerhaft aktiv (Spiel steht): der Kopf trägt Gold statt Braun. */
.keycap--lit {
  border-color: #c89040;
}
.keycap--lit .keycap__face {
  background: linear-gradient(to bottom, #6a4a12, #3a2606);
  color: #ffe9a8;
}

/* ── Ton „inherit": Taste im gefärbten Umfeld ─────────────
   Alles kommt aus dem geerbten `color` des Elternteils — Rahmen, Füllung und
   Schrift sind dieselbe Farbe in drei Stärken. Dadurch trägt die Taste die
   Farbgebung ihres Knopfes mit, auch wenn dieser sie beim Überfahren ändert,
   und braucht keine eigene Palette. Der plastische Aufbau bleibt, fällt aber
   flacher aus: auf gefärbtem Grund liest schon eine Andeutung als Taste. */
.keycap--inherit {
  background: transparent;
  border-color: color-mix(in srgb, currentColor 40%, transparent);
  box-shadow: none;
}
.keycap--inherit .keycap__face {
  background: color-mix(in srgb, currentColor 12%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, currentColor 25%, transparent);
  color: currentColor;
  text-shadow: none;
  transform: translateY(-1px);
}
/* Muss NACH der Ton-Regel stehen und höher gewichtet sein, sonst gewänne dort
   der Ruhe-Transform und die Taste ließe sich nicht mehr eindrücken. */
.keycap--inherit.keycap--pressed .keycap__face {
  transform: translateY(0);
}

/* ── Größen ───────────────────────────────────────────── */
.keycap--sm {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  font-size: 0.92rem;
}
.keycap--md {
  min-width: 30px;
  height: 30px;
  padding: 0 7px;
  font-size: 1.05rem;
}
.keycap--lg {
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  font-size: 1.35rem;
}
</style>
