## 2025-12-30 - UserHeader Refactor
**Learning:** Replacing custom interactive elements with standard library components (like `el-dropdown`) drastically reduces code complexity (removed manual event listeners) and improves accessibility (keyboard nav, ARIA) for free.
**Action:** Always check if a design pattern exists in the component library (Element Plus) before building a custom solution, especially for menus and overlays.

## 2025-05-20 - Empty States
**Learning:** Adding a clear call-to-action (CTA) in empty states (like `<el-empty>`) transforms a dead end into an onboarding opportunity. It guides users immediately to the next logical step without making them search for the "Add" button.
**Action:** Always include a primary action button in empty state components when the list is empty.

## 2025-05-23 - Icon-Only Buttons Accessibility
**Learning:** Icon-only buttons are a common pattern for "clean" UI, but they are invisible to screen readers without explicit `aria-label` or `aria-labelledby`. Tooltips (`el-tooltip`) are great for mouse users but do not always bridge the gap for assistive technology.
**Action:** Always verify icon-only buttons have an `aria-label` describing the action, not just the icon name.


## 2026-04-08 - Destructive Action Confirmation
**Learning:** Destructive actions without confirmation dialogues (like deleting an auth credential) can lead to accidental data loss. Using `el-popconfirm` provides a lightweight, inline confirmation without the heavy interruption of a modal dialog, offering a better user experience for table actions.
**Action:** Always wrap delete actions in list/table views with an `el-popconfirm` or similar confirmation mechanism to prevent accidental deletions.
