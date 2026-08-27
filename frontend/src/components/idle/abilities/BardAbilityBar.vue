<template>
  <!--
    Die Fähigkeitenleiste sitzt mittig über dem Scoreboard — die Stelle, an der
    ein MOBA-Spieler sie sucht. Sie ist per v-if an die freie Sicht geknüpft:
    liegt ein Profil-Tab darüber, verschwindet mit der Leiste auch ihre
    Tastenanmeldung, damit ein „e" im Champion-Filter keine Fähigkeit zündet,
    die niemand sieht (useKeybindings meldet beim Unmount selbst ab).

    Im Star Fight steht sie ANGEDOCKT in der Schiene des Modals (`dock: 'rail'`):
    dort läge sie unten über Sonnen-Horizont und Spieler-HP. App.vue setzt sie
    per `<Teleport>` um — dieselbe Instanz, also dieselbe Tastenanmeldung und
    derselbe rAF-Lauf; nur Form und Anker wechseln.

    Pausiert verschwindet sie ganz: im freien Bild läge sie bei z-index 10001
    ÜBER dem Overlay (9998), also mitten auf dem Panel. Ihren Platz nimmt dort
    `PauseKitPanel` ein — Zeilen statt Kacheln, weil im Overlay nichts
    bedienbar ist.

    ACHTUNG, das `v-if` reicht dafür NICHT allein: es entfernt nur das Element,
    die Komponente bleibt gemountet, und `onKeybinding` meldet erst beim
    Unmount ab. Ohne die Sperre in `castAbility` zündete `q` weiter, während
    das Spiel steht.
  -->
  <div
    v-if="uiStore.bardActiveTab === null && !isPaused"
    ref="barEl"
    class="ability-bar"
    :class="{
      'ability-bar--in': revealed,
      'ability-bar--docked': props.dock === 'rail',
    }"
    role="toolbar"
    aria-label="Bard abilities"
  >
    <!-- Was das letzte Wirken bewirkt hat, in einem Satz. Steht über allem
         anderen, weil es die Rückmeldung auf die gerade gedrückte Taste ist. -->
    <Transition name="ab-toast">
      <div v-if="toast" class="ab-toast" :style="{ '--ab-color': toastColor }" role="status">
        <span v-ink-center.x.y class="ab-toast-key">{{ toastKey }}</span>
        <span v-ink-center.y class="ab-toast-text">{{ toast }}</span>
      </div>
    </Transition>

    <!-- Tooltip der überfahrenen Kachel — er steht über IHR, nicht mittig über
         der Leiste: bei fünf Feldern nebeneinander musste der Spieler die
         Zuordnung sonst raten. Verschoben wird nur waagerecht (placeTip), die
         Höhe bleibt im Spaltenfluss, damit die Meldung darüber nicht springt.
         Der Zeiger unten am Kasten zeigt auf die Kachel. -->
    <Transition name="ab-tip">
      <div
        v-if="hovered"
        ref="tipEl"
        class="ab-tip"
        :class="{ 'ab-tip--locked': hovered.locked }"
        :style="{ '--ab-color': hovered.color }"
      >
        <!-- Kopf: wer spricht. Die Keycap wiederholt links die Taste der
             Kachel, damit Tooltip und Feld zusammengehören; rechts steht die
             zweite große Aussage des Kastens — der Rang. Beides sind Aussagen
             über die Fähigkeit selbst, der Kopf liest sich damit von Rand zu
             Rand als eine Zeile.

             Der Rang trägt KEINE eigene Fläche mehr: er stand einmal als
             umrandete Plakette hier und war darin ausgerechnet das kleinste
             Element. Jetzt trennt ihn allein die Typografie — die Zahl in der
             Größe des Namens, das Wort davor als zurücktretende Beschriftung,
             der Nenner als sein Anhang. Das nächste Level rutscht dabei in die
             Rolle, die es inhaltlich hat: die Fußnote „ab wann geht es weiter?".

             Alles hängt an der MITTE der Bande, nicht an einer gemeinsamen
             Grundlinie — die Keycap ist ein Kästchen, und ein Kästchen richtet
             sich nicht an einer Baseline aus; die vier Teile des Rangs sind
             verschieden groß und hätten auf einer Baseline sichtbar
             auseinandergestanden. Damit die Tinte in jeder Zeilenbox wirklich
             mittig sitzt, trägt jeder Textknoten `v-ink-center.y`: MedievalSharp
             setzt seine Glyphen fast vollständig über die Baseline, zentrierte
             Zeilenboxen stehen dadurch sichtbar zu hoch
             (utils/ui/textInkOffset.ts). -->
        <header class="ab-tip-head">
          <span v-if="hovered.key" v-ink-center.x.y class="ab-tip-key">{{ hovered.key }}</span>
          <span v-ink-center.y class="ab-tip-name">{{ hovered.name }}</span>
          <span class="ab-tip-rank">
            <span v-if="hovered.rank.word" v-ink-center.y class="ab-tip-rank-word">{{
              hovered.rank.word
            }}</span>
            <!-- Zahl und Nenner ohne Lücke dazwischen: der `gap` des Blocks
                 trennt Wort | Zähler | Level, nicht „3" von „/5". -->
            <span class="ab-tip-rank-count">
              <span
                v-ink-center.y
                class="ab-tip-rank-value"
                :class="{ 'ab-tip-rank-value--word': !hovered.rank.total }"
                >{{ hovered.rank.value }}</span
              ><span v-if="hovered.rank.total" v-ink-center.y class="ab-tip-rank-total"
                >/{{ hovered.rank.total }}</span
              >
            </span>
            <span v-if="hovered.levelLabel" v-ink-center.y class="ab-tip-rank-level">{{
              hovered.levelLabel
            }}</span>
          </span>
        </header>

        <!-- Was die Fähigkeit TUT, in Klartext und vor jeder Zahl: dass der
             Blitz mehrere Planeten auf einmal nimmt, dass die Stase wirklich
             alles anhält. Wer sie kennt, springt darüber hinweg an den
             Zahlenblock — der steht in jedem der fünf Kästen gleich tief. -->
        <p class="ab-tip-note">{{ hovered.note }}</p>

        <!-- Die Hauptwirkung: der Wert vor seiner
             Beschriftung, weil er die Antwort auf „was bringt der Druck?" ist.
             Alles Weitere ist Beiwerk und steht darunter. -->
        <div class="ab-tip-lead">
          <span class="ab-tip-lead-value">
            {{ hovered.lead.value }}
            <span v-if="hovered.lead.next" class="ab-tip-next">→ {{ hovered.lead.next }}</span>
          </span>
          <span class="ab-tip-lead-label">{{ hovered.lead.label }}</span>
        </div>

        <dl v-if="hovered.lines.length" class="ab-tip-lines">
          <template v-for="line in hovered.lines" :key="line.label">
            <dt>{{ line.label }}</dt>
            <dd>
              {{ line.value
              }}<span v-if="line.next" class="ab-tip-next">→ {{ line.next }}</span>
            </dd>
          </template>
        </dl>

        <!-- Fuß: beschriftete Ablesungen wie im Astral Codex. Der Status ist
             das einzige Feld, das sich WÄHREND des Hovers ändert — er wird
             deshalb vom Frame-Lauf beschrieben, nicht von Vue gerendert. -->
        <footer v-if="hovered.live || hovered.foot.length" class="ab-tip-foot">
          <div v-if="hovered.live" class="ab-tip-read">
            <span class="ab-tip-read-label">Status</span>
            <span ref="tipStatusEl" class="ab-tip-read-value ab-tip-status"></span>
          </div>
          <div v-for="cell in hovered.foot" :key="cell.label" class="ab-tip-read">
            <span class="ab-tip-read-label">{{ cell.label }}</span>
            <span class="ab-tip-read-value">{{ cell.value }}</span>
          </div>
        </footer>
      </div>
    </Transition>

    <div class="ab-row">
      <BardPassiveTile
        ref="passiveTile"
        :meep-fill="meepFill"
        :clicks-to-meep="clicksToMeep"
        :step-key="meepStepKey"
        :gain-amount="meepGainAmount"
        :gain-key="meepGainKey"
        @hover="(on: boolean) => (hoveredId = on ? 'passive' : null)"
      />


      <span class="ab-divider" aria-hidden="true"></span>

      <BardAbilityTile
        v-for="def in BARD_ABILITIES"
        :key="def.id"
        :ref="(el: unknown) => setTileRef(def.id, el)"
        :def="def"
        :rank="store.rankOf(def.id)"
        :locked="!store.isUnlocked(def.id)"
        @cast="triggerKeybind(KEYBIND_BY_ABILITY[def.id])"
        @hover="(on: boolean) => (hoveredId = on ? def.id : null)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import BardAbilityTile from './BardAbilityTile.vue'
