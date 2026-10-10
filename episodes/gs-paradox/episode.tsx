import React from 'react';
import {CX, MATH, PLATE, RAND, SANS, clamp01, easeInOut, easeOut, keys, lerp, seg, text, vis} from '../../engine';
import type {Ctx, Episode, Scene} from '../../engine';
import {C, LAMP_X, callout, disc, floorOf, formula, glow, lamps, path, priceAt, room, sun, valueAt} from './light';
import type {Lamp, Room, Term} from './light';

// 格罗斯曼-斯蒂格利茨悖论, following the source document: the paradox is named first, then the document's
// thesis and its three layers. The wording is the document's, compressed; terms of art are kept and glossed
// once in a line above the captions. The picture is one world throughout — see light.ts — in which
// information is light: informed traders are lamps, intrinsic value a curve only light reveals, the price a
// line that holds to it where lit and drifts where not.

const HUES = [C.value, C.cool, '#7fe0d0', '#c9a7ff', '#ff9fc0'];
/** The room at rest: four lamps in ten, most of the curve lit, a little of it not. */
const TWILIGHT = lamps({0: [0.8, 0.7], 3: [0.8, 0.5], 6: [0.8, 0.82], 9: [0.8, 0.6]});

// ── 0 the subject, stated first ─────────────────────────────────────────────
const title: Scene = {
  id: 'title', dur: 180,
  draw: (ctx, t) => room(ctx, {top: 760, bottom: 1300, lamps: lamps({3: [easeOut(seg(t, 24, 58)), 0.92]}), t, a: vis([0, 180], t), gap: 0.5}),
  subs: [{from: 70, to: 174, rows: [[['信息有成本时，']], [['信息完全有效的市场'], ['不可能存在', true], ['。']]]}],
  voice: [{from: 36, to: 66, rows: [[['格罗斯曼-斯蒂格利茨悖论。']]]}],
  overlay: (t) => (
    <div style={{position: 'absolute', left: 0, width: PLATE.w, top: 205, textAlign: 'center', fontFamily: SANS, opacity: Math.min(seg(t, 40, 60), 1 - seg(t, 172, 180)), transform: `translateY(${(1 - seg(t, 40, 60)) * 20}px)`}}>
      <div style={{fontSize: 92, fontWeight: 700, color: C.price, lineHeight: 1.25}}>格罗斯曼-斯蒂格利茨</div>
      <div style={{fontSize: 180, fontWeight: 700, color: C.value, lineHeight: 1.15, letterSpacing: 24, textShadow: '0 0 60px rgba(242,193,78,.45)'}}>悖论</div>
      <div style={{fontFamily: MATH, fontStyle: 'italic', fontSize: 38, color: C.dim, marginTop: 6}}>Grossman–Stiglitz Paradox</div>
      <div style={{marginTop: 22, color: C.dim, fontSize: 26, lineHeight: 1.7, opacity: seg(t, 60, 78)}}>
        <div>Sanford J. Grossman · Joseph E. Stiglitz</div>
        <div>On the Impossibility of Informationally Efficient Markets</div>
        <div>《美国经济评论》1980 年 6 月</div>
      </div>
    </div>
  ),
};

// ── 1 the document's thesis, and its three layers ───────────────────────────
const thesis: Scene = {
  id: 'thesis', chapter: '命题', dur: 300,
  draw: (ctx, t) => {
    const one = vis([0, 230], t), two = vis([230, 300], t), buy = seg(t, 12, 26), sell = seg(t, 30, 44), deal = seg(t, 56, 80);
    // Two traders who see the same asset differently: that difference is what a trade is made of.
    glow(ctx, 300, 720, 300, 'rgba(142,197,255,0.4)', one * buy); disc(ctx, 300, 720, 22, C.cool, one * buy, 30);
    glow(ctx, 780, 720, 300, 'rgba(255,217,160,0.4)', one * sell); disc(ctx, 780, 720, 22, C.lamp, one * sell, 30);
    formula(ctx, [['认为低估 · 买入', C.cool]], 300, 590, 40, one * buy); formula(ctx, [['认为高估 · 卖出', C.lamp]], 780, 590, 40, one * sell);
    path(ctx, [[340, 720], [lerp(340, 740, deal), 720]], C.price, 3, one * 0.7);
    for (let i = 0; i < 6; i++) { const u = (t / 50 + i / 6) % 1; disc(ctx, lerp(340, 740, i % 2 ? u : 1 - u), 720 + (i % 2 ? -9 : 9), 5, i % 2 ? C.cool : C.lamp, one * deal * Math.sin(u * Math.PI), 10); }
    formula(ctx, [['分歧'], ['　→　', C.dim], ['成交']], CX, 900, 64, one * seg(t, 84, 96));
    [['一', '有效市场'], ['二', '无套利均衡'], ['三', '市场的生态属性']].forEach(([no, name], i) => formula(ctx, [[no, C.value], [`　${name}`]], CX, 560 + i * 170, 62, two * seg(t, 236 + i * 12, 248 + i * 12)));
  },
  subs: [
    {from: 8, to: 110, rows: [[['市场的存在，']], [['依赖'], ['信息的非对称与分歧', true], ['；']]]},
    {from: 116, to: 226, rows: [[['确定性地“战胜市场”，']], [['是在'], ['消灭市场运转的机制', true], ['。']]]},
    {from: 232, to: 294, rows: [[['分三层来理解。']]]},
  ],
};

