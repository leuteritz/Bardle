<script setup lang="ts">
/**
 * Die azurne Marke „Star Forge ready" — EINE Quelle für alle Stellen, an denen
 * sie erscheint: die beiden Ecktasten im Header, die Reiter der Profil-Leiste
 * und im Skill-Tree-Reiter jeder einzelne Eintrag, der seit dem letzten Blick
 * bezahlbar geworden ist — Upgrade-Zeile, Baumknoten, Angebot.
 *
 * **Sie trägt IMMER eine Zahl.** Eine Fassung ohne Ziffer stand hier einmal (ein
 * reiner Punkt, für die Stellen, an denen die Zahl stets eine Eins gewesen wäre)
 * und ist gefallen: eine „1" ist die ehrliche Auskunft — genau ein Kauf ist
 * möglich —, während der Punkt den Blick erst zum Knopf zwingt, um dasselbe zu
 * erfahren. `count` entscheidet allein über das Erscheinen; bei null gibt es
 * nichts zu melden.
 *
 * **Warum eine Komponente und keine dritte CSS-Kopie.** Die Optik stand vorher
 * zweimal ausgeschrieben (`.btn-gem-badge` im globalen Block von
 * `AppHeaderComponent.vue`, `.mini-badge--shopready` scoped in
 * `BardProfileMenu.vue`), die Schiene trug eine dritte, davon ABWEICHENDE Form
 * (grün, eckig, ohne Schein). Der Spieler folgt einem blauen Abzeichen vom
 * Header in den Reiter — die Spur darf nicht genau dort abbrechen, wo sie ans
 * Ziel führt.
 *
 * **Der Farbkanon des Spiels entscheidet, welchen Ton sie trägt** — Violett ist
 * Expedition, Gold die Sonnen-Entwicklung, Smaragd die Planeten, Kupfer der
 * Codex. Zwei davon leben hier: Azur für die Star Forge, Cyan für den
 * Champion-Shop. Das ist der Grund für `tone` und nicht für eine zweite
 * Komponente — die Ecktasten links und rechts sind dieselbe Platte mit
 * demselben Drei-Variablen-Vertrag (`--sbadge-d/-top/-right`), sie melden nur
 * Verschiedenes. Eine zweite Form nähme dem Spieler die Spur, die er vom
 * Header in den Reiter verfolgt.
 *
 * `RpgNotifyBadge` konnte diesen Platz nicht übernehmen: es steht auf
 * `pointer-events: none`, und an der Ecktaste hängt der Hover-Tooltip am
 * Abzeichen selbst — er ginge nie auf.
 *
 * Maße und Sitz kommen vom Aufrufer als CSS-Variablen (`--sbadge-d`,
 * `--sbadge-top`, `--sbadge-right`) — Custom Properties vererben über die
 * Scope-Grenze hinweg, ein Prop je Zahl täte dasselbe zu einem höheren Preis.
 *
 * `title` ist bewusst NICHT als Prop deklariert: als Fallthrough-Attribut landet
 * es von selbst am Wurzel-Span, und die Ecktaste — die ihren eigenen
 * `RpgBadgeTooltip` trägt — lässt es einfach weg.
 */
withDefaults(
  defineProps<{
    /** Fällt der Wert auf 0, verschwindet die Marke ganz. */
    count: number
    /** Einmaliges Aufblitzen; kommt aus `useBadgeFlare()`. */
    flare?: boolean
    label?: string
    /**
     * `corner` hängt die Marke in die Ecke des nächsten positionierten Vorfahren.
     * `inline` lässt sie im Fluss — für die Abzeichen-Zeile der Profil-Leiste,
     * die mehrere Marken nebeneinander legen kann.
     */
    place?: 'corner' | 'inline'
    /** Welche Bereitschaft sie meldet — siehe den Farbkanon oben. */
    tone?: 'forge' | 'champions'
  }>(),
  { place: 'corner', tone: 'forge' },
)
</script>

