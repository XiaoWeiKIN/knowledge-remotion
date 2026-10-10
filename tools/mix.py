"""Lay a music track under a narrated film without rendering the picture again.

    python3 tools/mix.py EPISODE MUSIC [--film film] [--out film-music] [--music-gain 0.05] [--voice-gain 1.4]

Reads out/EPISODE/<film>.mp4 and writes out/EPISODE/<out>.mp4; an existing file is never written over. The music
is repeated as often as the film needs, each pass cross-faded into the next over two seconds, faded in at the
start and out at the end, and mixed far under the voice. Only use a track the owner has named; whether it may be
used where the film is published is the owner's to check.
"""
import argparse, math, pathlib, subprocess, sys

HOME = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("episode"); parser.add_argument("music")
parser.add_argument("--film", default="film"); parser.add_argument("--out", default="film-music")
parser.add_argument("--music-gain", type=float, default=0.05); parser.add_argument("--voice-gain", type=float, default=1.4)
args = parser.parse_args()
film, out = HOME / "out" / args.episode / f"{args.film}.mp4", HOME / "out" / args.episode / f"{args.out}.mp4"
ffmpeg, ffprobe = HOME / "node_modules" / "ffmpeg-static" / "ffmpeg", HOME / "node_modules" / "ffprobe-static" / "bin" / "darwin" / "arm64" / "ffprobe"
if out.exists(): sys.exit(f"Destination exists: {out}")
for needed in (film, pathlib.Path(args.music), ffmpeg, ffprobe):
    if not needed.exists(): sys.exit(f"Missing {needed}")
seconds = lambda path: float(subprocess.run([str(ffprobe), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], check=True, capture_output=True, text=True).stdout)
length, track, cross = seconds(film), seconds(args.music), 2.0
copies = max(1, math.ceil((length - cross) / (track - cross)))
chain = "[1:a]anull[x1]" + "".join(f";[x{i - 1}][{i}:a]acrossfade=d={cross}:c1=tri:c2=tri[x{i}]" for i in range(2, copies + 1))
graph = f"{chain};[x{copies}]atrim=0:{length},volume={args.music_gain},afade=t=in:d=1.5,afade=t=out:st={length - 4.5}:d=4.5[m];[0:a]volume={args.voice_gain}[v];[v][m]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]"
subprocess.run([str(ffmpeg), "-v", "error", "-n", "-i", str(film)] + [part for _ in range(copies) for part in ("-i", args.music)] + ["-filter_complex", graph, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
print(f"music laid under {length:.1f}s of film in {copies} passes, written to {out}")
