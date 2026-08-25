<script setup lang="ts">
/**
 * Der Zähler auf einer Galaxie-Miniatur — was dort auf den Spieler wartet.
 *
 * Kein Rand, sondern eine dunkle Aussparung: nur so setzt er sich auf JEDEM
 * Galaxienbild ab. Alle Schatten stehen still. Azur bleibt der Star Forge, hier
 * zählt Gold/Teal.
 *
 * KEINE Notify-Marke — `RpgNotifyBadge` und jede `notif`-Klasse verlangen einen
 * Eintrag in `config/ui/notifyBadges.ts`, und diese Zahl ist keine.
 */
defineProps<{ count: number; ready: boolean }>()
</script>

<template>
  <span class="ewb" :class="{ 'ewb--ready': ready }">{{ count }}</span>
</template>

<style scoped>
.ewb {
  position: absolute;
  right: 3px;
  top: 3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #14100a;
  background: linear-gradient(160deg, #f0d080, #c89040);
  box-shadow:
    0 0 0 1.5px rgba(10, 12, 16, 0.85),
    0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}
.ewb--ready {
  background: linear-gradient(160deg, #a8f0d8, #2e9c78);
}
</style>