<template>
  <span
    v-if="count > 0"
    class="sbadge"
    :class="[
      place === 'inline' ? 'sbadge--inline' : 'sbadge--corner',
      `sbadge--${tone}`,
      { 'sbadge--flare': flare },
    ]"
    :aria-label="label"
    >{{ count }}</span
  >
</template>

<style scoped>
.sbadge {
  /* Ein Maß trägt alles Übrige: Ecktaste clamp(15px…21px), Reiter 16px,
     Schiene 18px — Rundung, Schriftgrad und Polsterung folgen ihm. */
  --d: var(--sbadge-d, 16px);
  z-index: 20;
  min-width: var(--d);
  height: var(--d);
  padding: 0 calc(var(--d) * 0.22);
  border-radius: calc(var(--d) / 2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--d) * 0.62);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  background: linear-gradient(160deg, var(--sb-a), var(--sb-b));
  /* ── KEIN RAND, eine AUSSPARUNG ──────────────────────────────
     Hier stand `1.5px solid #bae6fd`, und eine helle Kontur um eine helle
     Fläche liest sich als Aufkleber: sie umreisst die Marke, statt sie
     abzusetzen.

     Der erste Schatten tut dasselbe von aussen und besser — ein fast schwarzer
     Ring, der die Marke von JEDEM Untergrund trennt. Das ist der Punkt: seit
     sie im Shop in der Ecke eines GRÜNEN Kaufknopfs sitzt, muss sie sich nicht
     mehr nur gegen dunkles Holz behaupten. Eine helle Kontur wäre dort der
     hellste Fleck der Zeile gewesen.

     Der zweite hebt sie an, die Glanzkante innen gibt der randlosen Fläche
     wieder einen Körper. ALLE drei stehen still — animiert wird ausschliesslich
     die Deckkraft von `::after` (Performance-Regel 2). */
  box-shadow:
    0 0 0 1.5px rgba(10, 12, 16, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.sbadge--corner {
  position: absolute;
  top: var(--sbadge-top, 4px);
  right: var(--sbadge-right, 4px);
}

.sbadge--inline {
  position: relative;
}

/* Der Schein liegt als EIGENE Ebene darüber und ist im Ruhezustand unsichtbar:
   sein `box-shadow` bleibt damit statisch, animiert wird allein die `opacity`.
   Ein Schatten IN der Keyframe rasterte die Box samt Hof in jedem Frame neu. */
.sbadge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    0 0 12px var(--sb-glow-a),
    0 0 20px var(--sb-glow-b);
  opacity: 0;
}

/* Azur — die Star Forge. */
.sbadge--forge {
  --sb-a: #7cc0ff;
  --sb-b: #2563eb;
  --sb-glow-a: rgba(59, 130, 246, 0.9);
  --sb-glow-b: rgba(37, 99, 235, 0.45);
}

/* Cyan — der Champion-Shop. Dieselben Werte wie `.mini-badge--champion` in der
   Reiterleiste und `RpgNotifyBadge variant="shop"` auf der Karte: der Spieler
   folgt EINER Farbe von der Ecktaste bis zur Karte, die sie meint. */
.sbadge--champions {
  --sb-a: #22d3ee;
  --sb-b: #0891b2;
  --sb-glow-a: rgba(6, 182, 212, 0.9);
  --sb-glow-b: rgba(8, 145, 178, 0.45);
}

/* Kein Dauertakt — die Marke steht ruhig und meldet sich nur beim Anwachsen.
   Dauer und BADGE_FLARE_MS in `config/constants/ui.ts` müssen zusammenpassen. */
.sbadge--flare {
  animation: sbadge-flare 0.55s ease-out 1;
}

.sbadge--flare::after {
  animation: sbadge-flare-glow 0.55s ease-out 1;
}

@keyframes sbadge-flare {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes sbadge-flare-glow {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sbadge--flare,
  .sbadge--flare::after {
    animation: none;
  }
}
</style>