import BardPassiveTile from './BardPassiveTile.vue'
import { useGamePause } from '@/composables/system/useGamePause'
import { useUiStore } from '@/stores/core/uiStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGameStore } from '@/stores/core/gameStore'
import { onKeybinding, triggerKeybind } from '@/composables/system/useKeybindings'
import { formatNumber } from '@/config/ui/numberFormat'
import { invalidateHudField } from '@/utils/ui/hudField'
import {
  BARD_ABILITIES,
  BARD_PASSIVE,
  bardAbilityEffectLines,
  getBardAbility,
} from '@/config/progression/bardAbilities'
import {
  ABILITY_BAR_REVEAL_MS,
  ABILITY_BAR_STACK_GAP_PX,
  ABILITY_CAST_FLASH_MS,
  ABILITY_CAST_TOAST_MS,
  ABILITY_MAX_RANK,
  ABILITY_MEEP_GAIN_COALESCE_MS,
  ABILITY_MEEP_GAIN_FLOAT_MS,
  ABILITY_TIP_VIEWPORT_MARGIN_PX,
  RESONANCE_MAX_STACKS,
} from '@/config/constants'
import type { AbilityBarDock, BardAbilityId, BardEffectLine, KeybindId } from '@/types'
import { gameNow } from '@/utils/game/gameClock'
import { formatCooldownSeconds } from '@/utils/ui/format'

/**
 * Wo die Leiste steht. Die Entscheidung gehört zu der Stelle, die auch
 * teleportiert (App.vue); stünde sie hier als Store-Zugriff, gäbe es sie
 * zweimal.
 *
 * `free` — waagerecht unten am Bild, `position: fixed`
 * `rail` — senkrecht in der Schiene des Star-Fight-Modals
 *
 * Den dritten Wert (`pause`) kennt nur die Buff-Reihe: die Leiste wird
 * pausiert nicht umgehängt, sondern gar nicht gerendert.
 */
const props = withDefaults(defineProps<{ dock?: AbilityBarDock }>(), { dock: 'free' })

const uiStore = useUiStore()
const { isPaused } = useGamePause()
const store = useBardAbilityStore()
const gameStore = useGameStore()

/** Kürzel-ID je Slot — Klick auf die Kachel und Tastendruck laufen beide über
 *  `triggerKeybind`, damit die Keycap in beiden Fällen gleich reagiert. */
const KEYBIND_BY_ABILITY: Record<BardAbilityId, KeybindId> = {
  q: 'abilityQ',
  w: 'abilityW',
  e: 'abilityE',
  r: 'abilityR',
}

// ── Der nächste Meep ────────────────────────────────────────────────────────
// Die Passiv-Kachel führt den Weg zum nächsten Meep, nicht den Bestand — der
// steht im Header. Beide lesen dieselbe Quelle (`pendingMeeps` und seine
// Geschwister im gameStore), damit HUD und Header nie zwei Stände zeigen.
//
// „Der nächste Meep" heisst seit dem Umbau: der nächste, den der AUFBRUCH
// auszahlt. Meeps fallen nicht mehr laufend — sie sind der Lohn des Prestige,
// und was der laufende Durchlauf bis jetzt eingebracht hat, wächst mit jedem
// Chime weiter.

/**
 * 0..1 — Füllstand des Rings.
 *
 * Er misst dieselbe Strecke wie `clicksToMeep` darunter, und zwar in denselben
 * Einheiten: `pendingMeepFill` rechnet in Chimes INNERHALB des laufenden
 * Meep-Schritts, ist also linear in Klicks. Steht die Zahl bei der Hälfte
 * ihres Startwerts, steht der Ring auf 50 %.
 */
const meepFill = computed(() => gameStore.pendingMeepFill)

/**
 * Der Index des laufenden Meep-Schritts. Er ändert sich genau dann, wenn
 * `meepFill` von ~1 auf ~0 fällt — die Kachel schaltet in diesem Frame ihren
 * Nachlauf ab, damit der Ring nicht rückwärts um den Kreis fährt.
 *
 * `meepsDevoured` zählt mit: gefressene Meeps sind gesammelt und bezahlt, ihr
 * Schritt war ein Schritt. Dieselbe Summe wie in `chimesToNextMeep`.
 */
const meepStepKey = computed(() => gameStore.pendingMeeps + gameStore.meepsDevoured)

/**
 * Klicks, die noch fehlen — die Zahl unter der Figur.
 *
 * Die Rechnung steht im Store (`clicksToNextMeep`), nicht hier: der
 * Passive-Slot im Kopf des Profils zeigt dieselbe Strecke, und zwei eigene
 * Rechnungen dafür liefen über kurz oder lang auseinander.
 */
const clicksToMeep = computed(() => gameStore.clicksToNextMeep)

// ── Der Gewinn ──────────────────────────────────────────────────────────────
// Die Kachel zeigt die offene Strecke; erreicht sie ihr Ziel, meldet ein Float
// darüber den Gewinn.
//
// Gemessen wird an „Meeps, die je VERDIENT wurden" — der Summe aus gehaltenen
// und anstehenden. Weder Summand allein trägt das:
//
//   `meeps` sinkt beim Ausgeben, ein Kauf im Skill-Tree täuschte also einen
//   Gewinn vor, sobald der Bestand wieder steigt.
//
//   `totalMeepsEarned` bewegt sich nur über `grantMeeps()`, und das läuft seit
//   dem Ökonomie-Umbau NUR beim Aufbruch (plus Drifter-Fund und Expedition).
//   Wer die Klickstrecke vollendet, bekommt einen ANSTEHENDEN Meep — damit
//   feuerte der Float genau in dem Moment nicht, für den er gebaut ist. Es fiel
//   nur deshalb lange nicht auf, weil der erste Meep vor der Umstellung auf den
//   Ratschen-Anker 390 Mio. Chimes kostete.
//
// Die Summe löst zusätzlich den Aufbruch ohne Sonderfall: dort wandern dieselben
// Meeps von „anstehend" nach „gehalten" (+45 / −45), die Summe bleibt stehen,
// und es kommt KEIN zweiter Float für Meeps, die beim Verdienen schon gemeldet
// wurden. Ein Meep wird einmal verdient — wenn der Lauf ihn sichert; das
// Prestige reicht ihn nur weiter.
const meepsEverEarned = computed(() => gameStore.totalMeepsEarned + gameStore.pendingMeeps)

/** Betrag im laufenden Float; 0 = keiner steht. */
const meepGainAmount = ref(0)
/** Steigt mit jeder Gutschrift — der Key-Bump stößt die Animation neu an. */
const meepGainKey = ref(0)

/** Was seit dem letzten Float dazukam, aber noch nicht gezeigt wurde. */
let meepGainPending = 0
let meepGainCoalesceTimer: ReturnType<typeof setTimeout> | null = null
let meepGainClearTimer: ReturnType<typeof setTimeout> | null = null

function showMeepGain(): void {
  meepGainCoalesceTimer = null
  if (meepGainPending <= 0) return
  meepGainAmount.value = meepGainPending
  meepGainPending = 0
  meepGainKey.value += 1
  if (meepGainClearTimer) clearTimeout(meepGainClearTimer)
  meepGainClearTimer = setTimeout(() => {
    meepGainAmount.value = 0
    meepGainClearTimer = null
  }, ABILITY_MEEP_GAIN_FLOAT_MS)
}

