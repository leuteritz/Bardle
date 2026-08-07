<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useActionToast } from '@/composables/ui/useActionToast'
import { TOAST_DURATION_MS } from '@/config/constants'

const { message, kindDef, seq, visible } = useActionToast()

/** Der Laufbalken leert sich exakt über die Standzeit — eine Quelle, kein Duplikat. */
const timerDuration = `${TOAST_DURATION_MS}ms`
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="action-toast"
      :style="{ '--toast-accent': kindDef.accent }"
      role="status"
      aria-live="polite"
    >
      <div class="toast-card">
        <div class="toast-goldline" aria-hidden="true" />
        <div class="toast-accent-rail" aria-hidden="true" />

        <div class="toast-body">
          <!-- `:key` → das Sigil wird bei jeder neuen Meldung neu gebaut und
               spielt seinen Auftritt erneut, auch wenn die Karte stehenbleibt. -->
          <div :key="seq" class="toast-sigil">
            <Icon :icon="kindDef.icon" class="toast-sigil-icon" width="34" height="34" />
          </div>

          <div class="toast-text">
            <span class="toast-eyebrow">
              <span class="toast-eyebrow-tick" aria-hidden="true" />
              {{ kindDef.label }}
            </span>
            <span class="toast-msg">{{ message }}</span>
          </div>

          <span class="toast-mark" aria-hidden="true">✦</span>
        </div>

        <div class="toast-timer" aria-hidden="true">
          <div :key="seq" class="toast-timer-fill" :style="{ animationDuration: timerDuration }" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Die Karte schwebt über dem Tab-Inhalt und darf ihn nie blockieren — der
   alte Vollbreiten-Streifen fing Klicks in der obersten Zeile jedes Tabs ab.
 *
 * Zentriert wird im BÜHNENBEREICH des aktiven Tabs, nicht im ganzen Modal: hat
 * ein Tab eine Seitenschiene (Planet-Tab), meldet er ihre Breite als
 * --toast-inset-right an .rp-modal-content an, und die Karte hält sich links
 * davon. Ohne das stand sie neben dem Planeten, auf den sie sich bezieht.
 * Tabs ohne Schiene lassen die Variable ungesetzt und bekommen die 0. */
.action-toast {
  position: absolute;
  top: 0;
  left: 0;
  right: var(--toast-inset-right, 0px);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px 0;
  pointer-events: none;
}

.toast-card {
  position: relative;
  flex: 0 1 auto;
  min-width: 320px;
  max-width: min(880px, 100%);
  overflow: hidden;
  background: #14100a;
  border: 2px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.88),
    inset 0 0 0 1px #3e200a;
}

/* Goldlinie oben — dieselbe wie an jedem Modal des Spiels. */
.toast-goldline {
  height: 3px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
}

/* Der Akzent trägt die Bedeutung: Farbe = Art des Ereignisses. */
.toast-accent-rail {
  position: absolute;
  top: 3px;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--toast-accent);
  box-shadow: 0 0 10px -1px var(--toast-accent);
}

.toast-body {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 13px 20px 13px 22px;
}

.toast-sigil {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 52px;
  height: 52px;
  color: var(--toast-accent);
  background: #1c1409;
  border: 2px solid var(--toast-accent);
  border-radius: 5px;
  box-shadow:
    inset 0 0 14px rgba(0, 0, 0, 0.85),
    0 0 12px -3px var(--toast-accent);
  animation: toast-sigil-pop 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}

.toast-sigil-icon {
  display: block;
}

.toast-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.toast-eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--toast-accent);
  text-transform: uppercase;
  letter-spacing: 2.4px;
}

.toast-eyebrow-tick {
  width: 14px;
  height: 2px;
  background: var(--toast-accent);
  opacity: 0.7;
}

.toast-msg {
  font-size: 25px;
  font-weight: 700;
  line-height: 1.16;
  color: #f6e6b4;
  letter-spacing: 0.4px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}

.toast-mark {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 18px;
  color: var(--toast-accent);
  opacity: 0.45;
}

/* Standzeit als Balken: er leert sich über transform, bleibt also
   Compositor-Arbeit — kein width-Lauf, kein Layout pro Frame. */
.toast-timer {
  height: 3px;
  background: #241708;
}

.toast-timer-fill {
  height: 100%;
  background: var(--toast-accent);
  transform-origin: left center;
  animation: toast-timer linear both;
}

@keyframes toast-timer {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

@keyframes toast-sigil-pop {
  from {
    transform: scale(0.55) rotate(-14deg);
  }
  to {
    transform: scale(1) rotate(0deg);
  }
}

/* Auftritt und Abgang laufen ausschließlich über transform/opacity. */
.toast-enter-active {
  animation: toast-in 0.3s cubic-bezier(0.16, 1.1, 0.3, 1);
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in forwards;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-100%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-16px) scale(0.98);
  }
}

/* Full HD / WUXGA: flachster Viewport, die Karte rückt näher an den Rand und
   gibt ein paar Pixel Höhe ab — lesbar bleibt sie. */
@media (max-height: 1100px) {
  .action-toast {
    padding: 10px 18px 0;
  }

  .toast-card {
    max-width: min(760px, 100%);
  }

  .toast-body {
    gap: 13px;
    padding: 10px 16px 10px 18px;
  }

  .toast-sigil {
    width: 44px;
    height: 44px;
  }

  .toast-sigil-icon {
    width: 28px;
    height: 28px;
  }

  .toast-eyebrow {
    font-size: 11px;
    letter-spacing: 2px;
  }

  .toast-msg {
    font-size: 21px;
  }
}

/* 4K und höher: auf 2030 px Viewporthöhe wirkt die Standardgröße verloren. */
@media (min-height: 1600px) {
  .action-toast {
    padding: 20px 32px 0;
  }

  .toast-card {
    max-width: min(1080px, 100%);
  }

  .toast-body {
    gap: 20px;
    padding: 17px 26px 17px 28px;
  }

  .toast-sigil {
    width: 64px;
    height: 64px;
  }

  .toast-sigil-icon {
    width: 42px;
    height: 42px;
  }

  .toast-eyebrow {
    font-size: 14px;
    letter-spacing: 2.8px;
  }

  .toast-msg {
    font-size: 31px;
  }

  .toast-mark {
    font-size: 22px;
  }
}
</style>
