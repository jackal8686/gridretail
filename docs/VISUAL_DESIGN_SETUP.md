# GridRetail Visual Design System & Customizer Setup Guide

**Guide Version:** 1.0  
**Target Environment:** Local Development, Staging, and Production  
**Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS v4, MongoDB, Auth.js

---

## 1. Prerequisites

- **Node.js:** v18.18+ or v20+
- **Package Manager:** `npm`
- **Database (Optional for demo mode):** MongoDB instance running at `MONGODB_URI` (the platform includes automatic in-memory mock fallback when unconfigured).
- **Environment Variables:** Defined in `.env.local`:
  ```bash
  NEXTAUTH_SECRET="your-development-nextauth-secret-key"
  NEXTAUTH_URL="http://localhost:3000"
  MONGODB_URI="mongodb://localhost:27017/gridretail" # optional in demo mode
  ```

---

## 2. Installation & Build

1. Clone or navigate to the repository:
   ```bash
   cd D:\grid
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run verification quality gates:
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```

4. Build production bundle:
   ```bash
   npm run build
   ```

5. Start the local server:
   ```bash
   npm run start # or npm run dev for hot-reloading development
   ```

---

## 3. Working with the Visual Design System & Customizer

### 3.1 Design Template Layout Families
The platform includes 8 coordinated design templates located in `src/constants/design-templates.ts`:
- `tmpl_modern_minimal`: Modern Minimal (floating header, split showcase hero, understated cards).
- `tmpl_luxury_editorial`: Luxury Editorial (monogram header, cinematic framed hero, 3:4 lookbook cards).
- `tmpl_bold_vibrant`: Bold & Vibrant (announcement header, high impact blocks, block-solid cards).
- `tmpl_classic_commerce`: Classic Commerce (multi-tier utility header, commercial banner, star ratings).
- `tmpl_editorial_magazine`: Editorial Magazine (magazine headline header, narrative hero, captioned cards).
- `tmpl_organic_natural`: Organic & Natural (soft curved header, organic flow hero, soft rounded cards).
- `tmpl_tech_futuristic`: Tech & Futuristic (technical HUD header, cyber specs hero, monospaced grid cards).
- `tmpl_playful_creative`: Playful & Creative (playful banner header, asymmetric cards hero, sticker cards).

### 3.2 Color Theme System
The platform includes 12 coordinated color themes located in `src/constants/themes.ts`:
- Light Themes: `theme_nordic_pine`, `theme_monochrome_minimal`, `theme_terracotta_dune`, `theme_coastal_sage`, `theme_copper_charcoal`, `theme_warm_stone`.
- Dark & Haute Themes: `theme_obsidian_slate`, `theme_tokyo_neon`, `theme_golden_hour`, `theme_sapphire_executive`, `theme_rose_velvet`, `theme_emerald_botanical`.

### 3.3 Customizer Key Features
- **Live Interactive Canvas:** Seamless bidirectional `postMessage` protocol updates the preview iframe instantaneously without page reloads.
- **Undo / Redo:** Full 30-snapshot history stack accessible via toolbar buttons (`Undo2` and `Redo2`).
- **Reset to Template Defaults:** Quickly restore default layout and styling tokens without losing user-authored headlines, descriptions, or logos.
- **Multi-Device Viewport Sandbox:** Instant switching between Desktop (fluid width), Tablet (768×1024), and Mobile (375×812) viewports.