watch(meepsEverEarned, (now, before) => {
  const delta = now - before
  // Nur nach oben. Der Void frisst anstehende Meeps und drückt die Summe damit
  // nach unten — ein Verlust darf keinen Gewinn-Float auslösen, er wird an
  // vier anderen Stellen gemeldet (Toast, Eventlog, Plakette, Rettungsbalken).
  if (delta <= 0) return
  // Solange die Leiste noch nicht hereingefahren ist, wird nur mitgezählt und
  // nichts gezeigt: `loadGame()` läuft direkt nach `app.mount()` und hebt die
  // Zähler in EINEM Schritt auf den gespeicherten Stand — ohne diese Sperre
  // begrüßte das Spiel jeden Wiederkehrer mit „+312 MEEPS".
  if (!revealed.value) return
  meepGainPending += delta
  // Gesammelt statt sofort gezeigt: ein Chime-Schub (gefällter Boss, eingesammelter
  // Drifter, Offline-Ertrag) kann mehrere anstehende Meeps auf einmal auslösen,
  // und die sollen EIN Float mit der Summe ergeben statt mehrerer, die einander
  // abwürgen.
  if (meepGainCoalesceTimer) clearTimeout(meepGainCoalesceTimer)
  meepGainCoalesceTimer = setTimeout(showMeepGain, ABILITY_MEEP_GAIN_COALESCE_MS)
})

// ── Kachel-Elemente für den Frame-Lauf ──────────────────────────────────────
// Ein Register statt eines reaktiven Arrays: die Positionen der Ringe werden am
// Vue-Rendering vorbei geschrieben (Performance-Regel 3), also darf ihr Halter
// auch kein Re-Rendering auslösen.
interface TileEls {
  tile: HTMLElement | null
  sweep: HTMLElement | null
  clock: HTMLElement | null
  /** Zuletzt geschriebener Zustand. Ohne dieses Gedächtnis liefe jeder Frame
   *  durch `classList.toggle` und `textContent`, auch wenn sich nichts geändert
   *  hat — und jeder dieser Zugriffe erklärt den Teilbaum für ungültig. */
  cooling: boolean
  ready: boolean
  clockText: string
}
const tileEls = new Map<BardAbilityId, TileEls>()

function setTileRef(id: BardAbilityId, el: unknown): void {
  if (!el) {
    tileEls.delete(id)
    return
  }
  const exposed = el as {
    tileEl: HTMLElement | null
    sweepEl: HTMLElement | null
    clockEl: HTMLElement | null
  }
  tileEls.set(id, {
    tile: exposed.tileEl,
    sweep: exposed.sweepEl,
    clock: exposed.clockEl,
    cooling: false,
    ready: false,
    clockText: '',
  })
  ensureLoop()
}

// ── Abklingzeiten: ein rAF für die ganze Leiste ─────────────────────────────
// Er läuft nur, solange tatsächlich etwas kühlt, und hält sich danach selbst
// an. Vier eigene Schleifen — eine je Kachel — wären vier Aufwachvorgänge für
// eine einzige Zeile.
let rafId: number | null = null
let flashUntil = 0

/**
 * Was sich zwischen zwei Frames NICHT ändert: Sperre und volle Abklingzeit
 * hängen allein am Bard-Level und an der Resonance. Als computed werden sie
 * genau dann neu gerechnet — statt achtmal je Frame über Getter, die eine
 * Funktion zurückgeben und deshalb bei jedem Aufruf ganz durchlaufen.
 *
 * Nachgemessen brachte das allerdings nichts (9,2 gegen 8,9 ms je Frame, also
 * Rauschen): die Kosten laufender Abklingzeiten stecken im Zeichnen der vier
 * Schleier, nicht im Ableiten ihrer Werte. Es bleibt trotzdem so — pro Frame
 * neu abzuleiten, was sich nur beim Level-Up ändert, wäre auch dann falsch,
 * wenn es billig ist.
 */
const slots = computed(() =>
  BARD_ABILITIES.map((def) => ({
    id: def.id,
    locked: !store.isUnlocked(def.id),
    total: store.cooldownMsOf(def.id),
  })),
)

function paint(): boolean {
  const now = gameNow()
  let busy = false

  for (const slot of slots.value) {
    const els = tileEls.get(slot.id)
    if (!els?.tile) continue

    const { locked, total } = slot
    const leftMs = Math.max(0, (store.cooldownReadyAt[slot.id] ?? 0) - now)
    const cooling = !locked && leftMs > 0

    if (cooling) {
      busy = true
      // Der einzige Wert, der wirklich in jeden Frame gehört.
      const rest = total > 0 ? Math.min(1, leftMs / total) : 0
      if (els.sweep) els.sweep.style.transform = `scaleY(${rest})`
      const text = String(formatCooldownSeconds(leftMs))
      if (els.clock && text !== els.clockText) {
        els.clock.textContent = text
        els.clockText = text
      }
    } else if (els.cooling && els.sweep) {
      els.sweep.style.transform = 'scaleY(0)'
    }

    // Klassen nur beim Zustandswechsel — ein `toggle` mit demselben Wert ist
    // zwar folgenlos, der Zugriff selbst aber nicht kostenlos.
    const ready = !locked && !cooling
    if (cooling !== els.cooling) {
      els.tile.classList.toggle('ab-tile--cooling', cooling)
      els.cooling = cooling
    }
    if (ready !== els.ready) {
      els.tile.classList.toggle('ab-tile--ready', ready)
      els.ready = ready
    }
  }

  // Der Status im offenen Tooltip hängt an derselben Uhr wie die Schleier —
  // er läuft deshalb im selben Frame mit, statt einen zweiten Lauf zu starten.
  paintTipStatus()

  if (now < flashUntil) busy = true
  return busy
}

function frame(): void {
  rafId = paint() ? requestAnimationFrame(frame) : null
}

/** Startet den Lauf, falls er steht. Jede Stelle, die etwas zu zeigen hat
 *  (Wirken, Klick-Erstattung, frische Freischaltung), ruft ihn auf. */
function ensureLoop(): void {
  if (rafId === null) rafId = requestAnimationFrame(frame)
}

// Ein Klick auf die Sonne nimmt von jeder laufenden Abklingzeit ein Stück —
// der Balken muss diesen Sprung zeigen, sonst bleibt die Passive unsichtbar.
watch(() => gameStore.totalClicks, ensureLoop)
// Ein Level-Up kann eine Kachel freischalten oder ihren Rang heben.
watch(() => gameStore.level, ensureLoop)

// ── Wirken ──────────────────────────────────────────────────────────────────
function castAbility(id: BardAbilityId): void {
  // Pausiert wirkt keine Fähigkeit — das Spiel steht. Die Sperre hängt an
  // `isPaused` und nicht an der Sichtbarkeit: das `v-if` oben entfernt nur das
  // Element, die Komponente bleibt gemountet, und `onKeybinding` meldet erst
  // beim Unmount ab (`useKeybindings.ts`). Sie steht HIER und nicht am
  // Klick-Handler — die Tastenanmeldungen laufen durch dieselbe Funktion, ein
  // Riegel am Kachelrand ließe Q/W/E/R offen.
  if (isPaused.value) return
  if (!store.cast(id)) return
  const els = tileEls.get(id)
  if (els?.tile) {
    // Neustarten der Animation: die Klasse muss erst weg sein, bevor sie
    // wieder greift, sonst bleibt ein zweiter Druck in Folge ohne Blitz.
    els.tile.classList.remove('ab-tile--cast')
    void els.tile.offsetWidth
    els.tile.classList.add('ab-tile--cast')
  }
  flashUntil = gameNow() + ABILITY_CAST_FLASH_MS
  ensureLoop()
}

for (const def of BARD_ABILITIES) {
  onKeybinding(KEYBIND_BY_ABILITY[def.id], () => castAbility(def.id))
}

// Blitzklasse wieder abräumen, sobald ihre Zeit um ist.
let flashTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => store.lastCast.seq,
  () => {
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      for (const els of tileEls.values()) els.tile?.classList.remove('ab-tile--cast')
      flashTimer = null
    }, ABILITY_CAST_FLASH_MS)
  },
)

// ── Meldung des letzten Wirkens ─────────────────────────────────────────────
const toast = ref('')
const toastKey = ref('')
const toastColor = ref('#e8c040')
let toastTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => store.lastCast.seq,
  () => {
    const { id, summary } = store.lastCast
    if (!id || !summary) return
    const def = getBardAbility(id)
    toast.value = summary
    toastKey.value = def?.key ?? ''
    toastColor.value = def?.color ?? '#e8c040'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
      toastTimer = null
    }, ABILITY_CAST_TOAST_MS)
  },
)

// ── Tooltip ─────────────────────────────────────────────────────────────────
const hoveredId = ref<BardAbilityId | 'passive' | null>(null)
const tipEl = ref<HTMLElement | null>(null)
const passiveTile = ref<{ tileEl: HTMLElement | null } | null>(null)

