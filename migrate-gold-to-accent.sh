#!/usr/bin/env bash
set -e
if [ ! -f "tailwind.config.ts" ]; then
  echo "Error: run this from inside your geodata-web folder"
  exit 1
fi
echo "Finding files with 'gold' class references..."
FILES=$(grep -rl "\b\(text\|bg\|border\|ring\|from\|to\|via\|fill\|stroke\|placeholder\|divide\|outline\|decoration\|caret\)-gold\b\|gold-dark\|gold-soft\|gold/[0-9]" \
  --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null || true)
if [ -z "$FILES" ]; then
  echo "No files to migrate (already done — script is idempotent)"
  exit 0
fi
COUNT=$(echo "$FILES" | wc -l | xargs)
echo "Migrating $COUNT files..."
if [[ "$OSTYPE" == "darwin"* ]]; then SED_INPLACE=(sed -i '' -E); else SED_INPLACE=(sed -i -E); fi
for f in $FILES; do
  "${SED_INPLACE[@]}" \
    -e 's/\bgold-dark\b/accent-dark/g' \
    -e 's/\bgold-soft\b/accent-soft/g' \
    -e 's/\bgold\/([0-9]+)/accent\/\1/g' \
    -e 's/-gold([^a-zA-Z0-9_-])/-accent\1/g' \
    -e 's/-gold$/-accent/g' \
    "$f"
done
echo "Done. Now clear .next cache: rm -rf .next && npm run dev"