// ── 2 how to read the room ──────────────────────────────────────────────────
const setup: Scene = {
  id: 'setup', chapter: '命题', dur: 240,
  draw: (ctx, t) => {
    const a = vis([0, 240], t), r: Room = {top: 380, bottom: 1010, lamps: lamps({3: [1, 0.9], 7: [easeOut(seg(t, 176, 204)), 0.96]}), t, a};
    room(ctx, r);
    callout(ctx, [['灯', C.lamp], ['：知情交易者', C.dim]], LAMP_X[3] + 40, floorOf(r), LAMP_X[3] + 110, floorOf(r), a * seg(t, 86, 98) * (1 - seg(t, 160, 170)));
    callout(ctx, [['燃料', C.lamp], ['：信息成本 ', C.dim], ['c', C.gap, true]], LAMP_X[3] - 24, floorOf(r) + 26, LAMP_X[3] - 60, floorOf(r) + 110, a * seg(t, 110, 122) * (1 - seg(t, 160, 170)));
    callout(ctx, [['金线', C.value], ['：内在价值 ', C.dim], ['V', C.value, true]], 380, valueAt(380, r) - 14, 300, valueAt(380, r) - 110, a * seg(t, 166, 178));
    callout(ctx, [['白线', C.price], ['：价格 ', C.dim], ['P', C.price, true]], 560, priceAt(560, r) - 6, 590, priceAt(560, r) - 96, a * seg(t, 178, 190));
  },
  subs: [
    {from: 8, to: 80, rows: [[['用一间暗室来看这件事：']]]},
    {from: 86, to: 160, rows: [[['灯', C.lamp], ['是知情交易者，']], [['点灯要付出'], ['信息成本', C.gap], ['。']]]},
    {from: 166, to: 234, rows: [[['光照到处，'], ['价格', true], ['贴合'], ['内在价值', C.value], ['；']], [['照不到处，价格偏离。']]]},
  ],
};

// ── 3 layer one: premise, contradiction, inference, in one room ─────────────
// The lamps come on; their fuel runs down while the light earns them nothing; they go out in this order.
const OUT = [4, 7, 1, 9, 2, 6, 0, 8, 3, 5], A = {clash: 300, infer: 600, end: 960};
const outAt = (i: number) => 400 + OUT.indexOf(i) * 20;
const burning = (t: number): Lamp[] => LAMP_X.map((x, i) => ({x, on: seg(t, 20 + i * 9, 36 + i * 9) * (1 - seg(t, outAt(i), outAt(i) + 12)), fuel: t < 310 ? 1 : clamp01(1 - (t - 310) / (outAt(i) - 310))}));
const layerOne: Scene = {
  id: 'layerOne', chapter: '一', dur: A.end,
  draw: (ctx, t) => {
    const a = vis([0, A.end], t), lit = LAMP_X.filter((_, i) => t < outAt(i)).length, share = t < 120 ? Math.min(10, Math.floor((t - 20) / 9) + 1) / 10 : lit / 10;
    const r: Room = {top: 300, bottom: 890, lamps: burning(t), t, a, lost: seg(t, 420, 720), ghost: 0.32 * seg(t, A.infer, A.infer + 30),
      news: [{x: 300, h: -95 * easeInOut(seg(t, 640, 664)), w: 70}, {x: 770, h: 85 * easeInOut(seg(t, 744, 768)), w: 80}]};
    room(ctx, r);
    [[300, 640], [770, 744]].forEach(([x, at]) => { const flash = seg(t, at, at + 10) * (1 - seg(t, at + 50, at + 80)); glow(ctx, x, valueAt(x, r), 150, 'rgba(242,193,78,0.6)', a * flash); formula(ctx, [['新信息', C.value]], x, valueAt(x, r) + (x < 500 ? -60 : 64), 32, a * flash); });

    // Premise and contradiction as lines that follow from one another.
    const lines = a * (1 - seg(t, A.infer, A.infer + 16));
    formula(ctx, [['P', C.price, true], [' = ', C.dim], ['V', C.value, true], ['　⇒　', C.dim], ['超额收益', C.gain], [' = 0']], CX, 975, 46, lines * seg(t, 206, 218));
    formula(ctx, [['信息成本 ', C.gap], ['c', C.gap, true], [' > 0']], CX, 1052, 46, lines * seg(t, A.clash + 16, A.clash + 28));
    formula(ctx, [['净收益 = '], ['超额收益', C.gain], [' − '], ['c', C.gap, true], [' < 0']], CX, 1129, 46, lines * seg(t, A.clash + 116, A.clash + 128));
    const bar = lines * seg(t, A.clash + 196, A.clash + 208);
    formula(ctx, [['知情交易者占比 '], ['λ', C.lamp, true]], 300, 1206, 36, bar);
    path(ctx, [[520, 1206], [880, 1206]], C.faint, 16, bar); if (share > 0) path(ctx, [[520, 1206], [520 + 360 * share, 1206]], C.lamp, 16, bar);
    formula(ctx, [['λ', C.lamp, true], [` = ${share.toFixed(1)}`]], 975, 1206, 34, bar);

    // Inference: value still moves; the price has nothing left to follow it by.
    formula(ctx, [['P', C.price, true], [' ≠ ', C.gap], ['V', C.value, true]], CX, 1020, 104, a * seg(t, A.infer + 176, A.infer + 190));
    text(ctx, '“强有效”的前提，被它自己的推论否定', CX, 1150, 38, C.dim, a * seg(t, A.infer + 250, A.infer + 264), 'center', 400);
  },
  subs: [
    {from: 8, to: 96, rows: [[['第一层：'], ['有效市场', true], ['。']]]},
    {from: 102, to: 200, rows: [[['前提：若市场'], ['强有效', true], ['，']], [['价格每一刻反映全部信息，']]]},
    {from: 206, to: 294, rows: [[['则无人能获得'], ['超额收益', C.gain], ['。']]]},
    {from: 306, to: 410, rows: [[['矛盾：搜集、分析信息需要'], ['成本', C.gap], ['：']], [['时间、算力、人力。']]]},
    {from: 416, to: 496, rows: [[['得不到额外补偿，']], [['净收益为负', true], ['。']]]},
    {from: 502, to: 594, rows: [[['理性的投资者，']], [['就会'], ['停止收集信息', true], ['。']]]},
    {from: 606, to: 720, rows: [[['推论：无人挖掘信息，']], [['价格凭什么反映'], ['真实价值', C.value], ['？']]]},
    {from: 726, to: 840, rows: [[['新信息出现，价格'], ['不再响应', true], ['，']]]},
    {from: 846, to: 954, rows: [[['市场陷入盲目：']], [['前提'], ['自我否定', true], ['。']]]},
  ],
  terms: [
    {from: 102, to: 200, text: '强式有效：价格反映全部信息，包括未公开的信息'},
    {from: 206, to: 294, text: '超额收益：实际收益超出基准（预期）收益的部分'},
    {from: 502, to: 594, text: '知情交易者：付出成本获取信息的交易者'},
  ],
};

