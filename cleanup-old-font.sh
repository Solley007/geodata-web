#!/usr/bin/env bash
# Removes the old Rotation Roman font if it was placed in /public/fonts
# from the previous bundle. Safe to run even if it's not there.
if [ -f "public/fonts/Rotation-Roman.otf" ]; then
  rm public/fonts/Rotation-Roman.otf
  echo "Removed old Rotation-Roman.otf"
else
  echo "No old Rotation-Roman.otf found (clean)"
fi
