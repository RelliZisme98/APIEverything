# Rellia Design System

A developer-centric, high-fidelity, and minimalist design system inspired by **Linear.app**.

---

## 1. Color Palette

### Canvas & Surfaces
- **Canvas Background (`--bg-primary`)**: `#010102` (Deepest near-black canvas)
- **Sidebar & Panels (`--bg-secondary`)**: `#08080a` (A subtle dark backdrop)
- **Surface 1 / Card (`--bg-card`)**: `#0f1011` (Solid dark charcoal for containers)
- **Surface 2 / Card Hover (`--bg-card-hover`)**: `#141516` (Hovered state for cards)
- **Surface 3 / Popover (`--bg-popover`)**: `#18191a` (Menus, dropdowns, and overlays)

### Borders & Dividers
- **Hairline Border (`--border`)**: `#23252a` (Ultra-fine hairline divider)
- **Hairline Strong (`--border-hover`)**: `#34343a` (Highlighted border on hover/focus)
- **Border Glow (`--border-glow`)**: `rgba(94, 106, 210, 0.35)` (Signature accent glow)

### Typography
- **Ink Primary (`--text-primary`)**: `#f7f8f8` (Crisp off-white for body/headings)
- **Ink Muted (`--text-secondary`)**: `#d0d6e0` (Light gray for secondary text)
- **Ink Subtle (`--text-muted`)**: `#8a8f98` (Dimmed gray for captions, placeholders)
- **Ink Link (`--text-link`)**: `#5e6ad2` (Lavender-blue for inline links)

### Brand & Accents
- **Primary Brand Accent (`--accent-blue`)**: `#5e6ad2` (Signature Linear lavender-blue)
- **Accent Hover (`--accent-purple`)**: `#828fff` (Lighter lavender for hover states)
- **Accent Cyan (`--accent-cyan`)**: `#4fc3f7` (Soft teal/cyan)
- **Semantic Success (`--accent-green`)**: `#27a644` (Clean forest green)
- **Semantic Error (`--accent-red`)**: `#ef5350` (Premium soft red)
- **Semantic Warning (`--accent-yellow`)**: `#ffca28` (Warm amber)
- **Semantic Orange (`--accent-orange`)**: `#ff7043` (Vibrant soft orange)

---

## 2. Typography & Hierarchy

### Font Families
- **Sans-Serif (`--font-sans`)**: `'Inter'`, `-apple-system`, sans-serif.
- **Headings (`--font-heading`)**: `'Plus Jakarta Sans'`, `'Inter'`, sans-serif.
- **Monospace (`--font-mono`)**: `'JetBrains Mono'`, monospace.

### Headings
- Sentences-cased (no uppercase forced) to feel professional and technical.
- Slightly negative letter-spacing for a tight, high-end editorial feel:
  - `.page-title`: `letter-spacing: -0.03em; font-weight: 600;`
  - `.card-title`: `letter-spacing: -0.01em; font-weight: 600;`

---

## 3. Radii & Spacing

- **Card Radius (`--radius`)**: `12px` (Balanced, sleek container rounding)
- **Component Radius (`--radius-md`)**: `8px` (For buttons, form fields, inputs)
- **Tag/Chip Radius (`--radius-sm`)**: `6px` (For small badges and quick-selection chips)

---

## 4. Components

### Card
- **Background**: Solid `--bg-card`.
- **Border**: `1px solid var(--border)`.
- **Top Hairline Highlight**: A subtle, semi-transparent top gradient to create a premium pixel-bevel effect.
- **Shadow**: `0 1px 2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)`.

### Buttons
- **Primary Button**: Solid `--accent-blue` background with a subtle top highlight bevel.
- **Secondary Button**: Solid `--bg-card` with `--border`.
- **Hover Transitions**: Smooth `0.2s cubic-bezier(0.16, 1, 0.3, 1)`.
