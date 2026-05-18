// Logger centralisé. Tape un tag + une charge utile arbitraire.
// Format : [HH:MM:SS][Tag] message ...args
// Active / désactive via __LOGS_ENABLED.

export const __LOGS_ENABLED = true;

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function log(tag, ...args) {
  if (!__LOGS_ENABLED) return;
  // eslint-disable-next-line no-console
  console.log(`[${ts()}][${tag}]`, ...args);
}

export function warn(tag, ...args) {
  if (!__LOGS_ENABLED) return;
  // eslint-disable-next-line no-console
  console.warn(`[${ts()}][${tag}]`, ...args);
}

export function error(tag, ...args) {
  if (!__LOGS_ENABLED) return;
  // eslint-disable-next-line no-console
  console.error(`[${ts()}][${tag}]`, ...args);
}
