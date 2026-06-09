#!/usr/bin/env python3
"""
compress-media.py — performance pass on /public media.

NEVER overwrites originals. Writes optimized copies to public-optimized/,
mirroring the folder structure, so you can review before swapping anything.

Usage (from project root):
    pip3 install Pillow
    python3 compress-media.py

Then review public-optimized/, and for files you are happy with, replace
the originals manually (or point the relevant components at the new paths).

PDFs are reported but not converted (use Ghostscript separately, see notes
printed at the end).
"""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Pillow not installed. Run: pip3 install Pillow")

SRC = Path("public")
DST = Path("public-optimized")
THRESHOLD = 500 * 1024          # only touch files larger than 500 KB
MAX_DIMENSION = 2400            # px, plenty for full-bleed heroes
WEBP_QUALITY = 82
JPEG_QUALITY = 82

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".JPG", ".JPEG", ".PNG"}


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main() -> None:
    if not SRC.exists():
        raise SystemExit("Run this from the project root (public/ not found).")

    total_before = 0
    total_after = 0
    pdfs = []
    converted = 0

    for path in sorted(SRC.rglob("*")):
        if not path.is_file():
            continue
        size = path.stat().st_size

        if path.suffix.lower() == ".pdf" and size > THRESHOLD:
            pdfs.append((path, size))
            continue

        if path.suffix not in IMAGE_EXTS or size <= THRESHOLD:
            continue

        rel = path.relative_to(SRC)
        out_path = (DST / rel).with_suffix(".webp")
        out_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            img = Image.open(path)
            img = img.convert("RGB")
            if max(img.size) > MAX_DIMENSION:
                img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
            img.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)
        except Exception as e:  # noqa: BLE001
            print(f"SKIP {rel} ({e})")
            continue

        new_size = out_path.stat().st_size
        total_before += size
        total_after += new_size
        converted += 1
        saving = 100 * (1 - new_size / size)
        print(f"{rel}  {human(size)} -> {human(new_size)}  (-{saving:.0f}%)  => {out_path}")

    print()
    print(f"Images converted: {converted}")
    if total_before:
        print(
            f"Total: {human(total_before)} -> {human(total_after)}  "
            f"(-{100 * (1 - total_after / total_before):.0f}%)"
        )

    if pdfs:
        print()
        print("Large PDFs found (compress with Ghostscript, originals untouched):")
        for p, s in pdfs:
            print(f"  {p}  ({human(s)})")
        print()
        print("  brew install ghostscript")
        print(
            "  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/ebook "
            "-dNOPAUSE -dQUIET -dBATCH -sOutputFile=out.pdf in.pdf"
        )

    print()
    print("Nothing in public/ was modified. Review public-optimized/ and swap")
    print("files in manually once you are happy with the quality.")


if __name__ == "__main__":
    main()