/** Die Kachel, über der der Kasten stehen soll — oder null, wenn keiner offen ist. */
function hoveredTileEl(): HTMLElement | null {
  const id = hoveredId.value
  if (!id) return null
  return id === 'passive' ? (passiveTile.value?.tileEl ?? null) : (tileEls.get(id)?.tile ?? null)
}

/**
 * Den Kasten über SEINE Kachel schieben — waagerecht, und sonst nichts.
 * (Angedockt: NEBEN seine Kachel, dann senkrecht — siehe Zweig unten.)
 *
 * Er bleibt Flex-Kind der Spalte. Damit fällt seine HÖHE weiterhin in den Fluss,
 * die Cast-Meldung stapelt sich unverändert darüber, und die Spalte bleibt
 * gleich hoch. Ein Kasten, der per `position: fixed` aus dem Fluss fiele,
 * verschöbe die Meldung bei JEDEM Überfahren nach unten — und genau diese
 * Kombination tritt dauernd auf: Klick auf die Kachel, Meldung erscheint, der
 * Zeiger steht noch darauf.
 *
 * `left` an einem ohnehin `position: relative` stehenden Kasten ändert seinen
 * Platz im Fluss nicht. Die Kachelreihe ist auf jeder Auflösungsstufe breiter
 * als der Kasten (459/565/691 gegen 320/380/450 px), der Versatz kann die
 * `max-content`-Breite der Spalte also auch nicht anrühren.
 *
 * Gemessen wird EINMAL je Wechsel der überfahrenen Kachel — Performance-Regel 3
 * meint Werte, die pro Frame fallen; dazwischen bewegt sich hier nichts, beide
 * Kästen stehen fest. Geschrieben wird an den Kasten selbst, nicht an einen
 * Container.
 */
function placeTip(): void {
  const tip = tipEl.value
  const tile = hoveredTileEl()
  if (!tip || !tile) return

  const rect = tile.getBoundingClientRect()

  // Angedockt steht die Spalte senkrecht und der Kasten daneben: ausgerichtet
  // wird dann in der HÖHE, und der Zeiger sitzt an der linken Kante. Der
  // Anker ist die Leiste selbst — sie steht in der Schiene, nicht in der
  // Bildmitte, ihre Lage lässt sich also nicht ausrechnen.
  if (props.dock === 'rail') {
    const bar = barEl.value
    if (!bar) return
    const barTop = bar.getBoundingClientRect().top
    const tipH = tip.offsetHeight
    const margin = ABILITY_TIP_VIEWPORT_MARGIN_PX

    // Geklemmt wird gegen die SCHIENE, nicht gegen den Viewport: das Modal
    // schneidet ab (`overflow: hidden`), und die Schiene ist genau so hoch wie
    // sein Innenraum. Gefunden wird sie ohne jedes Wissen über das Modal —
    // angedockt steht die Leiste `relative`, ihr `offsetParent` IST die Schiene.
    const box = (bar.offsetParent as HTMLElement | null)?.getBoundingClientRect()
    const boundTop = Math.max(box?.top ?? 0, 0) + margin
    const boundBottom = Math.min(box?.bottom ?? window.innerHeight, window.innerHeight) - margin

    const centerY = rect.top + rect.height / 2 - barTop
    const wantedTop = centerY - tipH / 2
    const top = Math.min(
      Math.max(wantedTop, boundTop - barTop),
      boundBottom - tipH - barTop,
    )

    // `left` kommt angedockt aus dem CSS — ein Inline-Wert aus dem waagerechten
    // Zweig würde ihn überschreiben und bliebe beim Wechsel stehen.
    tip.style.left = ''
    tip.style.top = `${Math.round(top)}px`
    tip.style.setProperty('--ab-caret-dy', `${Math.round(centerY - (top + tipH / 2))}px`)
    return
  }


  tip.style.top = ''
  // Die Leiste ist `fixed; left: 50%` und um ihre halbe Breite zurückgeschoben:
  // ihre Mitte IST die Bildmitte und muss nicht gemessen werden.
  const barCenter = window.innerWidth / 2
  const wanted = rect.left + rect.width / 2 - barCenter

  const half = tip.offsetWidth / 2
  const margin = ABILITY_TIP_VIEWPORT_MARGIN_PX
  const shift = Math.min(
    Math.max(wanted, margin + half - barCenter),
    window.innerWidth - margin - half - barCenter,
  )

  tip.style.left = `${Math.round(shift)}px`
  // Solange nichts geklemmt wird, ist die Differenz 0 und der Zeiger sitzt ohne
  // jede Rechnung in der Kastenmitte — die IST dann die Kachelmitte.
  tip.style.setProperty('--ab-caret-dx', `${Math.round(wanted - shift)}px`)
}

/**
 * Das Statusfeld im Fuß des Tooltips. Es ist das einzige, das sich ändert,
 * während der Zeiger stillsteht — geschrieben wird es deshalb direkt am
 * Rendering vorbei (Performance-Regel 3); ginge es über eine Ref, liefe pro
 * Frame ein VNode-Diff über den ganzen Tooltip samt Wirkungszeilen.
 */
const tipStatusEl = ref<HTMLElement | null>(null)
let tipStatusText = ''

function paintTipStatus(): void {
  const el = tipStatusEl.value
  const id = hoveredId.value
  if (!el || !id || id === 'passive') return

  const leftMs = Math.max(0, (store.cooldownReadyAt[id] ?? 0) - gameNow())
  const text = leftMs > 0 ? `${formatCooldownSeconds(leftMs)}s` : 'Ready'
  if (text === tipStatusText) return
  el.textContent = text
  el.classList.toggle('ab-tip-status--ready', leftMs === 0)
  tipStatusText = text
}

// Beim Wechsel der überfahrenen Kachel steht ein frisches, leeres Feld da —
// es einmal zu füllen ist Sache dieses Watchers, danach übernimmt der Lauf.
watch(hoveredId, async () => {
  tipStatusText = ''
  await nextTick()
  // Vor dem Zeichnen desselben Frames — sonst stünde der Kasten einen Frame
  // lang an der Stelle der zuvor überfahrenen Kachel.
  placeTip()
  paintTipStatus()
  ensureLoop()
})

/**
 * Der Tooltip in vier Rängen, statt einer Liste gleichwertiger Zeilen:
 *
 *   Kopf   — Taste, Name, Rang: welche Fähigkeit, wie weit gewachsen
 *   Satz   — was sie TUT, in Klartext und ohne eine Zahl
 *   Lead   — die EINE Zahl, für die man die Taste drückt
 *   Zeilen — was sonst noch passiert, je mit dem Ausblick auf den nächsten Rang
 *   Fuß    — Status und Abklingzeit: darf ich JETZT drücken?
 *
 * Der Kopf trägt beide Fortschrittsangaben: welcher Rang steht, und ab welchem
 * Level der nächste fällt. Das ist eine Aussage über die Fähigkeit selbst und
 * gehört deshalb neben ihren Namen — nicht in den Fuß, wo der Spieler den
 * Momentzustand sucht, und erst recht nicht ins Lead-Feld, das in allen fünf
 * Kästen dieselbe Rolle hat.
 *
 * Erst der Satz, dann die Zahlen — in ALLEN fünf Kästen gleich. Wer die
 * Fähigkeit noch nicht kennt, liest von oben und braucht zuerst das Was; wer
 * sie kennt, springt an den Zahlenblock, und der steht in jedem Kasten an
 * derselben Stelle. Eine Ausnahme für die Passive hätte genau diese
 * Verlässlichkeit gekostet.
 *
 * Die Hauptwirkung wird nicht hier ausgewählt, sondern ist per Vereinbarung
 * die erste Zeile aus `bardAbilityEffectLines` — die Fähigkeit selbst weiß am
 * besten, worauf es bei ihr ankommt.
 *
 * Nichts anderes steht drin. Der Kasten öffnet sich mitten im Spiel über dem
 * Orbit; alles, was der Spieler beim Überfliegen nicht in eine Entscheidung
 * übersetzen kann, kostet ihn nur die Zeile, in der es steht.
 */
