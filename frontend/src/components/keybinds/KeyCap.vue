<template>
  <span class="keycap" :class="[`keycap--${size}`, { 'keycap--pressed': pressed, 'keycap--lit': lit }]">
    <span class="keycap__face">{{ cap }}</span>
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
  }>(),
  { size: 'md', pressed: false, lit: false },
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
