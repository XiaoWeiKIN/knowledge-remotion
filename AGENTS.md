# knowledge-remotion

Knowledge explainer videos drawn by program: a selected document becomes a portrait short whose every scene is code.
Read .claude/skills/explainer-director/SKILL.md before making or changing an episode; it is the working method and
it came out of the owner's corrections, so follow it rather than improvising.

## Layout

- engine/: what every episode shares. kit.ts (pure helpers), Explainer.tsx (captions, glossary line, trail, the pacing
  that makes each sentence's stretch of a scene last as long as its recording, the Remotion root).
- episodes/NAME/: one episode. episode.tsx exports `episode`; drawing code particular to it sits beside it.
  voice/ and narration.json are generated and ignored by git.
- tools/: narration.mjs, voice.py, render.mjs, mix.py. out/ holds stills and films and is ignored by git.

## Rules

- Say what the episode will teach, how it will be told and what it will look like, and wait for the owner, before building.
- The source document's own argument and terms are the script. Check every fact against a primary source first.
- Remotion is the only clock. A scene is a function of its own time: no wall time, no Math.random, nothing kept
  from the frame before.
- Chinese text, captions and titles are DOM; geometry is Canvas 2D.
- Keep engine/ small. Drawing code stays with its episode until a second episode has used it unchanged.
- Recordings, music, films and keys are never committed. Generated folders and films are not written over.
- Sentences sent to the speech service leave the machine; say so. Use only music the owner names.
- Report what was looked at and what was not. Stills do not show motion; nobody has heard a recording until a person
  has, and a model's transcript of a clip is not evidence that it is read correctly.

## Checks

npm run check type-checks engine/ and every episode. There are no automated tests yet.
