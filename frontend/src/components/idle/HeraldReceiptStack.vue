<script setup lang="ts">
import { useHerald } from '@/composables/ui/useHerald'
import HeraldReceiptCard from './HeraldReceiptCard.vue'

const { receipts } = useHerald()
</script>

<template>
  <!-- `aria-relevant="additions"`: ohne das liest ein Screenreader bei drei
       Karten mit rollierender Standzeit auch jedes VERSCHWINDEN vor. -->
  <TransitionGroup
    tag="div"
    name="hr"
    class="hr-stack"
    role="status"
    aria-live="polite"
    aria-relevant="additions"
  >
    <HeraldReceiptCard v-for="receipt in receipts" :key="receipt.id" :receipt="receipt" />
  </TransitionGroup>
</template>

<style scoped>
/* Großzügiger als früher: seit die Karten die Bannerform tragen, haben sie
   keine Rahmenkante mehr, die zwei gestapelte optisch trennt — der Abstand
   allein leistet das jetzt. */
.hr-stack {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.9vh, 14px);
  align-items: center;
}

/* Das Nachrücken einer Karte — und das Wegschieben des ganzen Stapels, wenn
   über ihm eine Zeremonie auftaucht. FLIP der TransitionGroup, also transform,
   kein Layout-Sprung. */
.hr-move {
  transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.hr-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.24s cubic-bezier(0.2, 1.3, 0.4, 1);
}

/* `position: absolute` ist hier Pflicht: ohne das bleibt die abgehende Karte im
   Fluss und die move-Animation der übrigen läuft ins Leere. */
.hr-leave-active {
  position: absolute;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.hr-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.hr-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
