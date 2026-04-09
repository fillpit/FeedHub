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

## 2024-05-23 - Caching Configuration for High-Frequency Loops

**Learning:**
When processing large lists (e.g., translating RSS items sequentially), fetching configuration using `findOne()` inside the loop creates an N+1 query problem, hitting the database repeatedly for static or rarely-changing configuration data. This causes severe bottlenecks on loop execution time and database connection pools.

**Action:**
Extract the configuration fetch outside the loop or implement an in-memory cache with a TTL (e.g., 60 seconds) within the service layer. This converts O(N) database queries into O(1), greatly reducing database load.

## 2026-04-09 - Caching dynamically compiled RegExp Objects safely

**Learning:**
When performing frequent regex parsing (e.g., dynamically matching HTML/XML blocks or scraping tools like XPath/CSS selectors), creating a `new RegExp(pattern)` object inside a hot loop (like `applyRegexProcessing`) continuously blocks the event loop with compilation overhead. V8 has some internal caching, but re-instantiating the object manually across hundreds of iterations causes measurable GC and CPU pauses. However, storing compiled RegExp globally in an unbounded `Map` introduces a severe memory leak if patterns are dynamically generated from user inputs.

**Action:**
To optimize regex compilation securely, use an LRU Cache (like `lru-cache` with a strict `max` size) to store the compiled RegExp keyed by pattern and flags. Additionally, always reset `regex.lastIndex = 0` before using a cached RegExp to avoid stateful bugs caused by global (`g`) flags.