// ── 3 the four steps, closed into a staircase that only ever climbs ─────────
// A Penrose staircase: 2, 1, 5 and 4 steps round four sides, each step rising, and yet it meets itself.
const S = 132, EX = [0.866 * S, -0.5 * S], EY = [-0.866 * S, -0.5 * S], RISE = 0.25 * S; // the rise that makes 2+1 steps up and 5+4 steps "up" meet again in this projection
const FLIGHTS: [number[], number][] = [[EX, 2], [EY, 1], [[-EX[0], -EX[1]], 5], [[-EY[0], -EY[1]], 4]];
const STEPS = FLIGHTS.flatMap(([dir, n], flight) => Array.from({length: n}, () => ({dir, flight})));
const TREADS = (() => {
  const at = [[0, 0]]; STEPS.slice(0, -1).forEach((s, k) => at.push([at[k][0] + s.dir[0], at[k][1] + s.dir[1] - RISE]));
  const xs = at.map((p) => p[0]), ys = at.map((p) => p[1]), ox = CX - (Math.min(...xs) + Math.max(...xs)) / 2, oy = 640 - (Math.min(...ys) + Math.max(...ys)) / 2;
  return at.map(([x, y]) => [x + ox, y + oy]);
})();
const CLAIMS = ['价格反映全部信息', '获取信息没有超额收益', '无人获取信息', '价格不再含有信息'];
const stairs: Scene = {
  id: 'stairs', chapter: '一', dur: 210,
  draw: (ctx, t) => {
    const a = vis([0, 210], t), u = Math.max(0, (t - 16) / 9) % STEPS.length, k = Math.floor(u), frac = easeInOut(u - k), here = TREADS[k], next = TREADS[(k + 1) % STEPS.length], flight = STEPS[k].flight;
    const order = TREADS.map((_, i) => i).sort((p, q) => TREADS[p][1] - TREADS[q][1]);
    order.forEach((i) => {
      const [x, y] = TREADS[i], near = Math.max(0, 1 - Math.min(Math.abs(i - u), STEPS.length - Math.abs(i - u)) / 2.2), own = STEPS[i].flight === flight, d = STEPS[i].dir, side = Math.abs(d[0] - EX[0]) < 1 || Math.abs(d[0] + EX[0]) < 1 ? EY : EX;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [x + (p * EX[0] + q * EY[0]) / 2, y + (p * EX[1] + q * EY[1]) / 2]);
      ctx.save(); ctx.globalAlpha = a * (0.16 + 0.2 * (own ? 1 : 0) + 0.5 * near); ctx.fillStyle = C.value; ctx.beginPath(); corners.forEach(([cx, cy], j) => (j ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy))); ctx.closePath(); ctx.fill(); ctx.restore();
      path(ctx, [...corners, corners[0]], C.value, 2.5, a * (0.45 + 0.4 * near));
      // The riser up to the next tread.
      const edge = [-1, 1].map((q) => [x + d[0] / 2 + (q * side[0]) / 2, y + d[1] / 2 + (q * side[1]) / 2]);
      ctx.save(); ctx.globalAlpha = a * (0.3 + 0.3 * near); ctx.fillStyle = '#8a6a1e'; ctx.beginPath(); ctx.moveTo(edge[0][0], edge[0][1]); ctx.lineTo(edge[1][0], edge[1][1]); ctx.lineTo(edge[1][0], edge[1][1] - RISE); ctx.lineTo(edge[0][0], edge[0][1] - RISE); ctx.closePath(); ctx.fill(); ctx.restore();
      edge.forEach(([ex, ey]) => path(ctx, [[ex, ey], [ex, ey - RISE]], C.value, 2.5, a * 0.7));
    });
    const wx = lerp(here[0], next[0], frac), wy = lerp(here[1], next[1], frac) - 26 * Math.sin(frac * Math.PI) - 16;
    glow(ctx, wx, wy, 120, 'rgba(255,255,255,0.5)', a); disc(ctx, wx, wy, 11, '#ffffff', a, 24);
    CLAIMS.forEach((claim, i) => {
      const on = i === flight, mid = TREADS[STEPS.findIndex((s) => s.flight === i) + Math.floor(FLIGHTS[i][1] / 2)];
      formula(ctx, [[`${'①②③④'[i]}`, on ? C.value : C.dim]], mid[0] + [96, -110, -50, 124][i], mid[1] + [92, -56, -112, 50][i], 50, a);
      formula(ctx, [[`${'①②③④'[i]}　`, on ? C.value : C.dim], [claim, on ? C.price : C.dim], ...(i === 3 ? [['　⇒　否定 ①', C.gap] as Term] : [])], 170, 1020 + i * 62, 40, a * seg(t, 10 + i * 10, 22 + i * 10), 'left');
    });
  },
  subs: [{from: 8, to: 204, rows: [[['四步首尾相接：']], [['前提推出了'], ['对自身的否定', true], ['。']]]}],
};

