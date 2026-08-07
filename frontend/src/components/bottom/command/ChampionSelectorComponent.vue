<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useRoleAbilityStates } from '@/composables/battle/useRoleAbilityStates'
import { championInForeground } from '@/utils/orbit/foregroundGate'
import {
  ROLES,
  COMMAND_PANEL_ART_SIZE,
  ROLE_HOVER_COLORS,
  CHAMPION_REVIVE_MS,
  HUD_COUNTDOWN_TICK_MS,
  ABILITY_RING_CIRCUMFERENCE,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()
const uiStore = useUiStore()
const { headerSlots } = storeToRefs(battleStore)
const { roleAbilities } = useRoleAbilityStates()

// Ticker für den Revive-Countdown: championDownUntil ist reaktiv, Date.now() nicht.
const downNow = ref(Date.now())
let downTicker = 0

onMounted(() => {
  downTicker = window.setInterval(() => {
    downNow.value = Date.now()
  }, HUD_COUNTDOWN_TICK_MS)
})
onUnmounted(() => window.clearInterval(downTicker))

/** Verbleibende Ausfallzeit des Champions dieser Rolle in ms (0 = lebendig). */
function downMsLeft(i: number): number {
  const until = roleBehaviorStore.championDownUntil[ROLES[i].key as ChampionRole]
  return Math.max(0, until - downNow.value)
}

// Champion liegt am Boden — gleiche Bedingung wie im Idle-Orbit (ChampionOrbit)
function isChampionDown(i: number): boolean {
  return headerSlots.value[i] !== null && downMsLeft(i) > 0
}

function downSecsLeft(i: number): number {
  return Math.ceil(downMsLeft(i) / 1000)
}

/** Restanteil der Revive-Dauer (1 → 0) für den abschmelzenden Ring. */
function downProgress(i: number): number {
  return Math.min(1, downMsLeft(i) / CHAMPION_REVIVE_MS)
}

// Spiegel der Team-Tab-Auswahl: solange der Tab offen ist und dort das
// Details-Panel einer Rolle bearbeitet wird, trägt genau deren Karte eine
// Ziel-Markierung — derselbe Mechanismus wie beim Planet-Tab und der
// Planeten-Kachel darunter. Kein Panel offen → nichts zu spiegeln.
/**
 * One mark, one meaning: "this role is in focus right now". Several places can
 * put a role in focus, and all render the identical reticle here so the player
 * only ever learns one cue:
 *   • this panel — the card under the pointer, whatever else is open
 *   • team tab — the role node under the pointer
 *   • battle tab — the roster card under the pointer
 *   • team tab, standing selection — the role whose details panel is open
 *     (the tab mirrors that selection back to the store)
 * Pointing wins over the standing selection, because it is the more recent
 * intent — no matter which of the three places is doing the pointing, they all
 * write the same store field.
 */
const markedRoleIndex = computed(() => {
  if (uiStore.hoveredChampionSlotIndex !== null) return uiStore.hoveredChampionSlotIndex
  return uiStore.bardActiveTab === 'team' ? uiStore.teamActiveRoleIndex : null
})

function openPicker(slotIndex: number, subSlot: number = -1) {
  uiStore.requestOpenRolesTab(slotIndex, subSlot)
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function onSlotEnter(i: number) {
  uiStore.setHoveredChampionSlotIndex(i)
  if (headerSlots.value[i] !== null) {
    uiStore.setHoveredChampionRole(ROLES[i].key as ChampionRole)
  }
}

function onSlotLeave() {
  uiStore.setHoveredChampionSlotIndex(null)
  uiStore.setHoveredChampionRole(null)
}
</script>

<template>
  <div class="champ-cards">
    <button
      v-for="(slot, i) in headerSlots"
      :key="i"
      class="champ-card"
      :class="{
        'champ-card--filled': slot !== null,
        'champ-card--first': i === 0,
        'champ-card--last': i === headerSlots.length - 1,
        'champ-card--flash': roleAbilities[i].isFlashing && !isChampionDown(i),
        'champ-card--cd': roleAbilities[i].onCooldown && slot !== null && !isChampionDown(i),
        'champ-card--eclipsed': slot !== null && !championInForeground(slot) && !isChampionDown(i),
        'champ-card--down': isChampionDown(i),
        'champ-card--selected': markedRoleIndex === i,
      }"
      :style="{
        '--role-color': ROLES[i].color,
        '--hover-role-color': ROLE_HOVER_COLORS[ROLES[i].key],
      }"
      :title="
        slot
          ? isChampionDown(i)
            ? `${slot} (${ROLES[i].label}) – down, revives in ${downSecsLeft(i)}s`
            : `${slot} (${ROLES[i].label}) – click to change`
          : `${ROLES[i].label} – Select Champion`
      "
      @click="openPicker(i)"
      @mouseenter="onSlotEnter(i)"
      @mouseleave="onSlotLeave()"
    >
      <!-- role-colored header bar -->
      <div class="champ-card-bar" />

      <!-- portrait body -->
      <div class="champ-card-body">
        <img
          v-if="slot"
          :src="battleStore.getChampionImage(slot, { size: COMMAND_PANEL_ART_SIZE })"
          :alt="slot"
          class="champ-card-portrait"
          @error="onImgError"
        />
        <img
          v-else
          :src="ROLES[i].image"
          :alt="ROLES[i].short"
          class="champ-card-portrait champ-card-portrait--placeholder"
          aria-hidden="true"
        />
        <div class="champ-card-hover-glow" aria-hidden="true" />

        <!-- ability state (role ability tracking, was in the old bottom stats) —
             ein gefallener Champion verdrängt sie: seine Fähigkeiten pausieren,
             Cooldown-Pill und Ready-Dot wären dann irreführend -->
        <template v-if="slot !== null && !isChampionDown(i)">
          <!-- Ability-Kern: Rollen-Emblem mit umlaufendem Cooldown-Ring, der
               sich bis zur Bereitschaft füllt, darunter der Zustand im
               Klartext. Sitzt im unteren Kartendrittel über dem Rollen-Banner
               — freigehalten von Reticle-Ecken, Seitenkeilen und dem
               Eclipse-Medaillon in der Kartenmitte. -->
          <div
            class="champ-ability"
            :class="{
              'champ-ability--cd': !!roleAbilities[i].timer,
              'champ-ability--cast': roleAbilities[i].isFlashing,
            }"
          >
            <span class="champ-ability-orb">
              <!-- Fortschrittsring als SVG-Kontur. Vorher trieb eine Transition
                   auf der VERERBTEN Custom Property `--cd-progress` einen
                   conic-gradient samt Maske und drop-shadow: das rechnete pro
                   Frame den Farbverlauf neu, legte eigene Rendering-Surfaces an
                   und machte obendrein den ganzen Teilbaum der Karte dreckig —
                   fünfmal gleichzeitig, denn ein Cooldown läuft immer.
                   Der Bogen hier ist eine gestrichelte Kreislinie; bewegt wird
                   nur ihr `stroke-dashoffset`. -->
              <svg class="champ-ability-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle class="champ-ability-ring__track" cx="50" cy="50" r="47.5" />
                <circle
                  class="champ-ability-ring__fill"
                  cx="50"
                  cy="50"
                  r="47.5"
                  :style="{
                    strokeDashoffset: ABILITY_RING_CIRCUMFERENCE * (1 - roleAbilities[i].progress),
                  }"
                />
              </svg>
              <img :src="roleAbilities[i].image" alt="" draggable="false" />
            </span>
            <!-- Restzeit, solange eine läuft — sonst "READY". timer ist leer,
                 sobald der Cooldown abgelaufen ist, also trägt genau ein
                 Ausdruck beide Zustände. -->
            <span class="champ-ability-state">{{ roleAbilities[i].timer || 'READY' }}</span>
          </div>

          <!-- Eclipse: Champion fliegt gerade hinter der Sonne — Fähigkeiten
               warten, kein Angriff möglich. Der Schleier füllt die Karte mit
               dem Finsternis-Motiv (kalter Kernschatten, verdeckte Sonne
               glimmt als Korona am oberen Rand), der Chip benennt den Zustand.
               Bewusst ohne Transition: der Status soll sofort umschalten. -->
          <template v-if="!championInForeground(slot)">
            <div class="champ-card-eclipse-veil" />
            <div class="champ-card-eclipse-medal" title="Behind the Sun — combat paused">
              <Icon icon="game-icons:eclipse-flare" width="24" height="24" />
            </div>
          </template>
        </template>

        <template v-else-if="slot !== null">
          <!-- Champion am Boden — bis zum Revive raus aus dem Kampf.
               Deutlich härter als die Eclipse: das Porträt ist fast
               ausgelöscht, eine Warnschraffur legt sich über die Karte und
               ein Totenkopf-Emblem trägt den abschmelzenden Revive-Ring.
               Identisch zur zerstörten Planeten-Kachel darunter — nur die
               Ausfallzeit unterscheidet sich. -->
          <div class="champ-card-down-veil" />
          <div class="champ-card-down-hatch" />
          <div class="champ-card-down-core">
            <span class="champ-card-down-ring" :style="{ '--down-progress': downProgress(i) }">
              <Icon icon="game-icons:broken-skull" width="32" height="32" />
            </span>
            <span class="champ-card-down-timer">{{ downSecsLeft(i) }}s</span>
          </div>
        </template>

        <!-- role label -->
        <div v-ink-center class="champ-card-label">{{ ROLES[i].short }}</div>

        <!-- ── Ziel-Markierung: diese Rolle ist im Team-Tab geöffnet ──
             Reticle aus vier Eckwinkeln plus Keilen an beiden Seitenkanten —
             identische HUD-Sprache wie die markierte Planeten-Kachel darunter,
             nur auf das hohe Kartenformat gezogen. Alles reines Overlay: kein
             Layout-Shift, Down-/Eclipse-/Cooldown-Zustände laufen darunter
             unverändert weiter. -->
        <template v-if="markedRoleIndex === i">
          <div class="champ-select-glow" />
          <div class="champ-select-reticle">
            <span class="champ-sel-corner champ-sel-corner--tl" />
            <span class="champ-sel-corner champ-sel-corner--tr" />
            <span class="champ-sel-corner champ-sel-corner--bl" />
            <span class="champ-sel-corner champ-sel-corner--br" />
          </div>
          <span class="champ-select-tether champ-select-tether--l" />
          <span class="champ-select-tether champ-select-tether--r" />
        </template>
      </div>
    </button>
  </div>
