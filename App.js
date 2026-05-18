import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Platform, Image, Dimensions } from 'react-native';
import { EXO_IMAGES, EXO_RATIOS } from './src/exoImages';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { S, COLORS } from './src/styles';
import { MORNING, EVENING, SESSIONS, OFF_DAY } from './src/data';
import { ExoIcon, ExoThumb, ExoHero } from './src/icons';
import * as Clipboard from 'expo-clipboard';
import {
  loadHistory, lastMaxFor, lastWeightsFor,
  loadDraft, saveDraft, clearDraft, commitSession,
  exportData, importData,
  updateHistoryEntry, deleteHistoryEntry,
  loadWalkLog, logWalk, deleteWalkEntry,
  loadWalkStart, saveWalkStart,
  loadWeightLog, logWeight,
} from './src/storage';
import {
  WALKING_PLAN, currentWeekNumber, getWeek, getBlock,
  targetForToday, weekTotalMinutes, formatDuration, dayLabel, dayKeyFromDate,
} from './src/walkingPlan';
import * as Strava from './src/strava';
import { LineChart } from './src/Chart';

// Contexte pour ouvrir la lightbox depuis n'importe où dans l'arbre.
const LightboxCtx = createContext(() => {});

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function TimelineRow({ time, text, last }) {
  return (
    <View style={[S.timelineRow, last && S.timelineRowLast]}>
      <Text style={S.timelineTime}>{time}</Text>
      <Text style={S.timelineText}>{text}</Text>
    </View>
  );
}

function ExoRow({ exo, last, lastMax }) {
  const openLightbox = useContext(LightboxCtx);
  return (
    <View style={[S.exoRow, last && S.exoRowLast]}>
      <Pressable onPress={() => openLightbox(exo.slug)} android_ripple={{ color: COLORS.soft, borderless: true }}>
        <View style={S.exoThumbCol}>
          <ExoThumb slug={exo.slug} iconSize={32} />
        </View>
      </Pressable>
      <View style={S.exoInfo}>
        <Text style={S.exoName}>{exo.name}</Text>
        <Text style={S.exoMeta}>{exo.meta}</Text>
        {exo.warn && <Text style={S.exoWarn}>⚠ {exo.warn}</Text>}
        {lastMax != null && <Text style={S.exoLast}>Dernier max : {lastMax} kg</Text>}
      </View>
    </View>
  );
}

// ============ TODAY ============

