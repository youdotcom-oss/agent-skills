# Public API Templates

## Public API Functions

```typescript
/**
 * Concise one-line description of functionality.
 * Extended explanation providing context, use cases, and when to use this.
 *
 * @template T - Description of generic type parameter and constraints
 * @param paramName - Parameter purpose, constraints, and expected values
 * @returns Description of return value, what it represents, and guarantees
 *
 * @remarks
 * - Key behavioral characteristics
 * - Important execution details
 * - Performance considerations (with Big-O if relevant)
 * - Common pitfalls or gotchas
 * - Threading/async behavior if applicable
 *
 * @throws {ErrorType} When and why this error occurs
 *
 * @see {@link RelatedFunction} for related functionality
 * @see {@link RelatedType} for type details
 * @since 1.0.0
 */
```

## Public Types

```typescript
/**
 * Description of what this type represents in the API.
 * When and why to use this type.
 *
 * @template T - Generic parameter description and constraints
 * @property propName - What this property controls or represents
 * @property optionalProp - Purpose and when to include this property
 *
 * @remarks
 * - Type constraints and relationships
 * - Common usage patterns
 * - Integration with other types
 *
 * @see {@link RelatedType} for related type definitions
 * @since 1.0.0
 */
export type TypeName<T> = {
  propName: string;
  optionalProp?: number;
}
```

## Behavioral Programming Functions

**CRITICAL:** For behavioral programming APIs (bSync, bThread, behavioral, useBehavioral), always use factory functions in documentation - never raw `yield` statements.

```typescript
/**
 * Creates a behavioral thread for coordinating async operations.
 * Explain the coordination pattern and synchronization approach.
 *
 * @param config - Thread configuration options
 * @returns Configured behavioral thread
 *
 * @remarks
 * - Thread execution model (sequential through sync points)
 * - Event coordination semantics
 * - Blocking precedence rules
 * - Repetition behavior
 * - Integration with trigger/feedback mechanisms
 *
 * @see {@link bSync} for creating sync points
 * @see {@link behavioral} for program setup
 * @see {@link Idioms} for synchronization options
 * @since 1.0.0
 */
```

## Deprecated Code

```typescript
/**
 * @deprecated Use {@link NewFunction} instead. Will be removed in v8.0.
 *
 * Migration path: [Brief guidance on how to migrate]
 *
 * @see {@link NewFunction}
 */
```

## Required Elements by Context

### All Public APIs Must Include

- One-line description + extended context
- `@param` for all parameters
- `@returns` for return values
- `@remarks` section with behavioral notes
- `@see` tags to related APIs
