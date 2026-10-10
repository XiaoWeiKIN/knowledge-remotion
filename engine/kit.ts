// Helpers for scenes. Everything a scene draws is a function of its own clock: no wall time, no Math.random,
// nothing remembered from the frame before.
export const PLATE = {w: 1080, h: 1920}, CX = 540;
export const SANS = '"PingFang SC", "Noto Sans CJK SC", "Helvetica Neue", sans-serif';
export const MATH = '"Times New Roman", "Songti SC", serif';
export type Ctx = CanvasRenderingContext2D;

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** How far `x` has come from `a` to `b`, held at 0 before and 1 after. */
export const seg = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t: number) => { const c = clamp01(t); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
/** Present between `from` and `to`, fading over six frames at either end. */
export const vis = ([from, to]: readonly [number, number], t: number) => Math.min(seg(t, from, from + 6), 1 - seg(t, to - 6, to));
/** Piecewise-linear value at `t` through [time, value] pairs. */
export const keys = (t: number, k: number[][]) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
  return k[k.length - 1][1];
};
const mulberry = (seed: number) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** A fixed table of triples in 0..1, for scattering things without Math.random. */
export const RAND = Array.from({length: 600}, (_, i) => { const r = mulberry(4242 + i); return [r(), r(), r()]; });
export const text = (ctx: Ctx, s: string, x: number, y: number, size: number, color: string, alpha = 1, align: CanvasTextAlign = 'center', weight = 600) => {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${SANS}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore();
};
