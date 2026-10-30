export function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return 'just now';
  if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  if (delta < day * 7) return `${Math.floor(delta / day)}d ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(timestamp);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

const KNOWN_RATIOS: Array<[string, number]> = [
  ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['2:3', 2 / 3], ['9:16', 9 / 16],
  ['5:4', 5 / 4], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['21:9', 21 / 9],
];

/** "3:4" for a 1152x1536 picture: the closest common ratio, or the plain ratio when none is close. */
export function aspectLabel(width: number, height: number): string {
  if (!width || !height) return '';
  const value = width / height;
  const near = KNOWN_RATIOS.find(([, ratio]) => Math.abs(ratio - value) / ratio < 0.02);
  return near ? near[0] : `${value.toFixed(2)}:1`;
}
