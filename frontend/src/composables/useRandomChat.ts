export type TabId = 'all' | 'clan' | 'region'

export interface ChatMessage {
  id: number
  name: string
  text: string
  time: string
  channel: TabId
}

const NPC_NAMES = [
  'Grimbald',
  'Thessaly',
  'Brak der Händler',
  'Mystara',
  'Fenwick',
  'Ronja',
  'Aldric',
  'Syla',
  'Dorfwächter Hanz',
  'Bote Erwin',
]

const MESSAGE_POOLS: Array<{ text: string; channel: TabId }> = [
  { text: 'Der Händler hat seltene Waren – beeilt euch!', channel: 'all' },
  { text: 'Wer braucht Heiltränke? 50 Chimes das Stück.', channel: 'all' },
  { text: 'Hat jemand mein Schwert gesehen…?', channel: 'all' },
  { text: 'Gerücht: Im alten Turm soll ein Drache hausen.', channel: 'all' },
  { text: 'Die Sterne stehen ungünstig heute Nacht.', channel: 'all' },
  { text: 'Hat jemand das neue Lied von Bard gehört?', channel: 'all' },
  { text: 'Die Taverne hat Bärenschinken. Sehr empfehlenswert.', channel: 'all' },
  { text: 'Vorsicht vor dem Wolf im Dunkelwald!', channel: 'all' },
  { text: 'Neue Quest verfügbar – suche tapfere Helden!', channel: 'all' },
  { text: 'Der Bürgermeister erhöht die Steuern. Wieder.', channel: 'all' },
  { text: 'Clan-Raid startet in 10 Minuten! Alle bereit?', channel: 'clan' },
  { text: 'Wir brauchen noch 2 Heiler für den Boss-Kampf.', channel: 'clan' },
  { text: 'Schatz geteilt – jeder bekommt 200 Chimes.', channel: 'clan' },
  { text: 'Clan-Burg aufgewertet! Stufe 5 erreicht.', channel: 'clan' },
  { text: 'Unser Clan ist jetzt Rang 3 auf dem Scoreboard!', channel: 'clan' },
  { text: 'Nächster Clan-Event: Drachenjagd morgen 20 Uhr.', channel: 'clan' },
  { text: 'Alle ins Lager – wichtige Besprechung!', channel: 'clan' },
  { text: 'Achtung, Goblin-Angriff im Norden!', channel: 'region' },
  { text: 'Die Brücke im Süden ist eingestürzt.', channel: 'region' },
  { text: 'Der König schickt Truppen – Krieg zieht auf!', channel: 'region' },
  { text: 'Händler-Karawane erreicht bald den Marktplatz.', channel: 'region' },
  { text: 'Erdbeben erschütterte das östliche Gebirge.', channel: 'region' },
  { text: 'Neue Siedlung im Westen – Pioniere gesucht.', channel: 'region' },
  { text: 'Pestilenz in Dorf Grauhain – Quarantäne angeordnet.', channel: 'region' },
]

function getTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function createRandomChatMessage(id: number): ChatMessage {
  const entry = MESSAGE_POOLS[Math.floor(Math.random() * MESSAGE_POOLS.length)]
  const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]

  return {
    id,
    name,
    text: entry.text,
    time: getTime(),
    channel: entry.channel,
  }
}
