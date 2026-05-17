# Routine Muscu (React Native + Expo)

App native Android pour visualiser ta routine BasicFit et noter tes poids.
Stack : **Expo SDK 54 · React Native 0.81 · React 19 · AsyncStorage · react-native-svg**.

## Structure

```
routine-muscu-rn/
├── App.js              ← shell + écrans (Today / Routine / History / Detail)
├── src/
│   ├── data.js         ← séances, matin, soir, off day
│   ├── icons.js        ← pictogrammes SVG (1 par exo)
│   ├── storage.js      ← wrapper AsyncStorage (lecture/écriture historique)
│   └── styles.js       ← StyleSheet centralisé, palette blanche
├── app.json            ← config Expo (nom, icône, package Android)
├── eas.json            ← profils de build EAS (preview = APK)
└── package.json
```

## Dev local

```powershell
cd $env:USERPROFILE\Desktop\routine-muscu-rn
npm start
```
- Scanne le QR code avec **Expo Go** (Play Store) → l'app s'ouvre direct sur ton Vivo.
- Toute modification du code → hot reload instantané.

## Générer l'APK (EAS Build cloud, sans Android Studio)

### Étape 1 — Créer un compte Expo (gratuit)

1. Va sur https://expo.dev/signup
2. Crée le compte avec ton email
3. Vérifie l'email

### Étape 2 — Login + build (terminal)

```powershell
cd $env:USERPROFILE\Desktop\routine-muscu-rn
npx eas-cli@latest login        # te demande email/password
npx eas-cli@latest init          # lie le projet à ton compte (crée un projectId)
npx eas-cli@latest build -p android --profile preview
```

Le build se fait sur les serveurs Expo (free tier : 30 builds/mois).
Durée : 10-15 min. À la fin, tu reçois un lien de téléchargement APK + email.

### Étape 3 — Installer sur ton Vivo X300 Ultra

1. Télécharge l'APK depuis le lien EAS (ou clique sur le mail)
2. Transfère sur le tel (USB, drive, mail à toi-même)
3. Vivo → Paramètres → Sécurité & confidentialité → Sources inconnues → autorise ton explorateur
4. Tap sur le `.apk` → Installer
5. L'app "Routine" apparaît dans le tiroir

## Mises à jour

### Changements de contenu (data.js, icons.js, styles, écrans)
Pas besoin de rebuild l'APK. Utilise **EAS Update** :
```powershell
npx eas-cli@latest update --branch preview --message "ajout exo X"
```
Au prochain lancement de l'app, elle se met à jour OTA (over-the-air).

### Changements natifs (icône, splash, deps natives, version Expo)
Rebuild requis :
```powershell
npx eas-cli@latest build -p android --profile preview
```

## Customisation rapide

- **Ajouter un exo** : édite `src/data.js`, ajoute un objet dans la session voulue + crée son pictogramme dans `src/icons.js` (ou laisse le fallback cercle)
- **Changer les couleurs** : `src/styles.js` → constante `COLORS`
- **Modifier la routine matin/soir** : `src/data.js` → arrays `MORNING` / `EVENING`

## Données

Stockées en `AsyncStorage` sur le tel, clé `muscu-history-v1`. Aucun serveur, aucune synchro cloud, 100 % local.