interface TipView {
  key: string
  name: string
  color: string
  /**
   * Der Rang im Kopf, dreigeteilt — das Wort tritt zurück, die Zahl trägt den
   * Blick, der Nenner hängt an ihr. Ein fertiger String („Rank 3/5") ließe sich
   * typografisch nicht mehr auseinanderziehen.
   *
   * Leeres `total` heißt „kein Zähler": dann steht in `value` ein Zustandswort
   * („Locked", „Passive", „Maxed"), das der Kopf kleiner setzt als eine Zahl —
   * ein Wort in voller Namensgröße stünde als zweiter Titel gegen den ersten.
   */
  rank: { word: string; value: string; total: string }
  /**
   * Rechts neben dem Rang: das Level, ab dem es weitergeht — bei gesperrt die
   * Freischaltung, sonst der nächste Rang.
   *
   * Leer am Höchstrang (dort sagt „Rank 5/5" bereits, dass keins mehr kommt)
   * und bei der Passive, die weder Rang noch Freischaltung hat.
   */
  levelLabel: string
  locked: boolean
  live: boolean
  lead: BardEffectLine
  lines: BardEffectLine[]
  /** Der Klartextsatz aus der Definition — steht über den Zahlen. */
  note: string
  foot: { label: string; value: string }[]
}

const hovered = computed<TipView | null>(() => {
  const id = hoveredId.value
  if (!id) return null

  if (id === 'passive') {
    const capped = store.resonance >= RESONANCE_MAX_STACKS
    const due = clicksToMeep.value === 0
    // Der Kasten beantwortet ZWEI Fragen und keine dritte: „wie oft muss ich
    // noch drücken?" und „was gibt mir die Passive gerade?". Der Resonanz-Stand
    // („12 / 100", „noch 13 Klicks bis zum nächsten Stapel") stand hier einmal
    // und ist bewusst weg — er ist die HERKUNFT der beiden Prozentwerte, nicht
    // ihre Aussage, und zwang den Spieler zum Umrechnen.
    return {
      key: '',
      name: BARD_PASSIVE.name,
      color: BARD_PASSIVE.color,
      // Das einzige, was vom Stapelzähler bleibt: die Auskunft, dass er voll
      // ist. Bewusst OHNE das Wort „resonance" — es hätte im Kasten keinen
      // Anker mehr, seit weder Zähler noch Klartextsatz es nennen. Ein Zähler
      // steht hier nie: die Passive hat keine Ränge, ihr Feld trägt ein Wort.
      rank: { word: '', value: capped ? 'Maxed' : 'Passive', total: '' },
      levelLabel: '',
      locked: false,
      // Die Passive kühlt nicht ab — der Status-Slot bliebe leer.
      live: false,
      note: BARD_PASSIVE.description,
      // Der Lead führt die Frage, die der Ring der Kachel stellt. Die Wartezeit
      // ohne Klicken steht im Meep-Tooltip des Headers, nicht noch einmal hier.
      lead: {
        value: due ? 'Arriving' : `${formatNumber(clicksToMeep.value)} clicks`,
        label: 'Next meep',
      },
      // Nur, was die Passive JETZT gibt — der Fuß bleibt leer.
      lines: [
        { label: 'Ability power', value: `+${((store.resonancePowerMult - 1) * 100).toFixed(0)}%` },
        { label: 'Cooldowns', value: `−${(store.resonanceCdr * 100).toFixed(1)}%` },
      ],
      foot: [],
    }
  }

  const def = getBardAbility(id)
  if (!def) return null
  const rank = store.rankOf(id)
  const locked = rank === 0
  const lines = bardAbilityEffectLines(id, rank, store.resonancePowerMult)
  // `nextRankLevelOf` liefert bei gesperrt bereits das Freischalt-Level und am
  // Höchstrang 0 — beide Fälle des Kopffelds kommen aus derselben Quelle.
  const nextLevel = store.nextRankLevelOf(id)

  return {
    key: def.key,
    name: def.name,
    color: def.color,
    rank: locked
      ? { word: '', value: 'Locked', total: '' }
      : { word: 'Rank', value: String(rank), total: String(ABILITY_MAX_RANK) },
    levelLabel: nextLevel > 0 ? `Lv ${nextLevel}` : '',
    locked,
    live: !locked,
    // Gesperrt kein Sonderfall mehr: das Lead-Feld führt in JEDEM Zustand die
    // Hauptwirkung — bei gesperrt eben als Vorschau auf Rang 1. Was der Kasten
    // sonst vorangestellt hätte (das Freischalt-Level), steht oben neben dem
    // Rang und braucht den größten Platz im Kasten nicht.
    lead: lines[0],
    lines: lines.slice(1),
    note: def.description,
    // Dieselbe Rundung wie die Uhr auf der Kachel — die Zahl hier IST der Wert,
    // mit dem der Countdown beim nächsten Druck losläuft.
    foot: [{ label: 'Cooldown', value: `${formatCooldownSeconds(store.cooldownMsOf(id))}s` }],
  }
})

// ── Einfahren und Höhe veröffentlichen ──────────────────────────────────────
// Die Buff-Reihe sitzt an derselben Ankerlinie und stapelt sich über der
// Leiste; sie liest deren gemessene Höhe, statt eine Zahl zu raten.
const barEl = ref<HTMLElement | null>(null)
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null
let sizeObserver: ResizeObserver | null = null

/** Veröffentlicht wird die Höhe SAMT Abstand — die Buff-Reihe addiert den Wert
 *  einfach auf ihre eigene Ankerlinie und muss keine Lücke selbst kennen. */
function publishHeight(px: number): void {
  document.documentElement.style.setProperty(
    '--ability-bar-h',
    `${Math.round(px) + ABILITY_BAR_STACK_GAP_PX}px`,
  )
}

/**
 * Die KANTEN der Kachelreihe — für die HUD-Kontur, nicht fürs Stapeln.
 *
 * `--ability-bar-h` taugt dafür nicht: es trägt den Stapelabstand der Buff-Reihe
 * mit und sagt nichts darüber, WO oben ist. Die Kontur braucht genau zwei
 * Zahlen, und beide kommen aus demselben Rect, das `measureRow` ohnehin liest —
 * keine zweite Messung, keine Rechnung über `--hud-scale`, kein zweites Mal
 * dieselbe Geometrie beschrieben.
 *
 * Steht keine Leiste im Feld (angedockt oder abgebaut), werden beide entfernt;
 * `hudField.ts` liest das als „kein Band".
 */
function publishEdges(rect: DOMRect | null): void {
  const root = document.documentElement.style
  if (!rect) {
    root.removeProperty('--ability-bar-top')
    root.removeProperty('--ability-bar-w')
  } else {
    root.setProperty('--ability-bar-top', `${Math.round(rect.top)}px`)
    root.setProperty('--ability-bar-w', `${Math.round(rect.width)}px`)
  }
  // Der Cache-Schlüssel der Kontur kennt nur Fenstermaß und Header-Bogen. Die
  // Leiste verschwindet aber auch OHNE Resize — sobald ein Profil-Tab öffnet
  // oder sie ins Star-Fight-Modal andockt. Die gefährliche Richtung ist das
  // Zurückkommen: ohne diesen Ruf hielte die Kontur das Band bis zum nächsten
  // Resize für frei.
  invalidateHudField()
}

/** Nur die Kachelreihe zählt — Tooltip und Meldung schweben darüber und
 *  dürfen die Buff-Reihe nicht bei jedem Überfahren verschieben.
 *
 *  Angedockt wird 0 veröffentlicht: `--ability-bar-h` ist die Ankerlinie UNTEN
 *  am Bild, und die ist im Star Fight leer — die Buff-Reihe steht dann selbst
 *  in der Schiene. Würde hier die Säulenhöhe (≈460 px) landen, schöbe sie
 *  jeden anderen Verbraucher dieser Variablen ins Nichts. */
function measureRow(): void {
  if (props.dock !== 'free') {
    publishHeight(-ABILITY_BAR_STACK_GAP_PX)
    publishEdges(null)
    return
  }
  const row = barEl.value?.querySelector('.ab-row')
  if (row) {
    const rect = row.getBoundingClientRect()
    publishHeight(rect.height)
    publishEdges(rect)
  }
}

/** Nur der Weg selbst zählt; Deckkraft und Filter verschieben keine Kante. */
function onBarTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName === 'transform') measureRow()
}

// Ohne Bewegung (prefers-reduced-motion) gibt es kein `transitionend` — dann
// steht die Endlage schon im Frame nach dem Klassenwechsel.
watch(revealed, async () => {
  await nextTick()
  measureRow()
})

