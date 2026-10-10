import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Audio, Composition, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {PLATE, SANS, easeOut, seg, type Ctx} from './kit';

// An explainer film: an episode is code. Each scene draws its picture on a canvas from its own clock and lists
// the sentences said over it; this file supplies everything around the picture — captions, the line of
// glossary above them, the trail showing where the argument stands, and the pacing that makes each sentence's
// stretch of the scene last exactly as long as its recording.

/** Caption text and how it is marked: `true` for the highlighter, a colour for a term that keeps that colour. */
export type Part = [string, (boolean | string)?];
/** A sentence and the stretch of the scene's clock it belongs to. */
export type Sub = {from: number; to: number; rows: Part[][]};
/** A line above the captions: a term explained, or (`recap`) what a part of the argument has just established. */
export type Gloss = {from: number; to: number; text: string; recap?: boolean};
/**
 * `subs` are shown and spoken; `voice` is spoken only, for text the picture already carries.
 * `chapter` names the scene's place on the episode's trail; a scene with none is shown without the header.
 */
export type Scene = {id: string; chapter?: string; dur: number; draw: (ctx: Ctx, t: number) => void; subs: Sub[]; voice?: Sub[]; terms?: Gloss[]; overlay?: (t: number) => React.ReactNode};
export type Tones = {ground: string; text: string; dim: string; faint: string; accent: string; mark: string};
/** `trail` is the argument's stages in order: [key a scene names as its chapter, the name shown while it is current]. */
export type Episode = {title: string; fps: number; tones: Tones; trail: [string, string][]; scenes: Scene[]};
/** One recorded sentence, as written by tools/voice.py. */
export type Clip = {from: number; file: string; frames: number};
export type Timing = {scenes: Record<string, Clip[]>};

const spoken = (scene: Scene) => [...scene.subs, ...(scene.voice ?? [])].sort((p, q) => p.from - q.from);
/** Every sentence to be recorded, in the order it is said. */
export const narration = (episode: Episode) => episode.scenes.flatMap((scene) => spoken(scene).map((s) => ({scene: scene.id, from: s.from, to: s.to, text: s.rows.map((row) => row.map(([part]) => part).join('')).join('')})));

// Pacing. A scene is written against its own clock with a window for every sentence. Once the sentences are
// recorded, each window is replayed slower or faster so that it lasts as long as its recording, and whatever is
// drawn inside the window keeps step with the voice. Without recordings the scene plays as written.
const LEAD = 4, TAIL = 8, FASTEST = 0.72;
type Span = {from: number; to: number; out: number; clip?: Clip};
const plan = (scene: Scene, clips: Clip[]): Span[] => {
  const spans: Span[] = [];
  let at = 0;
  for (const s of spoken(scene)) {
    if (s.from < at) throw new Error(`Scene ${scene.id}: the sentence at ${s.from} starts before the one before it has ended`);
    const clip = clips.find((c) => c.from === s.from);
    if (s.from > at) spans.push({from: at, to: s.from, out: s.from - at});
    spans.push({from: s.from, to: s.to, out: clip ? Math.max(clip.frames + LEAD + TAIL, Math.round((s.to - s.from) * FASTEST)) : s.to - s.from, clip});
    at = s.to;
  }
  if (scene.dur > at) spans.push({from: at, to: scene.dur, out: scene.dur - at});
  return spans;
};
const pace = (episode: Episode, timing: Timing) => {
  for (const [id, clips] of Object.entries(timing.scenes)) {
    const scene = episode.scenes.find((s) => s.id === id);
    if (!scene) throw new Error(`Recorded scene ${id} is not in the episode`);
    for (const clip of clips) if (!spoken(scene).some((s) => s.from === clip.from)) throw new Error(`Scene ${id} has no sentence at ${clip.from}; the recording is of an older script`);
  }
  const plans = episode.scenes.map((scene) => plan(scene, timing.scenes[scene.id] ?? [])), lengths = plans.map((spans) => spans.reduce((sum, span) => sum + span.out, 0));
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((sum, n) => sum + n, 0));
  const clips = plans.flatMap((spans, i) => { let at = starts[i]; return spans.flatMap((span) => { const from = at; at += span.out; return span.clip ? [{at: from + LEAD, clip: span.clip}] : []; }); });
  return {plans, starts, duration: starts[starts.length - 1] + lengths[lengths.length - 1], clips};
};

