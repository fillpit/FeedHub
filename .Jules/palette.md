## 2025-12-30 - UserHeader Refactor
**Learning:** Replacing custom interactive elements with standard library components (like `el-dropdown`) drastically reduces code complexity (removed manual event listeners) and improves accessibility (keyboard nav, ARIA) for free.
**Action:** Always check if a design pattern exists in the component library (Element Plus) before building a custom solution, especially for menus and overlays.

## 2025-05-23 - Icon-Only Buttons Accessibility
**Learning:** Icon-only buttons are a common pattern for "clean" UI, but they are invisible to screen readers without explicit `aria-label` or `aria-labelledby`. Tooltips (`el-tooltip`) are great for mouse users but do not always bridge the gap for assistive technology.
**Action:** Always verify icon-only buttons have an `aria-label` describing the action, not just the icon name.
