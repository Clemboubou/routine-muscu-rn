// Nutrition + hydratation + suppléments — extrait essentiel du protocole 32 sem.
// Source : Documents/nutrition_plan_complete.json

export const NUTRITION = {
  proteinGramsPerDay: 220,
  caloriesTarget: 3200,
  caloriesActuel: 2280,
  fastingHours: 14.5,
  eatingWindow: '12h30 → 22h',
  totalDaily: { p: 266, g: 113, l: 51, kcal: 2280 },

  meals: [
    {
      time: '12h30',
      name: 'Repas 1 — Déjeuner',
      flag: 'Casse le jeûne',
      composition: '350g poulet · 250g riz basmati · 350g légumes · 1 c.à.s. huile olive',
      macros: { p: 108, g: 60, l: 15, kcal: 1000 },
      leucine: 9.5,
    },
    {
      time: '16h30',
      name: 'Repas 2 — Collation',
      flag: 'Avant muscu Lun/Mer/Ven',
      composition: '250g skyr · 40g amandes',
      macros: { p: 33, g: 12, l: 21, kcal: 380 },
      leucine: 3.0,
    },
    {
      time: '19h30',
      name: 'Repas 3 — Dîner',
      composition: '300g poulet ou poisson (Mar/Ven) · 500g légumes · 1 c.à.s. huile olive',
      macros: { p: 93, g: 25, l: 15, kcal: 700 },
      leucine: 8.0,
    },
    {
      time: '22h00',
      name: 'Repas 4 — Pré-sommeil',
      flag: '+22% MPS nocturne (caséine)',
      composition: '400g fromage blanc 0% · 15g collagène · 500mg vit C',
      macros: { p: 32, g: 16, l: 0, kcal: 200 },
      leucine: 3.0,
      critical: true,
    },
  ],

  hydration: [
    { time: '07h00', action: '500 ml — réhydratation post-nuit', elec: false },
    { time: '07h15', action: '250 ml + sel + citron — pré-marche', elec: true },
    { time: '07h30-10h', action: '250-300 ml/h — pendant marche', elec: true },
    { time: '10h-12h30', action: '750 ml — post-marche', elec: false },
    { time: '13h-19h', action: '1 L — après-midi', elec: false },
    { time: '19h-21h', action: '500 ml — soirée', elec: false },
    { time: '21h-22h', action: '200 ml max — avant coucher', elec: false },
  ],
  hydrationTotal: '~3,5 L / jour',
  urineCheck: 'Jaune paille clair = OK · Foncé = bois plus',

  supplements: [
    { time: 'Marche', items: 'Électrolytes (1g sel + 1g bicar /L + jus citron)' },
    { time: '13h', items: 'Oméga-3 (2g) · Vit D3 (3000 UI) · Multivit' },
    { time: '21h30', items: 'Magnésium bisglycinate (400 mg)' },
    { time: '22h00', items: 'Collagène (15g) + Vit C (500mg)', critical: true },
  ],

  dailySchedule: [
    { time: '07h00', text: 'Lever + 500 ml eau' },
    { time: '07h15', text: 'Café noir + préparation gourde électrolytes' },
    { time: '07h45-10h', text: 'Marche forêt à jeun' },
    { time: '10h00', text: 'Retour + étirements + 500 ml eau' },
    { time: '12h30', text: 'Repas 1 + suppléments midi' },
    { time: '16h30', text: 'Repas 2 (collation)' },
    { time: '17h-18h', text: 'Muscu si Lun/Mer/Ven' },
    { time: '19h30', text: 'Repas 3 (dîner)' },
    { time: '21h30', text: 'Magnésium + stop eau' },
    { time: '22h00', text: 'Repas 4 pré-sommeil ⭐' },
    { time: '22h30', text: 'Coucher (objectif 7h30 min)' },
  ],

  leucineThreshold: { perMealMin: 25, perMealMax: 40, mealsPerDay: 4 },

  budgetMonthly: { alim: 360, supp: 80, total: 440 },
};
