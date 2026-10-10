// Write out the sentences an episode speaks, in order, for tools/voice.py to record.
//   node tools/narration.mjs EPISODE        → episodes/EPISODE/narration.json
import {mkdtemp, rm, lstat, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const home = dirname(dirname(fileURLToPath(import.meta.url)));
if (process.argv.length !== 3) throw new Error('Usage: node tools/narration.mjs EPISODE');
const folder = join(home, 'episodes', process.argv[2]), episode = join(folder, 'episode.tsx');
await lstat(episode);
const work = await mkdtemp(join(home, '.work-'));
try {
  // the episode is code, so it is compiled and asked; nothing is parsed out of its text
  await build({stdin: {contents: `import {episode} from ${JSON.stringify(episode)};\nimport {narration} from ${JSON.stringify(join(home, 'engine/Explainer.tsx'))};\nexport const lines = narration(episode);\n`, resolveDir: home, loader: 'ts'}, bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', outfile: join(work, 'narration.mjs'), external: ['react', 'react/jsx-runtime', 'remotion'], logLevel: 'error'});
  const {lines} = await import(pathToFileURL(join(work, 'narration.mjs')).href);
  await writeFile(join(folder, 'narration.json'), JSON.stringify(lines, null, 1));
  console.log(`${lines.length} sentences, ${lines.reduce((sum, line) => sum + line.text.length, 0)} characters, written to ${join(folder, 'narration.json')}`);
} finally { await rm(work, {recursive: true, force: true}); }