function TodayScreen({ onStartSession, draftSessionDay }) {
  const todayDay = new Date().getDay();
  const session = SESSIONS[todayDay];
  const [maxes, setMaxes] = useState({});

  useEffect(() => {
    if (!session) return;
    (async () => {
      const m = {};
      for (const ex of session.exos) {
        const last = await lastMaxFor(ex.slug);
        if (last) m[ex.slug] = last.max;
      }
      setMaxes(m);
    })();
  }, [session]);

  return (
    <ScrollView contentContainerStyle={S.scroll}>
      <Text style={S.sectionTitle}>Matin</Text>
      <View style={S.card}>
        {MORNING.map((r, i) => (
          <TimelineRow key={i} time={r.time} text={r.text} last={i === MORNING.length - 1} />
        ))}
      </View>

      {session ? (
        <>
          <Text style={S.sectionTitle}>Séance — {session.title}</Text>
          <View style={S.card}>
            {session.exos.map((ex, i) => (
              <ExoRow key={i} exo={ex} last={i === session.exos.length - 1} lastMax={maxes[ex.slug]} />
            ))}
          </View>
          <Pressable
            style={S.logFinishBtn}
            onPress={() => onStartSession(todayDay)}
            android_ripple={{ color: '#333' }}
          >
            <Text style={S.logFinishBtnText}>
              {draftSessionDay === todayDay ? 'Reprendre la séance en cours' : 'Commencer la séance'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={S.sectionTitle}>{OFF_DAY.title}</Text>
          <View style={S.card}>
            {OFF_DAY.items.map((ex, i) => (
              <ExoRow key={i} exo={ex} last={i === OFF_DAY.items.length - 1} />
            ))}
          </View>
        </>
      )}

      <Text style={S.sectionTitle}>Soir</Text>
      <View style={S.card}>
        {EVENING.map((r, i) => (
          <TimelineRow key={i} time={r.time} text={r.text} last={i === EVENING.length - 1} />
        ))}
      </View>
    </ScrollView>
  );
}

// ============ TRAINING PICKER ============

function TrainingPickerScreen({ onPickSession, draftSessionDay }) {
  return (
    <ScrollView contentContainerStyle={S.scroll}>
      <Text style={S.sectionTitle}>Choisis ta séance</Text>
      {[1, 3, 5].map(di => {
        const s = SESSIONS[di];
        const inProgress = draftSessionDay === di;
        const exosList = s.exos.filter(e => e.sets).map(e => e.name).join(' · ');
        return (
          <Pressable
            key={di}
            onPress={() => onPickSession(di)}
            android_ripple={{ color: COLORS.soft }}
          >
            <View style={[S.pickerCard, inProgress && S.pickerInProgress]}>
              {inProgress && <Text style={S.pickerBadge}>EN COURS</Text>}
              <Text style={S.pickerDay}>{s.day}</Text>
              <Text style={S.pickerTitle}>{s.title}</Text>
              <Text style={S.pickerExos}>{exosList}</Text>
              <Text style={S.pickerCta}>
                {inProgress ? 'Reprendre →' : 'Commencer →'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ============ SESSION LOG (saisie groupée) ============

function SessionLogScreen({ sessionDay, onExit, onSaved, insets }) {
  const session = SESSIONS[sessionDay];
  const exosToLog = session.exos.filter(e => e.sets);

  const [weights, setWeights] = useState(null);
  const [notes, setNotes] = useState({});
  const [globalNote, setGlobalNote] = useState('');
  const [lastMaxes, setLastMaxes] = useState({});
  const [lastSetsByExo, setLastSetsByExo] = useState({}); // {slug: ['80','85','85','80']}
  const [confirm, setConfirm] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initialized = useRef(false);

  // Init : charger brouillon ou créer structure vide + derniers maxes + derniers poids/set
  useEffect(() => {
    (async () => {
      const draft = await loadDraft();
      if (draft && draft.sessionDay === sessionDay) {
        setWeights(draft.weights || {});
        setNotes(draft.notes || {});
        setGlobalNote(draft.globalNote || '');
      } else {
        const w = {};
        exosToLog.forEach(ex => { w[ex.slug] = Array(ex.sets).fill(''); });
        setWeights(w);
      }
      const m = {};
      const lw = {};
      for (const ex of exosToLog) {
        const last = await lastMaxFor(ex.slug);
        if (last) m[ex.slug] = last.max;
        const lastW = await lastWeightsFor(ex.slug);
        if (lastW) lw[ex.slug] = lastW;
      }
      setLastMaxes(m);
      setLastSetsByExo(lw);
      initialized.current = true;
    })();
  }, [sessionDay]);

  // Auto-save brouillon à chaque changement
  useEffect(() => {
    if (!initialized.current || weights === null) return;
    saveDraft({
      sessionDay, sessionTitle: session.title,
      startedAt: new Date().toISOString(),
      weights, notes, globalNote,
    });
  }, [weights, notes, globalNote]);

  if (weights === null) {
    return <View style={{ flex: 1 }}><Text style={S.empty}>Chargement…</Text></View>;
  }

  const filled = exosToLog.filter(ex => (weights[ex.slug] || []).some(w => w)).length;
  const total = exosToLog.length;

  const setWeight = (slug, idx, v) => {
    setWeights(prev => {
      const arr = [...(prev[slug] || [])];
      arr[idx] = v.replace(',', '.');
      return { ...prev, [slug]: arr };
    });
  };

  const setNote = (slug, v) => {
    setNotes(prev => ({ ...prev, [slug]: v }));
  };

  const onFinish = async () => {
    const exos = exosToLog
      .filter(ex => (weights[ex.slug] || []).some(w => w))
      .map(ex => ({
        slug: ex.slug, name: ex.name,
        weights: weights[ex.slug].map(w => w || ''),
      }));
    const noteParts = [];
    Object.entries(notes).forEach(([slug, n]) => {
      if (n && n.trim()) {
        const exo = exosToLog.find(e => e.slug === slug);
        noteParts.push(`${exo ? exo.name : slug}: ${n.trim()}`);
      }
    });
    if (globalNote.trim()) noteParts.push(`Général: ${globalNote.trim()}`);
    await commitSession({
      sessionTitle: session.title, exos,
      notes: noteParts.join('\n'),
    });
    await clearDraft();
    setConfirm(false);
    onSaved();
  };

  const onDiscard = async () => {
    await clearDraft();
    setConfirmDiscard(false);
    onExit();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={S.logHeader}>
        <Pressable onPress={onExit} style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
          <Text style={{ color: COLORS.muted, fontSize: 14 }}>← Quitter</Text>
        </Pressable>
        <Text style={S.logTitle}>{session.title}</Text>
        <Text style={S.logProgress}>
          {filled}/{total} exos remplis · brouillon sauvegardé automatiquement
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {session.exos.map((ex, i) => (
          <ExoLogBlock
            key={i}
            exo={ex}
            weights={weights[ex.slug] || []}
            lastWeights={lastSetsByExo[ex.slug]}
            note={notes[ex.slug] || ''}
            lastMax={lastMaxes[ex.slug]}
            onWeightChange={(idx, v) => setWeight(ex.slug, idx, v)}
            onNoteChange={(v) => setNote(ex.slug, v)}
          />
        ))}

        <Text style={S.sectionTitle}>Notes générales</Text>
        <TextInput
          style={[S.logExoNote, { minHeight: 80 }]}
          value={globalNote}
          onChangeText={setGlobalNote}
          placeholder="Énergie, douleur, contexte..."
          placeholderTextColor={COLORS.muted}
          multiline
        />

        <Pressable onPress={() => setConfirmDiscard(true)} style={S.logCancelBtn}>
          <Text style={S.logCancelBtnText}>Abandonner la séance (efface le brouillon)</Text>
        </Pressable>
      </ScrollView>

      <View style={[S.logFooter, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          style={S.logFinishBtn}
          onPress={() => setConfirm(true)}
          android_ripple={{ color: '#333' }}
        >
          <Text style={S.logFinishBtnText}>Terminer la séance ({filled}/{total})</Text>
        </Pressable>
      </View>

      {confirm && (
        <ConfirmModal
          title="Terminer la séance ?"
          text={filled < total
            ? `Tu as rempli ${filled} exos sur ${total}. Tu peux quand même enregistrer — les exos vides ne seront pas sauvés.`
            : `${filled} exos remplis. Prêt à enregistrer ?`}
          cancelLabel="Continuer la séance"
          confirmLabel="Enregistrer"
          onCancel={() => setConfirm(false)}
          onConfirm={onFinish}
        />
      )}
      {confirmDiscard && (
        <ConfirmModal
          title="Abandonner la séance ?"
          text="Le brouillon sera effacé. Rien ne sera enregistré dans l'historique."
          cancelLabel="Garder"
          confirmLabel="Abandonner"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onDiscard}
        />
      )}
    </View>
  );
}

function ExoLogBlock({ exo, weights, lastWeights, note, lastMax, onWeightChange, onNoteChange }) {
  const isCardio = !!exo.cardio;
  const openLightbox = useContext(LightboxCtx);
  return (
    <View style={S.logExoBlock}>
      <View style={S.logExoHeader}>
        <Pressable onPress={() => openLightbox(exo.slug)} android_ripple={{ color: COLORS.soft, borderless: true }}>
          <View style={S.exoThumbCol}>
            <ExoThumb slug={exo.slug} iconSize={28} />
          </View>
        </Pressable>
        <Text style={S.logExoName} numberOfLines={2}>{exo.name}</Text>
      </View>
      <Text style={S.logExoMeta}>{exo.meta}</Text>
      {exo.warn && <Text style={S.logExoWarn}>⚠ {exo.warn}</Text>}
      {lastMax != null && (
        <Text style={[S.logExoMeta, { color: COLORS.ok }]}>Dernier max : {lastMax} kg</Text>
      )}

      {isCardio ? (
        <Text style={S.cardioBadge}>Cardio · pas de poids à saisir</Text>
      ) : (
        <>
          <View style={S.logSetsRow}>
            {weights.map((w, i) => {
              const filled = !!w;
              const last = lastWeights && lastWeights[i];
              const ph = last ? last : 'kg';
              return (
                <View key={i} style={S.logSetCell}>
                  <Text style={S.logSetLabel}>S{i + 1}</Text>
                  <TextInput
                    style={[S.logSetInput, filled && S.logSetInputFilled]}
                    value={w}
                    onChangeText={(v) => onWeightChange(i, v)}
                    placeholder={ph}
                    placeholderTextColor={COLORS.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
              );
            })}
          </View>
          <TextInput
            style={S.logExoNote}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Note exo (optionnel)"
            placeholderTextColor={COLORS.muted}
            multiline
          />
        </>
      )}
    </View>
  );
}

// ============ LIGHTBOX ============

function Lightbox({ slug, onClose, exoName }) {
  const img = EXO_IMAGES[slug];
  if (!img) return null;
  const ratio = EXO_RATIOS[slug] || 1.5;
  return (
    <Pressable style={S.lightboxOverlay} onPress={onClose}>
      <Pressable style={S.lightboxClose} onPress={onClose}>
        <Text style={S.lightboxCloseText}>×</Text>
      </Pressable>
      <Image
        source={img}
        style={{ width: '100%', aspectRatio: ratio, maxHeight: '85%' }}
        resizeMode="contain"
      />
      {exoName ? <Text style={S.lightboxCaption}>{exoName}</Text> : null}
    </Pressable>
  );
}

// ============ CONFIRM MODAL ============

function ConfirmModal({ title, text, cancelLabel, confirmLabel, onCancel, onConfirm }) {
  return (
    <View style={S.modalOverlay}>
      <View style={S.modalCard}>
        <Text style={S.modalTitle}>{title}</Text>
        <Text style={S.modalText}>{text}</Text>
        <View style={S.modalBtns}>
          <Pressable style={S.modalBtnGhost} onPress={onCancel} android_ripple={{ color: COLORS.soft }}>
            <Text style={S.modalBtnGhostText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable style={S.modalBtnPrimary} onPress={onConfirm} android_ripple={{ color: '#333' }}>
            <Text style={S.modalBtnPrimaryText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ============ STRAVA SECTION (dans Marche) ============

function StravaSection({ onSyncedWalk }) {
  const [creds, setCreds] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [activities, setActivities] = useState(null);
  const [msg, setMsg] = useState(null);

  const refresh = async () => {
    setCreds(await Strava.loadCreds());
    setHasToken(!!(await Strava.loadToken()));
  };
  useEffect(() => { refresh(); }, []);

  const onSaveCreds = async () => {
    await Strava.saveCreds({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
    setSetupOpen(false);
    setClientId(''); setClientSecret('');
    await refresh();
    setMsg('Identifiants enregistrés');
    setTimeout(() => setMsg(null), 1800);
  };

  const onConnect = async () => {
    setBusy(true);
    const r = await Strava.connect();
    setBusy(false);
    if (r.ok) { setMsg('Connecté à Strava'); await refresh(); }
    else setMsg(r.error);
    setTimeout(() => setMsg(null), 2500);
  };

  const onSync = async () => {
    setBusy(true);
    setActivities(null);
    const r = await Strava.fetchTodayWalkActivities();
    setBusy(false);
    if (!r.ok) { setMsg(r.error); setTimeout(() => setMsg(null), 2500); return; }
    setActivities(r.activities);
    if (r.activities.length === 0) {
      setMsg('Aucune marche/randonnée trouvée aujourd\'hui');
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const onImportActivity = async (a) => {
    await onSyncedWalk(a);
    setMsg('Marche importée');
    setTimeout(() => setMsg(null), 1800);
    setActivities(null);
  };

  const onDisconnect = async () => {
    await Strava.clearCreds();
    setActivities(null);
    await refresh();
    setMsg('Déconnecté');
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <View style={S.card}>
      <Text style={[S.sectionTitle, { marginTop: 0 }]}>Strava</Text>

      {!creds && !setupOpen && (
        <>
          <Text style={[S.exoMeta, { marginBottom: 8 }]}>
            Pour synchroniser tes activités automatiquement, crée une app Strava (gratuit, 2 min) :
            {'\n'}1. va sur strava.com/settings/api
            {'\n'}2. récupère ton Client ID + Client Secret
          </Text>
          <Pressable style={[S.walkHeroBtn, { backgroundColor: COLORS.ink }]} onPress={() => setSetupOpen(true)}>
            <Text style={S.walkHeroBtnText}>Configurer Strava</Text>
          </Pressable>
        </>
      )}

      {setupOpen && (
        <>
          <Text style={[S.logSetLabel, { marginBottom: 4, textAlign: 'left' }]}>Client ID</Text>
          <TextInput
            style={S.logSetInput}
            value={clientId}
            onChangeText={setClientId}
            placeholder="ex: 123456"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <Text style={[S.logSetLabel, { marginTop: 8, marginBottom: 4, textAlign: 'left' }]}>Client Secret</Text>
          <TextInput
            style={S.logSetInput}
            value={clientSecret}
            onChangeText={setClientSecret}
            placeholder="chaîne hex 40 caractères"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            secureTextEntry
          />
          <View style={[S.modalBtns, { marginTop: 12 }]}>
            <Pressable style={S.modalBtnGhost} onPress={() => setSetupOpen(false)}>
              <Text style={S.modalBtnGhostText}>Annuler</Text>
            </Pressable>
            <Pressable style={S.modalBtnPrimary} onPress={onSaveCreds} disabled={!clientId.trim() || !clientSecret.trim()}>
              <Text style={S.modalBtnPrimaryText}>Enregistrer</Text>
            </Pressable>
          </View>
          <Text style={[S.exoMeta, { marginTop: 10, fontSize: 11 }]}>
            Redirect URI à mettre dans Strava : routinemuscu://strava
          </Text>
        </>
      )}

      {creds && !hasToken && (
        <>
          <Text style={[S.exoMeta, { marginBottom: 8 }]}>App configurée (client ID {creds.clientId}). Plus qu'à autoriser :</Text>
          <Pressable style={[S.walkHeroBtn, { backgroundColor: '#fc4c02' }]} onPress={onConnect} disabled={busy}>
            <Text style={[S.walkHeroBtnText, { color: '#fff' }]}>{busy ? '…' : 'Connecter à Strava'}</Text>
          </Pressable>
          <Pressable style={S.logCancelBtn} onPress={onDisconnect}>
            <Text style={S.logCancelBtnText}>Effacer la config</Text>
          </Pressable>
        </>
      )}

      {creds && hasToken && (
        <>
          <Text style={[S.exoMeta, { marginBottom: 8, color: COLORS.ok }]}>✓ Connecté à Strava</Text>
          <Pressable style={[S.walkHeroBtn, { backgroundColor: COLORS.ink }]} onPress={onSync} disabled={busy}>
            <Text style={S.walkHeroBtnText}>{busy ? 'Sync…' : 'Synchroniser aujourd\'hui'}</Text>
          </Pressable>
          {activities && activities.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {activities.map(a => (
                <Pressable key={a.id} style={S.pickerCard} onPress={() => onImportActivity(a)}>
                  <Text style={S.pickerTitle}>{a.name}</Text>
                  <Text style={S.exoMeta}>
                    {formatDuration(a.duration_min)} · {a.distance_km} km · +{a.elev_m} m
                    {a.kcal ? ` · ${a.kcal} kcal` : ''}
                    {a.hr_avg ? ` · FC moy ${a.hr_avg}` : ''}
                  </Text>
                  <Text style={S.pickerCta}>Importer comme marche du jour →</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable style={S.logCancelBtn} onPress={onDisconnect}>
            <Text style={S.logCancelBtnText}>Déconnecter</Text>
          </Pressable>
        </>
      )}

      {msg && (
        <View style={[S.toast, { bottom: 100 }]}><Text style={S.toastText}>{msg}</Text></View>
      )}
    </View>
  );
}

// ============ COURBE SCREEN ============

function CourbeScreen({ refreshKey }) {
  const [walkLog, setWalkLog] = useState([]);
  const [weightLog, setWeightLog] = useState([]);
  const [historyLog, setHistoryLog] = useState([]);
  const [startDate, setStartDate] = useState(WALKING_PLAN.startDate);

  useEffect(() => {
    (async () => {
      const s = await loadWalkStart();
      if (s) setStartDate(s);
      setWalkLog(await loadWalkLog());
      setWeightLog(await loadWeightLog());
      setHistoryLog(await loadHistory());
    })();
  }, [refreshKey]);

  // Données poids
  const weightData = weightLog
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ x: e.date, y: Number(e.kg) }));

  // Volume marche par semaine du plan (h)
  const weeklyVolume = (() => {
    const m = new Map(); // weekNum -> minutes
    walkLog.forEach(e => {
      const w = currentWeekNumber(startDate, new Date(e.date + 'T12:00:00'));
      if (!w) return;
      m.set(w, (m.get(w) || 0) + (e.minutes || 0));
    });
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wn, min]) => ({ x: 'S' + wn, y: +(min / 60).toFixed(1) }));
  })();

  // Volume muscu : nombre de séances par semaine ISO (8 dernières)
  const muscuPerWeek = (() => {
    const m = new Map();
    historyLog.forEach(e => {
      const d = new Date(e.date);
      const yw = isoYearWeek(d);
      m.set(yw, (m.get(yw) || 0) + 1);
    });
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([yw, n]) => ({ x: yw.slice(5), y: n })); // affiche juste "W23"
  })();

  // Max poids sur un exo récurrent (ex: leg-press) sur le temps
  const legPressProg = (() => {
    const pts = [];
    historyLog.forEach(e => {
      const ex = e.exos.find(x => x.slug === 'leg-press');
      if (ex && ex.weights) {
        const ws = ex.weights.filter(w => w).map(Number);
        if (ws.length) pts.push({ x: e.date.slice(5, 10), y: Math.max(...ws) });
      }
    });
    return pts;
  })();

  const screenW = Dimensions.get('window').width - 56;

  return (
    <ScrollView contentContainerStyle={S.scroll}>
      <Text style={S.sectionTitle}>Poids ({weightLog.length} pesées)</Text>
      <View style={S.card}>
        <LineChart
          data={weightData}
          width={screenW}
          targetY={WALKING_PLAN.goals.targetWeightKgMedian}
          color="#0f1115"
          fillUnderColor="rgba(15,17,21,0.05)"
          xFormat={(x) => x.slice(5)}
          emptyLabel="Pèse-toi dans l'onglet Marche pour voir la courbe"
        />
      </View>

      <Text style={S.sectionTitle}>Volume marche / semaine (heures)</Text>
      <View style={S.card}>
        <LineChart
          data={weeklyVolume}
          width={screenW}
          color={COLORS.ok}
          fillUnderColor="rgba(26,122,58,0.10)"
          emptyLabel="Log au moins 2 marches sur 2 semaines"
        />
      </View>

      <Text style={S.sectionTitle}>Séances muscu / semaine</Text>
      <View style={S.card}>
        <LineChart
          data={muscuPerWeek}
          width={screenW}
          color={COLORS.ink}
          emptyLabel="Pas encore de séances muscu enregistrées"
        />
      </View>

      <Text style={S.sectionTitle}>Progression presse à cuisses (max kg)</Text>
      <View style={S.card}>
        <LineChart
          data={legPressProg}
          width={screenW}
          color="#b25400"
          emptyLabel="Pas encore 2 séances avec la presse à cuisses"
        />
      </View>
    </ScrollView>
  );
}

function isoYearWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ============ MARCHE (plan 32 sem) ============

function MarcheScreen({ refreshKey, onChanged }) {
  const [startDate, setStartDate] = useState(WALKING_PLAN.startDate);
  const [walkLog, setWalkLog] = useState([]);
  const [weightLog, setWeightLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logMinutes, setLogMinutes] = useState('');
  const [logNote, setLogNote] = useState('');
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const s = await loadWalkStart();
      if (s) setStartDate(s);
      const log = await loadWalkLog();
      setWalkLog(log);
      const w = await loadWeightLog();
      setWeightLog(w);
    })();
  }, [refreshKey]);

  const flash = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1800);
  };

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const weekNum = currentWeekNumber(startDate, today);
  const week = weekNum ? getWeek(weekNum) : null;
  const block = week ? getBlock(week.block) : null;
  const tgt = weekNum ? targetForToday(weekNum, today) : null;

  const todayLogged = walkLog.find(e => e.date === todayIso);

  // Progression de la semaine en cours : on calcule lundi-dimanche de la semaine du `today`
  const weekStart = new Date(today);
  const dow = today.getDay(); // 0=dim
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  weekStart.setDate(today.getDate() + offsetToMon);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const targetTotalMin = weekNum ? weekTotalMinutes(weekNum) : 0;
  const doneTotalMin = weekDays.reduce((sum, d) => {
    const iso = d.toISOString().slice(0, 10);
    const entry = walkLog.find(e => e.date === iso);
    return sum + (entry ? entry.minutes : 0);
  }, 0);
  const progressPct = targetTotalMin ? Math.min(100, (doneTotalMin / targetTotalMin) * 100) : 0;

  const lastWeight = weightLog.length ? weightLog[weightLog.length - 1] : null;
  const firstWeight = weightLog.length ? weightLog[0] : null;
  const delta = lastWeight && firstWeight ? lastWeight.kg - firstWeight.kg : 0;

  const onLogWalk = async () => {
    if (!logMinutes.trim()) return;
    await logWalk({ date: todayIso, minutes: Number(logMinutes), note: logNote.trim() });
    setLogOpen(false); setLogMinutes(''); setLogNote('');
    flash('Marche enregistrée');
    const l = await loadWalkLog();
    setWalkLog(l);
    onChanged && onChanged();
  };

  const onLogWeight = async () => {
    if (!weightKg.trim()) return;
    const next = await logWeight({ date: todayIso, kg: weightKg.replace(',', '.') });
    setWeightOpen(false); setWeightKg('');
    setWeightLog(next);
    flash('Pesée enregistrée');
  };

  if (!weekNum) {
    return (
      <ScrollView contentContainerStyle={S.scroll}>
        <Text style={S.empty}>
          Plan terminé ou pas encore commencé.{'\n'}
          Date de démarrage actuelle : {startDate}
        </Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={S.scroll}>
        {/* Aujourd'hui */}
        <Text style={S.sectionTitle}>Aujourd'hui · {tgt.dayLabel}</Text>
        <View style={S.walkHero}>
          <Text style={S.walkHeroDay}>{tgt.dayLabel}</Text>
          <Text style={S.walkHeroDuration}>{formatDuration(tgt.minutes)}</Text>
          <Text style={S.walkHeroSpot}>{tgt.label}</Text>
          <Text style={S.walkHeroIntensity}>Marche en forêt · {tgt.intensityLabel}</Text>
          {tgt.note && <Text style={S.walkHeroNote}>⚠ {tgt.note}</Text>}
          {tgt.vest && <Text style={S.walkHeroVest}>Gilet lesté : {tgt.vest} kg</Text>}
          <Pressable
            style={[S.walkHeroBtn, todayLogged && S.walkHeroBtnDone]}
            onPress={() => {
              if (todayLogged) {
                setLogMinutes(String(todayLogged.minutes));
                setLogNote(todayLogged.note || '');
              } else {
                setLogMinutes(String(tgt.minutes));
              }
              setLogOpen(true);
            }}
            android_ripple={{ color: COLORS.soft }}
          >
            <Text style={[S.walkHeroBtnText, todayLogged && S.walkHeroBtnDoneText]}>
              {todayLogged ? `✓ Fait (${formatDuration(todayLogged.minutes)}) — modifier` : 'Marquer fait'}
            </Text>
          </Pressable>
        </View>

        {/* Semaine en cours */}
        <Text style={S.sectionTitle}>
          Semaine {weekNum} / 32 · Bloc {block.id} — {block.name}
        </Text>
        <View style={S.card}>
          <Text style={S.exoMeta}>{block.objective}</Text>
          <Text style={[S.exoMeta, { marginTop: 6 }]}>
            {formatDuration(doneTotalMin)} fait / {formatDuration(targetTotalMin)} prévu cette semaine
          </Text>
          <View style={S.weekBar}>
            <View style={[S.weekBarFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={{ marginTop: 10 }}>
            {weekDays.map((d, i) => {
              const key = dayKeyFromDate(d);
              const iso = d.toISOString().slice(0, 10);
              const targetMin = week.dur[key];
              const entry = walkLog.find(e => e.date === iso);
              const isToday = iso === todayIso;
              const isPast = d < today && !isToday;
              return (
                <View key={i} style={[S.dayRow, isToday && S.dayRowToday]}>
                  <Text style={S.dayName}>{dayLabel(key).slice(0, 3)}</Text>
                  <Text style={S.dayTarget}>
                    {WALKING_PLAN.template[key].label} · {formatDuration(targetMin)}
                  </Text>
                  {entry ? (
                    <Text style={S.dayDone}>{formatDuration(entry.minutes)} ✓</Text>
                  ) : isPast ? (
                    <Text style={S.dayMissed}>—</Text>
                  ) : (
                    <Text style={S.dayMissed}>{formatDuration(targetMin)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Strava sync */}
        <StravaSection
          onSyncedWalk={async (a) => {
            const note = `Strava: ${a.distance_km} km · +${a.elev_m} m`
              + (a.kcal ? ` · ${a.kcal} kcal` : '')
              + (a.hr_avg ? ` · FC ${a.hr_avg}` : '');
            await logWalk({
              date: todayIso,
              minutes: a.duration_min,
              note,
            });
            const l = await loadWalkLog();
            setWalkLog(l);
            onChanged && onChanged();
          }}
        />

        {/* Poids */}
        <Text style={S.sectionTitle}>Poids</Text>
        <View style={S.weightCard}>
          <View style={S.weightLine}>
            <Text style={S.weightCurrent}>
              {lastWeight ? `${lastWeight.kg} kg` : '— kg'}
            </Text>
            <Text style={S.weightTarget}>
              cible {WALKING_PLAN.goals.targetWeightKgMedian} kg
            </Text>
          </View>
          {lastWeight && firstWeight && weightLog.length > 1 && (
            <Text style={S.weightDelta}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg depuis le {firstWeight.date}
            </Text>
          )}
          <Pressable
            style={[S.walkHeroBtn, { backgroundColor: COLORS.ink, marginTop: 12 }]}
            onPress={() => setWeightOpen(true)}
            android_ripple={{ color: '#333' }}
          >
            <Text style={S.walkHeroBtnText}>Peser aujourd'hui</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal log marche */}
      {logOpen && (
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Marche du {todayIso}</Text>
            <Text style={S.modalText}>
              Cible : {formatDuration(tgt.minutes)} · {tgt.label}
            </Text>
            <Text style={[S.logSetLabel, { marginBottom: 4 }]}>Durée réalisée (min)</Text>
            <TextInput
              style={S.logSetInput}
              value={logMinutes}
              onChangeText={setLogMinutes}
              placeholder="minutes"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
            />
            <TextInput
              style={[S.logExoNote, { minHeight: 60, marginTop: 10 }]}
              value={logNote}
              onChangeText={setLogNote}
              placeholder="Note (terrain, ressenti…)"
              placeholderTextColor={COLORS.muted}
              multiline
            />
            <View style={[S.modalBtns, { marginTop: 16 }]}>
              <Pressable
                style={S.modalBtnGhost}
                onPress={() => { setLogOpen(false); setLogMinutes(''); setLogNote(''); }}
                android_ripple={{ color: COLORS.soft }}
              >
                <Text style={S.modalBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={S.modalBtnPrimary} onPress={onLogWalk} android_ripple={{ color: '#333' }}>
                <Text style={S.modalBtnPrimaryText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Modal pesée */}
      {weightOpen && (
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Pesée du {todayIso}</Text>
            <Text style={[S.logSetLabel, { marginBottom: 4 }]}>Poids (kg)</Text>
            <TextInput
              style={S.logSetInput}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="kg"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={[S.modalBtns, { marginTop: 16 }]}>
              <Pressable
                style={S.modalBtnGhost}
                onPress={() => { setWeightOpen(false); setWeightKg(''); }}
                android_ripple={{ color: COLORS.soft }}
              >
                <Text style={S.modalBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={S.modalBtnPrimary} onPress={onLogWeight} android_ripple={{ color: '#333' }}>
                <Text style={S.modalBtnPrimaryText}>Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {toastMsg && (
        <View style={S.toast}><Text style={S.toastText}>{toastMsg}</Text></View>
      )}
    </>
  );
}

// ============ HISTORY ============

function HistoryScreen({ historyVersion, onChanged, onOpenEntry }) {
  const [list, setList] = useState([]);
  const [storeLen, setStoreLen] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    (async () => {
      const h = await loadHistory();
      setStoreLen(h.length);
      setList(h.slice().reverse());
    })();
  }, [historyVersion]);

  const flash = (msg, ms = 2200) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), ms);
  };

  const onExport = async () => {
    const json = await exportData();
    try {
      await Clipboard.setStringAsync(json);
      flash(`${list.length} séances copiées`);
    } catch {
      flash('Copie impossible');
    }
  };

  const onImportConfirm = async () => {
    const res = await importData(importText.trim());
    if (res.ok) {
      setImportOpen(false); setImportText('');
      flash(`${res.count} séances importées`);
      onChanged && onChanged();
    } else {
      flash(res.error, 4000);
    }
  };

  const IOBar = (
    <View style={S.ioBar}>
      <Pressable style={S.ioBtn} onPress={onExport} android_ripple={{ color: COLORS.soft }}>
        <Text style={S.ioBtnText}>Exporter (presse-papiers)</Text>
      </Pressable>
      <Pressable style={S.ioBtn} onPress={() => setImportOpen(true)} android_ripple={{ color: COLORS.soft }}>
        <Text style={S.ioBtnText}>Importer</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      {list.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Text style={S.empty}>
            Aucune séance enregistrée pour l'instant.{'\n'}
            Termine ta première séance pour la voir ici.
          </Text>
          {IOBar}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={S.scroll}>
          <View style={S.card}>
            {list.map((entry, idx) => {
              const dt = new Date(entry.date);
              const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
              const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const exosLogged = entry.exos.filter(e => e.weights && e.weights.some(w => w));
              const summary = exosLogged.map(e => `${e.name} ${e.weights.filter(w => w).join('/')}kg`).join(' · ');
              const storeIdx = storeLen - 1 - idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => onOpenEntry(storeIdx)}
                  android_ripple={{ color: COLORS.soft }}
                >
                  <View style={S.historyRow}>
                    <Text style={S.historyDate}>{dateStr} · {timeStr}  ›</Text>
                    <Text style={S.historySession}>{entry.sessionTitle}</Text>
                    <Text style={S.historyExos}>{summary || '(aucun poids saisi)'}</Text>
                    {entry.notes ? <Text style={S.historyNotes}>{entry.notes}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {IOBar}
        </ScrollView>
      )}

      {toastMsg && (
        <View style={S.toast}><Text style={S.toastText}>{toastMsg}</Text></View>
      )}

      {importOpen && (
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Importer un JSON</Text>
            <Text style={S.modalText}>
              Colle ici un export précédent. L'historique actuel sera REMPLACÉ.
            </Text>
            <TextInput
              style={[S.logExoNote, { minHeight: 120, marginBottom: 16 }]}
              value={importText}
              onChangeText={setImportText}
              placeholder='{"version":1,"history":[...]}'
              placeholderTextColor={COLORS.muted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={S.modalBtns}>
              <Pressable style={S.modalBtnGhost} onPress={() => { setImportOpen(false); setImportText(''); }} android_ripple={{ color: COLORS.soft }}>
                <Text style={S.modalBtnGhostText}>Annuler</Text>
              </Pressable>
              <Pressable style={S.modalBtnPrimary} onPress={onImportConfirm} android_ripple={{ color: '#333' }} disabled={!importText.trim()}>
                <Text style={S.modalBtnPrimaryText}>Remplacer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

// ============ HISTORY DETAIL (édition + suppression) ============

function HistoryDetailScreen({ storeIdx, onExit, onChanged, insets }) {
  const [entry, setEntry] = useState(null);
  const [weights, setWeights] = useState({}); // {slug: ['80','85',...]}
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Charger l'entrée
  useEffect(() => {
    (async () => {
      const h = await loadHistory();
      const e = h[storeIdx];
      if (!e) { onExit(); return; }
      setEntry(e);
      const w = {};
      e.exos.forEach(ex => { w[ex.slug] = ex.weights.slice(); });
      setWeights(w);
      setNotes(e.notes || '');
    })();
  }, [storeIdx]);

  if (!entry) {
    return <View style={{ flex: 1 }}><Text style={S.empty}>Chargement…</Text></View>;
  }

  const setWeight = (slug, idx, v) => {
    setWeights(prev => {
      const arr = [...(prev[slug] || [])];
      arr[idx] = v.replace(',', '.');
      return { ...prev, [slug]: arr };
    });
    setDirty(true);
  };

  const onSave = async () => {
    const newEntry = {
      ...entry,
      exos: entry.exos.map(ex => ({
        slug: ex.slug, name: ex.name,
        weights: weights[ex.slug] || ex.weights,
      })),
      notes,
    };
    await updateHistoryEntry(storeIdx, newEntry);
    onChanged();
    onExit();
  };

  const onDelete = async () => {
    await deleteHistoryEntry(storeIdx);
    onChanged();
    setConfirmDelete(false);
    onExit();
  };

  const tryExit = () => {
    if (dirty) setConfirmDiscard(true);
    else onExit();
  };

  const dt = new Date(entry.date);
  const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flex: 1 }}>
      <View style={S.logHeader}>
        <Pressable onPress={tryExit} style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
          <Text style={{ color: COLORS.muted, fontSize: 14 }}>← Retour</Text>
        </Pressable>
        <Text style={S.logTitle}>{entry.sessionTitle}</Text>
        <Text style={S.logProgress}>{dateStr} · {timeStr}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {entry.exos.map((ex, i) => {
          // Lookup metadata from SESSIONS for image/meta/warn
          let meta = ex;
          for (const di of [1, 3, 5]) {
            const found = SESSIONS[di].exos.find(e => e.slug === ex.slug);
            if (found) { meta = { ...found, ...ex }; break; }
          }
          return (
            <HistoryExoEditBlock
              key={i}
              exo={meta}
              weights={weights[ex.slug] || []}
              onWeightChange={(idx, v) => setWeight(ex.slug, idx, v)}
            />
          );
        })}

        <Text style={S.sectionTitle}>Notes</Text>
        <TextInput
          style={[S.logExoNote, { minHeight: 80 }]}
          value={notes}
          onChangeText={(v) => { setNotes(v); setDirty(true); }}
          placeholder="Notes de la séance…"
          placeholderTextColor={COLORS.muted}
          multiline
        />

        <Pressable
          style={[S.logCancelBtn, { marginTop: 24 }]}
          onPress={() => setConfirmDelete(true)}
        >
          <Text style={[S.logCancelBtnText, { color: '#c53030' }]}>Supprimer cette séance</Text>
        </Pressable>
      </ScrollView>

      <View style={[S.logFooter, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          style={[S.logFinishBtn, !dirty && { opacity: 0.4 }]}
          onPress={onSave}
          disabled={!dirty}
          android_ripple={{ color: '#333' }}
        >
          <Text style={S.logFinishBtnText}>
            {dirty ? 'Enregistrer les modifications' : 'Rien à modifier'}
          </Text>
        </Pressable>
      </View>

      {confirmDelete && (
        <ConfirmModal
          title="Supprimer cette séance ?"
          text="L'entrée disparaît de l'historique. Action irréversible."
          cancelLabel="Annuler"
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={onDelete}
        />
      )}
      {confirmDiscard && (
        <ConfirmModal
          title="Quitter sans enregistrer ?"
          text="Tes modifications seront perdues."
          cancelLabel="Continuer"
          confirmLabel="Quitter"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => { setConfirmDiscard(false); onExit(); }}
        />
      )}
    </View>
  );
}

function HistoryExoEditBlock({ exo, weights, onWeightChange }) {
  const openLightbox = useContext(LightboxCtx);
  return (
    <View style={S.logExoBlock}>
      <View style={S.logExoHeader}>
        <Pressable onPress={() => openLightbox(exo.slug)} android_ripple={{ color: COLORS.soft, borderless: true }}>
          <View style={S.exoThumbCol}>
            <ExoThumb slug={exo.slug} iconSize={28} />
          </View>
        </Pressable>
        <Text style={S.logExoName} numberOfLines={2}>{exo.name}</Text>
      </View>
      {exo.meta && <Text style={S.logExoMeta}>{exo.meta}</Text>}
      <View style={S.logSetsRow}>
        {weights.map((w, i) => {
          const filled = !!w;
          return (
            <View key={i} style={S.logSetCell}>
              <Text style={S.logSetLabel}>S{i + 1}</Text>
              <TextInput
                style={[S.logSetInput, filled && S.logSetInputFilled]}
                value={w}
                onChangeText={(v) => onWeightChange(i, v)}
                placeholder="kg"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============ SHELL ============

const TABS = [
  { key: 'today', label: "Auj." },
  { key: 'marche', label: 'Marche' },
  { key: 'training', label: 'Muscu' },
  { key: 'curves', label: 'Courbes' },
  { key: 'history', label: 'Histo' },
];

function Shell() {
  const [tab, setTab] = useState('today');
  const [sessionMode, setSessionMode] = useState(null); // null ou dayIdx (1/3/5)
  const [historyEntryIdx, setHistoryEntryIdx] = useState(null); // null ou storeIdx
  const [historyVersion, setHistoryVersion] = useState(0);
  const [draftSessionDay, setDraftSessionDay] = useState(null);
  const [lightboxSlug, setLightboxSlug] = useState(null);
  const insets = useSafeAreaInsets();

  // Trouver le nom français de l'exo pour la caption de la lightbox
  const lightboxExoName = lightboxSlug ? (() => {
    for (const di of [1, 3, 5]) {
      const found = SESSIONS[di].exos.find(e => e.slug === lightboxSlug);
      if (found) return found.name;
    }
    const off = OFF_DAY.items.find(e => e.slug === lightboxSlug);
    return off ? off.name : null;
  })() : null;

  // Charger info brouillon (pour afficher "EN COURS" sur la séance correspondante)
  useEffect(() => {
    (async () => {
      const d = await loadDraft();
      setDraftSessionDay(d ? d.sessionDay : null);
    })();
  }, [historyVersion, sessionMode]);

  const startSession = useCallback((dayIdx) => setSessionMode(dayIdx), []);
  const exitSession = useCallback(() => setSessionMode(null), []);
  const sessionSaved = useCallback(() => {
    setHistoryVersion(v => v + 1);
    setSessionMode(null);
    setTab('history');
  }, []);

  let title;
  if (sessionMode != null) title = SESSIONS[sessionMode].title;
  else if (historyEntryIdx != null) title = 'Détail séance';
  else if (tab === 'today') title = "Aujourd'hui";
  else if (tab === 'marche') title = 'Marche 32 sem';
  else if (tab === 'training') title = 'Entraînement';
  else if (tab === 'curves') title = 'Courbes';
  else title = 'Historique';

  const inFullScreen = sessionMode != null || historyEntryIdx != null;

  return (
    <LightboxCtx.Provider value={setLightboxSlug}>
    <View style={[S.root, { paddingTop: insets.top, paddingBottom: inFullScreen ? 0 : insets.bottom }]}>
      <View style={S.topbar}>
        <Text style={S.topbarTitle}>{title}</Text>
        <Text style={S.topbarDate}>{todayLabel()}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {sessionMode != null ? (
          <SessionLogScreen
            sessionDay={sessionMode}
            onExit={exitSession}
            onSaved={sessionSaved}
            insets={insets}
          />
        ) : historyEntryIdx != null ? (
          <HistoryDetailScreen
            storeIdx={historyEntryIdx}
            onExit={() => setHistoryEntryIdx(null)}
            onChanged={() => setHistoryVersion(v => v + 1)}
            insets={insets}
          />
        ) : tab === 'today' ? (
          <TodayScreen onStartSession={startSession} draftSessionDay={draftSessionDay} />
        ) : tab === 'marche' ? (
          <MarcheScreen refreshKey={historyVersion} onChanged={() => setHistoryVersion(v => v + 1)} />
        ) : tab === 'curves' ? (
          <CourbeScreen refreshKey={historyVersion} />
        ) : tab === 'training' ? (
          <TrainingPickerScreen onPickSession={startSession} draftSessionDay={draftSessionDay} />
        ) : (
          <HistoryScreen
            historyVersion={historyVersion}
            onChanged={() => setHistoryVersion(v => v + 1)}
            onOpenEntry={(idx) => setHistoryEntryIdx(idx)}
          />
        )}
      </View>

      {!inFullScreen && (
        <View style={S.tabs}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={S.tab}
              onPress={() => setTab(t.key)}
              android_ripple={{ color: COLORS.soft }}
            >
              <Text style={[S.tabText, tab === t.key && S.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {lightboxSlug && (
        <Lightbox slug={lightboxSlug} exoName={lightboxExoName} onClose={() => setLightboxSlug(null)} />
      )}
    </View>
    </LightboxCtx.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Shell />
    </SafeAreaProvider>
  );
}
