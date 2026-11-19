export const TAU = Math.PI * 2;

/** rnd() → 0..1, rnd(a) → 0..a, rnd(a, b) → a..b */
export const rnd = (a = 1, b?: number): number => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export interface Rect { x: number; y: number; w: number; h: number }
export const inR = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export const pct = (v: number): string => Math.round(v * 100) + ' %';
