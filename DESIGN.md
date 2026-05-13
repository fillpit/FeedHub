# Design System: Node Template
**Project ID:** nodejs-template

## 1. Visual Theme & Atmosphere
The visual theme is modern, structured, and highly readable, aiming for a "Clean & Professional Utility" vibe. It features a dual-theme system (Light and Dark) that balances an airy, spacious light mode (#ffffff background) with a dense, focused dark mode (#0d1117 background). The design prioritizes content clarity through subtle elevations, distinct borders, and smooth Framer Motion micro-interactions (e.g., spring scaling, gentle fade-ins) to create an interface that feels responsive, alive, and polished without being distracting.

## 2. Color Palette & Roles
* **Page Background** (#ffffff Light / #0d1117 Dark): `bg-app-bg` - Used for the core page canvas, providing a neutral foundation.
* **Surface/Card Background** (#f9fafb Light / #161b22 Dark): `bg-app-surface` - Used for cards and panels, creating a subtle contrast against the page background.
* **Elevated Background** (#ffffff Light / #1c2333 Dark): `bg-app-elevated` - Used for floating layers, popovers, and modals.
* **Primary Text** (#111827 Light / #e6edf3 Dark): `text-tx-primary` - High-contrast text for core readability on main content and headers.
* **Secondary Text** (#6b7280 Light / #8b949e Dark): `text-tx-secondary` - Muted text for descriptions, metadata, and non-critical labels.
* **Primary Accent Blue** (#3b82f6 Light / #58a6ff Dark): `accent-primary` - Used for primary actions, focus rings, and main interactive buttons to draw the user's attention.
* **Success Green** (#22c55e Light / #7ee787 Dark): `accent-secondary` - Used for positive feedback, success states, and affirmative metrics.
* **Warning Orange** (#f59e0b Light / #f0883e Dark): `accent-warning` - Used for cautionary elements and warning badges.
* **Danger Red** (#ef4444 Light / #f85149 Dark): `accent-danger` - Used for destructive actions (e.g., delete) and error states.
* **Border Divider** (#e5e7eb Light / #30363d Dark): `bg-app-border` - Used for subtle structure lines separating content sections.

## 3. Typography Rules
* **Font Family**: Uses system-native fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC'...`) for optimal performance and native feel across OS platforms, with Inter (`font-sans`) and JetBrains Mono (`font-mono`) as stylistic supplements.
* **Headers**: High structural hierarchy utilizing bold weights (`font-bold`, `font-semibold`). Main page titles use 30px (`text-3xl`), block headers use 20-24px (`text-xl`), and card titles use 18px (`text-lg`).
* **Body**: Standardized readable sizing at 14px (`text-sm`) for general content, scaling down to 12px (`text-xs`) for helper text and 10px (`text-[10px]`) for badges.
* **Code Blocks**: Uses dedicated monospaced fonts (`Cascadia Code`, `Fira Code`, `Menlo`) for technical clarity.

## 4. Component Stylings
* **Buttons:** Gently rounded corners (`rounded-lg` / `rounded-md`). Primary buttons feature a solid accent-color background (`bg-accent-primary`) with inverse text. Ghost buttons use transparent backgrounds with hover effects (`bg-app-hover`), while destructive buttons use bold red. They incorporate subtle click and hover transitions.
* **Cards/Containers:** Generously rounded corners (`rounded-2xl` / 16px) with a soft background (`bg-app-surface/50`). They feature delicate borders (`border-app-border`) that subtly shift color on hover (`hover:border-accent-primary/50`), accompanied by soft shadows (`shadow-sm`) to lift them off the canvas.
* **Inputs/Forms:** Moderately rounded corners (`rounded-xl` or `rounded-md`). They possess a neutral background (`bg-app-bg`) with clear bounding box borders. When active, they gain an energetic focus ring (`focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary`) to clearly signify user interaction.
* **Modals/Dialogs:** Highly elevated surfaces featuring substantial roundness (`rounded-2xl` / 16px) and prominent drop shadows (`shadow-2xl` / `shadow-xl`). Modals enter with a snappy spring scale animation (from 0.95 to 1.0) for a premium feel.
* **Icons:** Housed in distinctly rounded squares (e.g., `rounded-xl` / 12-16px) with translucent tinted backgrounds (e.g., `bg-blue-500/10`) to provide localized pops of color without overwhelming the interface.

## 5. Layout Principles
* **Whitespace & Grid:** Adheres strictly to a 4px base unit spacing system. Elements use tight spacing internally (e.g., 4px/8px gap) and larger breathing room between major sections (16px to 24px/32px padding).
* **Structural Layout:** Follows a primary sidebar/content pattern. The navigation sidebar (220-480px width) is visually separated via borders and slight background contrast, while the main content area (`flex-1`) stretches fluidly. 
* **Alignment:** Extensive use of Flexbox with `gap` utilities for consistent vertical (`flex-col gap-3`) and horizontal (`flex items-center gap-2`) rhythm. Central content is typically constrained to optimal reading widths (`max-w-4xl mx-auto`).
* **Responsiveness:** Fluid grid columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) and conditional display utilities (`hidden md:flex`) handle responsive reflows, ensuring touch targets on mobile remain large enough (min 36x36px).