// ── 4 the paper's resolution ────────────────────────────────────────────────
// λ is the share of informed traders. Their gain over the uninformed falls as λ rises (the paper's conjecture 2)
// while the price becomes more informative (conjecture 1); the cost c does not move. The curve is a sketch.
const AX = {x0: 170, x1: 930, y0: 1196, top: 916}, REST = 0.44, GO = 116, TURN = 256, RANK = [0, 9, 3, 6, 4, 1, 7, 2, 8, 5];
const LX = (m: number) => lerp(AX.x0, AX.x1, m), gainY = (m: number) => AX.y0 - 28 - 240 * Math.pow(1 - m, 1.8), COST = gainY(REST);
const share = (t: number) => (t < GO ? 0.06 : t < TURN ? lerp(0.06, 0.92, easeInOut(seg(t, GO, TURN))) : REST + 0.48 * Math.exp(-(t - TURN) / 46) * Math.cos((t - TURN) / 26));
const resolve: Scene = {
  id: 'resolve', chapter: '一', dur: 720,
  draw: (ctx, t) => {
    const a = vis([0, 720], t), m = share(t), mx = LX(m), my = gainY(m), net = COST - my, sign = Math.abs(net) < 8 ? 0 : Math.sign(net), rest = seg(t, 376, 390);
    room(ctx, {top: 290, bottom: 800, lamps: LAMP_X.map((x, i) => ({x, on: 0.85 * clamp01(m * 10 - RANK.indexOf(i)), fuel: 0.72})), t, a, reach: 100, lost: clamp01(1.15 - m * 1.7)});
    formula(ctx, [['净收益 = '], ['G', C.gain, true], ['(', C.gain], ['λ', C.lamp, true], [')', C.gain], [' − '], ['c', C.gap, true], ...((sign > 0 ? [['　> 0', C.gain], ['　有人进入', C.dim]] : sign < 0 ? [['　< 0', C.gap], ['　有人退出', C.dim]] : [['　= 0'], ['　均衡', C.dim]]) as Term[])], CX, 858, 42, a * seg(t, 20, 34));
    for (let i = 1; i <= 4; i++) { path(ctx, [[AX.x0, lerp(AX.y0, AX.top, i / 4)], [AX.x1, lerp(AX.y0, AX.top, i / 4)]], C.faint, 1.5, a * 0.6); path(ctx, [[LX(i / 4), AX.y0], [LX(i / 4), AX.top]], C.faint, 1.5, a * 0.6); }
    path(ctx, [[AX.x0, AX.top - 14], [AX.x0, AX.y0], [AX.x1 + 22, AX.y0]], C.dim, 3, a);
    formula(ctx, [['0', C.dim]], AX.x0, AX.y0 + 30, 26, a); formula(ctx, [['1', C.dim]], AX.x1, AX.y0 + 30, 26, a); formula(ctx, [['λ', C.lamp, true], ['　知情交易者占比', C.dim]], (AX.x0 + AX.x1) / 2, AX.y0 + 36, 32, a);
    path(ctx, [[AX.x0, COST], [AX.x1, COST]], C.gap, 5, a); formula(ctx, [['c', C.gap, true], ['　信息成本', C.gap]], AX.x1, COST - 32, 32, a, 'right');
    const curve: number[][] = []; for (let u = 0; u <= seg(t, 8, 60) + 0.001; u += 0.01) curve.push([LX(u), gainY(u)]);
    path(ctx, curve, C.gain, 6, a); formula(ctx, [['G', C.gain, true], ['(', C.gain], ['λ', C.lamp, true], [')', C.gain], ['　获取信息的收益', C.gain]], AX.x0 + 150, AX.top + 4, 32, a * seg(t, 50, 64), 'left');
    formula(ctx, [['示意图 · 依据论文猜想 1、2', C.dim]], AX.x0 + 16, AX.y0 - 24, 26, a * seg(t, 80, 94), 'left');
    path(ctx, [[mx, AX.y0], [mx, Math.max(my, COST)]], C.dim, 2, a * 0.7, [6, 8]); path(ctx, [[mx, my], [mx, COST]], net > 0 ? C.gain : C.gap, 10, a * 0.8);
    disc(ctx, mx, my, 14, C.price, a, 22);
    if (rest > 0) { ctx.save(); ctx.globalAlpha = a * rest; ctx.strokeStyle = C.price; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(LX(REST), COST, 30 + 5 * Math.sin(t / 9), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); formula(ctx, [['λ*', C.lamp, true], ['　均衡', C.price]], LX(REST) - 130, COST + 52, 34, a * rest); }
  },
  subs: [
    {from: 8, to: 110, rows: [[['论文给出的解：']], [['价格只'], ['部分', true], ['反映信息。']]]},
    {from: 116, to: 250, rows: [[['知情者越多，价格信息含量越高，']], [['获取信息的'], ['收益', C.gain], ['越低。']]]},
    {from: 256, to: 370, rows: [[['收益', C.gain], ['高于'], ['成本', C.gap], ['，有人进入；']], [['低于'], ['成本', C.gap], ['，有人退出。']]]},
    {from: 376, to: 490, rows: [[['均衡时，知情者与不知情者的']], [['期望效用相等', true], ['。']]]},
    {from: 496, to: 610, rows: [[['市场必然保留微小的'], ['无效性', true], ['，']], [['作为对信息挖掘者的补偿。']]]},
    {from: 616, to: 714, rows: [[['这种“战胜”是局部的、动态的，']], [['且'], ['成本极高', true], ['。']]]},
  ],
  terms: [
    {from: 8, to: 110, text: '原文：an equilibrium degree of disequilibrium'},
    {from: 376, to: 490, text: '期望效用：各种可能结果的效用按概率加权的平均'},
    {from: 496, to: 610, text: '小结 一：价格不可能完全有效，无效性是对信息的补偿', recap: true},
  ],
};

