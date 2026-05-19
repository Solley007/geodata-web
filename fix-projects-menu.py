#!/usr/bin/env python3
"""
fix-projects-menu.py — Restructure projects mega menu categories.

Changes:
  1. "Institutional" → "Federal Government"  (and unhide CBN project)
  2. Add new "State Government" category (move Gombe projects in, unhide them)
  3. "Infrastructure" → "World Bank"
  4. Split the combined Kogi infrastructure project into TWO separate projects:
     - Kogi RAAMP Rural Roads
     - AKU Agro Logistic Centre
     (Both share the same gallery content.)

Run from project root:
    cd /Users/solley007/Downloads/geodata-web
    python3 fix-projects-menu.py
"""

from pathlib import Path
import sys

# Two new World Bank project entries that REPLACE the single "kogi-state-infrastructure" project
KOGI_RURAL_ROADS = '''  {
    slug: "kogi-raamp-rural-roads",
    name: "Kogi RAAMP Rural Roads",
    subtitle: "World Bank-funded upgrade of 33.56 km of rural roads in Kogi State",
    category: "World Bank",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "33.56 km rural roads · Lots 1 and 2",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop", alt: "Rural infrastructure" },
      { src: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1600&q=85&auto=format&fit=crop", alt: "Logistics centre construction" },
    ],
    overview: [
      "Under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme delivered in partnership with the Kogi State Government — Geodata is upgrading 33.56 kilometres of rural roads across Lots 1 and 2 to expand connectivity for farming communities in central Nigeria.",
      "The upgraded roads link smallholder farmers to markets and post-harvest infrastructure, reducing the cost of moving produce and strengthening the agricultural value chain across the state.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Roads upgraded", value: "33.56 km" },
      { label: "Lots",           value: "Lots 1 and 2" },
    ],
  },
  {
    slug: "aku-agro-logistic-centre",
    name: "AKU Agro Logistic Centre",
    subtitle: "World Bank-funded agricultural logistics centre in Adavi LGA, Kogi State",
    category: "World Bank",
    status: "Ongoing",
    year: 2024,
    location: "Adavi LGA, Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "Construction of AKU & Agro Logistic Centre · Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop", alt: "Rural infrastructure" },
      { src: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1600&q=85&auto=format&fit=crop", alt: "Logistics centre construction" },
    ],
    overview: [
      "Under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme — Geodata is constructing and physically improving the AKU and Agro Logistic Centre in Adavi Local Government Area (Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3).",
      "The centre provides aggregation, sorting, and post-harvest storage capacity for produce from across the state, complementing the rural-roads programme that connects farmers to markets.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Contract",       value: "NG-KOGIRAAMP-459307-CW-RFB/LOT 3" },
      { label: "Location",       value: "Adavi LGA, Kogi State" },
    ],
  },'''


# All discrete patches: (file, old_string, new_string)
PATCHES = []

# ─── lib/projects-data.ts ─────────────────────────────────────────────
DATA_FILE = "lib/projects-data.ts"

# 1. Update the ProjectCategory union type
PATCHES.append((DATA_FILE,
    '''export type ProjectCategory =
  | "Residential"
  | "Commercial"
  | "Institutional"
  | "Infrastructure";''',
    '''export type ProjectCategory =
  | "Residential"
  | "Commercial"
  | "Federal Government"
  | "State Government"
  | "World Bank";'''))

# 2. Update the PROJECT_CATEGORIES exported array
PATCHES.append((DATA_FILE,
    '''export const PROJECT_CATEGORIES: ("All" | ProjectCategory)[] = [
  "All",
  "Residential",
  "Commercial",
  "Institutional",
  "Infrastructure",
];''',
    '''export const PROJECT_CATEGORIES: ("All" | ProjectCategory)[] = [
  "All",
  "Residential",
  "Commercial",
  "Federal Government",
  "State Government",
  "World Bank",
];'''))

# 3. Kashere Bungalows: Residential → State Government, unhide
PATCHES.append((DATA_FILE,
    '''    slug: "kashere-bungalows",
    name: "Kashere Bungalow Project",
    subtitle: "20 three-bedroom bungalows in Gombe State",
    category: "Residential",''',
    '''    slug: "kashere-bungalows",
    name: "Kashere Bungalow Project",
    subtitle: "20 three-bedroom bungalows in Gombe State",
    category: "State Government",'''))

