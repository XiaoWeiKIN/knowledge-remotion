import {MATH, SANS, clamp01, lerp} from '../../engine';
import type {Ctx} from '../../engine';

// This episode's world: a dark room. Intrinsic value is a curve that is there whether or not anyone can see it.
// An informed trader is a lamp, and burning it costs fuel. Where lamplight falls the price lies on the value
// curve; in the dark it drifts, and the gap between the two glows red. Light cannot be fenced in — whoever
// has no lamp still sees by the others' — which is exactly why nobody wants to pay for one.
export const C = {night: '#05060a', value: '#f2c14e', price: '#f6f2ea', gap: '#ff5a4d', lamp: '#ffd9a0', gain: '#7fd4a0', dim: '#868d99', faint: '#252a33', cool: '#8ec5ff'};

export type Lamp = {x: number; on: number; fuel: number};
type Bump = {x: number; h: number; w: number};
/**
 * One instant of the room.
 * `reach`: how far a lamp's light carries along the curve. `lost`: how far the unlit price has wandered (0–1).
 * `ghost`: a floor under the value curve's visibility, for when the argument needs it seen in the dark.
 * `news`: changes in value that only lit prices follow. `edges`: momentary departures of price from value.
 * `flood`: light that reaches everywhere at once, from a source that is no lamp.
 * `quote`: how firmly there is a price at all (1 while trades happen, towards 0 when nobody will trade).
 * `flat`: how far the price has gone dead — a level line that no longer says anything.
 */
export type Room = {top: number; bottom: number; lamps: Lamp[]; t: number; a: number; reach?: number; gap?: number; lost?: number; ghost?: number; news?: Bump[]; edges?: Bump[]; flood?: number; quote?: number; flat?: number};
export const X0 = 40, X1 = 1040;
const REACH = 72;
const along = (x: number) => ((x - X0) / (X1 - X0)) * Math.PI;
const bell = (x: number, b: Bump) => b.h * Math.exp(-((x - b.x) ** 2) / (2 * b.w * b.w));
const baseAt = (x: number, r: Room) => lerp(r.top, r.bottom, 0.4) - (r.bottom - r.top) * 0.2 * (Math.sin(2.1 * along(x) + 0.6) * 0.6 + Math.sin(4.7 * along(x) + 1.9) * 0.3 + Math.sin(9.3 * along(x)) * 0.1);
const driftAt = (x: number, r: Room) => ((r.bottom - r.top) * 0.2 * (Math.sin(3.3 * along(x) + r.t / 90) + 0.6 * Math.sin(7.1 * along(x) - r.t / 60 + 2))) / 1.3;
export const valueAt = (x: number, r: Room) => baseAt(x, r) + (r.news ?? []).reduce((sum, b) => sum + bell(x, b), 0);
/** How well lit a point of the curve is, 0 to 1: every burning lamp reaches a little way to either side. */
export const lightAt = (x: number, r: Room) => { const reach = r.reach ?? REACH; return clamp01((r.flood ?? 0) + r.lamps.reduce((sum, l) => sum + l.on * Math.exp(-((x - l.x) ** 2) / (2 * reach * reach)), 0)); };
export const priceAt = (x: number, r: Room) => { const seen = lightAt(x, r), live = seen * valueAt(x, r) + (1 - seen) * (baseAt(x, r) + (r.lost ?? 1) * driftAt(x, r)) + (r.edges ?? []).reduce((sum, b) => sum + bell(x, b), 0); return lerp(live, lerp(r.top, r.bottom, 0.4), r.flat ?? 0); };
export const floorOf = (r: Room) => r.bottom - 50;
/** Ten places along the floor; `burning` gives [brightness, fuel left] for the lamps that are lit. */
export const LAMP_X = Array.from({length: 10}, (_, i) => 108 + i * 96);
export const lamps = (burning: Record<number, [number, number]>): Lamp[] => LAMP_X.map((x, i) => ({x, on: burning[i]?.[0] ?? 0, fuel: burning[i]?.[1] ?? 0}));