// ── 5 layer two: suppose a source that is never wrong ───────────────────────
const assume: Scene = {
  id: 'assume', chapter: '二', dur: 360,
  draw: (ctx, t) => {
    // The source rises over the twilight room. It lights everything at once; the lamps, now worth nothing, go out.
    const a = vis([0, 360], t), rise = easeOut(seg(t, 190, 240)), out = seg(t, 250, 310);
    room(ctx, {top: 430, bottom: 920, lamps: TWILIGHT.map((l) => ({...l, on: l.on * (1 - out), fuel: l.fuel * (1 - out)})), t, a, reach: 100, lost: 0.4, flood: rise});
    sun(ctx, CX, lerp(620, 356, rise), 42 * rise, a, t);
    ['确定性', '无风险', '无限可扩展'].forEach((s, i) => formula(ctx, [[s]], 230 + i * 310, 1060, 50, a * seg(t, 250 + i * 28, 262 + i * 28)));
  },
  subs: [
    {from: 8, to: 110, rows: [[['微小的无效性可以存在。']], [['那么，'], ['确定的、无限的', true], ['优势呢？']]]},
    {from: 116, to: 190, rows: [[['第二层：'], ['无套利均衡', true], ['。']]]},
    {from: 196, to: 354, rows: [[['假如有人拥有一种能力：']], [['确定性、无风险、无限可扩展', true], ['。']]]},
  ],
  terms: [{from: 196, to: 354, text: '以下为推演，不是 1980 年论文的结论'}],
};

// The three consequences all happen in the room the source has just risen over.
const DEN = {top: 430, bottom: 920}, SUN = {x: CX, y: 356, r: 42}, DEN_FLOOR = floorOf({...DEN, lamps: [], t: 0, a: 1});
/** The ten places on the floor, now simply the other traders, each with a colour of its own. */
const trader = (ctx: Ctx, i: number, a: number, lift = 0) => { const x = lerp(LAMP_X[i], SUN.x, lift), y = lerp(DEN_FLOOR, SUN.y, lift); glow(ctx, x, y, 90, HUES[i % 5], a * 0.4); disc(ctx, x, y, 13, HUES[i % 5], a, 18); };

// ── 6 nobody will take the other side ───────────────────────────────────────
const leaveAt = (i: number) => 150 + ((i * 7) % 10) * 13;
const counterparty: Scene = {
  id: 'counterparty', chapter: '二', dur: 390,
  draw: (ctx, t) => {
    // With no one left to trade against there is no price to speak of: the white line fades from the room.
    const a = vis([0, 390], t), left = LAMP_X.filter((_, i) => t < leaveAt(i)).length;
    room(ctx, {...DEN, lamps: lamps({}), t, a, flood: 1, quote: lerp(1, 0.12, seg(t, 300, 350))});
    LAMP_X.forEach((x, i) => {
      const here = seg(t, 10 + i * 4, 24 + i * 4), gone = seg(t, leaveAt(i), leaveAt(i) + 14);
      path(ctx, [[SUN.x, SUN.y], [x, DEN_FLOOR]], C.price, 2, a * 0.4 * here * (1 - seg(t, leaveAt(i), leaveAt(i) + 6)));
      trader(ctx, i, a * here * lerp(1, 0.1, gone));
    });
    sun(ctx, SUN.x, SUN.y, SUN.r, a, t);
    formula(ctx, [[t < 236 ? '买入' : '卖出']], SUN.x + 150, SUN.y, 46, a * seg(t, 126, 138));
    formula(ctx, [['愿意成为其对手方：', C.dim], [`${left}`, left ? C.price : C.gap]], CX, 1020, 46, a * seg(t, 126, 138));
    formula(ctx, [['流动性 '], ['→ 0', C.gap]], CX, 1120, 60, a * seg(t, 290, 304));
  },
  subs: [
    {from: 8, to: 120, rows: [[['其一：'], ['交易对手方消失', true], ['。']], [['交易的前提是分歧。']]]},
    {from: 126, to: 250, rows: [[['面对公认“永不犯错”的主体，']], [['没有理性的人愿做'], ['对手盘', true], ['。']]]},
    {from: 256, to: 384, rows: [[['流动性', true], ['归零，']], [['公开竞价交易制度崩溃。']]]},
  ],
  terms: [
    {from: 126, to: 250, text: '对手盘：与你做相反方向交易的一方'},
    {from: 256, to: 384, text: '流动性：资产能迅速成交而不显著影响价格的能力'},
  ],
};

