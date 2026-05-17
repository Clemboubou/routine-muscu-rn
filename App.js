import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { S, COLORS } from './src/styles';
import { MORNING, EVENING, SESSIONS, OFF_DAY } from './src/data';
import { ExoIcon } from './src/icons';
import { loadHistory, lastMaxFor, addSetEntry } from './src/storage';

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

function ExoRow({ exo, last, onPress, lastMax, clickable = true }) {
  const content = (
    <View style={[S.exoRow, last && S.exoRowLast]}>
      <View style={S.exoThumb}>
        <ExoIcon slug={exo.slug} size={32} />
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
  return (
    <Pressable onPress={onPress} android_ripple={{ color: COLORS.soft }}>
      {content}
    </Pressable>
  );
}

function TodayScreen({ onOpenExo, historyVersion }) {
  const session = SESSIONS[new Date().getDay()];
  const [maxes, setMaxes] = useState({});

  useEffect(() => {
    const exos = session ? session.exos : [];
    (async () => {
      const m = {};
      for (const ex of exos) {
        const last = await lastMaxFor(ex.slug);
        if (last) m[ex.slug] = last.max;
      }
      setMaxes(m);
    })();
  }, [session, historyVersion]);

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
              <ExoRow key={i} exo={ex} last={i === session.exos.length - 1}
                onPress={() => onOpenExo(ex, session.title)} lastMax={maxes[ex.slug]} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={S.sectionTitle}>{OFF_DAY.title}</Text>
          <View style={S.card}>
            {OFF_DAY.items.map((ex, i) => (
              <ExoRow key={i} exo={ex} last={i === OFF_DAY.items.length - 1} clickable={false} />
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

function RoutineScreen({ onOpenExo, historyVersion }) {
  const [maxes, setMaxes] = useState({});

  useEffect(() => {
    (async () => {
      const m = {};
      const seen = new Set();
      for (const di of [1, 3, 5]) {
        for (const ex of SESSIONS[di].exos) {
          if (seen.has(ex.slug)) continue;
          seen.add(ex.slug);
          const last = await lastMaxFor(ex.slug);
          if (last) m[ex.slug] = last.max;
        }
      }
      setMaxes(m);
    })();
  }, [historyVersion]);

  return (
    <ScrollView contentContainerStyle={S.scroll}>
      {[1, 3, 5].map(di => {
        const s = SESSIONS[di];
        return (
          <View key={di}>
            <Text style={S.sectionTitle}>{s.day} — {s.title}</Text>
            <View style={S.card}>
              {s.exos.map((ex, i) => (
                <ExoRow key={i} exo={ex} last={i === s.exos.length - 1}
                  onPress={() => onOpenExo(ex, s.title)} lastMax={maxes[ex.slug]} />
              ))}
            </View>
          </View>
        );
      })}
      <Text style={S.sectionTitle}>Mardi · Jeudi · Week-end</Text>
      <View style={S.card}>
        {OFF_DAY.items.map((ex, i) => (
          <ExoRow key={i} exo={ex} last={i === OFF_DAY.items.length - 1} clickable={false} />
        ))}
      </View>
    </ScrollView>
  );
}

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

function ExoDetail({ exo, sessionTitle, onBack, onSaved }) {
  const nbSets = exo.sets || 0;
  const isCardio = !!exo.cardio;
  const [weights, setWeights] = useState(Array(nbSets).fill(''));
  const [notes, setNotes] = useState('');
  const [lastMax, setLastMax] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { lastMaxFor(exo.slug).then(setLastMax); }, [exo.slug]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const onSave = async () => {
    if (!weights.some(w => w)) { showToast("Saisis au moins un poids"); return; }
    await addSetEntry(sessionTitle, exo.slug, exo.name, weights, notes.trim());
    showToast("Enregistré");
    setTimeout(() => onSaved(), 300);
  };

  return (
    <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} style={S.backBtn} android_ripple={{ color: COLORS.soft }}>
        <Text style={S.backBtnText}>← Retour</Text>
      </Pressable>

      <View style={S.detailImg}>
        <ExoIcon slug={exo.slug} size={80} />
      </View>

      <Text style={S.detailName}>{exo.name}</Text>
      <Text style={S.detailMeta}>{exo.meta}</Text>
      {lastMax && <Text style={S.detailMeta}>Dernier max enregistré : {lastMax.max} kg</Text>}
      {exo.warn && <Text style={S.detailWarn}>⚠ {exo.warn}</Text>}

      {isCardio ? (
        <Text style={S.empty}>Exercice cardio / non chargé — pas de poids à saisir.</Text>
      ) : (
        <>
          <View style={{ marginTop: 12 }}>
            {weights.map((w, i) => (
              <View key={i} style={S.setRow}>
                <Text style={S.setLabel}>Série {i + 1}</Text>
                <TextInput
                  style={S.setInput}
                  value={w}
                  onChangeText={(v) => {
                    const next = [...weights]; next[i] = v.replace(',', '.'); setWeights(next);
                  }}
                  placeholder="kg"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            ))}
          </View>
          <TextInput
            style={S.notes}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (ressenti, ajustements...)"
            placeholderTextColor={COLORS.muted}
            multiline
          />
          <Pressable onPress={onSave} style={S.saveBtn} android_ripple={{ color: '#333' }}>
            <Text style={S.saveBtnText}>Enregistrer cette série</Text>
          </Pressable>
        </>
      )}

      {toast && (
        <View style={S.toast}><Text style={S.toastText}>{toast}</Text></View>
      )}
    </ScrollView>
  );
}

const TABS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'routine', label: 'Routine' },
  { key: 'history', label: 'Historique' },
];

function Shell() {
  const [tab, setTab] = useState('today');
  const [detail, setDetail] = useState(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const insets = useSafeAreaInsets();

  const openExo = useCallback((exo, sessionTitle) => setDetail({ exo, sessionTitle }), []);
  const closeExo = useCallback(() => setDetail(null), []);
  const onSaved = useCallback(() => {
    setHistoryVersion(v => v + 1);
    setDetail(null);
  }, []);

  let title;
  if (detail) title = detail.exo.name;
  else if (tab === 'today') title = "Aujourd'hui";
  else if (tab === 'routine') title = 'Routine complète';
  else title = 'Historique';

  return (
    <View style={[S.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={S.topbar}>
        <Text style={S.topbarTitle}>{title}</Text>
        <Text style={S.topbarDate}>{todayLabel()}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {detail ? (
          <ExoDetail
            exo={detail.exo}
            sessionTitle={detail.sessionTitle}
            onBack={closeExo}
            onSaved={onSaved}
          />
        ) : tab === 'today' ? (
          <TodayScreen onOpenExo={openExo} historyVersion={historyVersion} />
        ) : tab === 'routine' ? (
          <RoutineScreen onOpenExo={openExo} historyVersion={historyVersion} />
        ) : (
          <HistoryScreen historyVersion={historyVersion} />
        )}
      </View>

      {!detail && (
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
