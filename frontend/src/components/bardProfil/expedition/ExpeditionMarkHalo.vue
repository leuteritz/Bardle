<script setup lang="ts">
/**
 * Ring und Schein über einer Marke der Galaxiekarte — die EINE Hervorhebung.
 *
 * Sie stand zuerst nur am Sternknoten, für die Kopplung mit der Manifestreihe.
 * Seit die Formlegende eine ganze Markenart ausleuchtet, tragen sie drei
 * Knotenarten; dieselben vier gemessenen Faktoren dreimal abzuschreiben wäre
 * die Doppelung, die hier sonst überall vermieden wird.
 *
 * **Der Radius kommt von aussen, und zwar aus der MALFUNKTION** — `markR` ist
 * `starMarkRadius` / `landfallMarkRadius` / `incidentMarkRadiusAt`, nicht die
 * Fangfläche. Die hat einen Boden und einen eigenen Faktor; aus ihr
 * zurückgerechnet säße der Ring neben seiner Marke.
 *
 * **Beide Ebenen ruhen unsichtbar und kosten nichts:** kein Keyframe, kein
 * `will-change`, und `paintKey` sieht sie nicht — die Platte wird beim Hovern
 * NICHT neu gemalt. Der hervorgehobene Zustand ist ein einmaliger Umschlag,
 * kein Dauerläufer; animiert wird allein `opacity` und `transform`.
 */
defineProps<{
  /** Der GEMALTE Radius der Marke in px. */
  markR: number
  /** Der Ton, den die Marke auf dem Canvas ohnehin trägt. */
  ink: string
  on: boolean
}>()
</script>

<template>
  <span
    class="mkh"
    :class="{ 'mkh--on': on }"
    :style="{ '--mkh-r': `${markR}px`, '--mkh-ink': ink }"
    aria-hidden="true"
  >
    <span class="mkh-glow" />
    <span class="mkh-ring" />
  </span>
</template>

<style scoped>
/* Sie füllt die Fangfläche ihres Knotens; 50 % ist damit die Mitte der Marke. */
.mkh {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mkh-glow,
.mkh-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  opacity: 0;
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.mkh-glow {
  width: calc(var(--mkh-r) * 4.2);
  height: calc(var(--mkh-r) * 4.2);
  margin: calc(var(--mkh-r) * -2.1) 0 0 calc(var(--mkh-r) * -2.1);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--mkh-ink) 42%, transparent) 0%,
    color-mix(in srgb, var(--mkh-ink) 13%, transparent) 45%,
    transparent 72%
  );
  transform: scale(0.86);
}

/* Ein Ring statt einer animierten Randfarbe — dieselbe Regel wie beim Hafen.
   Er sitzt auf dem GEMALTEN Radius, 19 % nach aussen versetzt wie `.sn--on`. */
.mkh-ring {
  width: calc(var(--mkh-r) * 2.38);
  height: calc(var(--mkh-r) * 2.38);
  margin: calc(var(--mkh-r) * -1.19) 0 0 calc(var(--mkh-r) * -1.19);
  border: 2px solid var(--mkh-ink);
  transform: scale(0.88);
}

.mkh--on .mkh-glow,
.mkh--on .mkh-ring {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .mkh-glow,
  .mkh-ring {
    transition: none;
  }
}
</style>