/**
 * Verschwindet die Leiste (Pause, Profil-Tab), muss die HUD-Kontur das SOFORT
 * sehen: `hudField.ts` klemmt Void- und Drifter-Spawns gegen `--ability-bar-h`
 * und `--ability-bar-top`, und ein stehengebliebener Wert reservierte ein Band,
 * das gar nicht mehr da ist. `onUnmounted` deckt den Fall nicht ab — das `v-if`
 * sitzt am Wurzelelement, die Komponente bleibt gemountet.
 */
watch(
  () => uiStore.bardActiveTab === null && !isPaused.value,
  async (visible) => {
    if (!visible) {
      publishHeight(-ABILITY_BAR_STACK_GAP_PX)
      publishEdges(null)
      return
    }
    await nextTick()
    measureRow()
  },
)

// Beim An- und Abdocken wechseln Form und Anker — beide Maße stehen erst nach
// dem nächsten Rendern fest.
watch(
  () => props.dock,
  async () => {
    await nextTick()
    measureRow()
    placeTip()
  },
)

onMounted(() => {
  revealTimer = setTimeout(() => {
    revealed.value = true
    revealTimer = null
  }, ABILITY_BAR_REVEAL_MS)

  measureRow()
  const row = barEl.value?.querySelector('.ab-row')
  if (row) {
    sizeObserver = new ResizeObserver(measureRow)
    sizeObserver.observe(row)
  }
  // Beim Einblenden fährt die Leiste 12 px nach oben (`.ability-bar--in`). Die
  // erste Messung oben läuft VOR diesem Weg, ihre Oberkante steht also 12 px zu
  // tief — die Kontur liesse genau diesen Streifen frei. Der ResizeObserver
  // sieht es nicht: die Reihe behält dabei ihre Größe.
  barEl.value?.addEventListener('transitionend', onBarTransitionEnd)
  // Die Leiste ist zentriert: ein Breitenwechsel verschiebt jede Kachel, und
  // damit den Anker eines offenen Kastens. `placeTip` steigt sofort aus, wenn
  // keiner offen ist.
  window.addEventListener('resize', placeTip)
  // Und die Oberkante wandert schon, wenn nur die HÖHE des Fensters wechselt —
  // die Leiste hängt an der unteren Bildkante. Der ResizeObserver auf `.ab-row`
  // sieht das nicht, weil die Reihe dabei ihre Größe behält.
  window.addEventListener('resize', measureRow)
  ensureLoop()
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  if (revealTimer) clearTimeout(revealTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (flashTimer) clearTimeout(flashTimer)
  if (meepGainCoalesceTimer) clearTimeout(meepGainCoalesceTimer)
  if (meepGainClearTimer) clearTimeout(meepGainClearTimer)
  window.removeEventListener('resize', placeTip)
  window.removeEventListener('resize', measureRow)
  barEl.value?.removeEventListener('transitionend', onBarTransitionEnd)
  sizeObserver?.disconnect()
  document.documentElement.style.removeProperty('--ability-bar-h')
  // Abgebaut heisst: kein Band im Feld. Die Kontur muss das SOFORT sehen —
  // ein Profil-Tab schliesst sich ohne jeden Resize wieder.
  publishEdges(null)
})
</script>

<style scoped>
/* ── Die Leiste ───────────────────────────────────────────────────────────
   Sie liegt auf derselben Ankerlinie wie die Buff-Reihe, direkt über dem
   tiefen Mittelstreifen der Bottom-Bar. `pointer-events: none` am Rahmen,
   damit die Lücken zwischen den Kacheln den Klick auf die Sonne durchlassen —
   die Kacheln selbst schalten es wieder ein. */
.ability-bar {
  --ab-size: 84px;
  --ab-passive-size: 72px;
  --ab-gap: 10px;
  position: fixed;
  bottom: calc(var(--bottom-center-strip-h, 79px) + 14px);
  left: 50%;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  pointer-events: none;
  transform: translateX(-50%) translateY(12px);
  opacity: 0;
  transition:
    opacity 320ms ease,
    transform 440ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ability-bar--in {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Angedockt: Bard’s Rail im Star-Fight-Modal ────────────────────────
   Dieselbe Instanz, andere Form: aus der waagerechten Reihe am Bildrand wird
   eine senkrechte Säule im Fluss der Schiene. Alles hier hängt hinter der
   Klasse — der Orbit-Pfad darüber bleibt unberührt.

   Kein Transform-Übergang: zwischen zwei völlig verschiedenen Ankern wäre er
   ein Sprung, und die Einblendung des Modals deckt den Wechsel ohnehin. */
.ability-bar--docked {
  position: relative;
  bottom: auto;
  left: auto;
  z-index: auto;
  transform: none;
  transition: opacity 320ms ease;
}

.ability-bar--docked.ability-bar--in {
  transform: none;
}

.ability-bar--docked .ab-row {
  flex-direction: column;
}

/* Der Strich trennt weiter Zustand von Knöpfen — nur eben quer. */
.ability-bar--docked .ab-divider {
  width: calc(var(--ab-size) * 0.54);
  height: 1px;
  background: linear-gradient(to right, transparent, #4a2a0e 28%, #4a2a0e 72%, transparent);
}

/* Meldung und Tooltip dürfen die Säule nicht aufreißen: beide sind breiter als
   eine Kachel und stehen deshalb daneben statt darin. Die Meldung über der
   Schiene, der Tooltip auf Höhe seiner Kachel (placeTip schreibt `top`). */
.ability-bar--docked .ab-toast {
  position: absolute;
  left: calc(100% + 14px);
  bottom: calc(100% + 10px);
  margin-bottom: 0;
}

.ability-bar--docked .ab-tip {
  position: absolute;
  left: calc(100% + 14px);
  top: 0;
  margin-bottom: 0;
}

/* Der Zeiger wandert von der Unterkante an die linke — er zeigt jetzt
   waagerecht auf die Kachel, nicht mehr senkrecht. */
.ability-bar--docked .ab-tip::after {
  bottom: auto;
  left: -9px;
  top: calc(50% + var(--ab-caret-dy, 0px));
  transform: translateY(-50%);
  border-left: none;
  border-right: 7px solid #5c3310;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.ab-row {
  display: flex;
  align-items: center;
  gap: var(--ab-gap);
}

/* Trennt den Zustand (Passive) von den Knöpfen (Q W E R). */
.ab-divider {
  width: 1px;
  height: calc(var(--ab-size) * 0.54);
  background: linear-gradient(to bottom, transparent, #4a2a0e 28%, #4a2a0e 72%, transparent);
}

/* ── Meldung des letzten Wirkens ──────────────────────────────────────────
   Eine Zeile, keine Karte: sie steht nur wenige Sekunden und darf den Blick
   nicht vom Orbit ziehen. */
.ab-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 5px 12px 6px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.ab-toast-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  /* Symmetrisch: das eine Pixel mehr unten war der Ausgleich von Hand für den
     hohen Sitz der Tinte — den übernimmt jetzt `v-ink-center.y`, und beides
     zusammen schöbe die Taste zu tief. */
  padding: 2px 4px;
  background: #1e1006;
  border: 1px solid var(--ab-color, #e8c040);
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1;
  color: var(--ab-color, #e8c040);
}

.ab-toast-text {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #f2ead2;
}

/* ── Tooltip ──────────────────────────────────────────────────────────────
   Der Kasten des Spiels, mit einer Haarlinie in der Leitfarbe der Fähigkeit —
   dieselbe Behandlung, die die Buff-Chips für dieselbe Aufgabe benutzen.

   `left` schreibt `placeTip()` einmal je Hover-Wechsel: der Kasten steht damit
   über SEINER Kachel, ohne seinen Platz im Spaltenfluss zu verlassen. */
.ab-tip {
  position: relative;
  left: 0;
  /* Die Größe der Kopfzeile — Name UND Rangzahl lesen sie. Beide sollen gleich
     groß sein; stünde die Zahl zweimal da, liefen sie spätestens auf der
     nächsten Auflösungsstufe auseinander. */
  --ab-tip-title: 1.05rem;
  /* Breit genug, dass der Kopf auch mit dem längsten Namen („Caretaker's
     Shrine") samt Keycap UND Rangfeld in eine Zeile passt. Breite ist hier
     billig: der Kasten bleibt auf jeder Stufe schmaler als die Kachelreihe,
     die er überspannt, und der Klartextsatz bekommt sie gleich mit. */
  width: 348px;
  margin-bottom: 14px;
  /* Oben kein Polster: der Kopf ist eine randbündige Bande in der Leitfarbe und
     bringt sein eigenes mit. `overflow: hidden` wäre der bequeme Weg, die Bande
     am Kastenradius zu beschneiden — er schnitte den Zeiger unten (::after) ab.
     Der Kopf rundet deshalb selbst: 4px Kastenradius minus 2px Rahmen = 2px. */
  padding: 0 12px 11px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  text-align: left;
}

/* Der Zeiger auf die Kachel. Er sitzt in der Kastenmitte, weil die bei
   ungeklemmtem Versatz die Kachelmitte IST; `--ab-caret-dx` trägt nur die
   Strecke, die ein Bildrand dem Kasten abgeschnitten hätte. */
.ab-tip::after {
  content: '';
  position: absolute;
  bottom: -9px;
  left: calc(50% + var(--ab-caret-dx, 0px));
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-right: 7px solid transparent;
  border-left: 7px solid transparent;
  border-top: 7px solid #5c3310;
}

/* Die Linie oben, in der Leitfarbe der Fähigkeit. Sie liegt ÜBER der
   Kopf-Bande, nicht neben ihr: der Kasten fängt damit mit der Farbe an,
   bevor das erste Wort steht. */
.ab-tip::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1;
  height: 3px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--ab-color, #e8c040) 65%, transparent) 16%,
    var(--ab-color, #e8c040) 50%,
    color-mix(in srgb, var(--ab-color, #e8c040) 65%, transparent) 84%,
    transparent
  );
}

/* Gesperrt trägt der Kasten die Leitfarbe noch nicht — sie gehört zu einer
   Fähigkeit, die der Spieler wirken kann. Flach, nicht als Verlauf: sonst
   gewänne die Regel darüber. */
.ab-tip--locked::before {
  background: #5c3310;
}

/* ── Kopf ─────────────────────────────────────────────────────────────────
   Taste, Name, Rang in einer Zeile. Die Keycap ist dieselbe wie in der
   Meldung des letzten Wirkens — sie bindet den Kasten an die Kachel, über
   der er gerade steht. */
/* Der Kopf ist eine eigene Fläche in der Leitfarbe — dasselbe Mittel, mit dem
   jedes Modal des Spiels seinen Kopfstreifen vom Inhalt trennt, nur eben in der
   Farbe der Fähigkeit statt im Holzton. Er ist der Grund, weshalb sich fünf
   Kästen aus dem Augenwinkel unterscheiden lassen; alles Weitere darunter ist
   Bestätigung. Der negative Seitenmargin hebt das Polster des Kastens auf, damit
   die Bande wirklich bis an beide Rahmen läuft. */
.ab-tip-head {
  display: flex;
  /* `center`, nicht `baseline`: die Keycap ist ein Kästchen, das Rangfeld ein
     Satz verschieden großer Zahlen und Wörter — beide tragen `align-self:
     center`. Auf einer Baseline stand allein der Name, und zwar sichtbar höher
     als die beiden. Die Tinte holt `v-ink-center.y` im Template auf die Mitte
     zurück. */
  align-items: center;
  gap: 8px;
  margin: 0 -12px;
  padding: 10px 12px 8px;
  background: color-mix(in srgb, var(--ab-color, #e8c040) 12%, #1a1610);
  border-bottom: 1px solid color-mix(in srgb, var(--ab-color, #e8c040) 32%, transparent);
  border-radius: 2px 2px 0 0;
}

/* Gefüllt statt umrandet: die Keycap ist im getönten Kopf der eine Fleck VOLLER
   Leitfarbe, mit dunklem Text darauf. Alle fünf Leitfarben sind hell genug, dass
   das trägt — und die Kachel darunter zeigt dieselbe Taste, nur andersherum. */
.ab-tip-key {
  flex-shrink: 0;
  align-self: center;
  min-width: 1.45em;
  /* Symmetrisch — die Ink-Korrektur sitzt jetzt im Template. */
  padding: 2px 4px;
  background: var(--ab-color, #e8c040);
  border: 1px solid color-mix(in srgb, var(--ab-color, #e8c040) 70%, #000);
  border-radius: 3px;
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
  color: #12100a;
  text-align: center;
}

.ab-tip-name {
  flex: 1;
  min-width: 0;
  font-size: var(--ab-tip-title);
  font-weight: 900;
  line-height: 1.1;
  color: var(--ab-color, #e8c040);
}

/* Der Rang rechts im Kopf — die zweite Aussage der Zeile, gleichrangig mit dem
   Namen und deshalb in seiner Größe. Er stand hier einmal als umrandete
   Plakette; die Fläche gab dem Feld Gewicht, das der Rang darin selbst nicht
   hatte — er war das kleinste Element in seinem eigenen Kasten. Jetzt trennt
   ihn allein die Typografie vom Namen: keine Fläche, keine Kante, nur Größe,
   Sperrung und Farbtiefe.

   Der Block selbst trägt nur die em-Basis für seine kleinen Teile — dann genügt
   je Auflösungsstufe EINE Regel an ihm, die große Zahl folgt der Titelgröße. */
.ab-tip-rank {
  display: inline-flex;
  flex-shrink: 0;
  align-self: center;
  /* Mitte statt Baseline: die vier Teile sind verschieden groß, und jeder trägt
     seine eigene Ink-Korrektur. */
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

/* „RANK" — die Beschriftung zur Zahl. Sie sagt, was die Zahl ist, und tritt
   dafür zurück: gesperrt, in Versalien, in einem Ton zwischen Leitfarbe und
   Bandengrund. Ohne sie wäre „3/5" im Kopf mehrdeutig. */
.ab-tip-rank-word {
  font-size: 0.85em;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ab-color, #e8c040) 30%, #7c6c48);
}

.ab-tip-rank-count {
  display: inline-flex;
  align-items: center;
}

/* Die Zahl. Sie ist es, weshalb der Spieler hersieht — volle Leitfarbe, volle
   Titelgröße, dasselbe Gewicht wie der Name. */
.ab-tip-rank-value {
  font-size: var(--ab-tip-title);
  font-weight: 900;
  line-height: 1.1;
  color: var(--ab-color, #e8c040);
}

/* „Locked", „Passive", „Maxed" sind Wörter, keine Zahlen: eine Spur kleiner und
   gesperrt, damit rechts im Kopf kein zweiter Titel gegen den ersten steht. */
.ab-tip-rank-value--word {
  font-size: calc(var(--ab-tip-title) * 0.82);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ab-color, #e8c040) 55%, #8a7a52);
}

/* „/5" hängt an der Zahl und skaliert mit ihr, nicht mit der em-Basis des
   Blocks — sonst risse das Verhältnis der beiden auf der nächsten Stufe auf.
   Blasser als die Zahl: das Maximum ändert sich nie, der Zähler schon. */
.ab-tip-rank-total {
  font-size: calc(var(--ab-tip-title) * 0.62);
  font-weight: 900;
  line-height: 1;
  color: color-mix(in srgb, var(--ab-color, #e8c040) 45%, transparent);
}

/* Das nächste Level ist die Fußnote zum Rang — es trug einmal die Leitfarbe und
   damit den Blick, den jetzt die Zahl bekommt. Etwas mehr Luft als der Abstand
   innerhalb des Rangs: „RANK 3/5" ist EINE Aussage, das Level die nächste. */
.ab-tip-rank-level {
  margin-left: 4px;
  font-weight: 900;
  line-height: 1;
  color: color-mix(in srgb, var(--ab-color, #e8c040) 38%, #8a7a52);
}

/* Die Leitfarbe gehört einer Fähigkeit, die man wirken kann — gesperrt fällt
   JEDE der neuen Farbflächen auf ihren neutralen Ton zurück. */
.ab-tip--locked .ab-tip-name,
.ab-tip--locked .ab-tip-key,
.ab-tip--locked .ab-tip-rank-value,
.ab-tip--locked .ab-tip-rank-level {
  color: #a08a5c;
  border-color: #4a2a0e;
}

.ab-tip--locked .ab-tip-rank-word,
.ab-tip--locked .ab-tip-rank-total {
  color: #7c6c48;
}

.ab-tip--locked .ab-tip-key {
  background: #2a2318;
}

.ab-tip--locked .ab-tip-head {
  background: #1a1610;
  border-bottom-color: #2e2416;
}

/* ── Hauptwirkung ─────────────────────────────────────────────────────────
   Der Wert steht VOR seiner Beschriftung — umgekehrt zu den Zeilen darunter,
   weil er hier die Aussage ist und nicht der Eintrag einer Tabelle. Die
   Leitfarbe trägt er als Kante links, nicht als Fläche: eine eingefärbte Box
   in dieser Größe zöge mehr Blick als die Kachel selbst. */
.ab-tip-lead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 9px 0 9px;
  padding: 7px 10px 8px;
  background: color-mix(in srgb, var(--ab-color, #e8c040) 9%, #12100a);
  border-left: 3px solid var(--ab-color, #e8c040);
  border-radius: 0 3px 3px 0;
}

/* Der Wert trägt die Leitfarbe selbst — er ist die Antwort auf „was bringt der
   Druck?", und im Kasten die einzige Zahl, die diesen Rang hat. Die Zeilen
   darunter bleiben Creme: sie werden verglichen, nicht angesehen. */
.ab-tip-lead-value {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.05;
  color: var(--ab-color, #e8c040);
  font-variant-numeric: tabular-nums;
}

/* Der Ausblick auf den nächsten Rang: dieselbe Zeile, gedämpft und kleiner.
   Die Größe steht in `em` statt `rem` — damit folgt sie den Auflösungsstufen
   von selbst und braucht dort keine eigene Regel. */
.ab-tip-next {
  margin-left: 5px;
  font-size: 0.82em;
  font-weight: 800;
  color: #8a7a52;
  white-space: nowrap;
}

/* Gesperrt gibt es keinen Ausblick — der Lead nennt das Freischalt-Level. */
.ab-tip--locked .ab-tip-next {
  color: #6f6244;
}

.ab-tip-lead-label {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a7a52;
  text-align: right;
}

.ab-tip--locked .ab-tip-lead {
  background: #12100a;
  border-left-color: #5c3310;
}
.ab-tip--locked .ab-tip-lead-value {
  color: #c9b384;
}

/* Zwei Spalten: links wofür, rechts wie viel — die Zahlen stehen dadurch
   untereinander und lassen sich zwischen zwei Rängen vergleichen. */
.ab-tip-lines {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 12px;
  margin: 0;
}

.ab-tip-lines dt {
  font-size: 0.78rem;
  font-weight: 700;
  color: #8a7a52;
  white-space: nowrap;
}

.ab-tip-lines dd {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  color: #ded0a6;
  text-align: right;
}

/* Gesperrt sind die Zeilen eine Vorschau, kein Versprechen — sie treten
   entsprechend zurück. */
.ab-tip--locked .ab-tip-lines dd {
  color: #a89a74;
}

/* ── Der Klartextsatz ─────────────────────────────────────────────────────
   Er steht zwischen Namen und Zahlen und braucht deshalb KEINE Trennlinie: er
   gehört zum Kopf, nicht zu einem eigenen Block.

   Bewusst GRÖSSER als die Zahlenzeilen darunter (0,86 gegen 0,78 rem) — er ist
   Fließtext und wird gelesen, nicht abgelesen; bei gleicher Größe verschwände
   er zwischen den Tabellenzeilen, obwohl er den längsten Weg durchs Auge hat.
   Die Farbe bleibt trotzdem unter der der Werte: er erklärt sie, ersetzt sie
   nicht. */
.ab-tip-note {
  margin: 9px 0 0;
  font-size: 0.86rem;
  font-weight: 400;
  line-height: 1.4;
  color: #c6b68c;
}

.ab-tip--locked .ab-tip-note {
  color: #9b8c68;
}

/* ── Fuß ──────────────────────────────────────────────────────────────────
   Beschriftete Ablesungen wie im Astral Codex: Überschrift über dem Wert.
   „Ready" und „42s" allein sagten nicht, was sie zählen.

   Es stehen bis zu DREI Zellen nebeneinander (Status · Cooldown · Next rank) —
   die Lücke ist deshalb knapper gesetzt als bei zwei.

   Die Passive hat keinen Fuß: sie kühlt nicht ab, und ihre Wirkung steht
   vollständig in den Zeilen darüber. Der `v-if` am `<footer>` hält den
   Trennstrich fern, wenn nichts zu lesen wäre. */
.ab-tip-foot {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--ab-color, #e8c040) 20%, #2e2416);
}

.ab-tip--locked .ab-tip-foot {
  border-top-color: #2e2416;
}

.ab-tip-read {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ab-tip-read-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6f6244;
}

.ab-tip-read-value {
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.1;
  color: #e6dcbe;
  font-variant-numeric: tabular-nums;
}

/* Bereit ist der einzige Zustand, der eine Farbe verdient — er ist die
   Aufforderung, die Taste zu drücken. */
.ab-tip-status--ready {
  color: var(--ab-color, #e8c040);
}

/* ── Ein- und Ausblenden ──────────────────────────────────────────────── */
.ab-toast-enter-active,
.ab-tip-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1.4, 0.4, 1);
}
.ab-toast-leave-active,
.ab-tip-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}
.ab-toast-enter-from,
.ab-tip-enter-from,
.ab-toast-leave-to,
.ab-tip-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* Angedockt kommen beide von der Schiene her, also von LINKS. */
.ability-bar--docked .ab-toast-enter-from,
.ability-bar--docked .ab-tip-enter-from,
.ability-bar--docked .ab-toast-leave-to,
.ability-bar--docked .ab-tip-leave-to {
  transform: translateX(-6px);
}

/* ── Auflösungsstufen ─────────────────────────────────────────────────────
   Full HD ist der flachste Viewport und bekommt die Grundgröße; darüber
   wachsen die Kacheln mit, damit sie auf 2K und 4K nicht verloren wirken.
   Die Reihe misst dabei nie mehr als 5 Kacheln plus Lücken — sie passt damit
   auf jeder Referenz zwischen die beiden erhöhten HUD-Panels. */
/* Flacher Viewport (Full HD, WUXGA): die Säule teilt sich die Modalhöhe mit
   den Buff-Chips darunter. Dieselbe Schwelle wie der Kompakt-Block des
   Star-Fight-Modals. Nur angedockt — die waagerechte Leiste im Orbit hängt
   nicht an der Höhe. */
@media (max-height: 1100px) {
  .ability-bar--docked {
    --ab-size: 72px;
    --ab-passive-size: 62px;
    --ab-gap: 8px;
  }
}

@media (min-width: 2400px) {
  .ability-bar {
    --ab-size: 104px;
    --ab-passive-size: 88px;
    --ab-gap: 12px;
  }
  .ab-tip {
    --ab-tip-title: 1.2rem;
    width: 410px;
    padding: 0 14px 13px;
  }
  /* Der negative Margin muss dem Seitenpolster des Kastens EXAKT folgen, sonst
     bleibt die Bande schmaler als er. */
  .ab-tip-head {
    margin: 0 -14px;
    padding: 12px 14px 9px;
  }
  .ab-tip-key {
    font-size: 0.88rem;
  }
  .ab-tip-rank {
    font-size: 0.88rem;
  }
  .ab-tip-lead-value {
    font-size: 1.32rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 0.86rem;
  }
  .ab-tip-note {
    font-size: 0.95rem;
  }
  .ab-tip-read-value {
    font-size: 0.92rem;
  }
  .ab-toast-text {
    font-size: 1.05rem;
  }
}

@media (min-width: 3400px) {
  .ability-bar {
    --ab-size: 128px;
    --ab-passive-size: 108px;
    --ab-gap: 14px;
  }
  .ab-tip {
    --ab-tip-title: 1.45rem;
    width: 480px;
    padding: 0 16px 15px;
  }
  .ab-tip-head {
    margin: 0 -16px;
    padding: 14px 16px 11px;
  }
  .ab-tip-key {
    font-size: 1rem;
  }
  .ab-tip-rank {
    font-size: 1rem;
  }
  .ab-tip-lead-value {
    font-size: 1.6rem;
  }
  .ab-tip-lines dt,
  .ab-tip-lines dd {
    font-size: 0.98rem;
  }
  .ab-tip-note {
    font-size: 1.08rem;
  }
  .ab-tip-read-value {
    font-size: 1.05rem;
  }
  .ab-toast-text {
    font-size: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ability-bar,
  .ab-toast-enter-active,
  .ab-tip-enter-active,
  .ab-toast-leave-active,
  .ab-tip-leave-active {
    transition: none;
  }
}
</style>
