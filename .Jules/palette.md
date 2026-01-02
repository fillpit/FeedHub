## 2025-12-30 - UserHeader Refactor
**Learning:** Replacing custom interactive elements with standard library components (like `el-dropdown`) drastically reduces code complexity (removed manual event listeners) and improves accessibility (keyboard nav, ARIA) for free.
**Action:** Always check if a design pattern exists in the component library (Element Plus) before building a custom solution, especially for menus and overlays.

## 2025-05-20 - Empty States
**Learning:** Adding a clear call-to-action (CTA) in empty states (like `<el-empty>`) transforms a dead end into an onboarding opportunity. It guides users immediately to the next logical step without making them search for the "Add" button.
**Action:** Always include a primary action button in empty state components when the list is empty.
