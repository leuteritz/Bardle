import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

/**
 * Welcher Knoten des Sternbaums gerade gezeigt wird — gleich, über welcher der
 * beiden Shop-Spalten die Maus steht.
 *
 * Baum links und Liste rechts sind zwei Bilder DESSELBEN Bestands (siehe
 * `useForgeUpgrades`). Ein Zeiger auf einem von ihnen muss deshalb auf beiden
 * dasselbe bedeuten, sonst sucht der Spieler den Kreis zur Karte unter
 * fünfundzwanzig selbst.
 *
 * Warum Modulebene statt Props durch `ShopComponent`: die beiden Leser sind
 * keine Geschwister — dazwischen liegt `StarForgePanel` mit seinen vier
 * Reitern, das mit diesem Zustand nichts zu tun hat und ihn nur durchreichen
 * müsste. Ein Hover-Id ist reine Anzeige (kein Store, keine Balance-Zahl, kein
 * Spielstand) und damit genau das, was ein Composable halten darf; dasselbe
 * Muster trägt `useHerald` und `useEventLog`.
 */
const listHoverId = ref<string | null>(null)
const treeHoverId = ref<string | null>(null)

/**
 * Der FOKUSSIERTE Knoten — die dritte Quelle, und die stärkste.
 *
 * Er war einmal der Sonderfall: ein Klick auf einen GESPERRTEN Knoten war im
 * Baum wirkungslos (`buyUpgrade` gibt `false` zurück), und die Anheftung gab ihm
 * eine Wirkung. Inzwischen ist er die REGEL — ein Klick fokussiert, gleich ob im
 * Baum oder auf einer Zeile der Detailspalte, und gleich in welchem Zustand der
 * Knoten steht. Erst der zweite Klick auf denselben Knoten kauft.
 *
 * Damit ändert sich sein Charakter: er ist kein flüchtiger Griff mehr, sondern
 * die Auswahl, mit der der Spieler arbeitet. Gelöst wird sie deshalb nur noch
 * AUSDRÜCKLICH — Escape, ein Klick auf die leere Bühne oder ein geglückter
 * Kauf. Ein zweiter Klick auf dasselbe Upgrade
 * löst NICHT; er holt es nur zurück ins Bild (siehe `focusNode`).
 */
const pinnedId = ref<string | null>(null)

/**
 * „Zeig ihn mir nochmal" — als Impuls, nicht als Zustand.
 *
 * Baum und Liste holen den fokussierten Knoten ins Bild, wenn `pinnedId`
 * WECHSELT. Genau das tut es aber nicht, wenn der Spieler dieselbe Zeile oder
 * denselben Knoten noch einmal anklickt — und das heißt „hol ihn her". Ein
 * Zähler ist die kleinste Form dafür: er trägt keinen Wert,
 * nur ein Ereignis, und jeder Leser entscheidet selbst, was er damit tut.
 */
/**
 * Was der Spieler VERFOLGT — ein Vault-Eintrag, auf den von aussen gezeigt
 * wurde (heute die gesperrte Send-All-Kachel des Voyages-Reiters).
 *
 * Eigener Zustand und NICHT `pinnedId`, obwohl beides „das meine ich" heisst:
 * die Verfolgungs-Karte bietet als Hauptgeste einen Sprung auf ihre eigenen
 * Bedingungen an, und der setzt den Fokus. Laege beides im selben Feld, loeschte
 * die Karte sich mit ihrem eigenen Knopf. Zwei Felder, zwei Lebensdauern: der
 * Fokus wandert mit dem Blick, die Verfolgung bleibt, bis sie erledigt oder
 * abgeraeumt ist.
 *
 * Eine Konstellation hat keinen Sitz im Netz — `pinnedId` waere fuer sie
 * ohnehin ein stummer Wert, der nur eine Escape-Stufe frisst.
 */
const pursuitId = ref<string | null>(null)

/**
 * „Zeig mir die Karte dazu" — der Impuls des Ankerknotens im Netz.
 *
 * Ein Zähler ohne Wert, dasselbe Muster wie `focusTick`: der Knoten im Netz und
 * die Karte in der Spalte meinen dieselbe Sache, und ein Klick auf den einen
 * soll die andere holen, ohne dass er dafür einen Zustand setzt, den jemand
 * wieder abräumen müsste.
 */
