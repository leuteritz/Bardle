<script setup lang="ts">
/**
 * Die azurne Marke „Star Forge ready" — EINE Quelle für alle Stellen, an denen
 * sie erscheint: die Shop-Ecktaste im Header, der Shop-Reiter der Profil-Leiste
 * und die vier Abteilungs-Marken der Schiene im Shop-Tab.
 *
 * **Warum eine Komponente und keine dritte CSS-Kopie.** Die Optik stand vorher
 * zweimal ausgeschrieben (`.btn-gem-badge` im globalen Block von
 * `AppHeaderComponent.vue`, `.mini-badge--shopready` scoped in
 * `BardProfileMenu.vue`), die Schiene trug eine dritte, davon ABWEICHENDE Form
 * (grün, eckig, ohne Schein). Der Spieler folgt einem blauen Abzeichen vom
 * Header in den Shop-Tab — die Spur darf nicht genau dort abbrechen, wo sie ans
 * Ziel führt.
 *
 * **Azur ist im Farbkanon des Spiels für diese eine Bedeutung reserviert:**
 * Violett ist Expedition, Gold die Sonnen-Entwicklung, Cyan der Champion-Shop,
 * Smaragd die Planeten, Kupfer der Codex.
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
  }>(),
  { place: 'corner' },
)
</script>

<template>
  <span
    v-if="count > 0"
    class="sbadge"
    :class="[place === 'inline' ? 'sbadge--inline' : 'sbadge--corner', { 'sbadge--flare': flare }]"
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
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  border: 1.5px solid #bae6fd;
  box-shadow:
    0 0 6px rgba(59, 130, 246, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
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
    0 0 12px rgba(59, 130, 246, 0.9),
    0 0 20px rgba(37, 99, 235, 0.45);
  opacity: 0;
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
