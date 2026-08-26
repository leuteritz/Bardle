<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { GAME_SPEED_DEFAULT } from '@/config/constants'
import type { AbilityBarDock } from '@/types'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyTheme } from '@/composables/ui/useGalaxyTheme'
import { useGamePause } from '@/composables/system/useGamePause'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { useSpaceMusic } from '@/composables/system/useSpaceMusic'
import MusicControlWidget from '@/components/idle/MusicControlWidget.vue'
import IdleGameComponent from '@/components/idle/IdleGameComponent.vue'
import StarBackgroundComponent from '@/components/idle/StarBackgroundComponent.vue'
import PlanetRescueOverlay from '@/components/idle/planet/PlanetRescueOverlay.vue'
import StarFightModal from '@/components/idle/planet/StarFightModal.vue'
import AugmentSelectionModal from '@/components/augment/AugmentSelectionModal.vue'
import AugmentAutoPickToast from '@/components/augment/AugmentAutoPickToast.vue'
import WayfinderHudCard from '@/components/idle/mission/WayfinderHudCard.vue'
import RoleSelectionModal from '@/components/roleSelection/RoleSelectionModal.vue'
import HyperspaceOverlay from '@/components/idle/prestige/HyperspaceOverlay.vue'
import UniverseSelectModal from '@/components/idle/prestige/UniverseSelectModal.vue'
import EncyclopediaPanel from '@/components/encyclopedia/EncyclopediaPanel.vue'
import AppHeaderComponent from '@/components/header/AppHeaderComponent.vue'
import StarTimerBarsComponent from '@/components/header/StarTimerBarsComponent.vue'
import FpsOverlay from './components/idle/FpsOverlay.vue'
import EventLogPanel from '@/components/idle/EventLogPanel.vue'
import NebulaFlythroughComponent from '@/components/idle/NebulaFlythroughComponent.vue'
import OfflineProgressModal from '@/components/idle/OfflineProgressModal.vue'
import PauseOverlay from '@/components/idle/PauseOverlay.vue'
import HeraldOverlay from '@/components/idle/HeraldOverlay.vue'
import SupernovaTransition from '@/components/idle/sun/SupernovaTransition.vue'
import DrifterLayer from '@/components/idle/drifter/DrifterLayer.vue'
import VoidLayer from '@/components/idle/void/VoidLayer.vue'
import VoidRiftHudCard from '@/components/idle/void/VoidRiftHudCard.vue'
import DrifterInfoCard from '@/components/idle/drifter/DrifterInfoCard.vue'
import ActiveBuffBar from '@/components/idle/drifter/ActiveBuffBar.vue'
import OmenHudCard from '@/components/idle/omen/OmenHudCard.vue'
import OmenChoiceOverlay from '@/components/idle/omen/OmenChoiceOverlay.vue'
import BardAbilityBar from '@/components/idle/abilities/BardAbilityBar.vue'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import TemperedFateOverlay from '@/components/idle/abilities/TemperedFateOverlay.vue'
import BottomBarComponent from '@/components/bottom/BottomBarComponent.vue'
import KeybindHud from '@/components/keybinds/KeybindHud.vue'
import KeybindPanel from '@/components/keybinds/KeybindPanel.vue'

const gameStore = useGameStore()
const starGroupStore = useStarGroupStore()
const { isPaused } = useGamePause()

