---
name: Luxury Editorial Social
colors:
  surface: '#fdf8f8'
  surface-dim: '#ddd9d8'
  surface-bright: '#fdf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e6'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5f5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2dd'
  on-secondary-container: '#656461'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e5e2dd'
  secondary-fixed-dim: '#c9c6c1'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fdf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  stack-sm: 16px
  stack-md: 32px
  stack-lg: 64px
---

## Brand & Style

This design system is defined by an intersection of high-end editorial curation and digital minimalism. It targets a discerning audience that values white space, silence, and intentionality over rapid-fire consumption.

The visual direction draws heavily from "Kinfolk" and "Vogue" aesthetics—emphasizing large-scale imagery, high-contrast serif typography, and a "warm" minimalist palette that feels more human than traditional tech-driven minimalism. The primary mood is one of quiet confidence, premium quality, and timeless sophistication.

**Key Aesthetic Pillars:**
- **Editorial Grids:** Layouts that prioritize imagery and negative space over density.
- **Warm Minimalism:** Replacing stark whites with ivory and bone tones to create a more luxurious, tactile feel.
- **High-Contrast Typography:** Using the tension between a traditional serif and a functional sans-serif to establish hierarchy.
- **Subtle Precision:** Utilizing razor-thin borders and generous padding to define boundaries without adding visual noise.

## Colors

The palette is anchored in warm neutrals. The base is a **Warm Ivory (#F7F5F2)**, which provides a softer, more sophisticated canvas than pure hex white. Contrast is achieved through a deep **Charcoal Primary (#1A1A1A)** used for call-to-actions and heavy typography.

**Usage Guidelines:**
- **Surfaces:** Use the Ivory background for the main viewport and the Secondary Background for structural elements like sidebars or footers. Cards should always be pure white in light mode to "lift" content off the warm base.
- **Borders:** Borders are functional but extremely light (#E5E0D8). They should disappear at a glance and only be visible upon closer inspection.
- **Dark Mode:** In dark mode, the "warmth" is maintained by avoiding true black for surfaces, opting instead for a deep charcoal (#111111) that feels more ink-like and premium.

## Typography

This system relies on the interplay between the classic, high-contrast strokes of **Playfair Display** and the utilitarian precision of **Inter**. 

**Editorial Principles:**
- **Serif for Narrative:** Use Playfair Display for headlines, quotes, and titles. It should feel authoritative and graceful.
- **Sans-Serif for Utility:** Use Inter for navigation, labels, and body text. It ensures legibility and a modern, "Apple-esque" feel.
- **Tracking (Letter Spacing):** Labels should be uppercase with wide tracking (8-10%) to evoke fashion house branding. Headlines should have slightly tightened tracking for a more "locked-in" editorial look.
- **Hierarchy:** Maintain large gaps between headline sizes and body text to create a dramatic, magazine-style scale.

## Layout & Spacing

The layout philosophy follows a **12-column fixed grid** on desktop, centered with significant margins. On mobile, the system transitions to a fluid single-column layout.

**Spacing Rhythm:**
- **Generosity:** Use the `stack-lg` (64px) unit frequently between sections to ensure the design "breathes." Avoid crowding elements; if in doubt, add more space.
- **Margins:** Desktop margins are intentionally wide (64px) to frame the content like a page in a book.
- **Consistency:** All spacing is based on an 8px baseline grid to maintain mathematical harmony even in a seemingly "loose" editorial layout.

## Elevation & Depth

To maintain the high-end minimalist aesthetic, this system avoids traditional heavy shadows. Instead, depth is communicated through **Tonal Layering** and **Low-contrast Outlines**.

- **Surface Tiering:** Depth is created by placing white cards on the Ivory background. The color shift itself acts as the primary separator.
- **Shadows:** Only one shadow level is permitted: a very soft, highly diffused "Ambient" shadow (0px 10px 30px rgba(0,0,0,0.03)). It should feel like a subtle glow rather than a drop shadow.
- **Glassmorphism:** Use a light backdrop blur (20px) on navigation bars and overlays to maintain context with the background colors while ensuring legibility.

## Shapes

The shape language is controlled and precise. While the "luxury" vibe often leans toward sharp corners, we utilize a `roundedness: 2` (0.5rem / 8px default, with 12px for larger cards) to bridge the gap between traditional editorial and modern app design.

- **Cards & Images:** Use 12px (`rounded-lg`) for all main content cards and hero images.
- **Buttons:** Small buttons use 8px; full-width CTA buttons can occasionally be pill-shaped to stand out from the grid-based layout.
- **Form Inputs:** Consistent 8px rounding.

## Components

### Magazine Cards
The core of the social experience. Cards should feature a 4:5 or 1:1 aspect ratio for imagery. Text is placed either directly below the image with generous padding or overlayed with a subtle gradient. Use thin borders (#E5E0D8) for separation.

### Buttons
- **Primary:** Solid #1A1A1A background with white Inter typography (bold). No shadow.
- **Secondary:** Transparent background with a 1px border of #1A1A1A.
- **Ghost:** No border or background; uses uppercase label styling with wide tracking.

### Inputs & Forms
Inputs should be minimalist: a simple 1px border (#E5E0D8) that turns slightly darker (#111111) on focus. No heavy background fills. Placeholder text should be in the Muted Text color (#9A9A9A).

### Navigation
A top bar with a backdrop blur and ivory-tinted transparency. Icons should be "thin" or "light" weight (2px stroke max) and paired with labels in `label-md` typography.

### Chips & Tags
Small, rectangular shapes with 4px rounding. Use the Secondary Background (#F3F0EB) for the fill and Primary Text for the label. These should feel like small physical tags on a garment.