PATCHES.append((DATA_FILE,
    '''      { label: "Location", value: "Gombe State" },
    ],
    hideFromNav: true,
  },
  {
    slug: "sil-estate",''',
    '''      { label: "Location", value: "Gombe State" },
    ],
  },
  {
    slug: "sil-estate",'''))

# 4. CBN Maitama Portfolio: Institutional → Federal Government, unhide
PATCHES.append((DATA_FILE,
    '''    slug: "cbn-maitama-portfolio",
    name: "Central Bank of Nigeria — Maitama Portfolio",
    subtitle: "Six property renovations across CBN's Maitama estate",
    category: "Institutional",''',
    '''    slug: "cbn-maitama-portfolio",
    name: "Central Bank of Nigeria — Maitama Portfolio",
    subtitle: "Six property renovations across CBN's Maitama estate",
    category: "Federal Government",'''))

PATCHES.append((DATA_FILE,
    '''      { label: "Locations", value: "Usuma & Vattern, Maitama" },
    ],
    hideFromNav: true,
  },
  {
    slug: "firs-office-programme",''',
    '''      { label: "Locations", value: "Usuma & Vattern, Maitama" },
    ],
  },
  {
    slug: "firs-office-programme",'''))

# 5. FIRS Office Programme: Institutional → Federal Government
PATCHES.append((DATA_FILE,
    '''    slug: "firs-office-programme",
    name: "Federal Inland Revenue Service — Office Programme",
    subtitle: "Office retrofitting and partitioning across FIRS facilities",
    category: "Institutional",''',
    '''    slug: "firs-office-programme",
    name: "Federal Inland Revenue Service — Office Programme",
    subtitle: "Office retrofitting and partitioning across FIRS facilities",
    category: "Federal Government",'''))

# 6. Federal University Kashere: Institutional → State Government, unhide
PATCHES.append((DATA_FILE,
    '''    slug: "federal-university-kashere",
    name: "Federal University Kashere",
    subtitle: "Construction and furnishing of Schools of Remedial Studies",
    category: "Institutional",''',
    '''    slug: "federal-university-kashere",
    name: "Federal University Kashere",
    subtitle: "Construction and furnishing of Schools of Remedial Studies",
    category: "State Government",'''))

PATCHES.append((DATA_FILE,
    '''      { label: "Completed", value: "2018" },
    ],
    hideFromNav: true,
  },

  // -------------------------------------------------------------------------
  // INFRASTRUCTURE
  // -------------------------------------------------------------------------''',
    '''      { label: "Completed", value: "2018" },
    ],
  },

  // -------------------------------------------------------------------------
  // WORLD BANK / GOVERNMENT INFRASTRUCTURE
  // -------------------------------------------------------------------------'''))

# 7. Okpella Community Centre: Infrastructure → Federal Government
#    (still hidden from nav — kept here so the type stays valid)
PATCHES.append((DATA_FILE,
    '''    slug: "okpella-community-centre",
    name: "Okpella Community Centre",
    subtitle: "Community centre and sporting facilities",
    category: "Infrastructure",''',
    '''    slug: "okpella-community-centre",
    name: "Okpella Community Centre",
    subtitle: "Community centre and sporting facilities",
    category: "Federal Government",'''))

# 8. Split Kogi Infrastructure into TWO World Bank projects
KOGI_OLD = '''  {
    slug: "kogi-state-infrastructure",
    name: "Kogi State Infrastructure Programme",
    subtitle: "World Bank-funded rural roads and agricultural logistics in Kogi State",
    category: "Infrastructure",
    status: "Ongoing",
    year: 2024,
    location: "Kogi State",
    client: "World Bank / Kogi State Government — KOGI RAAMP",
    scope: "33.56km rural roads · AKU & Agro Logistic Centre, Adavi LGA",
    coverImage:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&q=85&auto=format&fit=crop",
    gallery: [
      { src: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop", alt: "Rural infrastructure" },
      { src: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=1600&q=85&auto=format&fit=crop", alt: "Logistics centre construction" },
    ],
    overview: [
      "Geodata is engaged on two contracts under the Kogi State Rural Access & Agricultural Marketing Project (KOGI RAAMP) — a World Bank-funded programme delivered in partnership with the Kogi State Government to expand rural connectivity and agricultural value-chain infrastructure.",
      "The first contract covers upgrading of 33.56 kilometres of rural roads across Lots 1 and 2. The second is the construction and physical improvement of the AKU and Agro Logistic Centre in Adavi Local Government Area (Contract NG-KOGIRAAMP-459307-CW-RFB/LOT 3). Both projects are currently in execution and support farmer access to markets and post-harvest storage capacity across central Nigeria.",
    ],
    keyFacts: [
      { label: "Funded by",      value: "The World Bank" },
      { label: "Programme",      value: "KOGI RAAMP" },
      { label: "Roads upgraded", value: "33.56 km" },
      { label: "Logistics hub",  value: "Adavi LGA" },
    ],
  },'''

