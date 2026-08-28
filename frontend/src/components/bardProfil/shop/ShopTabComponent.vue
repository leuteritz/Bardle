<script setup lang="ts">
/**
 * Der Shop-Reiter — Champions und Ausrüstung, Facetten | Grid | Detail.
 *
 * Der Atlas lag einmal als Ebene über dem Sigil-Board und ging nur durch eine
 * Tür in der Board-Ecke auf. Er hat jetzt einen eigenen Reiter; die Wurzel hier
 * trägt genau das, was der Team-Tab ihm damals mitgab und was ihm sonst fehlte:
 * eine Flex-Box (`.cs-atlas` steht auf `flex: 1`, und `.tab-layer` im Profil ist
 * keine), die Escape-Stufe und den Besuchs-Lebenszyklus.
 *
 * KEIN Ladeschleier, und das ist eine Messung, keine Auslassung: das erste
 * Öffnen kostet 119 ms (Champion-Art dekodieren), jedes weitere 42–50 ms — und
 * 42 ms sind genau das, was ein Reiter ohne Schleier aufdecken darf.
 */
import { computed, ref, watch, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'

const uiStore = useUiStore()

/**
 * Der Reiter wird nach dem ersten Öffnen nicht mehr abgerissen, sondern nur noch
 * versteckt (siehe BardProfileMenu). Alles, was läuft, hängt deshalb hieran und
 * nicht an der Lebensdauer — sonst bliebe der Escape-Handler dauerhaft am
 * Fenster und verbrauchte die Taste auch im Idle-Orbit.
 */
const isVisible = computed(() => uiStore.bardActiveTab === 'shop')

/** True, solange eine Karte gewählt ist — ihre Seite füllt die Detailspalte. */
const detailOpen = ref(false)
/** Hochgezählt, um den Atlas die Auswahl fallen zu lassen (Escape). */
const closeDetailToken = ref(0)
/** Hochgezählt beim Betreten — der Atlas fängt seinen Besuch damit neu an. */
const visitToken = ref(0)

/**
 * Escape wickelt EINE Stufe ab: die Auswahl. Danach gehört die Taste dem Profil.
 *
 * Die Anfrage reist als Token nach unten statt als zweiter Fenster-Listener, der
 * mit diesem um die Reihenfolge liefe. Gemeldet wird sie mit `preventDefault()`
 * — `BardProfileMenu` entscheidet erst nach dem Ereignisdurchlauf anhand von
 * `defaultPrevented`, ob es zumacht.
 */
function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !detailOpen.value) return
  closeDetailToken.value++
  e.preventDefault()
}

watch(
  isVisible,
  (visible) => {
    if (!visible) {
      window.removeEventListener('keydown', onEsc)
      return
    }
    window.addEventListener('keydown', onEsc)
    // Der Besuch beginnt frisch: Suche, Auswahl und Abteilung sind der Stand des
    // LETZTEN Besuchs und können seitdem veraltet sein — eine Galaxie weiter steht
    // die höchste rekrutierbare Stufe woanders.
    //
    // Es sei denn, ein Deep-Link hat den Reiter GERADE aufgemacht (die Champion-
    // Zeile im Marken-Tooltip): dann ist er selbst die Ansage, wohin der Besuch
    // geht, und ein Reset löschte genau die Suche, die ihn hergebracht hat. Diese
    // Wurzel ist der Elternteil und läuft vor dem Atlas — sie sieht die Anfrage
    // also noch, bevor der sie verbraucht.
    if (uiStore.pendingChampionSearch) return
    visitToken.value++
  },
  { immediate: true },
)

onUnmounted(() => window.removeEventListener('keydown', onEsc))
</script>

<template>
  <!-- Die Box, die der Atlas braucht: `.cs-atlas` steht auf `flex: 1`, und ein
       `.tab-layer` ist `position: absolute` ohne Flex. Ohne sie fiele das Grid
       auf Inhaltsgröße zusammen. -->
  <div class="shop-tab">
    <!-- Der geteilte Sternenhimmel der Profil-Reiter. Er hängt HIER und nicht
         im Atlas: `.cs-atlas` trägt `zoom`, das die festen Sternkacheln
         mitskalieren und dem Shop als einzigem Reiter eine andere Sterndichte
         geben würde. -->
    <CosmicStageBackground />

    <ChampionShopComponent
      :close-detail-token="closeDetailToken"
      :visit-token="visitToken"
      @detail-state="detailOpen = $event"
    />
  </div>
</template>

<style scoped>
.shop-tab {
  position: absolute;
  inset: 0;
  display: flex;
  min-height: 0;
  background: #111008;
}

/* Depth-Wash über dem Sternfeld, damit die Karten das Hellste im Reiter
   bleiben. Flache Radialtöne wie `.ps-tab::after`, kein Blur, einmal Paint. */
.shop-tab::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(100% 70% at 42% 6%, rgba(92, 51, 16, 0.2) 0%, transparent 60%),
    radial-gradient(80% 70% at 100% 100%, rgba(46, 34, 96, 0.2) 0%, transparent 64%);
}
</style>
