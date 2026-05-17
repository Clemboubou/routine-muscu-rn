import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { EXO_IMAGES, EXO_RATIOS } from './exoImages';

const sw = 1.5;

function I({ size = 32, color = '#111', children }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const ICONS = {
  'velo': (p) => (<I {...p}><Circle cx="16" cy="46" r="10" /><Circle cx="48" cy="46" r="10" /><Path d="M16 46 L30 22 L42 22 L48 46" /><Path d="M30 22 L24 22" /><Circle cx="36" cy="14" r="3" /></I>),
  'leg-press': (p) => (<I {...p}><Rect x="8" y="40" width="48" height="14" rx="2" /><Path d="M14 40 L14 30 L34 18 L50 18 L50 30" /><Circle cx="24" cy="34" r="3" /></I>),
  'leg-curl': (p) => (<I {...p}><Path d="M8 40 L36 40 L42 30 L52 30" /><Circle cx="14" cy="36" r="4" /><Path d="M18 36 L30 36" /><Path d="M42 30 L48 22" /></I>),
  'leg-extension': (p) => (<I {...p}><Rect x="14" y="34" width="22" height="18" rx="2" /><Circle cx="25" cy="22" r="6" /><Path d="M36 40 L52 28" /><Circle cx="52" cy="28" r="4" /></I>),
  'hip-thrust': (p) => (<I {...p}><Path d="M8 48 L24 48 L36 30 L52 30" /><Circle cx="36" cy="22" r="6" /><Rect x="6" y="48" width="20" height="6" rx="1" /></I>),
  'calf': (p) => (<I {...p}><Circle cx="32" cy="14" r="6" /><Path d="M32 20 L32 44" /><Path d="M28 44 L36 44" /><Path d="M28 44 L22 54 L42 54" /></I>),
  'abductor': (p) => (<I {...p}><Circle cx="32" cy="14" r="6" /><Path d="M32 20 L32 38" /><Path d="M32 38 L20 54" /><Path d="M32 38 L44 54" /></I>),
  'lat-pulldown': (p) => (<I {...p}><Path d="M8 14 L56 14" /><Path d="M20 14 L20 26" /><Path d="M44 14 L44 26" /><Circle cx="32" cy="32" r="6" /><Path d="M20 26 L26 36" /><Path d="M44 26 L38 36" /><Path d="M32 38 L32 54" /></I>),
  'chest-press': (p) => (<I {...p}><Rect x="8" y="36" width="48" height="6" rx="1" /><Circle cx="20" cy="28" r="5" /><Path d="M25 28 L42 28" /><Rect x="42" y="22" width="6" height="14" rx="1" /></I>),
  'seated-row': (p) => (<I {...p}><Circle cx="20" cy="20" r="6" /><Path d="M20 26 L20 42 L32 42" /><Path d="M20 32 L34 32" /><Path d="M34 32 L52 32" /><Path d="M52 28 L52 36" /></I>),
  'rear-delt': (p) => (<I {...p}><Circle cx="32" cy="18" r="6" /><Path d="M32 24 L32 40" /><Path d="M14 30 L32 28 L50 30" /><Circle cx="10" cy="30" r="3" /><Circle cx="54" cy="30" r="3" /></I>),
  'triceps': (p) => (<I {...p}><Path d="M32 6 L32 22" /><Circle cx="32" cy="28" r="6" /><Path d="M32 34 L32 48" /><Rect x="26" y="48" width="12" height="8" rx="1" /></I>),
  'biceps': (p) => (<I {...p}><Circle cx="22" cy="14" r="6" /><Path d="M22 20 L22 30 Q22 38 30 38 L42 38" /><Path d="M30 30 Q38 30 38 22" /><Rect x="38" y="36" width="14" height="6" rx="1" /></I>),
  'elliptical': (p) => (<I {...p}><Ellipse cx="32" cy="40" rx="22" ry="8" /><Path d="M14 40 L24 18" /><Path d="M50 40 L40 18" /><Circle cx="24" cy="14" r="3" /><Circle cx="40" cy="14" r="3" /></I>),
  'plank': (p) => (<I {...p}><Circle cx="14" cy="30" r="5" /><Path d="M19 30 L50 38" /><Path d="M50 38 L50 50" /><Path d="M22 36 L22 50" /></I>),
  'walk': (p) => (<I {...p}><Circle cx="32" cy="12" r="5" /><Path d="M32 17 L30 32 L22 46" /><Path d="M30 32 L40 38 L38 50" /><Path d="M30 24 L40 20" /></I>),
  'stretch': (p) => (<I {...p}><Circle cx="20" cy="14" r="5" /><Path d="M20 19 L20 36" /><Path d="M20 36 L34 40 L50 32" /><Path d="M20 36 L14 50" /><Path d="M20 36 L30 52" /></I>),
};

export function ExoIcon({ slug, size = 32, color = '#111' }) {
  const Render = ICONS[slug];
  if (!Render) {
    return (<I size={size} color={color}><Circle cx="32" cy="32" r="20" /></I>);
  }
  return <Render size={size} color={color} />;
}

// Vignette carrée de liste : cover, crop léger acceptable à 56px.
export function ExoThumb({ slug, size = 56, iconSize = null }) {
  const img = EXO_IMAGES[slug];
  if (img) {
    return <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" />;
  }
  const sz = iconSize != null ? iconSize : Math.round(size * 0.55);
  return (
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <ExoIcon slug={slug} size={sz} />
    </View>
  );
}

// Grosse image pour la vue détail : ratio naturel, plein largeur, zéro espace vide.
export function ExoHero({ slug, borderRadius = 12 }) {
  const img = EXO_IMAGES[slug];
  if (img) {
    const ratio = EXO_RATIOS[slug] || 1.5;
    return (
      <Image
        source={img}
        style={{ width: '100%', aspectRatio: ratio, borderRadius }}
        resizeMode="contain"
      />
    );
  }
  return (
    <View style={{
      width: '100%', aspectRatio: 1.6, borderRadius,
      backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ececec',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <ExoIcon slug={slug} size={80} />
    </View>
  );
}
