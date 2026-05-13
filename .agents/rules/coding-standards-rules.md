---
trigger: always_on
---

# Core Development Principles

## Attitude Toward Legacy Code

This is the most important rule: **Do not mimic the style and patterns of existing code in the project.** Always follow this specification.

- When modifying old code, refactor the parts you touch according to this specification. Do not perpetuate bad habits for the sake of "consistency"
- If old code has obvious design problems (God Class, deep nesting, hardcoding, excessive coupling), fix them while making changes
- Do not be afraid to change the structure of old code, as long as behavior remains unchanged
- If the refactoring scope is too large (cascading changes across more than 3 files), explain the plan before proceeding

## Hard Requirements for Code Quality

- A single function must not exceed 30 lines (excluding blank lines and comments); split if it does
- A single file must not exceed 300 lines; split by responsibility if it does
- Nesting depth must not exceed 3 levels (if/for/callback); reduce with early returns, extracted functions, etc.
- Function parameters must not exceed 4; use an object parameter if more are needed
- No commented-out code allowed; delete unused code instead of commenting it out
- No magic numbers or magic strings; extract them into named constants

## Naming

- Names must be semantic; the purpose should be clear from the name alone
- No meaningless names: `data1`, `temp`, `info`, `obj`, `result`, `item` (except loop variables)
- Boolean values use `is`/`has`/`can`/`should` prefixes: `isLoading`, `hasPermission`
- Function names start with a verb: `fetchUser`, `validateInput`, `calculateTotal`
- Constants in ALL_CAPS_SNAKE_CASE: `MAX_RETRY_COUNT`, `API_BASE_URL`
- Event handler functions use `handle` prefix: `handleClick`, `handleSubmit`

## Architecture Principles

- **Single Responsibility**: One function does one thing, one file owns one domain
- **Separation of Concerns**: UI contains no business logic, business logic contains no UI code, data access is a separate layer
- **Unidirectional Dependencies**: Upper layers depend on lower layers, never the reverse. UI -> Business Logic -> Data Layer
- **Program to Interfaces**: Modules communicate through interfaces/protocols, not concrete implementations
- **Composition Over Inheritance**: Use composition unless there is a clear is-a relationship

## Error Handling

- Perform defensive validation only at system boundaries (user input, external API responses, file I/O)
- Internal function calls trust parameter types; no redundant validation
- Error messages should be human-friendly and include context (which operation failed, what values were passed)
- Async operations must have error handling; no bare Promises or unhandled async calls
- Do not wrap the entire function body in try-catch; only wrap the specific operations that may fail

## Avoid Over-Engineering

- Solve only the current problem; do not add abstractions for hypothetical future requirements
- Three lines of duplicated code are better than a premature abstraction
- Do not create utility functions for logic that is used only once
- Do not add unnecessary intermediate layers, wrappers, or adapters
- Add configuration and options only when flexibility is genuinely needed

## Output Requirements

- Always respond in English
- Get straight to the point; no pleasantries or preamble
- Only output information directly relevant to the current task; do not repeat what the user has already said
# Git Conventions

## Commit Rules

- Do not commit code automatically unless explicitly requested
- Ensure the code runs correctly before committing
- Commit directly to main/master to stay agile

## Commit Message Format

```
<type>(<scope>): <subject>
```

A space follows the colon. Type values:

| type | Purpose |
|------|---------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation or comments |
| style | Code formatting (no runtime impact) |
| refactor | Refactoring (not a new feature or bug fix) |
| perf | Performance optimization |
| test | Adding tests |
| chore | Build process or tooling changes |

Use a list when there are more than two key points:

```
feat(web): implement email verification workflow

- Add email verification token generation service
- Create verification email template with dynamic links
- Add API endpoint for token validation
```
# TypeScript Guidelines

## Type System

- No `any`. Use `unknown` when the type is uncertain, then narrow with type guards
- Use `interface` for object shapes; use `type` for unions / intersections / mapped types
- Public functions must have explicit return types; internal functions may rely on inference
- Mark properties and parameters that won't be mutated with `readonly`
- Leverage built-in utility types: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`
- Generic parameter names should be meaningful: `TItem` rather than bare `T` (single generic parameter excepted)

```typescript
// 禁止
function parse(data: any): any { ... }

