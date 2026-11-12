const KEY = 'campusflip_recent_searches';
const MAX = 3;

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return;
  const existing = getRecentSearches();
  const next = [q, ...existing.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function clearRecentSearches() {
  try { localStorage.removeItem(KEY); } catch {}
}