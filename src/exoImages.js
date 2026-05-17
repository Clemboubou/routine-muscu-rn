// Static require map — RN's bundler exige des chemins littéraux à la compilation.
// Si une image manque, supprime simplement sa ligne ici → fallback SVG automatique.

// Ratios w/h hardcodés (mesurés une fois au scan PowerShell).
// Sert au composant ExoHero pour dimensionner la boîte au pixel près sans appel runtime.
// (Image.resolveAssetSource() n'existe pas sur react-native-web.)
export const EXO_RATIOS = {
  'velo': 800 / 450,
  'leg-press': 800 / 450,
  'leg-curl': 800 / 450,
  'leg-extension': 800 / 450,
  'hip-thrust': 800 / 450,
  'calf': 384 / 448,
  'abductor': 800 / 450,
  'plank': 800 / 533,
  'lat-pulldown': 512 / 384,
  'chest-press': 800 / 533,
  'seated-row': 800 / 538,
  'rear-delt': 793 / 800,
  'triceps': 282 / 800,
  'biceps': 284 / 175,
  'elliptical': 800 / 754,
  'stretch': 800 / 450,
  'walk': 800 / 450,
};

export const EXO_IMAGES = {
  'velo': require('../assets/exercises/velo.png'),
  'leg-press': require('../assets/exercises/leg-press.png'),
  'leg-curl': require('../assets/exercises/leg-curl.png'),
  'leg-extension': require('../assets/exercises/leg-extension.png'),
  'hip-thrust': require('../assets/exercises/hip-thrust.png'),
  'calf': require('../assets/exercises/calf.png'),
  'abductor': require('../assets/exercises/abductor.png'),
  'plank': require('../assets/exercises/plank.png'),
  'lat-pulldown': require('../assets/exercises/lat-pulldown.png'),
  'chest-press': require('../assets/exercises/chest-press.png'),
  'seated-row': require('../assets/exercises/seated-row.png'),
  'rear-delt': require('../assets/exercises/rear-delt.png'),
  'triceps': require('../assets/exercises/triceps.png'),
  'biceps': require('../assets/exercises/biceps.png'),
  'elliptical': require('../assets/exercises/elliptical.png'),
  'stretch': require('../assets/exercises/stretch.png'),
  'walk': require('../assets/exercises/walk.png'),
};
