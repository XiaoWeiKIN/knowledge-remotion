// Render an episode: review stills at chosen frames, or the film.
//   node tools/render.mjs EPISODE [--stills 150,900] [--scale 0.5] [--silent] [--out NAME] [--range 0-359] [--concurrency 3]
// If episodes/EPISODE/voice exists the film is paced by its recordings and carries them as its sound; --silent
// ignores them and plays the scenes as written. Stills go to out/EPISODE/stills, the film to out/EPISODE/NAME.mp4
// (NAME defaults to "film", or "silent"); an existing film is never written over.
import {readFile, writeFile, mkdir, mkdtemp, copyFile, rm, lstat} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {bundle} from '@remotion/bundler';
import {ensureBrowser, openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const home = dirname(dirname(fileURLToPath(import.meta.url)));
const {values, positionals} = parseArgs({allowPositionals: true, options: {stills: {type: 'string'}, scale: {type: 'string', default: '1'}, silent: {type: 'boolean', default: false}, out: {type: 'string'}, range: {type: 'string'}, concurrency: {type: 'string', default: '3'}}});
if (positionals.length !== 1) throw new Error('Usage: node tools/render.mjs EPISODE [--stills 150,900] [--scale 0.5] [--silent] [--out NAME] [--range 0-359] [--concurrency 3]');
const folder = join(home, 'episodes', positionals[0]), episode = join(folder, 'episode.tsx'), voice = join(folder, 'voice'), out = join(home, 'out', positionals[0]);
await lstat(episode);
const exists = (path) => lstat(path).then(() => true, (error) => { if (error.code === 'ENOENT') return false; throw error; });
const voiced = !values.silent && await exists(join(voice, 'timing.json'));
const timing = voiced ? JSON.parse(await readFile(join(voice, 'timing.json'), 'utf8')) : {scenes: {}};
const film = join(out, `${values.out ?? (voiced ? 'film' : 'silent')}.mp4`);
if (!values.stills && await exists(film)) throw new Error(`Destination exists: ${film}`);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
if (!browserExecutable) await ensureBrowser();
// the entry names the one episode; the bundle is given only the recordings that episode's timing names
const work = await mkdtemp(join(home, '.work-'));
try {
  const publicDir = join(work, 'public');
  await mkdir(publicDir);
  for (const clip of Object.values(timing.scenes).flat()) { await mkdir(dirname(join(publicDir, clip.file)), {recursive: true}); await copyFile(join(voice, clip.file), join(publicDir, clip.file)); }
  await writeFile(join(work, 'entry.tsx'), `import {registerRoot} from 'remotion';\nimport {explainerRoot} from ${JSON.stringify(join(home, 'engine/Explainer.tsx'))};\nimport {episode} from ${JSON.stringify(episode)};\nregisterRoot(explainerRoot(episode, ${JSON.stringify(timing)}));\n`);
  const serveUrl = await bundle({entryPoint: join(work, 'entry.tsx'), publicDir});
  const browser = await openBrowser('chrome', {browserExecutable, chromeMode: 'headless-shell'});
  try {
    const common = {serveUrl, puppeteerInstance: browser, timeoutInMilliseconds: 120000, onBrowserLog: (log) => { if (['warn', 'error'].includes(log.type)) console.error(`[browser ${log.type}] ${log.text}`); }};
    const composition = await selectComposition({...common, id: 'Explainer'});
    const scale = Number(values.scale);
    console.log(`${composition.durationInFrames} frames, ${(composition.durationInFrames / composition.fps).toFixed(1)}s, ${voiced ? 'paced by recordings' : 'silent, as written'}`);
    if (values.stills) {
      await mkdir(join(out, 'stills'), {recursive: true});
      for (const frame of values.stills.split(',').map(Number)) await renderStill({...common, composition, frame, scale, imageFormat: 'png', output: join(out, 'stills', `frame-${String(frame).padStart(5, '0')}.png`)});
      console.log(`stills written to ${join(out, 'stills')}`);
    } else {
      await mkdir(out, {recursive: true});
      const frameRange = values.range ? values.range.split('-').map(Number) : null;
      let last = -1;
      // encoder settings are left at Remotion's defaults: full-range colour suits a picture that is mostly black and glow
      await renderMedia({...common, composition, codec: 'h264', muted: !voiced, scale, frameRange, concurrency: Number(values.concurrency), outputLocation: film, onProgress: ({progress}) => { const step = Math.floor(progress * 10); if (step !== last) { last = step; console.log(`${step * 10}%`); } }});
      console.log(`written to ${film}`);
    }
  } finally { await browser.close({silent: true}); }
} finally { await rm(work, {recursive: true, force: true}); }
