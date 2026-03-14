export async function fetchChampionNames(): Promise<string[]> {
  const response = await fetch('/data/champion.csv')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const text = await response.text()
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}