PATCHES.append((DATA_FILE, KOGI_OLD, KOGI_RURAL_ROADS))


# ─── components/nav/ProjectsMegaMenu.tsx ─────────────────────────────
PATCHES.append(("components/nav/ProjectsMegaMenu.tsx",
    '''const CATEGORY_COLUMNS: ProjectCategory[][] = [
  ["Residential", "Commercial"],
  ["Institutional", "Infrastructure"],
];''',
    '''const CATEGORY_COLUMNS: ProjectCategory[][] = [
  ["Residential", "Commercial"],
  ["Federal Government", "State Government", "World Bank"],
];'''))


# ─── components/nav/MobileNavDrawer.tsx ──────────────────────────────
PATCHES.append(("components/nav/MobileNavDrawer.tsx",
    'const PROJECT_CATEGORIES = ["Residential", "Commercial", "Institutional", "Infrastructure"] as const;',
    'const PROJECT_CATEGORIES = ["Residential", "Commercial", "Federal Government", "State Government", "World Bank"] as const;'))


# ─── components/about/TrackRecord.tsx ────────────────────────────────
# Excludes institutional projects from the about page track record (they
# have their own InstitutionalClients section). With the new schema,
# both government categories serve that role.
PATCHES.append(("components/about/TrackRecord.tsx",
    '''  // Show residential, commercial, and infrastructure projects in this section.
  // Institutional projects (CBN, FIRS, Federal Uni) get their own dedicated
  // InstitutionalClients section below — including them here would duplicate.
  const projects = PROJECTS.filter(
    (p) => p.category !== "Institutional"
  ).sort((a, b) => {''',
    '''  // Show residential, commercial, and World Bank projects in this section.
  // Government projects (CBN, FIRS, Federal Uni, etc.) get their own dedicated
  // InstitutionalClients section below — including them here would duplicate.
  const projects = PROJECTS.filter(
    (p) => p.category !== "Federal Government" && p.category !== "State Government"
  ).sort((a, b) => {'''))


def main():
    root = Path(".")
    if not (root / "package.json").exists():
        print("ERROR: run from project root (where package.json lives)")
        sys.exit(1)

    file_changes = {}
    failed = []

    for file_path, old, new in PATCHES:
        path = root / file_path
        if not path.exists():
            print(f"⚠️  {file_path} not found — skipping")
            continue

        content = file_changes.get(file_path) or path.read_text()
        if old in content:
            content = content.replace(old, new, 1)
            file_changes[file_path] = content
            print(f"✅ {file_path}: applied patch (first 60 chars: {old[:60].strip()!r}...)")
        else:
            failed.append((file_path, old[:80].strip()))
            print(f"❌ {file_path}: pattern NOT found ({old[:60].strip()!r}...)")

    # Write all changes
    for path_str, new_content in file_changes.items():
        (root / path_str).write_text(new_content)

    print(f"\n{'═' * 60}")
    print(f"Files modified: {len(file_changes)}")
    print(f"Patches applied: {len(PATCHES) - len(failed)} / {len(PATCHES)}")
    if failed:
        print(f"\n⚠️  {len(failed)} patches didn't match — likely already applied or file content differs:")
        for f, snippet in failed:
            print(f"   {f}: {snippet}")
    else:
        print("\nAll patches applied cleanly.")

    print("\nNext steps:")
    print("  npx tsc --noEmit       # verify it compiles")
    print('  git commit -am "feat: restructure projects menu — Federal/State Government + World Bank"')
    print("  git push")


if __name__ == "__main__":
    main()
