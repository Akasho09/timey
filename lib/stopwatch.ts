export type ParsedLap = { lapNumber: number; durationMs: number; cumulativeMs: number };

// Accepts stopwatch rows such as: 1  00:01.06  00:01.06 (mm:ss.cc)
// Also accepts hh:mm:ss.cc and decimal seconds.
export function parseStopwatchText(input: string): ParsedLap[] {
  const rows = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: ParsedLap[] = [];
  for (const row of rows) {
    const match = row.match(/^\s*(\d+)\s+((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?|\d+(?:[.,]\d+)?)\s+((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?|\d+(?:[.,]\d+)?)\s*$/);
    if (!match) continue;
    const lapNumber = Number(match[1]);
    const durationMs = parseTime(match[2]);
    const cumulativeMs = parseTime(match[3]);
    if (!Number.isInteger(lapNumber) || lapNumber < 1 || durationMs < 0 || cumulativeMs < 0) continue;
    parsed.push({ lapNumber, durationMs, cumulativeMs });
  }
  if (!parsed.length) throw new Error("No valid stopwatch rows found. Expected: lap number, lap time, cumulative time.");
  parsed.sort((a, b) => a.lapNumber - b.lapNumber);
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].lapNumber === parsed[i - 1].lapNumber) throw new Error(`Duplicate lap number: ${parsed[i].lapNumber}`);
    if (parsed[i].cumulativeMs < parsed[i - 1].cumulativeMs) throw new Error("Cumulative time must not decrease between laps.");
  }
  return parsed;
}

function parseTime(value: string): number {
  const normalized = value.replace(",", ".");
  if (!normalized.includes(":")) return Math.round(Number(normalized) * 1000);
  const parts = normalized.split(":");
  const last = Number(parts.pop());
  const minutesOrHours = parts.map(Number);
  const seconds = last;
  if (minutesOrHours.length === 1) return Math.round((minutesOrHours[0] * 60 + seconds) * 1000);
  if (minutesOrHours.length === 2) return Math.round((minutesOrHours[0] * 3600 + minutesOrHours[1] * 60 + seconds) * 1000);
  return 0;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}.${String(centiseconds).padStart(2, "0")}s`;
  return `${seconds}.${String(centiseconds).padStart(2, "0")}s`;
}

export function formatHours(ms: number): string {
  return `${(ms / 3_600_000).toFixed(2)} h`;
}
