# Ballpark Style Bible

## Brand idea

Ballpark is a daily act of geographic intuition. It should feel like a modern atlas crossed with a well-used field notebook: informed, tactile, concise, and quietly playful.

The interface should reward making an educated estimate. It must never feel like a casino, an arcade, or a test-prep product.

## Design principles

1. **Make the question the landmark.** The prompt is always the strongest element on a round screen.
2. **Use cartographic restraint.** Fine rules, paper tones, small labels, and measured color are preferable to large gradients or glossy effects.
3. **Let numbers feel consequential.** Guesses, answers, and totals use generous scale and tabular numerals.
4. **Keep interaction obvious.** One primary action per state. Secondary actions stay visibly secondary.
5. **Add delight through detail.** Progress marks, type, spacing, and language carry the personality; animation and ornament remain subtle.

## Color system

| Token | Light | Purpose |
| --- | --- | --- |
| `--paper` | `#f2eee4` | Page and input background |
| `--paper-raised` | `#fffaf0` | Cards and elevated surfaces |
| `--paper-deep` | `#e8e1d2` | Secondary surfaces and inactive progress |
| `--ink` | `#17211e` | Primary text |
| `--muted` | `#667169` | Metadata and supporting text |
| `--ocean` | `#176a70` | Primary action and coast rounds |
| `--terrain` | `#cc6842` | Distance rounds and brand punctuation |
| `--sun` | `#dcae3c` | Elevation rounds |
| `--good` | `#28764d` | Successful feedback |
| `--bad` | `#ad4936` | Error and large-miss feedback |

Dark-mode values live beside the light tokens in `styles.css`. New components must use tokens rather than hard-coded colors.

Color is supportive, not the only carrier of meaning. Every state also needs a label, border treatment, or structural difference.

## Typography

### Display

`Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif`

Use for the wordmark, questions, answers, totals, and major section headings. This supplies the editorial and geographic character.

### Interface

`"Avenir Next", Avenir, "Segoe UI Variable", "Segoe UI", sans-serif`

Use for controls, dates, metadata, statistics, labels, and instructional copy. This keeps dense UI text clean.

### Type rules

- Major prompts use tight leading and a balanced line length of roughly 15 characters.
- Labels are small, bold, uppercase, and letter-spaced.
- Numeric inputs and results use tabular numerals.
- Body text should normally stay between 14 and 18 pixels.
- Avoid more than two font families on one screen.
- Do not use all caps for sentences or primary actions.

## Layout and spacing

- Player content is capped at 44rem; the authoring tool at 52rem.
- The base visual spacing step is approximately 4px, with common gaps of 8, 12, 16, 24, 32, and 48px.
- Major cards use `--radius-lg`; fields and buttons use `--radius-sm`.
- Keep at least 44px of effective touch height for interactive controls.
- Mobile is the default. Add columns only when there is enough room for their contents.

## Components

### Header

Use an eyebrow, a large serif title, a short italic descriptor, and optional right-aligned context. The orange period is part of the current placeholder wordmark treatment.

### Game panel

The panel is a raised paper surface with a thin mode-colored top rule. Its order is:

1. Round number and mode label
2. Five-segment progress track
3. Question
4. Estimate field and primary action
5. Answer feedback after submission

### Buttons

- Primary: ocean fill, white text.
- Secondary: transparent surface, ink text, neutral border.
- Buttons use sentence case and a direct verb.
- Avoid multiple filled buttons in the same action group.

### Inputs

Inputs use paper backgrounds and visible neutral borders. Focus adds an ocean-colored ring. Units sit inside the estimate field but remain visually secondary.

### Archive days

Archive entries resemble compact index cards. Each shows a short UTC date plus one explicit state: `Unplayed`, `In progress`, or `Played`.

### Feedback

Use short factual language. Green communicates a close estimate; red communicates a large miss. Never ridicule a guess.

## Voice and writing

Ballpark sounds informed, calm, and lightly adventurous.

- Prefer: “Your estimate”, “Actual answer”, “Within 2x.”
- Avoid: “Wrong!”, “Terrible guess”, “You lose”, or exaggerated celebration.
- Keep instructions short and literal.
- Use “city to city”, “nearest coast”, and “elevation” consistently.
- Dates represent UTC editions and should be described as such in authoring tools.

## Motion

Motion is optional polish, never required for comprehension. Current hover movement is one pixel and disabled when the user requests reduced motion. Future score reveals should remain under 250ms and avoid bouncing or confetti.

## Accessibility

- Maintain WCAG AA contrast for normal text.
- Preserve visible keyboard focus on every interactive element.
- Pair color with text or shape.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Keep source order aligned with visual order.
- Every input requires a visible label.
- Do not place essential information in background artwork.

## Future product guidance

### Ads

Ads must sit outside the game panel and never resemble an answer, navigation control, or reward button. Label them plainly. Do not use visual language that encourages clicking.

### Remove-ads purchase

Treat purchasing as account utility, not game progression. Use the secondary visual hierarchy and never imply a scoring advantage.

### New modes

Each mode may receive one restrained accent color, a short label, and a consistent prompt structure. Reuse the same panel, progress, input, and feedback components.

### Final naming

When the placeholder name changes, update the visible wordmark, document title, `TITLE` in `index.js`, share text, and authoring-page title together. Preserve the visual hierarchy even if the wordmark length changes.
