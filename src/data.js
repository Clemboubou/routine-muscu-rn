export const MORNING = [
  { time: '6h30', text: "Réveil — ouvrir les volets (lumière naturelle)" },
  { time: '6h45', text: "Marche à jeun dehors" },
  { time: '7h30', text: "Fin de marche, petit-déjeuner" },
];

export const EVENING = [
  { time: '21h30', text: "Arrêt des écrans" },
  { time: '22h15', text: "Coucher" },
  { time: '6h30', text: "Réveil (8h de sommeil)" },
];

export const SESSIONS = {
  1: {
    title: "Bas du corps",
    day: "Lundi",
    exos: [
      { slug: 'velo', name: "Vélo échauffement", meta: "8 min — Z2", cardio: true },
      { slug: 'leg-press', name: "Presse à cuisses", meta: "4×12 — repos 90s", sets: 4 },
      { slug: 'leg-curl', name: "Leg curl allongé", meta: "4×12 — repos 60s", sets: 4 },
      { slug: 'leg-extension', name: "Leg extension", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'hip-thrust', name: "Hip thrust machine", meta: "4×12 — repos 90s", sets: 4 },
      { slug: 'calf', name: "Mollets debout excentrique", meta: "4×15 — repos 60s", sets: 4, warn: "Descente lente 5s" },
      { slug: 'abductor', name: "Abducteurs (alterner adducteurs)", meta: "3×15 — repos 45s", sets: 3 },
      { slug: 'plank', name: "Planche / gainage", meta: "3×30s", sets: 3 },
    ],
  },
  3: {
    title: "Haut du corps",
    day: "Mercredi",
    exos: [
      { slug: 'velo', name: "Vélo échauffement", meta: "8 min — Z2", cardio: true },
      { slug: 'lat-pulldown', name: "Tirage poitrine (lat pulldown)", meta: "4×10 — repos 90s", sets: 4 },
      { slug: 'chest-press', name: "Développé couché machine", meta: "4×10 — repos 90s", sets: 4 },
      { slug: 'seated-row', name: "Rowing assis machine", meta: "4×10 — repos 90s", sets: 4 },
      { slug: 'rear-delt', name: "Rear Delt machine", meta: "3×15 — repos 60s", sets: 3, warn: "Charge légère — épaule gauche. +0,5kg / 2-3 sem." },
      { slug: 'triceps', name: "Extension triceps poulie", meta: "3×12 — repos 45s", sets: 3 },
      { slug: 'biceps', name: "Curl biceps poulie", meta: "3×12 — repos 45s", sets: 3 },
    ],
  },
  5: {
    title: "Full Body Cardio",
    day: "Vendredi",
    exos: [
      { slug: 'velo', name: "Vélo échauffement", meta: "10 min — Z2", cardio: true },
      { slug: 'leg-press', name: "Presse à cuisses", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'leg-curl', name: "Leg curl allongé", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'leg-extension', name: "Leg extension", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'chest-press', name: "Développé couché machine", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'seated-row', name: "Rowing assis machine", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'rear-delt', name: "Rear Delt machine", meta: "3×15 — repos 45s", sets: 3, warn: "Épaule gauche" },
      { slug: 'hip-thrust', name: "Hip thrust machine", meta: "3×15 — repos 60s", sets: 3 },
      { slug: 'calf', name: "Mollets debout excentrique", meta: "3×15 — repos 60s", sets: 3, warn: "Descente lente 5s" },
      { slug: 'elliptical', name: "Elliptique finisher", meta: "15 min — Z2/Z3", cardio: true },
      { slug: 'stretch', name: "Étirements statiques", meta: "5-10 min", cardio: true },
    ],
  },
};

export const OFF_DAY = {
  title: "Repos actif",
  items: [
    { slug: 'walk', name: "Marche", meta: "30-60 min" },
    { slug: 'stretch', name: "Étirements / mobilité (soir)", meta: "10 min" },
  ],
};
