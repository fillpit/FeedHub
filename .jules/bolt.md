## 2026-01-02 - Exclude Heavy Columns in List Queries

**Learning:**
When fetching a list of items for a dashboard or index view, avoid fetching large text or BLOB columns (like `lastContent` which stores full RSS feed JSON) if they are not displayed in the list. This reduces payload size and database memory usage.

**Action:**
Use Sequelize's `attributes: { exclude: ['heavyColumn'] }` when querying for list views. Always verify that the frontend does not rely on the excluded fields.
