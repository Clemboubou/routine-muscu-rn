import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'muscu-history-v1';
const DRAFT_KEY = 'muscu-draft-v1';
const WALK_LOG_KEY = 'walk-log-v1';
const WALK_START_KEY = 'walk-start-v1';
const WEIGHT_LOG_KEY = 'weight-log-v1';

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

// Renvoie les poids de la dernière séance pour cet exo (array brut, peut contenir '')
// Sert à pré-remplir les inputs en placeholder.
export async function lastWeightsFor(slug) {
  const h = await loadHistory();
  for (let i = h.length - 1; i >= 0; i--) {
    const entry = h[i].exos.find(e => e.slug === slug);
    if (entry && entry.weights && entry.weights.some(w => w)) {
      return entry.weights.map(w => String(w || ''));
    }
  }
  return null;
}

// === EXPORT / IMPORT ===
export async function exportData() {
  const h = await loadHistory();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), history: h }, null, 2);
}

// Renvoie { ok: true, count } ou { ok: false, error }
export async function importData(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    let history;
    // Accepte {version,history} ou directement un array
    if (Array.isArray(parsed)) history = parsed;
    else if (parsed && Array.isArray(parsed.history)) history = parsed.history;
    else return { ok: false, error: 'Format non reconnu (attendu: {version, history:[...]} ou un array)' };
    // Validation minimale
    for (const e of history) {
      if (!e.date || !e.sessionTitle || !Array.isArray(e.exos)) {
        return { ok: false, error: 'Une entrée est invalide (date/sessionTitle/exos manquants)' };
      }
    }
    await saveHistory(history);
    return { ok: true, count: history.length };
  } catch (err) {
    return { ok: false, error: 'JSON invalide : ' + err.message };
  }
}

// === ÉDITION / SUPPRESSION D'UNE ENTRÉE HISTORIQUE ===
// L'index est calculé sur l'ordre stocké (chronologique). HistoryScreen affiche reverse,
// donc on convertit côté UI : storeIdx = history.length - 1 - displayIdx.

export async function updateHistoryEntry(storeIdx, newEntry) {
  const h = await loadHistory();
  if (storeIdx < 0 || storeIdx >= h.length) return false;
  h[storeIdx] = newEntry;
  await saveHistory(h);
  return true;
}

export async function deleteHistoryEntry(storeIdx) {
  const h = await loadHistory();
  if (storeIdx < 0 || storeIdx >= h.length) return false;
  h.splice(storeIdx, 1);
  await saveHistory(h);
  return true;
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

// === MARCHE ===
// Log des marches : array d'objets { date: 'YYYY-MM-DD', minutes: 120, note?: '' }
export async function loadWalkLog() {
  try { const raw = await AsyncStorage.getItem(WALK_LOG_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function saveWalkLog(log) { await AsyncStorage.setItem(WALK_LOG_KEY, JSON.stringify(log)); }

export async function logWalk({ date, minutes, note }) {
  const log = await loadWalkLog();
  const idx = log.findIndex(e => e.date === date);
  const entry = { date, minutes: Number(minutes) || 0, note: note || '' };
  if (idx >= 0) log[idx] = entry;
  else log.push(entry);
  log.sort((a, b) => a.date.localeCompare(b.date));
  await saveWalkLog(log);
}

export async function deleteWalkEntry(date) {
  const log = await loadWalkLog();
  const next = log.filter(e => e.date !== date);
  await saveWalkLog(next);
}

// Date de démarrage du plan (par défaut celle hardcodée dans walkingPlan.js)
export async function loadWalkStart() {
  try { return (await AsyncStorage.getItem(WALK_START_KEY)) || null; }
  catch { return null; }
}
export async function saveWalkStart(isoDate) {
  await AsyncStorage.setItem(WALK_START_KEY, isoDate);
}

// Pesées : array d'objets { date, kg }
export async function loadWeightLog() {
  try { const raw = await AsyncStorage.getItem(WEIGHT_LOG_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function logWeight({ date, kg }) {
  const log = await loadWeightLog();
  const idx = log.findIndex(e => e.date === date);
  const entry = { date, kg: Number(kg) };
  if (idx >= 0) log[idx] = entry;
  else log.push(entry);
  log.sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(log));
  return log;
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
