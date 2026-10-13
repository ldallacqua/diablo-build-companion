# Design system

The original identity is Sanctum: a bronze geometric arch/rune, an atmospheric gothic landscape, charcoal surfaces and restrained gold. The distributable fallback uses no Blizzard logos, characters or textures. An optional private theme reads artwork from the user’s installed game. `src/design-system/styles.css` is the token and component source.

| Token                       | Value / role                                              |
| --------------------------- | --------------------------------------------------------- |
| Background                  | `#101112`                                                 |
| Surface / raised            | `#17191b` / `#1d2022`                                     |
| Border                      | `#2e3031`                                                 |
| Main text                   | `#ebe6db`                                                 |
| Muted text                  | `#999b9b`                                                 |
| Gold                        | `#d1b578`                                                 |
| Positive / caution / danger | `#a7c7ae` / `#dbb780` / `#b66d66`                         |
| Type                        | Bundled Inter variable sans; Georgia for fantasy headings |
| Spacing                     | 4, 8, 12, 16, 20, 24, 32 pixels                           |
| Radius                      | 5px controls; 10px surfaces                               |

Shared primitives: Panel with eyebrow/title/action, Button (primary/secondary/ghost/danger), Badge, Meter, AssetIcon, CheckRow, Empty and FocusScope. Focus is visible; inputs/buttons have accessible labels; modal focus is contained and editor Escape cancels. Checklists expose pressed state. Motion uses short opacity/position changes and respects reduced motion. Verdict colors are accompanied by text and icons.

Breakpoints at 1150 and 850 logical pixels compress navigation and collapse columns. Very wide views cap content width. The overlay auto-sizes to its card, has a draggable native header, transparent outer margins and no decorative background image. The optional private theme replaces frame borders, corners, surfaces, dividers, button art and UI glyphs through semantic `texture.*` CSS variables. Eight tooltip pieces form a transparent-centred 171-pixel frame with 28-pixel nine-slice edges. Frame width is 12 logical pixels (9 for overlay, 6 for inputs/icons). Typography, text contrast, focus visibility, labels and layout remain Sanctum components. Missing theme data retains the original presentation; disabling the theme removes its CSS variables. Specific skill/item assignments require a verified semantic ID. The gallery previews original alpha on a checkerboard and uses accessible selection buttons. Real-art screenshots stay private. Distributable screenshots use the original fallback. Screenshots are reviewed, then compared with committed Windows baselines. See TESTING.md for physical-monitor and game limitations.