// ── 7 a sure gain is competed away, and the capital pools ───────────────────
const arbitrage: Scene = {
  id: 'arbitrage', chapter: '二', dur: 390,
  draw: (ctx, t) => {
    // Open gaps between price and value are sure profits. Capital pours down from the source and every gap shuts.
    const a = vis([0, 390], t), close = easeInOut(seg(t, 130, 236)), one = 1 - seg(t, 270, 284), two = seg(t, 282, 296);
    const r: Room = {...DEN, lamps: lamps({}), t, a, flood: close, lost: 1, ghost: 0.6};
    room(ctx, r);
    callout(ctx, [['价差', C.gap], ['：未闭合的套利空间', C.dim]], 250, (valueAt(250, r) + priceAt(250, r)) / 2, 300, DEN.top - 10, a * seg(t, 20, 34) * (1 - seg(t, 150, 170)));
    for (let i = 0; i < 120; i++) { const q = RAND[i * 3], born = 104 + q[0] * 130, u = (t - born) / 40, x = 60 + q[1] * 960; if (u > 0 && u < 1) disc(ctx, lerp(SUN.x, x, easeOut(u)), lerp(SUN.y, valueAt(x, r), easeOut(u)), 3.5 + 4 * q[2], '#ffffff', a * (1 - u * 0.6), 12); }
    formula(ctx, [['套利资金规模', C.dim]], 250, 1020, 34, a * one); path(ctx, [[400, 1020], [880, 1020]], C.faint, 16, a * one); path(ctx, [[400, 1020], [400 + 480 * Math.max(0.03, close), 1020]], C.price, 16, a * one); formula(ctx, [['→ ∞']], 960, 1020, 34, a * one * seg(close, 0.9, 1));
    formula(ctx, [['价差', C.gap], [' → 0　　收益率 → 无风险利率 '], ['r', C.price, true], ['f', C.price, true]], CX, 1120, 44, a * one * seg(close, 0.9, 1));
    // Then everyone else's capital goes the same way.
    let pooled = 0;
    LAMP_X.forEach((_, i) => { const lift = easeInOut(seg(t, 292 + ((i * 3) % 10) * 5, 340 + ((i * 3) % 10) * 5)); pooled += lift; trader(ctx, i, a * seg(t, 10 + i * 4, 24 + i * 4) * (1 - lift * lift), lift); });
    sun(ctx, SUN.x, SUN.y, SUN.r + pooled * 2, a, t);
    formula(ctx, [['单一垄断资本']], CX, 1060, 56, a * two * seg(pooled, 5, 8));
  },
  subs: [
    {from: 8, to: 110, rows: [[['其二：'], ['套利至死', true], ['。']]]},
    {from: 116, to: 190, rows: [[['按无套利定价原理，确定性策略']], [['会吸引'], ['无限的杠杆资金', true], ['，']]]},
    {from: 196, to: 276, rows: [[['价差被瞬间抹平，']], [['收益率降至'], ['无风险利率', true], ['。']]]},
    {from: 282, to: 384, rows: [[['资本集中为单一垄断者，']], [['价格发现', true], ['被统一分配取代。']]]},
  ],
  terms: [{from: 116, to: 276, text: '无套利原理：无风险的组合只能获得无风险利率'}],
};

// ── 8 what the market was for ───────────────────────────────────────────────
// Prices tell savings where value is highest. The peaks of the value curve stand for the most productive firms.
const REF: Room = {...DEN, lamps: [], t: 0, a: 1};
const PEAKS = (() => { const found: number[] = []; for (let x = 80; x < 1000; x += 4) if (valueAt(x, REF) < valueAt(x - 4, REF) && valueAt(x, REF) <= valueAt(x + 4, REF)) found.push(x); return found.sort((p, q) => valueAt(p, REF) - valueAt(q, REF)).slice(0, 2); })();
const allocate: Scene = {
  id: 'allocate', chapter: '二', dur: 300,
  draw: (ctx, t) => {
    const a = vis([0, 300], t), dry = easeInOut(seg(t, 196, 250)), live = 1 - dry;
    const r: Room = {...DEN, lamps: TWILIGHT.map((l) => ({...l, on: l.on * live, fuel: l.fuel * live})), t, a, reach: 100, lost: 0.4, flat: dry, ghost: 0.5 * dry};
    room(ctx, r);
    PEAKS.forEach((x) => { glow(ctx, x, valueAt(x, r), 120, 'rgba(242,193,78,0.55)', a * live * seg(t, 60, 80)); formula(ctx, [['高效率企业', C.value]], Math.max(150, Math.min(930, x)), valueAt(x, r) - 56, 30, a * seg(t, 60, 74) * lerp(0.35, 1, live)); });
    for (let i = 0; i < 44; i++) {
      const q = RAND[i * 7], from = 70 + q[0] * 940, to = PEAKS.reduce((best, x) => (Math.abs(x - from) < Math.abs(best - from) ? x : best), PEAKS[0]), u = (t / 84 + q[1]) % 1, e = easeInOut(u);
      // Guided by the price, savings climb to where value is highest; once the price is a dead level they have nowhere to go.
      disc(ctx, lerp(from, to, e), lerp(DEN_FLOOR - 10, valueAt(to, r) + 6, e) - 60 * Math.sin(e * Math.PI) * (to > from ? 1 : -1) * 0, 4 + 4 * q[2], C.lamp, a * live * seg(t, 30, 60) * Math.sin(u * Math.PI), 12);
      disc(ctx, from + 6 * Math.sin(t / 20 + i), DEN_FLOOR - 14 + 5 * Math.cos(t / 26 + i * 2), 4 + 3 * q[2], C.dim, a * dry * 0.7);
    }
    sun(ctx, SUN.x, SUN.y, SUN.r * lerp(0.5, 1.3, dry), a * lerp(0.5, 1, dry), t);
    formula(ctx, [['储蓄', C.lamp], ['　→　', C.dim], ['最具效率的实体经济', C.value]], CX, 1040, 46, a * seg(t, 96, 110) * live);
    formula(ctx, [['估值 · 定价 · 风险转移', C.dim], ['　失灵', C.gap]], CX, 1040, 46, a * seg(t, 236, 250));
  },
  subs: [
    {from: 8, to: 90, rows: [[['其三：'], ['资本配置功能', true], ['解体。']]]},
    {from: 96, to: 190, rows: [[['市场本应引导储蓄，']], [['流向'], ['最具效率的实体经济', true], ['。']]]},
    {from: 196, to: 294, rows: [[['波动与流动性被吸干，']], [['估值、定价与风险转移'], ['失灵', true], ['。']]]},
  ],
  terms: [{from: 196, to: 294, text: '小结 二：确定性的优势，会让市场停止运转', recap: true}],
};

