import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { S, COLORS } from './src/styles';
import { MORNING, EVENING, SESSIONS, OFF_DAY } from './src/data';
import { ExoIcon, ExoThumb, ExoHero } from './src/icons';
import {
  loadHistory, lastMaxFor,
  loadDraft, saveDraft, clearDraft, commitSession,
} from './src/storage';

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

function ExoRow({ exo, last, onPress, lastMax, clickable = false }) {
  const content = (
    <View style={[S.exoRow, last && S.exoRowLast]}>
      <View style={S.exoThumb}>
        <ExoThumb slug={exo.slug} iconSize={32} />
      </View>
      <View style={S.exoInfo}>
        <Text style={S.exoName}>{exo.name}</Text>
        <Text style={S.exoMeta}>{exo.meta}</Text>
        {exo.warn && <Text style={S.exoWarn}>⚠ {exo.warn}</Text>}
        {lastMax != null && <Text style={S.exoLast}>Dernier max : {lastMax} kg</Text>}
      </View>
      {clickable && <Text style={S.chevron}>›</Text>}
    </View>
  );
  if (!clickable) return content;
  return <Pressable onPress={onPress} android_ripple={{ color: COLORS.soft }}>{content}</Pressable>;
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
  const [confirm, setConfirm] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initialized = useRef(false);

  // Init : charger brouillon ou créer structure vide
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
      for (const ex of exosToLog) {
        const last = await lastMaxFor(ex.slug);
        if (last) m[ex.slug] = last.max;
      }
      setLastMaxes(m);
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

function ExoLogBlock({ exo, weights, note, lastMax, onWeightChange, onNoteChange }) {
  const isCardio = !!exo.cardio;
  return (
    <View style={S.logExoBlock}>
      <View style={S.logExoHeader}>
        <View style={S.exoThumb}>
          <ExoThumb slug={exo.slug} iconSize={28} />
        </View>
        <Text style={S.logExoName}>{exo.name}</Text>
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

// ============ HISTORY ============

function HistoryScreen({ historyVersion }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const h = await loadHistory();
      setList(h.slice().reverse());
    })();
  }, [historyVersion]);

  if (list.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={S.empty}>
          Aucune séance enregistrée pour l'instant.{'\n'}
          Termine ta première séance pour la voir ici.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={S.scroll}>
      <View style={S.card}>
        {list.map((entry, idx) => {
          const dt = new Date(entry.date);
          const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
          const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const exosLogged = entry.exos.filter(e => e.weights && e.weights.some(w => w));
          const summary = exosLogged.map(e => `${e.name} ${e.weights.filter(w => w).join('/')}kg`).join(' · ');
          return (
            <View key={idx} style={S.historyRow}>
              <Text style={S.historyDate}>{dateStr} · {timeStr}</Text>
              <Text style={S.historySession}>{entry.sessionTitle}</Text>
              <Text style={S.historyExos}>{summary || '(aucun poids saisi)'}</Text>
              {entry.notes ? <Text style={S.historyNotes}>{entry.notes}</Text> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============ SHELL ============

const TABS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'training', label: 'Entraînement' },
  { key: 'history', label: 'Historique' },
];

function Shell() {
  const [tab, setTab] = useState('today');
  const [sessionMode, setSessionMode] = useState(null); // null ou dayIdx (1/3/5)
  const [historyVersion, setHistoryVersion] = useState(0);
  const [draftSessionDay, setDraftSessionDay] = useState(null);
  const insets = useSafeAreaInsets();

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
  else if (tab === 'today') title = "Aujourd'hui";
  else if (tab === 'training') title = 'Entraînement';
  else title = 'Historique';

  return (
    <View style={[S.root, { paddingTop: insets.top, paddingBottom: sessionMode != null ? 0 : insets.bottom }]}>
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
        ) : tab === 'today' ? (
          <TodayScreen onStartSession={startSession} draftSessionDay={draftSessionDay} />
        ) : tab === 'training' ? (
          <TrainingPickerScreen onPickSession={startSession} draftSessionDay={draftSessionDay} />
        ) : (
          <HistoryScreen historyVersion={historyVersion} />
        )}
      </View>

      {sessionMode == null && (
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
    </View>
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
