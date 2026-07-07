---
name: GrantLink Institutional Design System
colors:
  surface: '#fefae0'
  surface-dim: '#dedbc2'
  surface-bright: '#fefae0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f4db'
  surface-container: '#f2efd5'
  surface-container-high: '#ede9cf'
  surface-container-highest: '#e7e3ca'
  on-surface: '#1d1c0d'
  on-surface-variant: '#46483c'
  inverse-surface: '#323120'
  inverse-on-surface: '#f5f1d8'
  outline: '#77786b'
  outline-variant: '#c7c8b9'
  surface-tint: '#586330'
  primary: '#485422'
  on-primary: '#ffffff'
  primary-container: '#606c38'
  on-primary-container: '#dfedac'
  inverse-primary: '#bfcd8f'
  secondary: '#546341'
  on-secondary: '#ffffff'
  secondary-container: '#d7e9bd'
  on-secondary-container: '#5a6947'
  tertiary: '#714507'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d5c20'
  on-tertiary-container: '#ffe0c4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe9a9'
  primary-fixed-dim: '#bfcd8f'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#404b1b'
  secondary-fixed: '#d7e9bd'
  secondary-fixed-dim: '#bbcda3'
  on-secondary-fixed: '#121f05'
  on-secondary-fixed-variant: '#3d4b2b'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#faba75'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#fefae0'
  on-background: '#1d1c0d'
  surface-variant: '#e7e3ca'
typography:
  display-accent:
    fontFamily: Allura
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Soria
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Soria
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Soria
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Soria
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system is rooted in a "Modern Institutional" aesthetic—a blend of governmental stability and premium financial elegance. It departs from typical blockchain tropes of neon and glass, opting instead for a grounded, earthy palette that signals longevity, transparency, and accountability.

The personality is authoritative yet accessible, targeting high-stakes stakeholders, NGOs, and government entities. The visual style prioritizes **Minimalism** with **Tactile** accents, using solid fills and refined structural lines to create a sense of digital "paper of record." The emotional goal is to provide a calm, trustworthy environment where complex funding data feels organized and immutable.

## Colors
The palette is inspired by natural parchment and traditional forestry, reinforcing the concept of sustainable growth and institutional roots.

- **Primary Olive (#606C38):** Used for primary actions, success states, and brand identifiers.
- **Deep Forest (#283618):** Reserved for high-contrast text, navigation headers, and deep structural elements to ensure readability.
- **Warm Ivory (#FEFAE0):** The foundational background color. It reduces eye strain compared to pure white and provides a "premium document" feel.
- **Sand Gold (#DDA15E) & Burnt Copper (#BC6C25):** These are functional accents used for milestone progress, highlight tags, and warning states.

Avoid all gradients. Use solid block colors to maintain the "government-grade" sobriety.

## Typography
This design system employs a three-tier typographic hierarchy:
1.  **Calligraphic Accent (Allura):** Used sparingly for logo marks and high-level hero decorative text. It should never be used for functional UI.
2.  **Institutional Serif (Soria):** The voice of the platform. Used for headings, card titles, and critical statistics. It conveys heritage and authority.
3.  **Systematic Sans (Inter):** The workhorse font for all interactive elements, data tables, and body copy. It ensures maximum legibility for complex financial figures.

Maintain generous line heights for body text to mimic editorial layouts.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain the structure of a formal report, transitioning to a fluid model on mobile devices.

- **Grid:** 12-column grid with 24px gutters.
- **Margins:** Large 48px outer margins on desktop to allow the content to breathe, emphasizing the "Minimalist" brand value.
- **Rhythm:** An 8px base unit drives all spacing. Vertical stacks use 24px (stack-md) for related content and 48px (stack-lg) to separate major sections.
- **Tables:** Data-heavy views should utilize a full-width fluid layout within the container to accommodate multi-column milestone data.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Low-contrast Outlines** rather than aggressive shadows. 

- **Surface Levels:** The base layer is Warm Ivory. Secondary surfaces (cards, sidebars) use pure white (#FFFFFF). 
- **Borders:** Use 1px solid borders in #E3E0C8 for card containers. This creates a "tabbed folder" or "architectural blueprint" look.
- **Shadows:** If elevation is required for modals, use a very soft, diffused ambient shadow: `0px 4px 20px rgba(40, 54, 24, 0.05)`. Avoid black-based shadows; always tint shadows with the Deep Forest (#283618) color at very low opacity.

## Shapes
The shape language is "Soft" (0.25rem / 4px). This slight rounding removes the harshness of a brutalist grid while maintaining the professional rigor of a governmental portal. 

- **Buttons & Inputs:** 4px radius.
- **Cards & Modals:** 8px (rounded-lg) for a slightly softer container feel.
- **Status Pills:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components
- **Buttons:** Primary buttons use a solid Deep Forest (#283618) background with Ivory text. Secondary buttons use an Olive (#606C38) outline with a 1px weight.
- **Cards:** White background, 1px #E3E0C8 border, 8px corner radius. No shadow by default. Headers within cards should use Soria in Deep Forest.
- **Data Tables:** Clean, minimalist rows with thin horizontal dividers. Header cells should use `label-md` (Inter, Bold, All-Caps).
- **Milestone Trackers:** Use a vertical or horizontal line in Sand Gold (#DDA15E). Completed milestones use the Primary Olive; pending milestones use a dashed Burnt Copper line.
- **Input Fields:** Soft Ivory background with a 1px border. On focus, the border transitions to Primary Olive with no "glow" effect, only a subtle weight increase or color change.
- **Chips/Badges:** Small, rectangular with 4px radius. Use Burnt Copper for "High Priority" and Olive for "Verified."