// ── 9 layer three: an ecology ───────────────────────────────────────────────
const KINDS = ['价值投资', '趋势交易', '量化高频', '指数基金', '散户'];
const kindAt = (i: number) => { const g = -Math.PI / 2 + (i * Math.PI * 2) / 5; return [CX + Math.cos(g) * 320, 740 + Math.sin(g) * 330]; };
const eatenAt = (i: number) => 334 + i * 22;
const ecology: Scene = {
  id: 'ecology', chapter: '三', dur: 540,
  draw: (ctx, full) => {
    // The first two seconds belong to the sentence that leads in; the source that caused the failures fades with it.
    const a = vis([0, 540], full), t = Math.max(0, full - 60), collapse = seg(t, 444, 470);
    sun(ctx, CX, 740, 30, a * (1 - seg(full, 36, 64)), full);
    KINDS.forEach((_, i) => { const from = kindAt(i), to = kindAt((i + 2) % 5), alive = (1 - seg(t, eatenAt(i), eatenAt(i) + 10)) * (1 - seg(t, eatenAt((i + 2) % 5), eatenAt((i + 2) % 5) + 10)), on = a * alive * seg(t, 50 + i * 10, 80 + i * 10);
      path(ctx, [from, to], C.dim, 1.5, on * 0.35);
      for (let k = 0; k < 7; k++) { const u = (t / 80 + k / 7 + i * 0.2) % 1; disc(ctx, lerp(from[0], to[0], u), lerp(from[1], to[1], u), 4.5, HUES[i], on * Math.sin(u * Math.PI), 10); } });
    KINDS.forEach((kind, i) => {
      const [x, y] = kindAt(i), eaten = easeInOut(seg(t, eatenAt(i), eatenAt(i) + 36)), shown = seg(t, 10 + i * 10, 26 + i * 10);
      glow(ctx, x, y, 170, HUES[i], a * 0.3 * shown * (1 - eaten));
      for (let k = 0; k < 16; k++) { const q = RAND[i * 31 + k * 7], g = q[0] * Math.PI * 2 + t / 300, d = 12 + q[1] * 72, sx = x + Math.cos(g) * d, sy = y + Math.sin(g) * d, turn = eaten * 2.4, dx = sx - CX, dy = sy - 740;
        disc(ctx, CX + (dx * Math.cos(turn) - dy * Math.sin(turn)) * (1 - eaten), 740 + (dx * Math.sin(turn) + dy * Math.cos(turn)) * (1 - eaten), 3 + 5 * q[2], HUES[i], a * shown * (0.5 + 0.5 * Math.sin(t / 14 + k)) * (1 - eaten * eaten), 12); }
      formula(ctx, [[kind, HUES[i]]], x, y + (y < 740 ? -104 : 108), 36, a * shown * (1 - seg(t, eatenAt(i), eatenAt(i) + 14)));
    });
    const fed = KINDS.filter((_, i) => t > eatenAt(i) + 30).length;
    sun(ctx, CX, 740, (30 * easeOut(seg(t, 304, 330)) + fed * 9) * (1 - collapse), a * (1 - collapse), t);
  },
  subs: [
    {from: 8, to: 62, rows: [[['对手方、定价、配置同时失灵，']], [['因为市场'], ['不是一台机器', true], ['。']]]},
    {from: 68, to: 160, rows: [[['第三层：市场是'], ['生态系统', true], ['。']]]},
    {from: 166, to: 354, rows: [[['信息、模型、期限各不相同：']], [['多样性', true], ['，就是流动性。']]]},
    {from: 360, to: 450, rows: [[['一个无法被克制的'], ['终极捕食者', true], ['，']]]},
    {from: 456, to: 534, rows: [[['吃尽猎物之后，']], [['整个系统'], ['随之崩溃', true], ['。']]]},
  ],
  terms: [{from: 456, to: 534, text: '小结 三：市场靠分歧运转，多样性就是流动性', recap: true}],
};

