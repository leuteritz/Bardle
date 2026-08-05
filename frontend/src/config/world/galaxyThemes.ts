export type GalaxyTheme = {
  name: string
  gradient: string
  accentColor: string
  nebulaColors: [string, string, string, string]
}

export const GALAXY_THEMES: GalaxyTheme[] = [
  // 0 — Blue Veil
  {
    name: 'Blue Veil',
    gradient: 'linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830)',
    accentColor: '#0a1a3e',
    nebulaColors: [
      'rgba(88, 28, 135, 0.10)',
      'rgba(6, 78, 130, 0.09)',
      'rgba(14, 116, 144, 0.08)',
      'rgba(131, 24, 67, 0.08)',
    ],
  },
  // 1 — Violet Rift
  {
    name: 'Violet Rift',
    gradient: 'linear-gradient(45deg, #0d0420, #1a0838, #220a48, #160530)',
    accentColor: '#3a0a60',
    nebulaColors: [
      'rgba(130, 20, 220, 0.12)',
      'rgba(100, 10, 180, 0.10)',
      'rgba(150, 40, 240, 0.09)',
      'rgba(90, 10, 160, 0.09)',
    ],
  },
  // 2 — Emerald Void
  {
    name: 'Emerald Void',
    gradient: 'linear-gradient(45deg, #030e06, #082014, #0b2c18, #051208)',
    accentColor: '#0a3a18',
    nebulaColors: [
      'rgba(20, 130, 50, 0.12)',
      'rgba(10, 100, 60, 0.10)',
      'rgba(30, 150, 40, 0.09)',
      'rgba(15, 110, 55, 0.09)',
    ],
  },
  // 3 — Amber Forge
  {
    name: 'Amber Forge',
    gradient: 'linear-gradient(45deg, #0e0600, #1e0e00, #281400, #160800)',
    accentColor: '#3a1a00',
    nebulaColors: [
      'rgba(200, 90, 10, 0.12)',
      'rgba(180, 70, 5, 0.10)',
      'rgba(220, 110, 20, 0.09)',
      'rgba(160, 60, 5, 0.09)',
    ],
  },
  // 4 — Crimson Expanse
  {
    name: 'Crimson Expanse',
    gradient: 'linear-gradient(45deg, #0e0202, #200606, #2a0808, #180404)',
    accentColor: '#3a0808',
    nebulaColors: [
      'rgba(200, 20, 20, 0.12)',
      'rgba(180, 10, 10, 0.10)',
      'rgba(220, 30, 30, 0.09)',
      'rgba(160, 15, 15, 0.09)',
    ],
  },
  // 5 — Cyan Deep
  {
    name: 'Cyan Deep',
    gradient: 'linear-gradient(45deg, #020e10, #041820, #061e28, #031214)',
    accentColor: '#043a3a',
    nebulaColors: [
      'rgba(10, 180, 180, 0.10)',
      'rgba(5, 150, 170, 0.09)',
      'rgba(15, 200, 190, 0.08)',
      'rgba(8, 160, 165, 0.08)',
    ],
  },
  // 6 — Gold Nebula
  {
    name: 'Gold Nebula',
    gradient: 'linear-gradient(45deg, #0e0c00, #1e1800, #281e00, #160e00)',
    accentColor: '#302400',
    nebulaColors: [
      'rgba(200, 170, 10, 0.12)',
      'rgba(180, 150, 5, 0.10)',
      'rgba(220, 190, 20, 0.09)',
      'rgba(160, 130, 5, 0.09)',
    ],
  },
  // 7 — Rose Drift
  {
    name: 'Rose Drift',
    gradient: 'linear-gradient(45deg, #0e0208, #1e0414, #28061c, #160410)',
    accentColor: '#3a0428',
    nebulaColors: [
      'rgba(200, 20, 110, 0.12)',
      'rgba(180, 10, 90, 0.10)',
      'rgba(220, 30, 130, 0.09)',
      'rgba(160, 15, 80, 0.09)',
    ],
  },
  // 8 — Indigo Storm
  {
    name: 'Indigo Storm',
    gradient: 'linear-gradient(45deg, #040414, #080828, #0c0c38, #060622)',
    accentColor: '#0c0c40',
    nebulaColors: [
      'rgba(60, 60, 200, 0.12)',
      'rgba(40, 40, 180, 0.10)',
      'rgba(80, 60, 220, 0.09)',
      'rgba(50, 30, 160, 0.09)',
    ],
  },
  // 9 — Teal Abyss
  {
    name: 'Teal Abyss',
    gradient: 'linear-gradient(45deg, #020c0e, #041416, #05181c, #031010)',
    accentColor: '#043030',
    nebulaColors: [
      'rgba(10, 140, 130, 0.11)',
      'rgba(8, 120, 110, 0.09)',
      'rgba(15, 160, 145, 0.08)',
      'rgba(6, 100, 95, 0.08)',
    ],
  },
  // 10 — Magenta Pulse
  {
    name: 'Magenta Pulse',
    gradient: 'linear-gradient(45deg, #100410, #1e0820, #280a2c, #180618)',
    accentColor: '#3a0840',
    nebulaColors: [
      'rgba(180, 20, 180, 0.12)',
      'rgba(160, 10, 160, 0.10)',
      'rgba(200, 30, 200, 0.09)',
      'rgba(140, 15, 140, 0.09)',
    ],
  },
  // 11 — Rust Nebula
  {
    name: 'Rust Nebula',
    gradient: 'linear-gradient(45deg, #100400, #200800, #2c0a00, #180600)',
    accentColor: '#3c1000',
    nebulaColors: [
      'rgba(180, 60, 10, 0.12)',
      'rgba(160, 40, 5, 0.10)',
      'rgba(200, 80, 20, 0.09)',
      'rgba(140, 30, 5, 0.09)',
    ],
  },
  // 12 — Jade Silence
  {
    name: 'Jade Silence',
    gradient: 'linear-gradient(45deg, #060c04, #0c1608, #121c0a, #080e06)',
    accentColor: '#103010',
    nebulaColors: [
      'rgba(40, 140, 60, 0.11)',
      'rgba(30, 120, 50, 0.09)',
      'rgba(50, 160, 70, 0.08)',
      'rgba(25, 100, 45, 0.08)',
    ],
  },
  // 13 — Cobalt Depths
  {
    name: 'Cobalt Depths',
    gradient: 'linear-gradient(45deg, #020816, #041030, #06163e, #020c24)',
    accentColor: '#041840',
    nebulaColors: [
      'rgba(20, 60, 200, 0.12)',
      'rgba(10, 40, 180, 0.10)',
      'rgba(30, 80, 220, 0.09)',
      'rgba(15, 30, 160, 0.09)',
    ],
  },
  // 14 — Silver Void
  {
    name: 'Silver Void',
    gradient: 'linear-gradient(45deg, #080c10, #0e1418, #141c22, #0a1014)',
    accentColor: '#182030',
    nebulaColors: [
      'rgba(100, 130, 160, 0.10)',
      'rgba(80, 110, 140, 0.09)',
      'rgba(120, 150, 180, 0.08)',
      'rgba(70, 100, 130, 0.08)',
    ],
  },
  // 15 — Scarlet Haze
  {
    name: 'Scarlet Haze',
    gradient: 'linear-gradient(45deg, #120200, #220400, #2e0600, #1a0300)',
    accentColor: '#400800',
    nebulaColors: [
      'rgba(220, 30, 10, 0.12)',
      'rgba(200, 20, 5, 0.10)',
      'rgba(240, 50, 20, 0.09)',
      'rgba(180, 15, 5, 0.09)',
    ],
  },
  // 16 — Lime Expanse
  {
    name: 'Lime Expanse',
    gradient: 'linear-gradient(45deg, #050c02, #0a1604, #0e2006, #080e04)',
    accentColor: '#0e2c06',
    nebulaColors: [
      'rgba(60, 180, 20, 0.11)',
      'rgba(40, 160, 10, 0.09)',
      'rgba(80, 200, 30, 0.08)',
      'rgba(30, 140, 10, 0.08)',
    ],
  },
  // 17 — Aqua Rift
  {
    name: 'Aqua Rift',
    gradient: 'linear-gradient(45deg, #021010, #041e1a, #062820, #031614)',
    accentColor: '#063830',
    nebulaColors: [
      'rgba(10, 200, 160, 0.11)',
      'rgba(5, 180, 140, 0.09)',
      'rgba(15, 220, 180, 0.08)',
      'rgba(8, 160, 130, 0.08)',
    ],
  },
  // 18 — Twilight Mauve
  {
    name: 'Twilight Mauve',
    gradient: 'linear-gradient(45deg, #0c0814, #160e22, #1c1030, #10081a)',
    accentColor: '#281040',
    nebulaColors: [
      'rgba(140, 80, 200, 0.11)',
      'rgba(120, 60, 180, 0.09)',
      'rgba(160, 100, 220, 0.08)',
      'rgba(100, 50, 160, 0.08)',
    ],
  },
  // 19 — Deep Burgundy
  {
    name: 'Deep Burgundy',
    gradient: 'linear-gradient(45deg, #0e0208, #1c0410, #240516, #14030c)',
    accentColor: '#300618',
    nebulaColors: [
      'rgba(160, 10, 60, 0.12)',
      'rgba(140, 5, 50, 0.10)',
      'rgba(180, 20, 70, 0.09)',
      'rgba(120, 5, 40, 0.09)',
    ],
  },
]