/**
 * Fähigkeitenleiste und Buff-Reihe stehen dort, wo gerade Platz für sie ist:
 *
 *   rail  → in der Schiene des Star-Fight-Modals
 *   free  → unten am Bild, über dem Scoreboard
 *   pause → im Kit-Band des Pause-Overlays — NUR die Buff-Reihe
 *
 * Im Star Fight lagen sie über Sonnen-Horizont und Spieler-HP. Pausiert lagen
 * sie über dem Overlay selbst: beide stehen bei z-index 10001, das Overlay bei
 * 9998 — sie schwebten also mitten auf dem Panel, samt Hover und Klick.
 *
 * Die Buff-Reihe zieht deshalb ins Band; die Fähigkeitenleiste verschwindet
 * dort ganz (sie prüft `isPaused` selbst), weil das Overlay ihre Kacheln durch
 * `PauseKitPanel` ersetzt — Zeilen statt Knöpfe, da nichts bedienbar ist.
 * Die Pause hat Vorrang vor dem Star Fight, weil ihr Overlay über beidem liegt.
 *
 * `<Teleport>` SETZT die Komponente UM, es erzeugt sie nicht neu: die
 * Tastenanmeldung der Leiste, ihr rAF-Lauf für alle Cooldowns und das
 * nicht-reaktive Kachelregister überleben den Wechsel unverändert. Genau
 * deshalb ist es hier ein Teleport und keine zweite Instanz.
 *
 * ZWEI echte Docks statt `:disabled`, und `defer` dazu — beides kein
 * Geschmack, sondern zwei verschiedene Fallstricke:
 *
 * • Vue löst das Teleport-Ziel nur neu auf, wenn sich `to` ÄNDERT; ein
 *   deaktivierter Teleport schreibt sein altes `to` sogar ausdrücklich
 *   zurück. Mit `:disabled` bliebe das Ziel für immer `null`, und das
 *   Einschalten stürbe an `insertBefore` auf `null` — samt dem restlichen
 *   Patch von App, sodass danach nicht einmal mehr das Modal erschien.
 * • `defer` deckt den AUFBAU ab: Vue hängt das Wurzelelement einer Komponente
 *   erst ein, NACHDEM es seine Kinder gemountet hat. Beim ersten Durchlauf
 *   steht `#orbit-ability-dock` also noch nicht im Dokument, und ohne `defer`
 *   fände der Teleport auch dieses Ziel nicht.
 *
 * Warum zusätzlich ein eigenes Flag statt `computed(() => …ModalOpen)`:
 * dieselbe Zustandsänderung stößt App.vue UND das Modal zum Neurendern an, und
 * App ist das ältere Bauteil — es kommt in der Warteschlange ZUERST dran.
 * Angedockt wird deshalb erst, wenn das Dock nachweislich steht.
 *
 * Der Rückweg braucht kein `nextTick`: der Watcher läuft vor dem Rendern, die
 * Leisten ziehen also zurück, solange das Dock noch im DOM steht.
 */
const railDocked = ref(false)
const pauseDocked = ref(false)

watch(
  () => starGroupStore.starFightModalOpen,
  async (open) => {
    if (!open) {
      railDocked.value = false
      return
    }
    await nextTick()
    railDocked.value = document.getElementById('sf-ability-dock') !== null
  },
)

watch(isPaused, async (paused) => {
  if (!paused) {
    pauseDocked.value = false
    return
  }
  await nextTick()
  pauseDocked.value = document.getElementById('pause-buff-dock') !== null
})

/** Die Buff-Reihe kennt alle drei Stellen, die Leiste nur zwei — pausiert wird
 *  sie nicht umgehängt, sondern gar nicht gerendert. */
const buffDock = computed<AbilityBarDock>(() =>
  pauseDocked.value ? 'pause' : railDocked.value ? 'rail' : 'free',
)
const abilityDock = computed<AbilityBarDock>(() => (railDocked.value ? 'rail' : 'free'))

/** Die Dock-Kennungen ausgeschrieben statt aus dem Zustand zusammengesetzt:
 *  ein Template-String fände `#orbit-buff-dock` in keiner Suche wieder. */
const BUFF_DOCK_IDS: Record<AbilityBarDock, string> = {
  free: '#orbit-buff-dock',
  rail: '#sf-buff-dock',
  pause: '#pause-buff-dock',
}
const ABILITY_DOCK_IDS: Record<'free' | 'rail', string> = {
  free: '#orbit-ability-dock',
  rail: '#sf-ability-dock',
}
useGalaxyTheme()
useSpaceMusic()

/** Der Spiegel im Store ist reaktiv, die Uhr selbst nicht. */
const isTimeWarped = computed(() => gameStore.gameSpeed !== GAME_SPEED_DEFAULT)

const { isRenderingPaused, isIdleRenderingPaused } = useRenderingPaused()