// 正确
function parse(data: unknown): ParseResult { ... }
```

## Naming

- Types and interfaces: `PascalCase` (`UserProfile`, `ApiResponse`)
- Variables and functions: `camelCase` (`getUserById`, `isValid`)
- Constants: `UPPER_CASE` (`MAX_RETRY_COUNT`)
- Enum members: `PascalCase` (`Status.Active`)
- Generic parameters: single uppercase letter or `T` prefix (`T`, `TKey`, `TValue`)

## Module Organization

- One primary export per file (a component, a class, or a group of closely related functions)
- Place type definitions at the top of the file that uses them; shared cross-file types go in a `types/` directory
- Do not use `index.ts` barrel exports -- they cause circular dependencies and tree-shaking issues; import directly from source files
- Separate `import type` from value imports

```typescript
import type { UserProfile } from './types/user'
import { formatDate } from './utils/date'
```

## Functions

- Prefer arrow functions; use `function` only when `this` binding is needed
- Prefer `async/await`; do not chain more than 2 levels of `.then()`
- Handle errors with specific types; do not `catch(e: any)`

```typescript
// 禁止
fetchData().then(res => process(res)).then(data => save(data)).catch(e => console.log(e))

// 正确
try {
  const res = await fetchData()
  const data = process(res)
  await save(data)
} catch (error) {
  if (error instanceof NetworkError) {
    showNetworkError(error.message)
  }
  throw error
}
```

## Prohibited Patterns

- No `// @ts-ignore` or `// @ts-expect-error` (unless accompanied by a comment explaining why)
- No `as` type assertions (unless narrowing from `unknown` with good reason)
- No `!` non-null assertions (use optional chaining `?.` or early null checks instead)
- No `enum` (use `as const` objects or union types instead to avoid runtime overhead)

```typescript
// 禁止
enum Status { Active, Inactive }

// 正确
const Status = { Active: 'active', Inactive: 'inactive' } as const
type Status = typeof Status[keyof typeof Status]
```
# React Guidelines

## Basic Component Rules

- Use only function components; class components are forbidden
- A single component file must not exceed 200 lines
- Components are responsible only for UI; extract business logic into custom hooks
- Complex expressions in JSX are forbidden; extract them into variables or functions
- A file should export only one component (except small helper components)

## State Management

- Use `useState` for component-local state
- Use `useReducer` for complex state logic
- Keep state as close to where it is used as possible; do not lift state unnecessarily
- Use Context (for small amounts of global state) or Zustand/Jotai (for complex scenarios) for cross-component sharing
- Prop drilling beyond 2 levels is forbidden

```tsx
// Forbidden: prop drilling
<GrandParent user={user}>
  <Parent user={user}>
    <Child user={user} />  // 3 levels deep
  </Parent>
</GrandParent>

// Correct: Context
const UserContext = createContext<User | null>(null)
const useUser = () => {
  const user = useContext(UserContext)
  if (!user) throw new Error('useUser must be used within UserProvider')
  return user
}
```

## Hook Rules

- Custom hook file names must have the `use` prefix: `useAuth.ts`
- A hook should do one thing only
- `useEffect` must have a correct dependency array; suppressing with `// eslint-disable-next-line` is forbidden
- `useEffect` with side effects must return a cleanup function
- Passing an async function directly to `useEffect` is forbidden

```typescript
// Forbidden
useEffect(async () => {
  const data = await fetchData()
  setData(data)
}, [])

// Correct
useEffect(() => {
  const controller = new AbortController()
  const load = async () => {
    try {
      const data = await fetchData({ signal: controller.signal })
      setData(data)
    } catch (error) {
      if (!controller.signal.aborted) setError(error)
    }
  }
  load()
  return () => controller.abort()
}, [])
```

## Performance

- Use `React.memo` only on components with actual performance issues; do not use it preemptively
- Use `useMemo` / `useCallback` only in the following scenarios:
  - Computationally expensive derived values
  - Dependencies of other hooks
  - Props passed to children wrapped with `React.memo`
- Lists must have stable, unique `key` values; using index is forbidden
- Use virtualization for large lists (`react-virtual` / `react-window`)

## Props

- Define with TypeScript interfaces, named `XxxProps`
- Prefer primitive types over objects for props
- Name callback props with `onXxx`: `onClick`, `onSubmit`

```typescript
interface UserCardProps {
  name: string
  email: string
  onEdit: (id: string) => void
}
```

## Error Handling

- Page-level components must have an Error Boundary
- Async operations must handle loading / error / empty states
- Error messages should be user-friendly; log raw errors to the console

## Styling

- Prefer Tailwind CSS
- Use CSS Modules or `clsx`/`cn` for class name concatenation when dynamic styles are needed
- Inline style objects are forbidden (unless the values are truly dynamically computed)
- `!important` is forbidden