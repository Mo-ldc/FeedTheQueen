"""One-time compression; preserve paths, dimensions, UUIDs and advertising art."""
import argparse, io, json, subprocess, tempfile
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
if (root / 'reports/media-compression.json').exists():
    raise SystemExit('Already compressed. Restore original media from Git before running again to avoid repeated lossy encoding.')
protected = set(json.loads((root / 'reports/original-migration.json').read_text(encoding='utf-8'))['protectedAdvertising'])
records = []
for path in sorted((root / 'assets').rglob('*')):
    ext = path.suffix.lower()
    if ext not in {'.png', '.jpg', '.mp3', '.wav'}:
        continue
    relative = path.relative_to(root).as_posix()
    if relative in protected:
        continue
    before = path.stat().st_size
    if ext in {'.png', '.jpg'}:
        with Image.open(path) as im:
            output = io.BytesIO()
            if ext == '.png':
                im.save(output, format='PNG', optimize=True)
            else:
                im.save(output, format='JPEG', quality=85, optimize=True, progressive=True)
            data = output.getvalue()
            with Image.open(io.BytesIO(data)) as check:
                check.load()
                assert check.size == im.size
                if ext == '.png':
                    assert check.convert('RGBA').tobytes() == im.convert('RGBA').tobytes()
    else:
        with tempfile.TemporaryDirectory(prefix='queen-audio-') as temp:
            target = Path(temp) / path.name
            settings = ['-c:a', 'pcm_s16le', '-ac', '1', '-ar', '22050'] if ext == '.wav' else ['-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '44100']
            subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', str(path), '-map_metadata', '-1', *settings, str(target)], check=True)
            subprocess.run([args.ffmpeg, '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
            data = target.read_bytes()
    if len(data) < before:
        path.write_bytes(data)
    records.append({'path': relative, 'before': before, 'after': path.stat().st_size})
report = {'before': sum(r['before'] for r in records), 'after': sum(r['after'] for r in records), 'filesChanged': sum(r['after'] < r['before'] for r in records), 'files': records}
(root / 'reports/media-compression.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'files'}))
