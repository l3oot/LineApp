---
name: ยายเภา
description: A crisp farm ledger — know profit per planting cycle.
colors:
  young-rice: "#3BB273"
  young-rice-soft: "#E8F8EE"
  young-rice-edge: "#2F9A5F"
  canopy-deep: "#2D6A4F"
  washed-cloth: "#F4F8F5"
  surface: "#FFFFFF"
  surface-soft: "#EEF6F0"
  border: "#DCE8E0"
  charcoal: "#1B2433"
  moss-mute: "#6E7A72"
  chili: "#F06B6B"
  chili-action: "#E57373"
  chili-edge: "#C85A5A"
  chili-wash: "#FFF5F5"
  mk-leaf-deep: "#1F6B42"
  mk-ink: "#1A2E24"
  mk-cream: "#F7FAF7"
  page-pink: "#E07A9A"
  page-blue: "#4D9EFF"
  page-purple: "#8B7BC8"
typography:
  display:
    fontFamily: "Mali, cursive"
    fontSize: "clamp(2.15rem, 5.5vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "clamp(1.125rem, 4.2vw, 1.75rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.18px"
  title:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.18px"
  body:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.18px"
  label:
    fontFamily: "Sarabun, Noto Sans Thai, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.18px"
rounded:
  card: "22px"
  control: "16px"
  footer: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  page-x: "18px"
components:
  button-primary:
    backgroundColor: "{colors.young-rice}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.young-rice}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-primary-active:
    backgroundColor: "{colors.young-rice}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-expense:
    backgroundColor: "{colors.chili-action}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "52px"
  button-cancel:
    backgroundColor: "{colors.chili-wash}"
    textColor: "{colors.chili-edge}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.moss-mute}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  chip-active:
    backgroundColor: "{colors.young-rice}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "#9AA3B2"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
  nav-item-active:
    backgroundColor: "transparent"
    textColor: "{colors.young-rice}"
    rounded: "{rounded.control}"
  button-marketing-primary:
    backgroundColor: "{colors.mk-leaf-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "44px"
---

# Design System: ยายเภา

## Overview

**Creative North Star: "The Village Ledger"**

ยายเภา is a farm-ops notebook that should feel like a produce stand's cash tray: crisp, scanable, and green without becoming a nature illustration. The world is neighborly in material and color, then tightened into dashboard density — large tap targets, tabular numbers, short Thai labels, white trays over a mint wash. Personality lives in Young Rice, Mali display type, and the capsule commit. The rest of the chrome stays quiet so a grower can read income, cost, and profit in one glance.

The product has two registers that share a leaf family and must not be blended into a third look. The **app** is Operate: Washed Cloth field, white 22px trays, Young Rice pills, a fixed footer. The **marketing site** is Persuade: cream paper, deeper forest leaf, Mali headlines, a 1120px editorial shell. New app screens inherit the Operate register. New marketing surfaces inherit the Persuade register. Do not split the difference.

Confirmed visual rejections: corporate-fintech navy-and-graphite, gray drop shadows, and a third type family. Google Sans is loaded and unused — leave it that way.

**Key Characteristics:**
- Young Rice as the single operational accent (income, commit, active)
- Washed Cloth field with white trays, never a full-bleed white app
- Sarabun for work, Mali for display and greeting
- Full-pill actions with a firm tap (scale 0.99 / 0.96)
- Ambient canopy glow tinted with Young Rice
- Income / expense as the only data-color binary
- Page tones (pink / blue / purple) as header accents only

## Colors

A mint field palette: one growing green for commit and income, one chili for spend and danger, and a cool-green paper stack for everything else.

### Primary
- **Young Rice**: The operational voice — income amounts, primary pills, active nav, selected calendar days, and the tint inside every canopy glow. Keep it scarce; wash and trays do the acreage.
- **Young Rice Soft**: The quiet bed under avatars, active nav icons, selected list rows, and income-idle hovers.
- **Young Rice Edge**: The 1.5px rim on primary pills. Slightly deeper than the fill so the capsule reads as a physical bead, not a flat stamp.
- **Canopy Deep**: The `--navy` token — a forest shade used where the ledger needs weight without leaving the leaf family. Not a second primary.

### Secondary
- **Chili**: Expense amounts, danger text, and destructive selection.
- **Chili Action / Chili Edge**: The warmer spend pill (`#E57373` fill, `#C85A5A` rim) used when the action *is* an expense, not a warning about one.
- **Chili Wash**: Cancel and delete-adjacent beds. Pink paper, not a red flood.

### Tertiary
- **Page Pink / Page Blue / Page Purple**: Header accent tints only (cycle & tools, weather, settings). They color a 2.5rem hairline and the notification glyph. They are not brand, not CTAs, and not chart decoration by default.
- **Marketing Leaf Deep**: Persuade-register primary. Deeper and more forest than Young Rice. Use on the landing CTA, not inside the app shell.
- **Marketing Ink / Marketing Cream**: Persuade text and paper. Do not replace Charcoal / Washed Cloth inside the app.

### Neutral
- **Washed Cloth**: App canvas and HTML fallback. The field the trays sit on.
- **Surface**: White tray, sheet, footer, and popover paper.
- **Surface Soft**: Recessed wells inside trays (date chips, segment tracks, filter idles).
- **Border**: Cool mint hairline. Prefer this over gray `#E5E7EB`.
- **Charcoal**: Primary ink. Cool enough to stay crisp on mint paper.
- **Moss Mute**: Secondary copy, timestamps, idle labels.

**The Young Rice Rule.** Young Rice is income, commit, and the active voice. It should occupy a minority of any screen. If a layout needs more green, use Washed Cloth and Young Rice Soft — not more filled pills.

**The Ledger Binary Rule.** Money has two colors: Young Rice for in, Chili for out. Do not invent a third amount color. Balance follows income.

## Typography

**Display Font:** Mali (cursive fallback)
**Body Font:** Sarabun (`Noto Sans Thai`, `Segoe UI`)
**Label/Mono Font:** Sarabun for UI labels; `ui-monospace, Consolas` only for raw technical strings

**Character:** Sarabun is the workhorse — generous Thai counters, slightly wide, built for numbers and short farm labels. Mali is the greeting: rounded, handwritten, used when the product speaks as ยายเภา rather than as a form. The pairing is village notebook, not startup geometric.

### Hierarchy
- **Display** (Mali 700, clamp 2.15–3.4rem, 1.15): Marketing heroes and large Persuade statements. Max width around 14ch on the hero.
- **Headline** (Sarabun 800, clamp 1.125–1.75rem, 1.2): App subpage titles (รอบปลูก, รายการ, สรุป).
- **Title** (Sarabun 800, 1.0625rem, 1.3): Greeting name and card titles.
- **Body** (Sarabun 400, 17px / 16px below 1024px, 1.45, +0.18px): Default reading and form copy. Marketing lead sits slightly larger (~1.08rem / 1.65) with a ~38ch measure.
- **Label** (Sarabun 600–800, 0.6875–0.8125rem): Nav, chips, date-field captions, amount badges. Nav labels are the smallest (11px / 600). Amount badges are 11px / 800 inside a 24px-tall pill.

### Named Rules
**The Ledger Pair Rule.** Sarabun carries the work. Mali is for greetings and marketing display. Do not introduce a third family. Do not set app body in Mali.

## Layout

Mobile-first farm ops in a centered column. The app shell is `max-width: 1080px`, page padding around 16–18px, vertical rhythm 16–20px. Home cards sit on a field-background proportion (`--bg-aspect-ratio-h-w: 0.34`) so the first tray aligns with the illustrated header; from 768px the same offsets switch to `dvh`. The footer is `position: fixed`, `width: min(100%, 1080px)`, lifted on a top radius of 24px, with content padded `pb-24` so rows never hide behind it. Bottom sheets cap at 420px and rise from the same column.

Marketing uses a wider editorial shell — `min(1120px, calc(100% - 2rem))` — with section padding around 3.5rem and a 3-column feature grid from 720px. Sticky header blurs the cream paper. Do not put that editorial width or blur chrome into the app.

Safe-area insets are real: greeting and subpage headers add `env(safe-area-inset-top)`; the footer adds `env(safe-area-inset-bottom)`. Tap targets stay at 44–48px minimum.

**The Phone-First Tray Rule.** Work lives on white trays inside the 1080 column over Washed Cloth. Do not full-bleed white. Do not desktop-app the Operate register into a 12-column dashboard.

## Elevation & Depth

Ambient canopy, not Material lift. Surfaces float a little even at rest; the glow is atmosphere tinted with Young Rice. Actions get a stronger bead of the same green. Expense uses a shorter red glow so spend never borrows the income shadow. Depth is not conveyed with gray, cool blue, or hard offsets.

### Shadow Vocabulary
- **Canopy rest** (`box-shadow: 0 10px 28px rgba(59, 178, 115, 0.10)`): Cards, date trays, icon buttons, popovers. The default `--shadow-soft`.
- **Footer lift** (`box-shadow: 0 -10px 30px rgba(59, 178, 115, 0.10)`): The fixed tab bar rising off the field.
- **Commit bead** (`box-shadow: 0 8px 18px rgba(59, 178, 115, 0.28)`): Primary pills. Hover steps to `0 10px 22px` at 0.34 alpha.
- **Chip bead** (`box-shadow: 0 6px 14px rgba(59, 178, 115, 0.22)`): Active filters and pill controls.
- **Spend bead** (`box-shadow: 0 2px 8px rgba(200, 90, 90, 0.22)`): Expense pills only.
- **Avatar bead** (`box-shadow: 0 4px 12px rgba(59, 178, 115, 0.14)`): Greeting portrait ring.

### Named Rules
**The Canopy Glow Rule.** Shadows are tinted Young Rice (or Chili on spend). Never gray. Never cool blue. A leftover blue sheet shadow in the shared BottomSheet default is drift — new sheets use canopy rest.

## Shapes

Soft agriculture geometry: trays are generously rounded, tools are slightly tighter, commits are capsules.

- **Tray** (22px): Cards, sheets (top corners), date popovers, settings panels.
- **Control** (16px): Inputs, icon wells, nav item hit areas, compact actions.
- **Capsule** (9999px): Primary pills, chips, segment tracks, avatars, selected calendar days, coin chip.
- **Footer arch** (24px 24px 0 0): The tab bar is a tray that grew into the bottom edge.
- **Hairline**: 1.5px on pills and list date-range; 1px on marketing rules and app borders.

**The Capsule Commit Rule.** If the control spends money, saves a cycle, or filters the ledger, it is a pill. Do not square primary actions. Do not put 8px Material radius on a tray.

## Components

Tactile and confident — full pills, firm tap, green that commits.

### Buttons
- **Shape:** Full capsule (9999px). Primary is 52px tall, 10px 20px padding, 15px / 700, 1.5px Young Rice Edge rim, white label, optional 32px white icon coin.
- **Primary:** Young Rice fill, canopy commit bead, 180ms ease on transform / filter / shadow. Hover brightens 1.03 and lifts the bead. Active scales to 0.99. Disabled drops to 0.55 opacity and loses the shadow.
- **Expense:** Chili Action fill, Chili Edge rim, spend bead. Same motion. Used when the action records a cost.
- **Cancel:** Chili Wash bed, Chili Edge label, no shadow. Hover warms to a deeper wash. Never a gray ghost.
- **Marketing primary:** Marketing Leaf Deep fill, 44px min height, 0.97 active scale. Hover goes to `#185734`. A LINE-green partner button (`#06C755`) is allowed only for LINE-native actions — it is not a second primary.

### Chips
- **Idle:** Surface Soft bed, Moss Mute 13px / 700, no border, capsule.
- **Active (all / income):** Young Rice fill, white label, chip bead.
- **Active (expense):** Chili Action fill, spend bead, light text-shadow.
- **Ghost pill control:** Transparent until `.is-active`, then the same Young Rice bead as a chip. Used in analytics filter bars and segment tracks (track = Surface Soft capsule with 4px gap).

### Cards / Containers
- **Corner Style:** Tray radius (22px), overflow hidden when the card has a hero tint.
- **Background:** Surface on Washed Cloth. Some cycle heroes carry a user-picked crop color; the chrome around them stays system.
- **Shadow Strategy:** Canopy rest. No extra border required; when a border appears it is the mint hairline, hover may shift toward `#CFDAC8`.
- **Internal Padding:** 12–18px. List filter card is 16×18. Transaction rows are 12px with a 40px circular glyph well.
- **Amount badges:** 24px-tall capsules, 11px / 800, Young Rice or Chili fill.

### Inputs / Fields
- **Style:** Surface bed, Control radius (16px), 1px mint border, 8×12 padding, 14–15px Sarabun.
- **Focus:** Border shifts to Young Rice. No glow ring. Outline none — the border *is* the focus.
- **Wells:** Date-range inner fields sit in Surface Soft at ~14px radius with no border.
- **Error / Disabled:** Error copy in Chili on a light chili bed. Disabled is 0.50–0.60 opacity, cursor not-allowed.

### Navigation
- **App footer:** Five equal columns. Idle ink is `#9AA3B2`. Active label is Young Rice; the 36px icon well fills Young Rice Soft. Active press scales 0.96. No filled tab pill behind the whole item.
- **Greeting:** 48px avatar (white 2px ring, Young Rice Soft fallback), 17px / 800 name, 13px / 500 subtitle, coin chip on the right.
- **Subpage header:** Headline + Moss Mute subtitle. Non-neutral page tones add a 2.5×3px capsule hairline in the page accent — a section mark, not a text kicker.
- **Marketing nav:** Soft ink links, Leaf Deep on current/hover, 860px breakpoint to a drawer. Sticky cream blur.

### Bottom Sheet
The signature mobile editor. Top tray radius, Surface paper, drag handle 4×48 on Border, 180–240ms rise (`ease-out` / `cubic-bezier(0.32, 0.72, 0, 1)`), dismiss after 96px drag. Width follows the 420px column. Backdrop is a 0.35 black veil, not a blur.

## Do's and Don'ts

### Do:
- **Do** sit work on white 22px trays over Washed Cloth.
- **Do** make commit actions full capsules with a Young Rice Edge rim and a canopy bead.
- **Do** keep Sarabun on app chrome and Mali on display / greeting only.
- **Do** tint every rest shadow with Young Rice; tint spend shadows with Chili.
- **Do** keep income / expense as the only amount colors.
- **Do** hold the app to a 1080 column and sheets to 420.
- **Do** keep tap targets at 44–48px and honor safe-area insets.

### Don't:
- **Don't** introduce a third type family or set app body in Mali.
- **Don't** use gray, graphite, or cool-blue drop shadows.
- **Don't** promote page-tone pink / blue / purple into buttons or brand marks.
- **Don't** square off primary actions or use 8px Material radius on trays.
- **Don't** flood a screen with Young Rice fill — Soft and Cloth do the field.
- **Don't** mix marketing Leaf Deep into the app shell, or Young Rice pills into the landing hero.
- **Don't** treat unused Google Sans, marketing eyebrows, or Lucide marks as house style to copy.
