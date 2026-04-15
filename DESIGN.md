# Design Brief: HAR Vision

**Purpose**: Human Activity Recognition (HAR) system with dark sci-fi aesthetic for real-time activity detection via video upload and live webcam.

**Tone**: Retro-futuristic cyberpunk data visualization. Minimalist, high-contrast, technocratic. Every element serves information hierarchy. No decorative waste.

**Differentiation**: Grid-patterned atmosphere with cyan neon accents, glowing activity timeline, confidence bars with gradient fills, monospace dataset reference tables.

## Color Palette

| Token | OKLCH | Purpose |
|---|---|---|
| `primary` | `0.75 0.18 195` | Cyan neon accent: buttons, borders, timeline, highlights |
| `secondary` | `0.45 0.08 280` | Deep purple accent for secondary actions |
| `background` | `0.12 0.015 250` | Deep navy black |
| `card` | `0.15 0.018 250` | Elevated surface, slightly lighter than background |
| `muted` | `0.35 0.01 250` | Subdued text and borders |
| `destructive` | `0.72 0.19 30` | Alert red for errors |
| `border` | `0.25 0.02 250` | Grid lines and card separators |

## Typography

| Tier | Font | Usage |
|---|---|---|
| Display | Bricolage Grotesque | Page titles, section headings, callouts |
| Body | Mona Sans | Paragraph text, UI labels, descriptions |
| Mono | Geist Mono | Code blocks, dataset values, timestamps, confidence scores |

## Elevation & Depth

| Layer | Style |
|---|---|
| Header/Nav | `bg-card` with `border-b border-primary/30`, subtle glow |
| Card/Modal | `bg-card` with `border border-primary/40`, glow effect on hover |
| Input/Control | `bg-input` with `border border-primary/30`, focus glow |
| Background | `bg-background` with `grid-background` pattern (40px cyan grid, 3% opacity) |

## Structural Zones

| Zone | Treatment |
|---|---|
| Header | Dark card with cyan accent border, logo + nav links |
| Upload area | Large drag-and-drop card with `ring-glow` on hover, centered text |
| Results panel | Grid of activity cards with glow effect, confidence bars, timeline |
| Timeline | Horizontal scroll, monospace timestamps, cyan connectors, activity colors |
| Dataset ref | Monospace table below results, bordered cells, alternating row backgrounds |
| Webcam panel | Live feed card with real-time indicator (pulsing cyan dot), control buttons |

## Component Patterns

- **Buttons**: Cyan primary, deep card background, glow on focus/hover
- **Bars**: Gradient fill (cyan to purple) for confidence scores
- **Timeline**: Connectors and milestones in primary color, glow animation
- **Tables**: Monospace body, bordered cells, cyan headers, dark alternating rows
- **Cards**: Minimal border, 1px primary/30, subtle inset glow on dark background

## Motion & Animation

| Effect | Duration | Use |
|---|---|---|
| Glow pulse | 2s infinite | Activity timeline indicators, button focus |
| Fade + scale | 0.3s smooth | Card entrance, modal open |
| Slide + glow | 0.4s smooth | Results panel appearance |

## Spacing & Rhythm

- **Density**: Compact for data-heavy regions (timeline, tables); relaxed for hero/upload zones
- **Grid**: 4px base unit. Cards: 16px padding. Sections: 24px gap.

## Signature Detail

Grid-background atmosphere with 40px cyan grid pattern (3% opacity, subtle but persistent). Glowing cyan borders on interactive elements create "active" state. Monospace typography for data/metrics reinforces technical authenticity.

## Constraints

- No purple or gradient backgrounds unless directly serving the accent (primary cyan).
- Glow effects used sparingly: focus states, active timelines, hover cards only.
- No rounded corners beyond `radius: 0.5rem` standard.
- Text shadows for glow effect only on display headings in hero context.
