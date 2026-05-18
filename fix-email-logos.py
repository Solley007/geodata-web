#!/usr/bin/env python3
"""
fix-email-logos.py
Replaces text-based GEODATA wordmarks in email templates with the actual
logo image, matching the pattern already used in notify-blog/route.ts.

Run from project root:
    cd /Users/solley007/Downloads/geodata-web
    python3 fix-email-logos.py
"""

from pathlib import Path
import re
import sys

# The new image-based brand header (matches notify-blog/route.ts)
NEW_HEADER = '''<tr><td style="padding:22px 30px;background:#0f2547;text-align:center;">
    <img src="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="200" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;margin:0 auto;" />
  </td></tr>'''

# Per-file replacements. Each entry is (old_block, new_block).
# Old blocks must match exactly — taken verbatim from the files.
PATCHES = {
    "app/api/subscribe/route.ts": [
        (
            '''<tr><td style="padding:28px 40px 20px;border-bottom:1px solid #E5E0D5;">
    <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;color:#0A1628;">
      GEODATA<span style="color:#C9A961;">.</span>
    </p>
  </td></tr>''',
            NEW_HEADER,
        ),
    ],
    "app/api/admin/notify/route.ts": [
        (
            '''<tr><td style="padding:32px 40px 24px;border-bottom:1px solid #E5E0D5;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.01em;color:#0A1628;">
            GEODATA<span style="color:#C9A961;">.</span>
          </p>
          <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">
            World Services Limited
          </p>
        </td></tr>''',
            NEW_HEADER,
        ),
    ],
    "app/api/mortgage-application/route.ts": [
        # Team email header
        (
            '''<tr><td style="padding:32px 40px 16px;border-bottom:1px solid #E5E0D5;">
      <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;">
        GEODATA<span style="color:#C9A961;">.</span>
      </p>
      <p style="margin:6px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#94A0B0;">
        New MREIF mortgage enquiry
      </p>
    </td></tr>''',
            NEW_HEADER,
        ),
        # Applicant confirmation header
        (
            '''<tr><td style="padding:32px 40px 16px;border-bottom:1px solid #E5E0D5;">
      <p style="margin:0;font-family:Georgia,serif;font-size:20px;letter-spacing:-0.01em;">
        GEODATA<span style="color:#C9A961;">.</span>
      </p>
    </td></tr>''',
            NEW_HEADER,
        ),
    ],
    "app/api/mortgage-quiz/route.ts": [
        # Top header (wide-letter-spaced text version)
        (
            '''<tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e5e0d5;">
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#0a1628;letter-spacing:4px;">GEODATA</p>
    <p style="margin:6px 0 0;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#5c6b7e;">World Services Limited</p>
  </td></tr>''',
            NEW_HEADER,
        ),
        # Footer wordmark (on navy) — REMOVE the text wordmark, keep the rest of the footer
        (
            '''<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#fafaf7;letter-spacing:3px;">GEODATA</p>
    <p style="margin:4px 0 16px;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#bfd4f2;">World Services Limited</p>''',
            '<img src="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://geodata.com.ng"}/geodata-full-logo-white.png" alt="Geodata World Services Limited" width="180" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;margin:0 0 20px 0;" />',
        ),
    ],
}


def main():
    root = Path(".")
    if not (root / "package.json").exists():
        print("ERROR: run this from the project root (where package.json lives)")
        sys.exit(1)

    total_replacements = 0
    failed_patches = []

    for file_path, patches in PATCHES.items():
        path = root / file_path
        if not path.exists():
            print(f"⚠️  SKIP — file not found: {file_path}")
            continue

        content = path.read_text()
        original = content
        file_replacements = 0

        for old, new in patches:
            if old in content:
                content = content.replace(old, new, 1)
                file_replacements += 1
            else:
                failed_patches.append((file_path, old[:80] + "..."))

        if content != original:
            path.write_text(content)
            print(f"✅ {file_path} — {file_replacements} replacement(s) applied")
            total_replacements += file_replacements
        else:
            print(f"⚠️  {file_path} — no changes (patterns not found)")

    print(f"\nTotal replacements: {total_replacements}")
    if failed_patches:
        print(f"\n⚠️  {len(failed_patches)} pattern(s) didn't match — they may already be fixed or have different formatting:")
        for f, snippet in failed_patches:
            print(f"   {f}: {snippet}")

    print("\nNext steps:")
    print("  npx tsc --noEmit       # verify it still compiles")
    print('  git commit -am "fix: unify email brand headers with logo image"')
    print("  git push")


if __name__ == "__main__":
    main()
