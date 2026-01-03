## 2024-05-23 - Table Empty States and Icon Buttons
**Learning:** `el-table` provides a dedicated `#empty` slot that is often underutilized. Instead of showing a generic "No Data" message, this slot can host a rich `el-empty` component with a direct Call-To-Action (CTA) button (e.g., "Add Config"). This reduces friction for users starting with a fresh state.
**Action:** Always check `el-table` implementations for the `#empty` slot. If missing, add an `el-empty` component with a relevant CTA button to guide the user's next step.

**Learning:** Icon-only buttons (like those used in table actions columns) are invisible to screen readers if they rely solely on `el-tooltip` for context. `el-tooltip` provides visual context on hover, but does not automatically map to the button's accessible name.
**Action:** Always add an explicit `aria-label` to any `el-button` that contains only an icon, ensuring the label matches or summarizes the tooltip content (e.g., `aria-label="Delete configuration"`).
