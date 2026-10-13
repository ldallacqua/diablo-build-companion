# Design system

The original identity is Sanctum: a bronze geometric arch/rune, an atmospheric gothic landscape, charcoal surfaces and restrained gold. No Blizzard logos, characters or textures are used. `src/design-system/styles.css` is the token and component source.

| Token                       | Value / role                                                |
| --------------------------- | ----------------------------------------------------------- |
| Background                  | `#101112`                                                   |
| Surface / raised            | `#17191b` / `#1d2022`                                       |
| Border                      | `#2e3031`                                                   |
| Main text                   | `#ebe6db`                                                   |
| Muted text                  | `#999b9b`                                                   |
| Gold                        | `#d1b578`                                                   |
| Positive / caution / danger | `#a7c7ae` / `#dbb780` / `#b66d66`                           |
| Type                        | Windows system sans; Georgia for editorial fantasy headings |
| Spacing                     | 4, 8, 12, 16, 20, 24, 32 pixels                             |
| Radius                      | 5px controls; 10px surfaces                                 |

Shared primitives: Panel with eyebrow/title/action, Button (primary/secondary/ghost/danger), Badge, Meter, AssetIcon, CheckRow, Empty and FocusScope. Focus is visible; inputs/buttons have accessible labels; modal focus is contained and editor Escape cancels. Checklists expose pressed state. Motion uses short opacity/position changes and respects reduced motion. Verdict colors are accompanied by text and icons.

Breakpoints at 1150 and 850 logical pixels compress navigation and collapse columns. Very wide views cap content width. The overlay auto-sizes to its card, has a draggable native header, transparent outer margins and no decorative background image. Screenshots are reviewed, then compared with committed Windows baselines. See TESTING.md for physical-monitor and game limitations.
