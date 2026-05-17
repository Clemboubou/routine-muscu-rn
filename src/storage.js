import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'muscu-history-v1';

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(h) {
  await AsyncStorage.setItem(KEY, JSON.stringify(h));
}

export async function lastMaxFor(slug) {
  const h = await loadHistory();
  for (let i = h.length - 1; i >= 0; i--) {
    const entry = h[i].exos.find(e => e.slug === slug);
    if (entry && entry.weights && entry.weights.some(w => w)) {
      const ws = entry.weights.filter(w => w).map(Number);
      return { date: h[i].date, max: Math.max(...ws) };
    }
  }
  return null;
}

export async function addSetEntry(sessionTitle, slug, name, weights, notes) {
  const h = await loadHistory();
  const today = new Date().toISOString().slice(0, 10);
  let entry = h.find(e => e.date.slice(0, 10) === today && e.sessionTitle === sessionTitle);
  if (!entry) {
    entry = { date: new Date().toISOString(), sessionTitle, exos: [], notes: '' };
    h.push(entry);
  }
  const existing = entry.exos.findIndex(e => e.slug === slug);
  const exoEntry = { slug, name, weights };
  if (existing >= 0) entry.exos[existing] = exoEntry;
  else entry.exos.push(exoEntry);
  if (notes) {
    entry.notes = entry.notes ? entry.notes + '\n— ' + name + ': ' + notes : name + ': ' + notes;
  }
  await saveHistory(h);
}