const Caption: React.FC<{sub: Sub; t: number; tones: Tones}> = ({sub, t, tones}) => (
  <div style={{position: 'absolute', left: 60, width: 960, top: 1290, height: 340, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 56, lineHeight: 1.45, color: tones.text}}>
    {sub.rows.map((row, r) => {
      const o = Math.min(seg(t, sub.from + r * 12, sub.from + r * 12 + 8), 1 - seg(t, sub.to - 6, sub.to)), wipe = easeOut(seg(t, sub.from + r * 12 + 8, sub.from + r * 12 + 24));
      return (
        <div key={r} style={{opacity: o, transform: `translateY(${(1 - o) * 18}px)`}}>
          {row.map(([part, mark], k) => <span key={k} style={typeof mark === 'string' ? {color: mark} : mark ? {backgroundImage: `linear-gradient(transparent 58%, ${tones.mark} 58%)`, backgroundRepeat: 'no-repeat', backgroundSize: `${wipe * 100}% 100%`, padding: '0 4px'} : undefined}>{part}</span>)}
        </div>
      );
    })}
  </div>
);

const Film: React.FC<{episode: Episode; paced: ReturnType<typeof pace>}> = ({episode, paced}) => {
  const f = useCurrentFrame(), canvas = useRef<HTMLCanvasElement>(null), {tones} = episode;
  let i = episode.scenes.length - 1;
  while (i > 0 && f < paced.starts[i]) i--;
  const scene = episode.scenes[i];
  // the scene's own clock, this many frames after the scene came on screen
  let t = scene.dur - 0.001, left = f - paced.starts[i];
  for (const span of paced.plans[i]) { if (left < span.out) { t = span.from + (left / span.out) * (span.to - span.from); break; } left -= span.out; }
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.save(); ctx.fillStyle = tones.ground; ctx.fillRect(0, 0, PLATE.w, PLATE.h); ctx.restore();
    scene.draw(ctx, t);
  }, [scene, t, tones]);
  return (
    <AbsoluteFill style={{background: tones.ground}}>
      {paced.clips.map((line) => <Sequence key={line.clip.file} from={line.at} durationInFrames={line.clip.frames + 12} layout="none"><Audio src={staticFile(line.clip.file)} /></Sequence>)}
      <canvas ref={canvas} width={PLATE.w} height={PLATE.h} style={{position: 'absolute', inset: 0}} />
      {scene.chapter && (
        <div style={{position: 'absolute', left: 70, right: 70, top: 168, fontFamily: SANS}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 30, letterSpacing: 4, color: tones.dim}}>
            <span>{episode.title}</span>
            <span>{episode.trail.map(([key, name], k) => <span key={key} style={{color: key === scene.chapter ? tones.accent : tones.dim, opacity: key === scene.chapter ? 1 : 0.6, marginLeft: k ? 18 : 0}}>{key === scene.chapter ? name : key}</span>)}</span>
          </div>
          <div style={{height: 3, background: tones.faint, marginTop: 16}}><div style={{height: 3, width: `${(f / paced.duration) * 100}%`, background: tones.accent}} /></div>
        </div>
      )}
      {scene.overlay?.(t)}
      {(scene.terms ?? []).map((g, k) => {
        const o = Math.min(seg(t, g.from + 6, g.from + 18), 1 - seg(t, g.to - 6, g.to));
        return o > 0 ? <div key={`${scene.id}-${k}`} style={{position: 'absolute', left: 60, width: 960, top: 1262, textAlign: 'center', fontFamily: SANS, fontSize: g.recap ? 33 : 30, fontWeight: g.recap ? 600 : 400, color: g.recap ? tones.accent : tones.dim, opacity: o}}><span style={{borderLeft: `4px solid ${tones.accent}`, paddingLeft: 16}}>{g.text}</span></div> : null;
      })}
      {scene.subs.filter((s) => t >= s.from && t <= s.to).map((s) => <Caption key={`${scene.id}-${s.from}`} sub={s} t={t} tones={tones} />)}
    </AbsoluteFill>
  );
};

/** The Remotion root for one episode, paced by its recordings if there are any. */
export const explainerRoot = (episode: Episode, timing: Timing): React.FC => {
  const paced = pace(episode, timing), Paced: React.FC = () => <Film episode={episode} paced={paced} />;
  return () => <Composition id="Explainer" component={Paced} fps={episode.fps} width={PLATE.w} height={PLATE.h} durationInFrames={paced.duration} />;
};