const pursuitPingTick = ref(0)

const focusTick = ref(0)

/**
 * „Und zwar so, dass ich ihn LESEN kann" — der zweite Impuls, und der einzige,
 * der den Zoom anfasst.
 *
 * Er ist nicht dasselbe wie `focusTick`. Wer eine Zeile anklickt, hat seinen
 * Zoom bewusst gewaehlt, und eine Bühne, die ihn dabei verstellt, waere eine
 * Bevormundung. Wer dagegen aus dem NICHTS an eine Stelle springt — Taste K auf
 * The Wandering —, kommt am Zoomboden bei einem Knoten von sechs Pixeln an:
 * gemessen 6,5 px in der Vollübersicht. Hinfahren allein beantwortet die Geste
 * dort nicht.
 */
const readableTick = ref(0)

/**
 * Anheftung schlägt Liste schlägt Baum — von der absichtlichsten Geste zur
 * billigsten.
 *
 * Die Anheftung steht VOR beiden Zeigern und nicht zwischen ihnen: eine, die
 * der nächste Zeigerweg wieder abräumt, wäre keine — und der erste Weg nach dem
 * Anheften führt zwangsläufig auf einen anderen Knoten.
 *
 * Die mittlere Regel ist die alte, dieselbe wie `spotlightAlly` im Team-Tab:
 * die Liste ist die absichtlichere Geste und die, die noch steht, während der
 * Zeiger vom Baum auf eine Karte wandert.
 *
 * Wer daran hängt, beantwortet die Frage „wessen Bedingungskette wird gezeigt" —
 * die Voraussetzungen abzufahren ist der Grund, aus dem es den Fokus gibt. Wer
 * dagegen „worauf zeigt der Spieler GERADE" meint, nimmt `hoverId`.
 */
const spotlightId = computed(() => pinnedId.value ?? listHoverId.value ?? treeHoverId.value)

/**
 * Was der ZEIGER meint — ohne den Fokus davor.
 *
 * Nötig geworden, als der Fokus von der Ausnahme zur Regel wurde: er steht
 * seitdem dauerhaft, und `spotlightId` schluckte damit jede Hover-Rückmeldung
 * auf den hundertvierundfünfzig anderen Zeilen — ausgerechnet auf denen, die
 * als Nächstes geklickt werden. Hervorhebung und Dämpfung fragen deshalb hier,
 * Bedingungskette und Kamera weiterhin bei `spotlightId`.
 */
const hoverId = computed(() => listHoverId.value ?? treeHoverId.value)

/**
 * Hängt die Ansicht fest?
 *
 * Der Baum zeichnet daran seine Anheftungs-Marke, und der Shop-Tab entscheidet
 * daran, ob er die Escape-Taste verbraucht — ohne diese Meldung schlösse
 * dieselbe Taste gleich das ganze Profil (`BardProfileMenu`).
 */
const pinned = computed(() => pinnedId.value !== null)

/**
 * Ob der Zeiger die LISTE gerade hält — die Halte-Geste.
 *
 * Reine Ableitung, kein zweiter Zustand. Wer sein Erscheinen an einen Wert
 * hängt, der auch ohne Zutun kippt (die Chimes ticken jede Sekunde), fragt
 * hier, ob er warten muss: was der Zeiger hält, darf nicht unter ihm
 * wegrutschen.
 *
 * Sie hatte genau einen Leser, das Empfehlungs-Panel, und das ist gestrichen.
 * Sie bleibt trotzdem: dieselbe Frage stellt sich in dieser Spalte an mehreren
 * Stellen (`frozenBuckets` und `frozenBulk` in `ForgeUpgradesSection` lösen sie
 * über ihr eigenes `mouseenter`, weil sie beim Betreten eine Momentaufnahme
 * brauchen und nicht nur ein Ja/Nein).
 */
const listHovering = computed(() => listHoverId.value !== null)

