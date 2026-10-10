"""Record an episode's sentences, one clip each, and note how long each clip is.

    python3 tools/voice.py EPISODE [--voice zh-CN-YunyangNeural] [--rate +0%]

Reads episodes/EPISODE/narration.json (from tools/narration.mjs) and writes episodes/EPISODE/voice: one WAV per
sentence and timing.json, which the film paces itself by. An existing voice folder is never written over.

The voice is Microsoft Edge's online reader, through the edge-tts command; the text of every sentence is sent to
that service. One request carries one sentence and nothing else: a model given an instruction as well read the
instruction aloud, and several sentences recorded together could not be cut apart reliably. edge-tts is taken from
tools/venv (python3 -m venv tools/venv && tools/venv/bin/pip install edge-tts) and ffmpeg from node_modules.
Nobody has listened to what this writes; timing.json says so until someone has.
"""
import argparse, array, json, pathlib, subprocess, sys, tempfile, wave

HOME = pathlib.Path(__file__).resolve().parent.parent
FPS, RATE = 30, 24000
parser = argparse.ArgumentParser()
parser.add_argument("episode")
parser.add_argument("--voice", default="zh-CN-YunyangNeural"); parser.add_argument("--rate", default="+0%")
args = parser.parse_args()
folder = HOME / "episodes" / args.episode
out, edge, ffmpeg = folder / "voice", HOME / "tools" / "venv" / "bin" / "edge-tts", HOME / "node_modules" / "ffmpeg-static" / "ffmpeg"
if out.exists(): sys.exit(f"Destination exists: {out}")
for tool in (edge, ffmpeg):
    if not tool.exists(): sys.exit(f"Missing {tool}; see the setup in README.md")
lines = json.loads((folder / "narration.json").read_text())
(out / "audio").mkdir(parents=True)


def trim(samples, floor=80, pad=int(RATE * 0.08)):
    # The floor is low on purpose: soft initials (l-, r-, zh-) rise slowly, and a higher one cuts into the first syllable.
    loud = [i for i in range(0, len(samples), 4) if abs(samples[i]) > floor]
    if not loud: sys.exit("a clip came back silent")
    return samples[max(0, loud[0] - pad): min(len(samples), loud[-1] + pad)]


scenes, total = {}, 0.0
with tempfile.TemporaryDirectory() as work:
    for line in lines:
        mp3, raw = pathlib.Path(work) / "clip.mp3", pathlib.Path(work) / "clip.wav"
        subprocess.run([str(edge), "--voice", args.voice, f"--rate={args.rate}", "--text", line["text"], "--write-media", str(mp3)], check=True, capture_output=True)
        subprocess.run([str(ffmpeg), "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(RATE), str(raw)], check=True)
        with wave.open(str(raw)) as clip:
            samples = trim(array.array("h", clip.readframes(clip.getnframes())))
        name = f"audio/{line['scene']}-{line['from']}.wav"
        with wave.open(str(out / name), "wb") as clip:
            clip.setnchannels(1); clip.setsampwidth(2); clip.setframerate(RATE); clip.writeframes(samples.tobytes())
        total += len(samples) / RATE
        scenes.setdefault(line["scene"], []).append({"from": line["from"], "file": name, "frames": round(len(samples) / RATE * FPS)})
        print(" spoke", name, flush=True)
(out / "timing.json").write_text(json.dumps({"engine": "edge-tts", "voice": args.voice, "rate": args.rate, "listened": False, "scenes": scenes}, ensure_ascii=False, indent=1))
print(f"{len(lines)} clips, {total:.1f}s of speech, written to {out}")
