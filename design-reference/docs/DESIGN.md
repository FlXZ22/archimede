# Focus Dashboard design reconstruction

## Evidence

The supplied PNG is 2048 × 1536 pixels. Layout coordinates below refer to that image, with the origin at the top-left. Coordinates are pixel measurements at visible edges and may shift by 1–3 px at blurred or rounded boundaries.

The [REA website-observation guide](https://github.com/morluto/rea/blob/main/docs/guides/web/browser-observation.md) describes inspecting a running page through CDP. The reference here is a flattened PNG, so it contains rendered pixels without DOM, computed styles, or font metadata. The original product name, font family, and chart inputs remain unverified. The original card imagery was isolated from the supplied reference. Text, controls, bars, and the timeline are rendered as live UI.

## Layout

| Element | Approximate reference box `x, y, w, h` | Implementation |
| --- | --- | --- |
| Outer dashboard frame | 102, 153, 1844, 1229 | 90% viewport width, 51 px corners, scaled from an 1844 px container |
| Main alignment rail | 153 to 1895 | 51 px horizontal padding at reference size |
| Navigation and account controls | 153, 184, 1762, 66 | Four tabs, thin notched underline, invite, bell, avatar menu |
| Hero group | 153, 338, 1742, 82 | Title, divider, illustrated status, two actions |
| Goals strip | 163, 479, 1732, 112 | Two fine rules, 83 px date tile, progress, 62 px arrows |
| Deep Work Time | 153, 632, 462, 283 | Cool inset highlights, gold spotlight, 53 px timer button |
| Attention Quality | 635, 632, 462, 283 | Amber artwork with layered live text |
| Focus Stability | 1116, 632, 779, 283 | Eleven bars, dashed guide, peak pill, and score chip |
| Daily Timeline | 160, 970, 1735, 412 | Charcoal panel with thirteen hour markers, two event lanes, and priority pills |

The widget row uses a 462:462:779 ratio, approximately 20 px gaps, and 42 px radii. The timeline starts about 55 px below the cards. Event pills are about 74 px tall in the reference, with the second lane offset by 103 px. Their horizontal geometry is based on the visible reference positions across the 8 AM–8 PM grid.

## Palette

| Role | Hex | Reference sample or treatment |
| --- | --- | --- |
| Surrounding light gray | `#CECECE` | Pixel 10,10 |
| Surrounding dark gray | `#6F6F6F` | Pixel 2030,1500 |
| Dashboard base | `#070707` | Pixel 120,600 |
| Dashboard glow | `#101213` | Near pixel 1100,300, which reads `#0F1112` |
| Timeline panel | `#18181A` | Pixel 210,1000 |
| Divider | `#222224` | Pixel 1000,479 |
| Cool card highlight | `#627790` | Pixel 1490,635 |
| Metallic button highlight | `#8FA5BE` | Pixel 1744,374 |
| Amber artwork | `#D68D01` | Pixel 1015,836 |
| Low priority | `#4B87F0` | Pixel 535,1187 |
| Important | `#35E4A0` | Pixel 1122,1289 |
| High priority | `#A64D9B` | Pixel 1630,1187 |
| Text and muted labels | `#F7F7F8`, `#929295` | Near-white and neutral gray reconstruction tokens |

The metallic controls use a cool diagonal gradient with a faint upper inset edge. Cards use black centers, soft blue-gray reflections, and a localized warm highlight. The chart uses separate cool and amber gradients, fading each bar toward the baseline. Icon controls use thin charcoal outlines with white foregrounds.

## Typography

The bundled family is **Manrope Variable**, normal style, with Arial and the system sans-serif as fallbacks. It was selected for the screenshot’s rounded sans-serif forms, open counters, and restrained weight. The exact original family and font metadata cannot be established from the available image.

| Role | Size at reference scale | Implementation weight and spacing |
| --- | --- | --- |
| Main heading | 47 px | 400, −0.008 em |
| Metric values | 49 px | 400, −0.019 em |
| Timeline and focus headings | 29 px | 400, approximately −0.01 em |
| Card headings and status title | 24 px | 400, −0.01 to −0.025 em |
| Navigation, time labels, descriptions | 20 px | 400 |
| Main actions and chart callout | 20 px | 660 and 750 |

The production build contains the actual Manrope WOFF2 files. The font’s SIL Open Font License is included in `docs/Manrope-OFL.txt`. [Font source](https://github.com/sharanda/manrope)

## Assets and mobile layout

The amber portrait, avatar, brand mark, and status illustration come from crops of the supplied screenshot. The portrait's overlaid labels were removed to make room for live UI text. The other gradients, chart bars, outlines, and priority markers are CSS. Small functional icons and the nav underline are inline vector paths. The screenshot’s “Hight priority” typo is corrected in the implementation.

The screenshot shows the wide dashboard only. At 1100 px and below the cards reflow, and the schedule becomes a chronological agenda with event times. At 680 px and below, the frame becomes full-width, the navigation gets its own row, and the metric cards stack. The same state and controls are available at each size. These breakpoint choices, demo date data, reconstructed chart values, and modal behavior are implementation decisions.

## Verification

The production build was rendered in Chromium at 2048 × 1536. REA 6.8.0’s `compare-web-screenshots` reported that 4.54% of full-frame pixels differed by more than 16 levels in at least one channel. The gray surround and large dark surfaces contribute to this figure, so it is a pixel diagnostic. The widget row and timeline started at the reference y-coordinates of 632 px and 970 px.

Browser checks covered widths of 320, 390, 768, and 1100 px for horizontal overflow. The 390 px agenda was visually checked. The timer controls, date navigation, widget visibility, event creation and deletion, event persistence across reload, and the Projects filter passed interaction checks.
