# Design Brief

## Direction

Ledger — a dark, institutional trade-finance terminal where tokenized invoices and purchase orders read like entries in a precise on-chain ledger.

## Tone

Refined industrial/utilitarian fintech: restrained, dense, and trustworthy, with a single vivid mint signal color cutting through deep warm charcoal.

## Differentiation

Monospace tabular numerals for every monetary value, percentage, and token ID, paired with hairline "ledger rule" dividers — the interface itself reads like a settlement book.

## Color Palette

| Token      | OKLCH        | Role                                             |
| ---------- | ------------ | ------------------------------------------------ |
| background | 0.145 0.014 60 | Deep warm charcoal canvas                      |
| foreground | 0.94 0.01 70   | Primary text, near-white with warm tint        |
| card       | 0.185 0.016 60 | Elevated token cards and panels                |
| primary    | 0.78 0.16 162  | Mint-emerald: funding progress, CTAs, active   |
| accent     | 0.76 0.14 65   | Copper-amber: maturity dates, document badges  |
| muted      | 0.225 0.018 60 | Filter panels, secondary surfaces, dividers    |

## Typography

- Display: Space Grotesk — headings, token titles, hero, nav wordmark
- Body: Satoshi — paragraphs, labels, form fields, UI copy
- Mono: JetBrains Mono — face values, funding %, APY, maturity dates, token IDs
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase text-muted-foreground`, body `text-base`

## Elevation & Depth

Layered dark surfaces: background → card → popover, separated by 1px hairline borders and `shadow-subtle`; `shadow-elevated` reserved for hovered cards and modals; no glow effects.

## Structural Zones

| Zone    | Background              | Border              | Notes                                          |
| ------- | ----------------------- | ------------------- | ---------------------------------------------- |
| Header  | `bg-card/95 backdrop-blur` | `border-b`       | Sticky; mint active-state underline on nav     |
| Content | `bg-background`         | —                   | Alternating `bg-muted/30` sections; grain overlay |
| Footer  | `bg-muted/40`           | `border-t`          | Ledger-rule divider, muted small print         |

## Spacing & Rhythm

Generous 24–32px section gaps with denser 8–12px internal card spacing; `gap-4`/`gap-6` grids; compact filter rows at `py-2` to maximize information density.

## Component Patterns

- Buttons: 6px radius, mint solid primary, `hover:brightness-110` + `shadow-elevated`; ghost/secondary on `bg-secondary`
- Cards: 6px radius, `bg-card`, hairline `border-border`, `shadow-subtle`, lift to `shadow-elevated` on hover
- Badges: pill-shaped status chips — Open (mint outline), Funded (mint solid), Matured (muted), document tags in copper

## Motion

- Entrance: `animate-fade-in-up` 400ms staggered 60ms per card on grid load
- Hover: `transition-smooth` 300ms lift and border brighten on cards/buttons
- Decorative: `animate-progress-grow` on funding bars; `animate-pulse-soft` on live funding indicators

## Constraints

- Dark mode only; do not implement a light theme
- Never use raw hex/rgb in components — semantic tokens only
- Monetary values, percentages, and IDs must render in JetBrains Mono tabular numerals
- Keep palette to mint + copper + neutral; no purple, no full-page gradients

## Signature Detail

The ledger treatment: hairline rule dividers with monospace tabular figures make the whole marketplace read as a live, auditable settlement ledger.
