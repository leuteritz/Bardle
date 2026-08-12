// Testvorbereitung — läuft vor jeder Spec.
//
// jsdom bringt `window.matchMedia` NICHT mit, der Code verlässt sich an
// achtzehn Stellen darauf (überall `prefers-reduced-motion`). Solange ein
// solcher Aufruf hinter einer Bedingung lag, die im Test nie wahr wurde, fiel
// das nicht auf; sobald einer erreichbar wird, stirbt die Spec mit
// „window.matchMedia is not a function" — an einer Stelle, die mit der
// eigentlichen Prüfung nichts zu tun hat.
//
// Der Ersatz meldet `matches: false`, also „keine reduzierte Bewegung" — das
// ist der Normalfall eines Spielers und damit die richtige Vorgabe. Wer das
// Gegenteil braucht, überschreibt `window.matchMedia` in seiner Spec.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}
