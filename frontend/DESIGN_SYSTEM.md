# Atmosfera Design System

## Brand direction

Уверенный, спокойный и точный мобильный fintech для сервисного бизнеса. Никакого декоративного неона, чрезмерного glassmorphism или бессмысленных графиков.

## Core tokens

| Role | Light | Dark |
|---|---|---|
| Canvas | `#F3F3EF` | `#121511` |
| Surface | `#FCFCFA` | `#191D18` |
| Raised | `#F8F8F4` | `#20251F` |
| Primary text | `#171A16` | `#EEF1E9` |
| Secondary text | `#596057` | `#AEB6A9` |
| Brand | `#587817` | `#B9DF55` |
| Brand soft | `#E5EFC9` | `#29351B` |
| Positive | `#2E7552` | `#71BF93` |
| Warning | `#94651C` | `#DDB768` |
| Danger | `#AA423F` | `#E77B75` |

CSS source of truth: `src/styles/atmosfera-redesign.css`.

## Typography and density

- System/Inter sans stack.
- Body: 16 px, 1.45.
- Financial values use tabular numbers.
- Compact captions remain secondary; task and CTA labels keep strong contrast.
- Spacing follows 4/8/12/16/24/32.

## Geometry

- Inputs and compact surfaces: 12 px.
- Functional cards: 16 px.
- Hero/service surfaces: 22 px.
- Bottom sheets: 28 px top corners.
- Borders are primary separators; shadows are reserved for raised navigation and overlays.

## Interaction

- Minimum target: 44×44 px.
- Focus-visible ring: 3 px brand tone.
- Main CTA uses brand fill; secondary actions use bordered surfaces.
- Status always combines color with text/icon.
- `prefers-reduced-motion` and `prefers-contrast` supported.
- Safe-area insets and stable Telegram viewport height supported.

## Responsive behavior

- 320–430 px: single-column, touch-first layout.
- Dense staff navigation keeps labels visible; on very narrow staff screens it scrolls inside the navigation surface without creating page overflow.
- 760 px+: centered content and capped navigation width.
- 1120 px max content width for Telegram Desktop.