</template>

<style scoped>
/* ── Durchgehend laufende Fortschrittsringe ─────────────────────────────────
   Die Ring-Werte kommen aus diskreten Takten: der Cooldown aus dem 1s-Game-
   Tick, die Revive-Zeit aus dem 250ms-HUD-Ticker. Als rohe Zahl gesetzt würde
   der Ring in ebenso großen Stufen springen — bei nur 8s Revive-Zeit sind das
   gut sichtbare Sprünge. Eine Transition über die Länge des jeweiligen Takts
   füllt die Lücke linear auf, der Ring läuft durchgehend.

   Der COOLDOWN-Ring tut das über `stroke-dashoffset` einer SVG-Kreislinie
   (siehe .champ-ability-ring): er läuft dauerhaft, und eine Transition auf
   einer VERERBTEN Custom Property hätte in jedem Frame den ganzen Teilbaum
   der Karte für ungültig erklärt und einen conic-gradient samt Maske und
   drop-shadow neu gerastert — fünfmal gleichzeitig.

   Der REVIVE-Ring darf bei seiner Bauart bleiben: er steht nur die wenigen
   Sekunden, die ein gefallener Champion am Boden liegt, und ist damit kein
   Dauerläufer. @property typisiert den Wert als <number> und macht ihn für
   den Browser interpolierbar; inherits: true, damit er im ::before ankommt. */
