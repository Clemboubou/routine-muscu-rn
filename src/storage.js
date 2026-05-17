import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'muscu-history-v1';
const DRAFT_KEY = 'muscu-draft-v1';

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

// === BROUILLON DE SÉANCE ===
// Un seul brouillon actif à la fois (l'utilisateur fait une séance à la fois).
// Persistance : survit à la fermeture de l'app, au reboot, à la batterie morte.

export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveDraft(draft) {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function clearDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

// === COMMIT FINAL D'UNE SÉANCE ===
// Convertit le brouillon en entrée d'historique au format attendu par HistoryScreen.

export async function commitSession({ sessionTitle, exos, notes }) {
  const h = await loadHistory();
  const entry = {
    date: new Date().toISOString(),
    sessionTitle,
    exos: exos.map(e => ({ slug: e.slug, name: e.name, weights: e.weights })),
    notes: notes || '',
  };
  h.push(entry);
  await saveHistory(h);
}

// === Legacy : saisie d'un seul exo (encore utilisé si tu touches un exo depuis Aujourd'hui) ===
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