export const glow = (ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) => {
  if (alpha <= 0 || radius <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};
const lamp = (ctx: Ctx, l: Lamp, y: number, a: number, t: number) => {
  const low = l.fuel < 0.2, on = l.on * (l.on > 0 && low ? 0.72 + 0.28 * Math.sin(t / 2.6 + l.x) : 1);
  ctx.save(); ctx.lineCap = 'round';
  // The fuel ring: what is left to burn.
  ctx.globalAlpha = a * 0.55; ctx.strokeStyle = C.faint; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(l.x, y, 31, 0, Math.PI * 2); ctx.stroke();
  if (l.fuel > 0.005) { ctx.globalAlpha = a * (0.35 + 0.65 * on); ctx.strokeStyle = low ? C.gap : C.lamp; ctx.beginPath(); ctx.arc(l.x, y, 31, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * l.fuel); ctx.stroke(); }
  ctx.globalAlpha = a; ctx.fillStyle = on > 0.05 ? C.lamp : '#14171d'; ctx.strokeStyle = C.dim; ctx.lineWidth = 2;
  if (on > 0.05) { ctx.shadowColor = C.lamp; ctx.shadowBlur = 34 * on; ctx.globalAlpha = a * (0.4 + 0.6 * on); }
  ctx.beginPath(); ctx.arc(l.x, y, 16, 0, Math.PI * 2); ctx.fill(); if (on <= 0.05) { ctx.globalAlpha = a * 0.5; ctx.stroke(); }
  ctx.restore();
};
export const room = (ctx: Ctx, r: Room) => {
  if (r.a <= 0) return;
  const floor = floorOf(r), reach = r.reach ?? REACH;
  // Light first: a pool at each lamp, a soft beam rising from it, and a wash on the curve above.
  r.lamps.filter((l) => l.on > 0.02).forEach((l) => {
    const up = valueAt(l.x, r) - 70, beam = ctx.createLinearGradient(0, floor, 0, up);
    beam.addColorStop(0, 'rgba(255,217,160,0.16)'); beam.addColorStop(1, 'rgba(255,217,160,0.0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = r.a * l.on; ctx.fillStyle = beam;
    [0.7, 1.3, 2.0, 2.8].forEach((wide) => { ctx.beginPath(); ctx.moveTo(l.x - 8, floor); ctx.lineTo(l.x - reach * wide, up); ctx.lineTo(l.x + reach * wide, up); ctx.lineTo(l.x + 8, floor); ctx.fill(); });
    ctx.restore();
    glow(ctx, l.x, floor, 160, 'rgba(255,217,160,0.7)', r.a * l.on * 0.6); glow(ctx, l.x, valueAt(l.x, r), reach * 4.2, 'rgba(255,205,140,0.42)', r.a * l.on * 0.6);
  });
  ctx.save(); ctx.globalAlpha = r.a * 0.5; ctx.strokeStyle = C.faint; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, floor + 50); ctx.lineTo(X1, floor + 50); ctx.stroke(); ctx.restore();
  // Those without a lamp stand between the lamps and see by whatever light reaches them.
  for (let x = X0 + 20; x < X1; x += 48) { if (r.lamps.some((l) => Math.abs(l.x - x) < 44)) continue; ctx.save(); ctx.globalAlpha = r.a * (0.12 + 0.6 * lightAt(x, r)); ctx.fillStyle = C.dim; ctx.beginPath(); ctx.arc(x, floor + 26, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // The gap, then value, then the price on top.
  const step = 6;
  ctx.save(); ctx.lineCap = 'round';
  for (let x = X0; x < X1; x += step) {
    const v0 = valueAt(x, r), v1 = valueAt(x + step, r), p0 = priceAt(x, r), p1 = priceAt(x + step, r);
    if (Math.abs(p0 - v0) > 3) { ctx.globalAlpha = r.a * (r.gap ?? 1) * (r.quote ?? 1) * (0.14 + 0.2 * (1 - lightAt(x, r))); ctx.fillStyle = C.gap; ctx.beginPath(); ctx.moveTo(x, v0); ctx.lineTo(x + step + 0.6, v1); ctx.lineTo(x + step + 0.6, p1); ctx.lineTo(x, p0); ctx.fill(); }
  }
  for (let x = X0; x < X1; x += step) {
    const seen = lightAt(x, r);
    ctx.globalAlpha = r.a * Math.max(r.ghost ?? 0, 0.025 + 0.975 * Math.pow(seen, 1.3)); ctx.strokeStyle = C.value; ctx.lineWidth = 9; ctx.shadowColor = C.value; ctx.shadowBlur = 18 * seen;
    ctx.beginPath(); ctx.moveTo(x, valueAt(x, r)); ctx.lineTo(x + step, valueAt(x + step, r)); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (let x = X0; x < X1; x += step) {
    ctx.globalAlpha = r.a * (r.quote ?? 1) * (0.42 + 0.58 * lightAt(x, r)); ctx.strokeStyle = C.price; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(x, priceAt(x, r)); ctx.lineTo(x + step, priceAt(x + step, r)); ctx.stroke();
  }
  ctx.restore();
  r.lamps.forEach((l) => lamp(ctx, l, floor, r.a, r.t));
};
/** A source that outshines every lamp: the trader who is never wrong. */
export const sun = (ctx: Ctx, x: number, y: number, radius: number, a: number, t: number) => {
  if (a <= 0 || radius <= 0) return;
  glow(ctx, x, y, radius * 9, 'rgba(255,255,255,0.28)', a); glow(ctx, x, y, radius * 3.4, 'rgba(255,255,255,0.75)', a);
  ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const g = (i / 12) * Math.PI * 2 + t / 140, long = radius * (2.4 + 1.1 * Math.sin(t / 17 + i * 2.1)); ctx.globalAlpha = a * 0.28; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(g) * radius * 1.2, Math.sin(g) * radius * 1.2); ctx.lineTo(Math.cos(g) * long, Math.sin(g) * long); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = radius * 1.6; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};

// ── drawing shared with the plots and diagrams ──────────────────────────────
export const path = (ctx: Ctx, pts: number[][], color: string, width: number, alpha: number, dash?: number[]) => {
  if (alpha <= 0 || pts.length < 2) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
};
export const disc = (ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number, blur = 0) => {
  if (alpha <= 0 || radius <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};
/** A run of text with its own colour; `true` sets it as a mathematical symbol. */
export type Term = [string, string?, boolean?];
export const formula = (ctx: Ctx, terms: Term[], x: number, y: number, size: number, alpha: number, align: 'center' | 'left' | 'right' = 'center') => {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const font = (symbol?: boolean) => (symbol ? `italic 500 ${size * 1.08}px ${MATH}` : `600 ${size}px ${SANS}`);
  const widths = terms.map(([s, , symbol]) => { ctx.font = font(symbol); return ctx.measureText(s).width; }), total = widths.reduce((sum, w) => sum + w, 0);
  let at = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  terms.forEach(([s, color, symbol], i) => { ctx.font = font(symbol); ctx.fillStyle = color ?? C.price; ctx.fillText(s, at, y); at += widths[i]; });
  ctx.restore();
};
/** A label tied to the thing it names by a thin line. */
export const callout = (ctx: Ctx, terms: Term[], fromX: number, fromY: number, toX: number, toY: number, a: number) => {
  if (a <= 0) return;
  path(ctx, [[fromX, fromY], [toX, toY]], C.dim, 2, a * 0.8); disc(ctx, fromX, fromY, 5, C.dim, a);
  formula(ctx, terms, toX + (toX >= fromX ? 14 : 0), toY + (toX >= fromX ? 0 : -30), 34, a, toX >= fromX ? 'left' : 'center');
};