watch(
  isRenderingPaused,
  (paused) => {
    document.documentElement.classList.toggle('rendering-paused', paused)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen cosmic-bg" :class="{ 'cosmic-drift-paused': isIdleRenderingPaused }">
    <div class="galaxy-tint-overlay" aria-hidden="true"></div>
    <StarBackgroundComponent />
    <NebulaFlythroughComponent />
    <StarFightModal />
    <AugmentSelectionModal />
    <!-- Wayfinder: das oberste und einzige DAUERHAFTE Glied der linken
         Kartenspalte. Alles darunter — Auto-Pick, Riss, Vorzeichen, Drifter —
         ist flüchtig und würde eine ständig sichtbare Karte sonst mehrmals pro
         Minute auf und ab schieben. Ein Element, das immer da ist, darf sich
         nicht bewegen. -->
    <WayfinderHudCard />
    <AugmentAutoPickToast />
    <RoleSelectionModal />
    <HyperspaceOverlay />
    <UniverseSelectModal />
    <EventLogPanel />
    <OfflineProgressModal />
    <PauseOverlay />
    <HeraldOverlay />
    <SupernovaTransition />
    <StarTimerBarsComponent />

    <div class="flex flex-col justify-between w-full min-h-screen px-4 pb-10">
      <div class="w-full">
        <AppHeaderComponent />

        <div class="planet-rescue-wrapper">
          <PlanetRescueOverlay />
        </div>
      </div>

      <div class="flex flex-col w-full gap-2">
        <div class="flex justify-center w-full">
          <!-- While an opaque overlay covers the screen (bard tab or star-fight
               modal), the idle layer's CSS animations pause — they'd only burn
               compositor time invisibly -->
          <div class="w-full" :class="{ 'idle-anim-paused': isIdleRenderingPaused }">
            <IdleGameComponent />
          </div>
        </div>
      </div>
    </div>

    <!-- Drifters fly over the idle orbit, below every modal. The info card sits
         top-left under the auto-pick message and says what is out there and how
         long; the buff bar above the scoreboard collects every timed effect. -->
    <DrifterLayer />
    <DrifterInfoCard />
    <div id="orbit-buff-dock" class="bard-dock" />
    <Teleport defer :to="BUFF_DOCK_IDS[buffDock]">
      <ActiveBuffBar :dock="buffDock" />
    </Teleport>

    <!-- The Void: der Riss steht im Orbit auf derselben Ebene wie die Drifter,
         seine Karte an der SPITZE des Stapels oben links — sie meldet als
         einzige der drei eine Frist, die etwas kostet. Beide hängen hier und
         nicht im Idle-Layer, damit ein Riss auch weiterläuft (und kollabiert),
         während das Bard-Profil offen steht. -->
    <VoidLayer />
    <VoidRiftHudCard />

    <!-- Omens: die HUD-Karte teilt sich die linke Ecke mit der Drifter-Karte und
         steht über ihr (sie ist dauerhaft da, die andere nur Sekunden). Das
         Wahl-Overlay erscheint nur, wenn ein Trio ansteht, und wartet, solange
         ein Profil-Tab das Spielbild verdeckt. -->
    <OmenHudCard />
    <OmenChoiceOverlay />

    <!-- Bard-Fähigkeiten: die Leiste sitzt über dem Scoreboard und schiebt die
         Buff-Reihe über sich; der Stase-Schleier liegt über dem Orbit, aber
         unter jedem Modal. -->
    <div id="orbit-ability-dock" class="bard-dock" />
    <Teleport defer :to="ABILITY_DOCK_IDS[abilityDock]">
      <BardAbilityBar :dock="abilityDock" />
    </Teleport>
    <TemperedFateOverlay />

    <MusicControlWidget />

    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-[45] px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 hover:pr-3 group encyclopedia-toggle"
      @click="gameStore.toggleEncyclopedia()"
    >
      <Icon icon="game-icons:wax-tablet" width="24" height="24" class="transition-transform duration-200 group-hover:scale-110" style="color: #e8c040" />
    </button>

    <EncyclopediaPanel />
    <BottomBarComponent />

    <!-- Tastenkürzel: die Keycap-Leiste sitzt unten rechts als Gegenstück zur
         Signatur-Zeile links, das Panel listet alle Kürzel auf. Das Panel ist
         immer montiert — es hält den Handler für sein eigenes Kürzel. -->
    <KeybindHud />
    <KeybindPanel />

    <!-- Zeitraffer-Warnung. Sie ist die wichtigere Hälfte des Reglers: ein Lauf
         bei 10× sieht auf einem Screenshot exakt aus wie ein Live-Lauf, und eine
         Balance-Messung, die versehentlich beschleunigt lief, ist wertlos.
         Der Rahmen liegt am Bildrand statt in der Bühne — dort verdeckt er
         nichts Spielbares (siehe „HUD-Freiraum"), ist aber immer im Blick. -->
    <div v-if="isTimeWarped" class="warp-frame" aria-hidden="true"></div>
    <div v-if="isTimeWarped" class="warp-pill">
      <Icon icon="game-icons:extra-time" width="15" height="15" />
      {{ gameStore.gameSpeed }}× TIME WARP — NOT LIVE
    </div>

    <!-- Signatur und FPS-Zähler sitzen als ein Paar unten links über der
         Minimap — die obere linke Ecke gehört der Auto-Pick-Meldung. -->
    <div class="credit-row">
      <span class="copyright-overlay text-amber-600/60">© Leuteritz</span>
      <FpsOverlay />
    </div>
  </div>
</template>

<style>
/* Die Orbit-Docks sind reine Teleport-Ziele: `display: contents` gibt ihnen
   keine eigene Box, die Leisten stehen darin genau so wie vorher direkt hier
   im Baum. Ihre Stelle im Template ist Absicht — sie hält die DOM-Reihenfolge
   von Buff-Reihe und Fähigkeitenleiste, die sich einen z-index teilen. */
.bard-dock {
  display: contents;
}

:root {
  --galaxy-accent: #0a1a3e;
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);

  --header-bg: rgba(8, 5, 18, 0.72);
  --header-border: rgba(255, 200, 80, 0.1);
  --header-divider: rgba(255, 200, 80, 0.12);
  --header-radius: 10px;

  --color-chimes: #f0c840;
  --color-cps: #74d448;
  --color-label: rgba(200, 185, 140, 0.55);

  --header-total-height: 50px;

  /* Fluid scaling — no breakpoint jumps */
  /* Die Breite ist ein Rest: 808px gehen an die beiden HUD-Gassen (Kartenspalte
     links, Eventlog rechts), der Header bekommt, was übrig bleibt. Boden 1048,
     darunter clippt die rechte Flex-Zeile. Siehe headerWidthBudget.spec.ts. */
  --header-max-width: clamp(1048px, calc(100vw - 808px), 1400px);

  /* Die EINE Breite beider HUD-Spalten. Der Header steht mittig, also ist die
     rechte Gasse die gespiegelte linke — eine Formel trägt beide Seiten, und
     die fünf Karten links wie die Log-Spur rechts lesen nur noch von hier.
     Die Skalare setzt main.ts vor dem Mount; Wächter: hudColumnWidth.spec.ts. */
  --hud-col-edge: var(--hud-col-inset);
  --hud-col-w: clamp(
    var(--hud-col-min),
    calc(var(--header-vp-left, 22vw) - var(--hud-col-edge) * 2),
    var(--hud-col-max)
  );
  --header-height: clamp(62px, calc(30px + 2.9vw), 115px);
  --bard-avatar-radius: clamp(14px, 1.4vw, 40px);
  --avatar-circle-size: clamp(48px, calc(-5px + 4.4vw), 100px);
  --bump-center: clamp(6px, calc(-4px + 1vw), 20px);
  --bump-profile: clamp(2px, calc(-3px + 0.5vw), 8px);

  /* hud-scale drives the whole bottom bar. Fluid and height-aware: the bar
     tracks the smaller of viewport width and height so it never dominates
     short screens (e.g. 1440×900 MacBooks). Registered via @property below
     so JS readers get a resolved number, not a calc() token stream. */
  /* tan(atan2(a, b)) divides two lengths into a plain <number> — plain
     calc(100vw / 2560px) is invalid CSS division */
  --hud-scale: clamp(0.52, min(tan(atan2(100vw, 2560px)), tan(atan2(100vh, 1440px))), 1);
  --hud-panel-size: calc(440px * var(--hud-scale));
  /* Height of the low center strip (scoreboard) of the bottom bar:
     (BOTTOM_BAR_HEIGHT 443 − BOTTOM_BAR_CENTER_TOP_Y 364) × hud-scale.
     Overlays that must end above the scoreboard anchor to this. */
  --bottom-center-strip-h: calc(79px * var(--hud-scale));

  /* team-ui-scale shrinks the fixed-px team-tab panels (shop modals, details
     side panel) on small desktops. Reference design is 1920×1080; below that
     the panels zoom down proportionally, capped at 1 on large screens. */
  --team-ui-scale: clamp(0.62, min(tan(atan2(100vw, 1920px)), tan(atan2(100vh, 1080px))), 1);
}

@property --hud-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 0.75;
}

@property --team-ui-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 0.85;
}