// ── 11 summary, then the conclusion ─────────────────────────────────────────
// Twice an edge opens between price and value; each time the price itself closes it.
const EDGES = [{x: 250, h: -105, at: 126}, {x: 790, h: 95, at: 250}];
const pulse = (t: number, at: number) => easeOut(seg(t, at, at + 18)) * (1 - easeInOut(seg(t, at + 46, at + 90)));
const summary: Scene = {
  id: 'summary', chapter: '结论', dur: 360,
  draw: (ctx, t) => {
    const a = vis([0, 360], t), r: Room = {top: 300, bottom: 860, lamps: TWILIGHT, t, a, reach: 100, lost: 0.4, edges: EDGES.map((e) => ({x: e.x, h: e.h * pulse(t, e.at), w: 46}))};
    room(ctx, r);
    EDGES.forEach((e) => { const on = pulse(t, e.at); formula(ctx, [['优势', C.gain]], e.x, valueAt(e.x, r) + (e.h < 0 ? e.h - 44 : e.h + 46) * Math.max(on, 0.5), 36, a * on); });
    const stage = EDGES.reduce((now, e) => (t >= e.at ? Math.min(3, Math.floor((t - e.at) / 27)) : now), -1), list = a * seg(t, 110, 124);
    ['优势出现', '被感知、规模变大', '价格自我调整', '优势消失'].forEach((s, i) => formula(ctx, [[s, i === stage ? C.price : C.dim]], 110, 960 + i * 62, 38, list, 'left'));
    path(ctx, [[84, 946], [84, 1160]], C.faint, 3, list); if (stage >= 0) disc(ctx, 84, 960 + stage * 62, 8, C.gain, list, 12);
  },
  subs: [
    {from: 8, to: 110, rows: [[['“没有人能战胜市场”，']], [['不是说投资高手不存在；']]]},
    {from: 116, to: 236, rows: [[['而是不存在超脱于市场之外、']], [['持续收割却'], ['不改变规则', true], ['的外挂。']]]},
    {from: 242, to: 354, rows: [[['任何优势一旦被感知或规模变大，']], [['价格就会'], ['自我调整', true], ['，将其吞噬。']]]},
  ],
};
const END_AT = 330;
const RECAPS = ['价格不可能完全有效，无效性是对信息的补偿', '确定性的优势，会让市场停止运转', '市场靠分歧运转，多样性就是流动性'];
const conclusion: Scene = {
  id: 'conclusion', chapter: '结论', dur: 450,
  draw: (ctx, t) => room(ctx, {top: 290, bottom: 780, lamps: TWILIGHT, t, a: vis([0, 450], t), reach: 100, lost: 0.4}),
  subs: [],
  voice: [
    {from: 10, to: 104, rows: [[['结论：市场不可能被确定性地战胜；这样的能力一旦存在，被消灭的是市场本身。']]]},
    {from: 108, to: 142, rows: [[['一，价格不可能完全有效，无效性是对信息的补偿。']]]},
    {from: 144, to: 178, rows: [[['二，确定性的优势，会让市场停止运转。']]]},
    {from: 180, to: 316, rows: [[['三，市场靠分歧运转，多样性就是流动性。']]]},
  ],
  overlay: (t) => {
    const verdict = Math.min(seg(t, 6, 22), 1 - seg(t, END_AT - 14, END_AT)), end = seg(t, END_AT + 6, END_AT + 24);
    return (
      <>
        <div style={{position: 'absolute', left: 60, width: 960, top: 830, textAlign: 'center', fontFamily: SANS, opacity: verdict}}>
          <div style={{fontSize: 34, letterSpacing: 16, color: C.value}}>结论</div>
          <div style={{fontSize: 60, fontWeight: 700, color: C.price, lineHeight: 1.4, marginTop: 26, opacity: seg(t, 14, 30)}}>市场不可能被<span style={{color: C.value}}>确定性地</span>战胜；</div>
          <div style={{fontSize: 60, fontWeight: 700, color: C.price, lineHeight: 1.4, opacity: seg(t, 50, 66)}}>这样的能力一旦存在，</div>
          <div style={{fontSize: 60, fontWeight: 700, color: C.price, lineHeight: 1.4, opacity: seg(t, 50, 66)}}>被消灭的是<span style={{color: C.gap}}>市场本身</span>。</div>
          <div style={{marginTop: 50, textAlign: 'left', paddingLeft: 70, fontSize: 36, lineHeight: 1.9, color: C.price}}>
            {RECAPS.map((line, k) => <div key={k} style={{opacity: seg(t, 110 + k * 36, 126 + k * 36)}}><span style={{color: C.value, marginRight: 22}}>{'一二三'[k]}</span>{line}</div>)}
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, width: PLATE.w, top: 980, textAlign: 'center', fontFamily: SANS, opacity: end, transform: `translateY(${(1 - end) * 24}px)`}}>
          <div style={{fontSize: 76, fontWeight: 700, color: C.price, lineHeight: 1.25, whiteSpace: 'nowrap'}}>格罗斯曼-斯蒂格利茨<span style={{color: C.value}}>悖论</span></div>
          <div style={{width: 160, height: 6, background: C.value, margin: '40px auto'}} />
          <div style={{fontSize: 40, fontWeight: 600, color: C.price}}>战胜市场与市场消亡</div>
          <div style={{fontSize: 28, color: C.dim, marginTop: 24, letterSpacing: 2}}>内容整理自 Wei-Book · game-theory</div>
        </div>
      </>
    );
  },
};

export const episode: Episode = {
  title: '格罗斯曼-斯蒂格利茨悖论', fps: 30,
  tones: {ground: C.night, text: C.price, dim: C.dim, faint: C.faint, accent: C.value, mark: 'rgba(252,98,85,.5)'},
  trail: [['命题', '命题'], ['一', '一 有效市场'], ['二', '二 无套利均衡'], ['三', '三 生态属性'], ['结论', '结论']],
  scenes: [title, thesis, setup, layerOne, stairs, resolve, assume, counterparty, arbitrage, allocate, ecology, summary, conclusion],
};
