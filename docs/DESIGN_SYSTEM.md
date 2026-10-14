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

Breakpoints at 1150 and 850 logical pixels compress navigation and collapse columns. Very wide views cap content width. The overlay auto-sizes to its card, has a draggable native header, transparent outer margins and no decorative background image. Typography, text contrast, focus visibility, labels and layout remain Sanctum components. Real-art screenshots stay private; distributable screenshot baselines use the original fallback. See TESTING.md for physical-monitor and game limitations.

## Private artwork composition

The v0.2.0 theme failed the design review: a global SVG rule replaced unrelated commands with a generic ornament; transparent atlas margins shrank other icons; a navigation underline was stretched over secondary buttons; one button image served every interaction state; 12px borders flattened the surface hierarchy. Functional smoke tests did not establish visual quality.

The corrected theme uses these rules:

- **Frames:** eight original tooltip pieces form a transparent-centred 171px frame with 28px slices. Paint it on a pointer-transparent pseudo-element, 5px on ordinary panels and 7px on the hero, item card and overlay. Keep content padding independent of the art. Corners retain their proportions. Inputs and small icon wells have a simple 1px edge.
- **Surfaces:** restrained obsidian/stone layers, a single angel ornament in the hero and a narrow divider under panel headings. The sidebar has a quiet right edge, not a frame enclosing the entire window.
- **Buttons:** primary actions use crimson; secondary actions use dark stone. Normal, hover and pressed states select matching sprites. Fixed corner slices prevent distortion on long labels. Disabled buttons cannot acquire hover/pressed styling. Ghost controls stay quiet. All decorative layers use `pointer-events: none`.
- **Navigation:** only the active route gets the gold leading edge and selection underline. Hover adds a restrained surface/border change; leaving restores the original state. Keyboard focus uses a separate 2px pale-gold outline with 3px offset.
- **Icons:** `GameIcon` explicitly maps a UI role to real artwork and fits its visible alpha bounds into a consistent box. Never hide every Lucide stroke or replace unrelated icons globally. Conventional utility/status symbols retain their meaning. Corrupt, empty, missing or oversized glyphs fall back to the original vector icon.
- **Game identity:** class crests and equipment-slot pictograms come from their own atlases. Skill artwork resolves an exact, normalized English skill name within the character class. Explicit user assignments take precedence. Unknown skills/classes keep a category fallback; a generic glyph does not claim to depict a named skill.
- **Motion/accessibility:** 80–140ms control feedback, no decorative glow or looping animation; reduced motion disables transitions. Gallery selection exposes `aria-pressed`. Native labels, focus order and hit areas remain intact.

`gameSkillIcons.ts` contains only numeric lookup recipes, verified against `hIconNormal` in [DiabloTools' extracted Power records](https://github.com/DiabloTools/d4data/tree/33e0bfbb5f717d3e560d14a7fb27d5a7f17fd2c0/json/base/meta/Power) and the matching English name in [StringList records](https://github.com/DiabloTools/d4data/tree/33e0bfbb5f717d3e560d14a7fb27d5a7f17fd2c0/json/enUS_Text/meta/StringList). Only handles present in the owner's local five class atlases were retained; ambiguous names were omitted. Runtime resolves exclusively from the private extracted cache. No remote artwork, game prose or pixels are bundled.

Existing v0.2.0 presets upgrade when loaded, preserving manual art and customized bindings. Reapplying the preset refreshes theme chrome while retaining manual skill/class/item assignments. A missing recipe is skipped. Disabling the theme removes the chrome variables and role glyphs; individually imported semantic assets remain available.