/* Die Zeile trägt Position und Schriftgrad für beide Kinder — Signatur und
   FPS stehen dadurch garantiert auf einer Grundlinie und in einer Größe,
   ganz gleich wie der clamp() bei welcher Auflösung ausfällt. */
.credit-row {
  position: fixed;
  /* unten links, direkt über dem oberen Rahmen des Minimap-Panels */
  bottom: calc(var(--hud-panel-size, 330px) + 8px);
  left: 0.75rem;
  z-index: 9999;
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  pointer-events: none;
  font-size: clamp(0.72rem, 0.9vw, 1rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  user-select: none;
}

.copyright-overlay {
  font-size: inherit;
  color: #f8e7a6;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .credit-row {
    font-size: 1.5rem;
  }
}

/* Ab hier rücken BEIDE HUD-Spalten gemeinsam von der Bildkante ab — dieselbe
   Schwelle, an der die Karten links auf ihre grosse Typografie umstellen. */
@media (min-width: 2400px) {
  :root {
    --hud-col-edge: var(--hud-col-inset-wide);
  }
}

/* ── Zeitraffer-Warnung ───────────────────────────────────────────────────
   Der Rahmen sitzt AUF der Bildkante und damit außerhalb des freien Feldes —
   er verdeckt nichts Spielbares, ist aber aus jedem Blickwinkel da. Statisch,
   ohne Animation: er steht minutenlang, und ein pulsender Schatten über die
   ganze Bildfläche wäre eine Neurasterung pro Frame. */
