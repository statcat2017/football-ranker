# Stage 10 — Styling

## Goal

Create a distinct visual identity that isn't generic "sports app dark theme".

## Dependencies

- Stage 07 (vote UI)
- Stage 08 (leaderboard UI)

## Design Direction

**Concept: "Football pub debate board"**

Think chalkboard, match-day programme, and transfer deadline day energy. Bold, slightly brash, but readable.

### Color Palette

```css
:root {
  /* Base */
  --bg: #0c0e12;
  --surface: #161920;
  --surface-hover: #1e222b;
  --border: #2a2e38;

  /* Accent — electric blue, not green */
  --accent: #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.25);
  --accent-dim: #1e40af;

  /* Text */
  --text: #f0f0f5;
  --text-muted: #6b7280;

  /* Status */
  --win: #22c55e;
  --loss: #ef4444;
  --provisional: #eab308;

  /* Rank badges */
  --gold: #fbbf24;
  --silver: #94a3b8;
  --bronze: #d97706;
}
```

### Typography

- Headings: system font, bold, slightly condensed.
- Body: system font, regular weight.
- Player names: large, bold, tight letter-spacing.

### Vote Page

- Two cards on a slight tilt (1-2 degrees) for energy.
- "VS" badge in the center with a subtle pulse animation.
- Green glow on selected card.
- Smooth slide transition between matchups (cards slide out, new ones slide in).

### Player Cards

- Dark surface with subtle gradient.
- Large initials in the center (placeholder for photos).
- Team crest small in top-right.
- Position badge as a colored pill.
- Shirt number in large muted text behind initials.

### Leaderboard

- Clean table with alternating row shading.
- Top 3 rows with gold/silver/bronze left border.
- Provisional rows slightly transparent.
- "Provisional" badge in yellow.
- ELO displayed prominently.
- Mobile: stack into card layout.

### Responsive Breakpoints

- Desktop (>900px): side-by-side cards, full table.
- Tablet (600-900px): side-by-side cards, condensed table.
- Mobile (<600px): stacked cards, card-based leaderboard.

### Animations

- Vote submission: brief green flash on winner, red flash on loser.
- Matchup transition: 200ms slide.
- Leaderboard row update: subtle highlight pulse.
- Reduced motion: respect `prefers-reduced-motion`.

### CSS Architecture

Single global stylesheet (`app/globals.css`), matching `footballticketsdashboard` conventions:

- CSS custom properties on `:root`.
- Kebab-case class names.
- No CSS modules, no Tailwind.
- Component-specific prefixes (`.vote-*`, `.leaderboard-*`, `.player-card-*`).

## Verification

```bash
npm run build
# Visual inspection at /vote and /leaderboard
# Test on mobile viewport
```

## Key Design Decisions

- **Electric blue accent**: distinctive, not the default green.
- **Pub debate vibe**: slightly rough, not polished corporate.
- **Bold initials**: functional without photos, looks intentional.
- **Tilted cards**: adds energy without being gimmicky.
- **Single CSS file**: consistent with existing projects.

## Blocks

- Stage 11 (final lint/test/build)
