# Internal Templates

## Internal Module Documentation

```typescript
/**
 * @internal
 * @module module-name
 *
 * Purpose: Why this module exists in the codebase
 * Architecture: How it fits into the overall system design
 * Dependencies: What this module depends on (be specific)
 * Consumers: What parts of the system use this module
 *
 * Maintainer Notes:
 * - Key implementation details and design decisions
 * - Important invariants that must be maintained
 * - Tricky aspects of the implementation
 * - Performance-critical sections with complexity analysis
 *
 * Common modification scenarios:
 * - When you might need to modify this module
 * - How to extend functionality safely
 * - What to watch out for when making changes
 *
 * Performance considerations:
 * - Optimization strategies used
 * - Memory management concerns
 * - Computational complexity (Big-O notation)
 *
 * Known limitations:
 * - Current constraints or technical debt
 * - Planned improvements
 * - Workarounds for known issues
 */
```

## Internal Types

```typescript
/**
 * @internal
 * What this type represents internally and why it exists.
 * How it's used in the implementation.
 *
 * @property propName - Internal property purpose
 *
 * @remarks
 * - Implementation-specific constraints
 * - Why this structure was chosen
 */
type InternalType = {
  // Implementation-specific properties
}
```

## Internal Helper Functions

```typescript
/**
 * @internal
 * Brief description of what this internal function does.
 * Why it exists and how it's used within the module.
 *
 * @param paramName - Parameter purpose
 * @returns Return value meaning
 *
 * @remarks
 * - Algorithm details (e.g., "Fisher-Yates shuffle")
 * - Complexity: O(n) where n is...
 * - Why this approach was chosen
 */
const internalHelper = () => { ... }
```

## Security-Sensitive Code

```typescript
/**
 * @internal
 * SECURITY: This function handles [sensitive operation].
 *
 * Security considerations:
 * - Input sanitization approach
 * - XSS/injection prevention measures
 * - Authentication/authorization requirements
 */
```

## Performance-Critical Code

```typescript
/**
 * @internal
 * PERFORMANCE: Hot path - called [frequency/context].
 *
 * Performance notes:
 * - Optimization strategy (e.g., "minimal allocations")
 * - Caching approach (e.g., "WeakMap cache")
 * - Complexity: O(1) lookup after initial computation
 */
```

## Required Elements for Internal Modules

### All Internal Modules Must Include

- Purpose and architecture context
- Dependencies and consumers
- Maintainer notes
- Modification scenarios
- Performance considerations
- Known limitations
