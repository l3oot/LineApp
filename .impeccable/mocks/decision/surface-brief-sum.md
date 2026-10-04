# Surface: Home summary (Sum)

## Scope
Operate surface — mobile home of ยายเภา: balance, date range, income/expense, cycles, recent transactions. Design-only; no logic changes.

## Visitor mode
Operate

## Audience / job
เกษตรกรเปิดดูเงินคงเหลือและกำไรต่อรอบ แล้วไล่รายรับ-รายจ่าย

## Constraints
- Design/CSS/markup presentation only
- Preserve all existing data wiring, handlers, routes, i18n keys
- Mobile web first

## Chosen direction
Bank passbook (model-pick). Seed key: 906c7bd3.

## Direction contract

THESIS: Home is a stamped passbook page — remaining cash reads as the day's stamp, not a pastel dashboard of equal cards.

OWN-WORLD: Deep green cover ink (#0B3D2E), cream inner paper (#F4F1E8), white ledger sheets, chili debit / green credit, tight 12–14px trays, tabular stamp numerals, hairline ledger rules. Signature move: the balance figure settles with a short stamp press when the date range changes.

STORY: Farmer opens and knows remaining cash before anything else; income and expense are hard halves; recent rows read as deposit/withdrawal lines.

FIRST VIEWPORT: Passbook cover band with greeting; weather as a thin strip under the cover; cream field; finance sheet with date stamp strip then monumental balance then twin income/expense columns; bottom nav as the passbook binding edge. Primary action remains existing add/see-all controls lower on the page.

FORM: Bank passbook — grounded list #1 (top-ranked pick). Seed key 906c7bd3.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment
Balance stamp settle on date-range change.