export function useForgeSpotlight(): {
  spotlightId: ComputedRef<string | null>
  hoverId: ComputedRef<string | null>
  listHoverId: Readonly<Ref<string | null>>
  treeHoverId: Readonly<Ref<string | null>>
  pinnedId: Readonly<Ref<string | null>>
  pursuitId: Readonly<Ref<string | null>>
  pursuitPingTick: Readonly<Ref<number>>
  focusTick: Readonly<Ref<number>>
  readableTick: Readonly<Ref<number>>
  listHovering: ComputedRef<boolean>
  pinned: ComputedRef<boolean>
  setListHover: (id: string | null) => void
  setTreeHover: (id: string | null) => void
  setPin: (id: string) => void
  refocus: () => void
  focusNode: (id: string, opts?: { readable?: boolean }) => void
  clearPin: () => void
  setPursuit: (id: string) => void
  pingPursuit: () => void
  clearPursuit: () => void
  resetForgeSpotlight: () => void
} {
  function setListHover(id: string | null): void {
    listHoverId.value = id
  }

  function setTreeHover(id: string | null): void {
    treeHoverId.value = id
  }

  /**
   * Setzen, nie lösen.
   *
   * Hier stand `togglePin`, und der zweite Klick auf denselben Knoten räumte den
   * Fokus ab. Das trug, solange Anheften die seltene Geste für gesperrte Knoten
   * war. Seit ein Klick IMMER fokussiert, ist es die falsche Regel: der Spieler
   * verlöre seine Auswahl durch genau die Geste, mit der er sie bestätigt.
   */
  function setPin(id: string): void {
    pinnedId.value = id
  }

  /** Denselben Knoten noch einmal ins Bild holen, ohne den Fokus anzufassen. */
  function refocus(): void {
    focusTick.value += 1
  }

  /**
   * Die Geste der beiden Zeilen: ein anderer versetzt den Fokus, derselbe holt
   * ihn heran.
   *
   * Steht hier und nicht je Komponente — es ist EINE Regel, und Zeile wie
   * Archivzeile müssen sie gleich beantworten.
   */
  function focusNode(id: string, opts: { readable?: boolean } = {}): void {
    if (pinnedId.value === id) refocus()
    else setPin(id)
    if (opts.readable) readableTick.value += 1
  }

  function clearPin(): void {
    pinnedId.value = null
  }

  /** Von aussen auf einen Vault-Eintrag zeigen. */
  function setPursuit(id: string): void {
    pursuitId.value = id
  }

  /** Den Ankerknoten angeklickt — die Karte soll sich melden. */
  function pingPursuit(): void {
    pursuitPingTick.value += 1
  }

  function clearPursuit(): void {
    pursuitId.value = null
  }

  /**
   * Alle drei Quellen löschen. Der Shop-Tab bleibt nach dem ersten Öffnen
   * GEMOUNTET (`BardProfileMenu` rendert ihn als `v-if` auf `mountedTabs` plus
   * `v-show`, und `mountedTabs` wird nie geleert) — ohne diesen Weg überlebte
   * eine Anheftung den Tabwechsel garantiert. Ein Zeiger tut es heute nur
   * deshalb nicht, weil sein `mouseleave` ihn zufällig aufräumt.
   *
   * `focusTick` bleibt stehen: er ist ein Zähler ohne Bedeutung, und ihn
   * zurückzusetzen zündete bei jedem Tabwechsel einen Impuls, auf den beide
   * Spalten mit einer Fahrt antworten würden.
   */
  function resetForgeSpotlight(): void {
    listHoverId.value = null
    treeHoverId.value = null
    pinnedId.value = null
    pursuitId.value = null
  }

  return {
    spotlightId,
    hoverId,
    listHoverId: readonly(listHoverId),
    treeHoverId: readonly(treeHoverId),
    pinnedId: readonly(pinnedId),
    pursuitId: readonly(pursuitId),
    pursuitPingTick: readonly(pursuitPingTick),
    focusTick: readonly(focusTick),
    readableTick: readonly(readableTick),
    listHovering,
    pinned,
    setListHover,
    setTreeHover,
    setPin,
    refocus,
    focusNode,
    clearPin,
    setPursuit,
    pingPursuit,
    clearPursuit,
    resetForgeSpotlight,
  }
}