.warp-frame {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 99998;
  box-shadow: inset 0 0 0 3px #cc6050;
}

/* Unten links über der Signatur — dieselbe Ecke, die das Spiel schon für
   Chrome nutzt. Über dem Minimap-Panel, damit sie nichts überdeckt. */
.warp-pill {
  position: fixed;
  bottom: calc(var(--hud-panel-size, 330px) + 30px);
  left: 0.75rem;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #cc6050;
  background: #1e1008;
  color: #e89080;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  white-space: nowrap;
}

.galaxy-tint-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-color: var(--galaxy-accent);
  opacity: 0.18;
  transition: background-color 3s ease;
}

.cosmic-bg {
  background: #0a0620;
  position: relative;
}

.cosmic-bg::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 200%;
  height: 100%;
  background: var(--cosmic-gradient);
  background-size: 50% 100%;
  animation: cosmicShift 20s ease infinite;
  will-change: transform;
  z-index: -1;
  pointer-events: none;
}

/* The drifting gradient is a layer twice the viewport wide, kept on the
   compositor by will-change. Behind an opaque bard tab or the star-fight modal
   nobody can see it drift, so park it there — it stays painted, just still. */
.cosmic-drift-paused::before {
  animation-play-state: paused;
}

/* Spiel pausiert (Fenster ohne Fokus / Tab im Hintergrund): CSS-Animationen und
   Transitions einfrieren — sie kosten Compositor-Zeit, ohne dass jemand hinsieht.

   AUSGENOMMEN sind die beiden Ebenen, die im pausierten Spiel SICHTBAR bleiben:

   • Die Bottom-Bar liegt mit z-index 10000 über dem Pause-Overlay (9998).
     Minimap, Scoreboard und Command Panel laufen dort weiter (siehe
     useRenderingPaused → isHudPaused), und ihre Cooldown-Ringe, Scan-Punkte und
     Balken müssen das mitmachen.
   • Das Pause-Overlay selbst. Es EXISTIERT nur in diesem Zustand — jede seiner
     Animationen lag hier also tot, vom atmenden Titel über das Glühen der
     Chime-Münze bis zum Staub im Hintergrund. Sichtbar wurde das an den
     Flyby-Karten: ihr Zeitbogen soll stetig abbrennen, stand aber still und
     ruckte einmal je Sekunde auf den nächsten gebundenen Wert. Was hier läuft,
     ist genau das, worauf der Spieler gerade schaut. */
.rendering-paused *:not(.bottom-bar-shell, .bottom-bar-shell *, .pause-overlay, .pause-overlay *),
.rendering-paused
  *:not(.bottom-bar-shell, .bottom-bar-shell *, .pause-overlay, .pause-overlay *)::before,
.rendering-paused
  *:not(.bottom-bar-shell, .bottom-bar-shell *, .pause-overlay, .pause-overlay *)::after {
  animation-play-state: paused !important;
  transition: none !important;
}

/* Idle layer hidden behind an opaque overlay (bard tab or star-fight modal):
   freeze its CSS animations only — the overlay itself keeps animating normally */
.idle-anim-paused *,
.idle-anim-paused *::before,
.idle-anim-paused *::after {
  animation-play-state: paused !important;
}

@keyframes cosmicShift {
  0%,
  100% {
    transform: translateX(0%);
  }
  50% {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-bg::before {
    animation: none !important;
  }
}

.planet-rescue-wrapper {
  width: 100%;
  max-width: var(--header-max-width);
  margin-inline: auto;
  padding-inline: var(--bard-avatar-radius);
}

.encyclopedia-toggle {
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border-color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.15));
  border-radius: 4px 0 0 4px;
}

.encyclopedia-toggle:hover {
  background: #2a1a0a;
  border-color: var(--rpg-wood, #7c4f1a);
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}
</style>
