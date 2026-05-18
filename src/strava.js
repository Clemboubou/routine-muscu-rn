// Intégration Strava — OAuth Authorization Code Grant (sans PKCE, avec client_secret).
// Single-user perso : le client_secret est stocké en local sur le téléphone.
// Pour usage public, il faudrait un backend proxy.

import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRAVA_CREDS_KEY = 'strava-creds-v1';
const STRAVA_TOKEN_KEY = 'strava-token-v1';

const DISCOVERY = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
  revocationEndpoint: 'https://www.strava.com/oauth/deauthorize',
};

export function makeStravaRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'routinemuscu',
    path: 'strava',
  });
}

export async function loadCreds() {
  try { const raw = await AsyncStorage.getItem(STRAVA_CREDS_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export async function saveCreds({ clientId, clientSecret }) {
  await AsyncStorage.setItem(STRAVA_CREDS_KEY, JSON.stringify({ clientId, clientSecret }));
}

export async function clearCreds() {
  await AsyncStorage.removeItem(STRAVA_CREDS_KEY);
  await AsyncStorage.removeItem(STRAVA_TOKEN_KEY);
}

export async function loadToken() {
  try { const raw = await AsyncStorage.getItem(STRAVA_TOKEN_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export async function saveToken(tok) {
  await AsyncStorage.setItem(STRAVA_TOKEN_KEY, JSON.stringify(tok));
}

// Lance le flux OAuth. Retourne { ok, error? }.
export async function connect() {
  const creds = await loadCreds();
  if (!creds) return { ok: false, error: 'Client ID / secret manquants' };

  const redirectUri = makeStravaRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: creds.clientId,
    scopes: ['activity:read_all'],
    redirectUri,
    usePKCE: false,
    extraParams: { approval_prompt: 'auto' },
  });
  await request.makeAuthUrlAsync(DISCOVERY);
  const result = await request.promptAsync(DISCOVERY);
  if (result.type !== 'success') {
    return { ok: false, error: 'Connexion annulée ou refusée' };
  }
  try {
    const tokenResp = await AuthSession.exchangeCodeAsync(
      {
        code: result.params.code,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        redirectUri,
        extraParams: { grant_type: 'authorization_code' },
      },
      DISCOVERY
    );
    await saveToken({
      accessToken: tokenResp.accessToken,
      refreshToken: tokenResp.refreshToken,
      expiresAt: tokenResp.issuedAt + tokenResp.expiresIn,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Échange du code échoué : ' + e.message };
  }
}

// Renvoie un accessToken valide, le rafraîchit si expiré.
export async function getValidAccessToken() {
  const tok = await loadToken();
  if (!tok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now < tok.expiresAt - 60) return tok.accessToken;
  const creds = await loadCreds();
  if (!creds) return null;
  try {
    const refreshed = await AuthSession.refreshAsync(
      {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: tok.refreshToken,
      },
      DISCOVERY
    );
    const next = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || tok.refreshToken,
      expiresAt: refreshed.issuedAt + refreshed.expiresIn,
    };
    await saveToken(next);
    return next.accessToken;
  } catch {
    return null;
  }
}

// Récupère les activités de la journée (Walk / Hike) en epoch UTC.
// Retourne array de { id, name, type, duration_min, distance_km, elev_m, kcal, hr_avg, start_date }.
export async function fetchTodayWalkActivities() {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, error: 'Non connecté' };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const afterTs = Math.floor(start.getTime() / 1000);
  const beforeTs = Math.floor(end.getTime() / 1000);
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=10`;
  try {
    const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!resp.ok) return { ok: false, error: 'API ' + resp.status };
    const arr = await resp.json();
    const walks = arr.filter(a => ['Walk', 'Hike', 'WalkingWorkout'].includes(a.type) || a.sport_type === 'Walk' || a.sport_type === 'Hike');
    return {
      ok: true,
      activities: walks.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        duration_min: Math.round((a.moving_time || a.elapsed_time) / 60),
        distance_km: +(a.distance / 1000).toFixed(2),
        elev_m: Math.round(a.total_elevation_gain || 0),
        kcal: a.calories ? Math.round(a.calories) : null,
        hr_avg: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        hr_max: a.max_heartrate ? Math.round(a.max_heartrate) : null,
        start_date: a.start_date_local,
      })),
    };
  } catch (e) {
    return { ok: false, error: 'Réseau : ' + e.message };
  }
}
