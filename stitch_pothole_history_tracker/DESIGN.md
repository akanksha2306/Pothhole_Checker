---
name: Civic Flow
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4940'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f7a6f'
  outline-variant: '#becabd'
  surface-tint: '#006d37'
  primary: '#006130'
  on-primary: '#ffffff'
  primary-container: '#107c41'
  on-primary-container: '#b6ffc5'
  inverse-primary: '#7ada95'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#aa091b'
  on-tertiary: '#ffffff'
  tertiary-container: '#cd2b2f'
  on-tertiary-container: '#ffe9e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#96f7af'
  primary-fixed-dim: '#7ada95'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  touch-target: 48px
---

## Brand & Style

The design system is built for a reliable, community-driven civic-tech platform that prioritizes transparency and efficiency. The brand personality avoids the bureaucratic friction of traditional government portals, opting instead for a polished, consumer-grade experience that feels approachable yet authoritative.

The design style is **Corporate / Modern** with a strong emphasis on **Minimalism**. It uses heavy whitespace and a systematic approach to typography to ensure that utility and clarity are never compromised. The interface evokes a sense of civic duty and success through a refined color palette and precise execution, ensuring users feel their contributions are being handled with professional care.

## Colors

The palette is anchored by a restrained "Success Green" (Primary), chosen to instill trust and signal resolution. Neutral grays handle the bulk of the UI structure to keep the focus on content.

- **Primary (#107C41):** Used for main actions, success states, and branding. It represents the "fixed" state and reliability.
- **Secondary (#F97316):** Used for "Warning" or "In Progress" states. It draws attention to active issues without signaling immediate danger.
- **Tertiary (#EF4444):** Reserved for "Urgent" or "Dangerous" reports and critical error states.
- **Neutral (#64748B):** A slate-leaning gray used for secondary text, borders, and iconography to maintain a professional, calm atmosphere.
- **Backgrounds:** Use a pure white (#FFFFFF) for surfaces and a very light gray (#F8FAFC) for page backgrounds to provide subtle contrast between the screen and nested cards.

## Typography

This design system utilizes **Inter** for its systematic, utilitarian, and highly legible characteristics. The type scale is optimized for a mobile-first environment, ensuring that information hierarchy is clear even when viewed at arm's length outdoors.

- **Headlines:** Use Bold or SemiBold weights with tighter letter spacing to create a strong visual anchor for report titles and page headers.
- **Body:** Standardized at 16px for primary reading to ensure accessibility for all age groups in a civic context.
- **Labels:** Used for status badges (e.g., "Open", "Fixed") and metadata. These often use Medium or SemiBold weights to remain legible at smaller sizes.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for the 390x844 mobile viewport. The spacing rhythm is based on a 4px baseline, ensuring all elements align to a consistent vertical and horizontal cadence.

- **Mobile Constraints:** Use a 20px side margin to provide breathing room for content and prevent accidental taps near the edge of the screen.
- **Touch Targets:** All interactive elements (buttons, inputs, navigation items) must maintain a minimum height of 48px to accommodate one-handed mobile use.
- **Bottom Navigation:** A persistent bottom bar (56px–64px height) contains the primary navigation nodes.
- **FAB (Floating Action Button):** The "Report" action is elevated via a primary-colored FAB or a centered, prominent bottom-bar item to encourage the core user loop.

## Elevation & Depth

To maintain a clean, "consumer-app" feel, the design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Ambient Shadows** to define hierarchy.

- **Level 0 (Background):** #F8FAFC. The lowest layer.
- **Level 1 (Cards/Sheets):** White (#FFFFFF) surfaces with a subtle, very diffused shadow (0px 2px 8px rgba(0,0,0,0.05)).
- **Level 2 (Active Elements/Modals):** Increased shadow depth (0px 4px 16px rgba(0,0,0,0.08)) to indicate overlay status.
- **Outlines:** Use a 1px border (#E2E8F0) for input fields and non-elevated cards to maintain structure without adding visual weight.

## Shapes

The shape language is **Rounded**, moving away from "official" sharp corners to a friendlier, modern aesthetic.

- **Standard Elements:** Buttons, cards, and input fields use a 0.5rem (8px) corner radius.
- **Large Elements:** Modals and bottom sheets use a 1rem (16px) radius on the top corners to feel "tucked" into the UI.
- **Pills:** Status badges and tags use a fully rounded radius to differentiate them from functional buttons.

## Components

### Buttons
- **Primary:** Background color Primary, text White. 8px radius. Minimum 48px height.
- **Secondary:** Background color White, 1px border Neutral-200. Text Neutral-800.
- **Danger:** Background color Tertiary, text White. Used for reporting extreme hazards.

### Cards
- **Report Card:** White background, Level 1 elevation. Includes a 4:3 image placeholder, Title (Headline-sm), Status Badge (Pill), and Timestamp (Label-md).
- **Interactive:** Use a subtle active state (darken background by 5%) to provide tactile feedback on tap.

### Input Fields
- Labels must be visible above the field (Label-lg).
- Use a 1px border (#CBD5E1) that thickens to 2px Primary on focus.
- Placeholder text in #94A3B8.

### Status Indicators (Pills)
- **Resolved:** Green background (10% opacity) with Green text.
- **In Progress:** Orange background (10% opacity) with Orange text.
- **Reported:** Gray background (10% opacity) with Gray text.

### Navigation
- **Bottom Bar:** Icons should be 24x24px with a label below in Label-md. Active state uses Primary color; inactive uses Neutral-400.