@property --down-progress {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

.champ-cards {
  display: flex;
  gap: 9px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
  width: 100%;
  height: 100%;
}

/* ── Card ── */
.champ-card {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease;
}
.champ-card:hover {
  transform: translateY(-1px);
}
.champ-card:active {
  transform: translateY(0) scale(0.98);
}

/* role-colored top bar with glow */
.champ-card-bar {
  height: 5px;
  flex-shrink: 0;
  border-radius: 3px 3px 0 0;
  background: var(--role-color, #c89040);
  box-shadow: 0 0 8px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent);
}
/* first card: the flat 5px bar can't bend around the 44px shell arc (CSS clamps
   the radius to the bar height) — the color is drawn as the body's top border
   instead, which follows the curve natively */
.champ-card--first .champ-card-bar {
  display: none;
}

/* portrait body */
.champ-card-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 2px solid var(--role-color, #c89040);
  border-top: none;
  border-radius: 0 0 5px 5px;
  background: #0e0c08;
  box-shadow: 0 0 10px color-mix(in srgb, var(--role-color, #c89040) 30%, transparent);
  transition: box-shadow 0.2s ease;
}
/* top-left corner follows the panel silhouette arc (frame geometry — exception
   to the 4-5px radius rule): shell arc 60px minus 20px panel gap = 40px, so the
   card corner runs concentric to the frame curve; the right panel edge sits
   flush with the screen edge, so the last card stays square up top */
.champ-card--first .champ-card-body {
  border-top: 5px solid var(--role-color, #c89040);
  border-bottom-left-radius: 5px;
  border-top-left-radius: 40px;
}
.champ-card:hover .champ-card-body {
  box-shadow:
    0 0 14px color-mix(in srgb, var(--role-color, #c89040) 55%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.5);
}


/* Leerer Slot: identischer Kartengrund wie die unbelegte Planeten-Kachel im
   Dock darunter (#1a1408 → #120e04) — beide Leerzustände lesen sich damit als
   dieselbe Sorte Fach, unabhängig davon, was sie später aufnehmen. Ein knapper
   radialer Schein in der Rollenfarbe liegt exakt unter dem mittigen Rollenbild
   und hebt es vom flachen Grund ab, ohne die Fläche einzufärben. */
.champ-card:not(.champ-card--filled) .champ-card-body {
  background:
    radial-gradient(
      circle at 50% 45%,
      color-mix(in srgb, var(--role-color, #c89040) 13%, transparent) 0%,
      transparent 56%
    ),
    linear-gradient(170deg, #1a1408 0%, #120e04 100%);
}

.champ-card-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition:
    transform 0.25s ease,
    filter 0.3s ease;
}
/* ability on cooldown → portrait kühlt leicht ab. Bewusst zurückhaltend: den
   Cooldown trägt jetzt der Ability-Kern mit Ring und Countdown, das Porträt
   muss ihn nicht mehr mitsignalisieren und darf lesbar bleiben. */
.champ-card--cd .champ-card-portrait {
  filter: grayscale(30%) brightness(0.86);
}
.champ-card:hover .champ-card-portrait {
  transform: scale(1.06);
}

/* Leerer Slot: das Rollenbild steht als eigenständiges Motiv exakt auf der
   Kartenmitte — nicht mehr als vollflächiges, weich ausmaskiertes Relief. Der
   Kartengrund bleibt dadurch flach und ruhig, das Motiv wird zum einzigen
   Inhalt zwischen Rahmen und Rollen-Banner. Die Box ist prozentual bemessen
   (die Karte skaliert mit --hud-scale) und mit `contain` gefüllt, damit
   unterschiedlich proportionierte Rollenbilder gleich groß wirken; 32% Höhe
   halten reichlich Abstand zum Banner unten und zum Kartenrand oben. */
.champ-card-portrait--placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 32%;
  object-fit: contain;
  object-position: center;
  opacity: 0.88;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8))
    drop-shadow(0 0 10px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent));
  transition:
    opacity 0.2s ease,
    filter 0.2s ease,
    transform 0.25s ease;
}
.champ-card:hover .champ-card-portrait--placeholder {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.07);
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.8))
    drop-shadow(0 0 16px color-mix(in srgb, var(--hover-role-color, #c89040) 75%, transparent));
}

/* hover glow inside the portrait */
.champ-card-hover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 35%,
    color-mix(in srgb, var(--hover-role-color, #c89040) 22%, transparent),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.champ-card:hover .champ-card-hover-glow {
  opacity: 1;
}
.champ-card--filled:hover .champ-card-hover-glow {
  animation: champ-role-pulse 1.4s ease-in-out infinite;
}

@keyframes champ-role-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* ── Ability-Kern ───────────────────────────────────────────────────────────
   Ersetzt die alte Pille in der oberen rechten Ecke: die kollidierte mit dem
   Auswahl-Reticle und war für die wichtigste Statusinfo der Karte zu klein.
   Der Kern sitzt jetzt in der freien Zone über dem Rollen-Banner und trägt
   den Zustand in einem Ring-Emblem — dieselbe Sprache wie Revive-Ring und
   Jungle-Buff-Chip, nur läuft der Ring hier VOLL statt leer: er zeigt den
   Weg zurück zur Bereitschaft, nicht die Restlaufzeit eines Effekts. */
/* Der Container ist exakt so groß wie das Emblem und liegt punktgenau auf der
   Kartenmitte — genau dort sitzen auch die Auswahl-Keile an den Seitenkanten,
   ihre Spitzen zeigen damit mittig aufs Rollen-Icon. Der Zustandstext hängt
   absolut darunter: läge er im Fluss, würde er das Emblem um seine halbe Höhe
   nach oben schieben und die Keile zielten daneben. */
.champ-ability {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}

.champ-ability-orb {
  position: relative;
  /* 56px lässt links und rechts noch Luft zu den Auswahl-Keilen an den
     Seitenkanten (die sitzen ebenfalls auf halber Kartenhöhe) */
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  /* Der Grund nimmt die Rollenfarbe auf, statt fast schwarz zu sein — das
     Emblem sitzt damit in einer beleuchteten Fassung und hebt sich auch vom
     dunklen Porträt ab. Der helle Innenrand gibt der Fassung Tiefe. */
  background: radial-gradient(
    circle at 38% 30%,
    color-mix(in srgb, var(--role-color, #c89040) 48%, #46381f) 0%,
    color-mix(in srgb, var(--role-color, #c89040) 22%, #241d12) 100%
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--role-color, #c89040) 60%, transparent),
    inset 0 0 12px rgba(0, 0, 0, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.65),
    0 0 14px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  transition: box-shadow 0.25s ease;
}

/* Fortschrittsring — füllt sich über den Cooldown bis zum geschlossenen Kreis.
   Beginnt oben (rotate -90deg) und läuft im Uhrzeigersinn. */
.champ-ability-ring {
  position: absolute;
  inset: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  transform: rotate(-90deg);
  overflow: visible;
  pointer-events: none;
}

.champ-ability-ring__track,
.champ-ability-ring__fill {
  fill: none;
  stroke-width: 5;
}

.champ-ability-ring__track {
  stroke: rgba(255, 240, 210, 0.1);
}

.champ-ability-ring__fill {
  stroke: var(--role-color, #c89040);
  stroke-linecap: round;
  /* Umfang bei r = 47.5 → 2·π·47.5 = 298.45 (ABILITY_RING_CIRCUMFERENCE) */
  stroke-dasharray: 298.45;
  /* Taktlänge = GAME_TICK_INTERVAL_MS (der Store zählt den Cooldown im
     1s-Raster herunter) — die Transition füllt die Lücke zwischen zwei Werten
     linear auf, damit der Ring durchgehend läuft. */
  transition: stroke-dashoffset 1s linear;
}

.champ-ability-orb img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
  /* über der Glut-Ebene (::after), damit deren Innenlinie das Emblem nicht
     überzeichnet */
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent));
  transition: filter 0.25s ease;
}

/* Zustandslabel unter dem Emblem — freistehender Text ohne Grund und Rahmen.
   "READY" ist das längste Wort und muss auf der innen 74px schmalen Karte
   vollständig stehen: 12px bei enger Sperrung ergibt rund 41px, also reichlich
   Luft. Kein overflow/max-width — die Breite ist konstruktiv sicher, ein Clip
   würde den Text nur wieder anschneiden. Getragen wird die Lesbarkeit auf
   hellen Skins von einem kräftigen Schattensaum. */
.champ-ability-state {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.06em;
  text-indent: 0.06em; /* gleicht das letter-spacing des letzten Zeichens aus */
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--role-color, #c89040) 28%, #f6eeda);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.98),
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px color-mix(in srgb, var(--role-color, #c89040) 50%, transparent);
  transition: color 0.25s ease;
}

/* Bereit: geschlossener Ring, das Emblem atmet in der Rollenfarbe.
   Der Puls läuft NICHT über eine box-shadow-Keyframe-Animation — box-shadow
   ist eine Paint-Property, ihre Animation zwingt den Browser jede Frame zu
   einem Repaint der gesamten Wurzel-Ebene (und damit des kompletten HUDs,
   gemessen: rund 14 % Framerate). Stattdessen liegt der helle Zustand als
   eigene Glut-Ebene (::after) fest im Element und nur deren opacity atmet —
   das erledigt der Compositor auf der GPU, ohne einen einzigen Repaint. */
.champ-ability:not(.champ-ability--cd) .champ-ability-orb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  /* nur der HELLE Anteil des früheren 50 %-Keyframes — der dunkle Innen-
     schatten sitzt konstant auf .champ-ability-orb */
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--role-color, #c89040) 60%, transparent),
    0 0 24px color-mix(in srgb, var(--role-color, #c89040) 85%, transparent);
  /* Ruhezustand = unsichtbar; ohne Animation (reduced motion) bleibt damit
     genau der frühere 0-%-Keyframe stehen */
  opacity: 0;
  animation: champ-ability-ready 1.9s ease-in-out infinite;
}

@keyframes champ-ability-ready {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* Cooldown: die Fassung kühlt aus, der Countdown übernimmt die Führung — das
   Emblem bleibt dabei klar erkennbar, nur der Glanz nimmt ab */
.champ-ability--cd .champ-ability-orb {
  background: radial-gradient(
    circle at 38% 30%,
    color-mix(in srgb, var(--role-color, #c89040) 22%, #38301f) 0%,
    color-mix(in srgb, var(--role-color, #c89040) 9%, #1c1810) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(210, 182, 132, 0.24),
    inset 0 0 12px rgba(0, 0, 0, 0.55),
    0 2px 8px rgba(0, 0, 0, 0.65);
}
.champ-ability--cd .champ-ability-orb img {
  filter: grayscale(45%) brightness(0.82);
}
/* Der Countdown ist kurz (max "30s") und darf deshalb deutlich größer stehen */
.champ-ability--cd .champ-ability-state {
  letter-spacing: 0.03em;
  text-indent: 0.03em;
  font-size: 16px;
  color: #f0e4c8;
}

/* Gerade ausgelöst: kurzer Impuls, dann fällt der Ring auf null zurück */
.champ-ability--cast .champ-ability-orb {
  animation: champ-ability-cast 0.45s ease-out;
}
.champ-ability--cast .champ-ability-state {
  color: color-mix(in srgb, var(--role-color, #c89040) 25%, #fff);
}

@keyframes champ-ability-cast {
  0% {
    transform: scale(1.3);
    box-shadow:
      0 0 26px var(--role-color, #c89040),
      0 0 52px color-mix(in srgb, var(--role-color, #c89040) 55%, transparent);
  }
  100% {
    transform: scale(1);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--role-color, #c89040) 45%, transparent),
      inset 0 0 12px rgba(0, 0, 0, 0.5),
      0 2px 8px rgba(0, 0, 0, 0.65),
      0 0 14px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  }
}

/* ── Ausgewählt: diese Rolle ist gerade im Team-Tab offen ───────────────────
   Markiert genau die Karte, deren Details-Panel im Modal bearbeitet wird.
   Immer in der Rollenfarbe — die trägt jede Karte ohnehin, auch die leeren.
   Bewusst VOR den Eclipse-/Down-Blöcken definiert: deren Statusfarben am
   Rahmen bleiben damit führend, die Auswahl liest sich weiter über Glow,
   Reticle und Keile ab (gleiche Schichtung wie im Planet-Dock). */
.champ-card--selected {
  --sel: var(--role-color, #e8c040);
  transform: translateY(-2px);
  z-index: 2;
}
.champ-card--selected:hover {
  transform: translateY(-3px);
}

.champ-card--selected .champ-card-body {
  border-color: var(--sel);
  /* Basis-Glow trägt die Markierung auch dann, wenn der Puls per
     prefers-reduced-motion abgeschaltet ist */
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--sel) 55%, transparent),
    0 0 18px color-mix(in srgb, var(--sel) 45%, transparent),
    inset 0 0 18px color-mix(in srgb, var(--sel) 12%, transparent);
  animation: champ-select-pulse 2s ease-in-out infinite;
}

/* Kopfleiste und Rollen-Label ziehen mit — die Karte leuchtet als Ganzes,
   statt nur einen zweiten Rahmen zu bekommen */
.champ-card--selected .champ-card-bar {
  box-shadow:
    0 0 12px var(--sel),
    0 0 22px color-mix(in srgb, var(--sel) 45%, transparent);
}
.champ-card--selected .champ-card-label {
  color: color-mix(in srgb, var(--sel) 35%, #fff);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 16px color-mix(in srgb, var(--sel) 70%, transparent);
}

/* Innenschein in der Auswahlfarbe, über Vignette und Schleiern */
.champ-select-glow {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    color-mix(in srgb, var(--sel, #e8c040) 16%, transparent) 0%,
    transparent 70%
  );
}

/* Vier Eckwinkel — HUD-Reticle statt zweitem Rahmen */
.champ-select-reticle {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.champ-sel-corner {
  position: absolute;
  width: 13px;
  height: 13px;
  border: 2px solid var(--sel, #e8c040);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sel, #e8c040) 70%, transparent));
}

.champ-sel-corner--tl {
  top: 4px;
  left: 4px;
  border-right: none;
  border-bottom: none;
  border-radius: 4px 0 0 0;
}
.champ-sel-corner--tr {
  top: 4px;
  right: 4px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 4px 0 0;
}
.champ-sel-corner--bl {
  bottom: 4px;
  left: 4px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 4px;
}
.champ-sel-corner--br {
  bottom: 4px;
  right: 4px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 4px 0;
}

/* Die erste Karte folgt oben links dem 40px-Bogen der Panel-Silhouette. Ein
   rechtwinkliger Eckwinkel schneidet diesen Bogen und bricht die Silhouette —
   stattdessen läuft hier ein konzentrischer Viertelbogen 4px innerhalb der
   Kante mit. Die Rundung ist leicht elliptisch, weil der obere Rahmen der
   ersten Karte 5px trägt und der linke 2px: innen bleiben 40−2=38 horizontal
   und 40−5=35 vertikal, abzüglich der 4px Abstand also 34 × 31. */
.champ-card--first .champ-sel-corner--tl {
  top: 4px;
  left: 4px;
  width: 34px;
  height: 31px;
  border-radius: 0;
  border-top-left-radius: 34px 31px;
}

/* Keile an beiden Seitenkanten — fassen die Karte symmetrisch ein und zeigen
   zum geöffneten Modal. Die Karte clippt sie zur Hälfte, wodurch sie als
   eingeschobene Spitzen lesen. */
.champ-select-tether {
  position: absolute;
  z-index: 6;
  top: 50%;
  width: 13px;
  height: 13px;
  border-radius: 2px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--sel, #e8c040) 85%, white) 0%,
    var(--sel, #e8c040) 100%
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--sel, #e8c040) 70%, transparent);
  pointer-events: none;
}

.champ-select-tether--l {
  left: 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.champ-select-tether--r {
  right: 0;
  transform: translate(50%, -50%) rotate(45deg);
}

@keyframes champ-select-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--sel) 45%, transparent),
      0 0 14px color-mix(in srgb, var(--sel) 35%, transparent),
      inset 0 0 16px color-mix(in srgb, var(--sel) 10%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--sel) 75%, transparent),
      0 0 26px color-mix(in srgb, var(--sel) 62%, transparent),
      inset 0 0 22px color-mix(in srgb, var(--sel) 18%, transparent);
  }
}

/* ── Eclipse: Champion hinter der Sonne ──
   Porträt taucht in kühlen Schatten, Rollen-Glow erlischt, goldener
   ✦-Chip atmet oben links — synchron zum Idle-Orbit & StarFightModal. */
.champ-card--eclipsed .champ-card-portrait {
  filter: grayscale(70%) brightness(0.45) saturate(0.6);
}
/* Rahmen und Kopfleiste kippen von warm auf kalt — die Karte steht nicht mehr
   im Sonnenlicht, also verliert sie auch ihren warmen Ton */
.champ-card--eclipsed .champ-card-body {
  border-color: color-mix(in srgb, var(--role-color, #c89040) 20%, #1e2740);
  box-shadow: inset 0 0 22px rgba(4, 8, 20, 0.75);
}
.champ-card--eclipsed .champ-card-bar {
  opacity: 0.4;
  background: color-mix(in srgb, var(--role-color, #c89040) 28%, #223052);
  box-shadow: none;
}
.champ-card--first.champ-card--eclipsed .champ-card-body {
  border-top-color: color-mix(in srgb, var(--role-color, #c89040) 28%, #223052);
}

/* Finsternis-Motiv über der ganzen Karte: ein kalter Kernschatten füllt sie
   aus, während die verdeckte Sonne als schmale Korona über den oberen Rand
   glimmt. Deutlich mehr als ein Icon — der Zustand ist am Kartengrund
   ablesbar, auch wenn man gar nicht auf den Chip schaut. Die langsame
   Atmung nimmt die Bewegung des Champions hinter der Sonne auf. */
.champ-card-eclipse-veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 140% 40% at 50% -6%,
      rgba(240, 200, 80, 0.26) 0%,
      rgba(150, 104, 34, 0.09) 46%,
      transparent 74%
    ),
    radial-gradient(ellipse at 50% 58%, rgba(12, 18, 38, 0.72) 0%, rgba(3, 5, 12, 0.9) 100%);
  /* Wie im Command Panel: der Schleier steht, das Medaillon atmet. */
  opacity: 0.9;
}
.champ-card--eclipsed .champ-ability {
  opacity: 0.42;
  filter: grayscale(60%);
}
.champ-card--eclipsed .champ-card-label {
  color: rgba(200, 188, 160, 0.5);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Kompakter Chip am oberen Kartenrand statt des früheren großen Medaillons in
   der Kartenmitte: die Mitte gehört jetzt dem Ability-Kern. Der Eclipse-
   Zustand trägt sich ohnehin über die ganze Karte (kühles Portrait, matter
   Rahmen, erloschene Kopfleiste) — der Chip muss ihn nur benennen, nicht
   tragen. Horizontal zentriert, damit er weder die Reticle-Eckwinkel noch
   den 40px-Bogen der ersten Karte berührt. */
.champ-card-eclipse-medal {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(10, 7, 3, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 14px rgba(232, 192, 64, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  z-index: 4;
  pointer-events: none;
  animation: champ-eclipse-breathe 1.6s ease-in-out infinite alternate;
}
.champ-card-eclipse-medal :deep(svg) {
  filter: drop-shadow(0 0 5px rgba(232, 192, 64, 0.55));
}

@keyframes champ-eclipse-breathe {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

/* ── Down: Champion am Boden, wartet auf den Revive ─────────────────────────
   Härtester Kartenzustand — die Rollenfarbe erlischt komplett, der Rahmen
   wechselt auf Wund-Rot und das Portrait bleibt nur als kalter Schemen
   sichtbar. Ablesbar in <1s, ohne mit Cooldown- oder Eclipse-Zustand
   verwechselbar zu sein. */
.champ-card--down .champ-card-portrait {
  filter: grayscale(100%) brightness(0.3) contrast(0.85);
  transform: none;
}
.champ-card--down:hover .champ-card-portrait {
  transform: none;
}
.champ-card--down .champ-card-body {
  border-color: #963e30;
  box-shadow:
    inset 0 0 22px rgba(0, 0, 0, 0.8),
    0 0 12px rgba(150, 62, 48, 0.35);
}
.champ-card--down:hover .champ-card-body {
  border-color: #cc6050;
  box-shadow:
    inset 0 0 22px rgba(0, 0, 0, 0.8),
    0 0 18px rgba(204, 96, 80, 0.5);
}
.champ-card--down .champ-card-bar {
  background: #963e30;
  box-shadow: none;
}
.champ-card--first.champ-card--down .champ-card-body {
  border-top-color: #963e30;
}
.champ-card--down .champ-card-hover-glow {
  display: none;
}
.champ-card--down .champ-card-label {
  color: rgba(190, 150, 140, 0.55);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Blutroter Schleier über dem Portrait */
.champ-card-down-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 40%, rgba(60, 10, 6, 0.5), rgba(3, 2, 4, 0.88) 85%);
  pointer-events: none;
  z-index: 2;
}

/* Warnschraffur — HUD-Sprache für "Slot außer Gefecht"; bewusst flach und
   sehr dezent, damit das Emblem darüber die Aufmerksamkeit behält */
.champ-card-down-hatch {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -45deg,
    rgba(204, 96, 80, 0.09) 0 6px,
    transparent 6px 14px
  );
  pointer-events: none;
  z-index: 3;
}

/* Deckungsgleich mit dem Ability-Kern aufgebaut: der Container ist exakt so
   groß wie das Emblem und liegt punktgenau auf der Kartenmitte, der Timer
   hängt absolut darunter. Down-Emblem und Fähigkeits-Emblem sitzen damit an
   derselben Stelle — die Karte wechselt den Zustand, nicht das Layout. */
.champ-card-down-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}

/* Totenkopf-Emblem mit Revive-Ring: der Ring schmilzt über die Ausfallzeit ab —
   dieselbe conic+mask-Technik wie der Jungle-Buff-Chip im Planet-Dock */
.champ-card-down-ring {
  position: relative;
  /* gleiche Maße wie .champ-ability-orb */
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(44, 14, 10, 0.96), rgba(10, 4, 4, 0.96));
  color: #e08070;
  box-shadow:
    0 0 10px rgba(204, 96, 80, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.7);
  /* Taktlänge = HUD_COUNTDOWN_TICK_MS */
  transition: --down-progress 250ms linear;
}

.champ-card-down-ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    #ff5040 calc(var(--down-progress, 1) * 360deg),
    rgba(255, 80, 64, 0.14) 0
  );
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 3px),
    #000 calc(100% - 2.5px)
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  filter: drop-shadow(0 0 4px rgba(255, 80, 64, 0.7));
}

.champ-card-down-ring :deep(svg) {
  filter: drop-shadow(0 0 6px rgba(204, 96, 80, 0.7));
  animation: champ-down-pulse 1.4s ease-in-out infinite alternate;
}

/* sitzt wie das Ability-Label unter dem Emblem */
.champ-card-down-timer {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  text-indent: 0.03em;
  color: #f0b0a0;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.98),
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 12px rgba(255, 80, 64, 0.55);
}

@keyframes champ-down-pulse {
  from {
    opacity: 0.55;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

/* ability just triggered → card flash */
.champ-card--flash .champ-card-body {
  animation: champ-card-flash 0.45s ease-out;
  box-shadow:
    0 0 16px var(--role-color, #c89040),
    0 0 30px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
}

@keyframes champ-card-flash {
  0% {
    box-shadow:
      0 0 26px var(--role-color, #c89040),
      0 0 50px color-mix(in srgb, var(--role-color, #c89040) 60%, transparent);
  }
  100% {
    box-shadow:
      0 0 16px var(--role-color, #c89040),
      0 0 30px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  }
}

/* ── Role label at the bottom ──
   Banner über die volle Kartenbreite: großzügiger Scrim, kräftige
   Versal-Typo in der Rollenfarbe — füllt die untere Kartenzone. */
.champ-card-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
  padding: 26px 0 8px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-indent: 0.16em; /* gleicht das letter-spacing des letzten Zeichens aus */
  color: color-mix(in srgb, var(--role-color, #c89040) 55%, #f0e6d0);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0.94));
  line-height: 1;
  pointer-events: none;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 12px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  transition:
    color 0.2s ease,
    text-shadow 0.2s ease;
}
.champ-card:not(.champ-card--filled) .champ-card-label {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, rgba(200, 180, 140, 0.55));
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.champ-card:hover .champ-card-label {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, #fff);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 16px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .champ-card--filled:hover .champ-card-hover-glow,
  .champ-card--flash .champ-card-body,
  .champ-ability:not(.champ-ability--cd) .champ-ability-orb::after,
  .champ-ability--cast .champ-ability-orb,
  .champ-card-eclipse-medal,
  .champ-card-eclipse-veil,
  .champ-card-down-ring :deep(svg),
  .champ-card--selected .champ-card-body {
    animation: none;
  }
}
</style>
