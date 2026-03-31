## 2026-01-02 - Exclude Heavy Columns in List Queries

**Learning:**
When fetching a list of items for a dashboard or index view, avoid fetching large text or BLOB columns (like `lastContent` which stores full RSS feed JSON) if they are not displayed in the list. This reduces payload size and database memory usage.

**Action:**
Use Sequelize's `attributes: { exclude: ['heavyColumn'] }` when querying for list views. Always verify that the frontend does not rely on the excluded fields.

## 2026-03-29 - Fetch Minimum Required Attributes in Iterative Pattern Matching

**Learning:**
When performing manual pattern matching across a list of database records on every request, avoid pulling all columns into memory (e.g., using `findAll()`), especially if the records contain large `TEXT` or `JSON` fields. This causes an N+1-like bloat where a request to a dynamic route loads all scripts, logs, and descriptions into memory only to check the `path` property.

**Action:**
Use `attributes: ['id', 'path']` to perform a lightweight `findAll()` query just for the pattern-matching phase. Lazy-load the full record using `findByPk(route.id)` only when a matching path is found. This drasticaly reduces database memory usage and latency.
