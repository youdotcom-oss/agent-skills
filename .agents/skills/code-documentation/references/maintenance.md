# Documentation Maintenance

Guidelines for maintaining documentation hygiene: synchronizing TSDoc with code, removing non-compliant comments, and handling orphaned documentation.

## Comment Policy

### Allowed Comments

1. **TSDoc comment blocks** following project standards
2. **TODO comments**: `// TODO: description of future work`
3. **FIXME comments**: `// FIXME: description of issue to fix`

### Remove These Comments

1. **Performance notes**: `// Performance: this is O(n)`
2. **Update timestamps**: `// Updated 2024-12-15 to fix bug`
3. **Historical notes**: `// This used to use Array.filter`
4. **Implementation notes**: `// Hack to work around limitation`
5. **Inline explanations**: `// Loop through items and process`
6. **Rationale comments**: `// We do this because...`

### Convert to TSDoc

Valuable information from inline comments should be moved to TSDoc `@remarks`:

```typescript
// This function is O(n) because it iterates all items
// We use a for-loop instead of .filter for better performance

// ↓ CONVERT TO ↓

/**
 * @internal
 * Processes items with linear complexity.
 *
 * @remarks
 * - Complexity: O(n) where n is number of items
 * - Uses for-loop instead of .filter for performance
 */
```

## Synchronization Tasks

### Parameter Sync

```typescript
// OUT OF SYNC:
/**
 * @param name - User name
 * @param age - User age
 */
function createUser({ username, age }: UserData) { ... }

// FIXED:
/**
 * @param options - User data
 * @param options.username - User's username
 * @param options.age - User's age
 */
function createUser({ username, age }: UserData) { ... }
```

### Return Type Sync

```typescript
// OUT OF SYNC:
/**
 * @returns User object
 */
function getUser(): Promise<User> { ... }

// FIXED:
/**
 * @returns Promise resolving to User object
 */
function getUser(): Promise<User> { ... }
```

### Generic Parameter Sync

```typescript
// OUT OF SYNC:
/**
 * @template T - Generic type
 */
function process<T extends BaseType>() { ... }

// FIXED:
/**
 * @template T - Type extending BaseType for processing
 */
function process<T extends BaseType>() { ... }
```

## Orphaned Documentation

When TSDoc comments reference code that no longer exists:

1. **Deleted functions/types**: Remove the entire TSDoc block
2. **Moved code**: Report the TSDoc location and ask where code moved to
3. **Invalid @see references**: Remove `@see` tags referencing deleted code
4. **Uncertain**: If confidence < 95%, report for manual review

**Examples:**

```typescript
// ORPHANED: Function deleted, TSDoc remains
/**
 * @deprecated Use newFunction instead
 * @param x - Input value
 */
// <--- Nothing here, function was deleted

// ACTION: Remove entire TSDoc block

// INVALID REFERENCE: @see points to deleted code
/**
 * Processes user data.
 * @see {@link validateInput} - Function no longer exists
 * @see {@link sanitizeData} - Still exists
 */
function processUser(data: UserData) { ... }

// ACTION: Remove @see for validateInput, keep sanitizeData reference
```

## Maintenance Process

When cleaning documentation in a file or directory:

1. **Scan for comments**
   - Identify all comment types (TSDoc, inline, TODO/FIXME)
   - Classify each comment (KEEP, REMOVE, CONVERT)

2. **Remove non-compliant**
   - Delete performance notes, timestamps, historical notes
   - Remove inline explanations and implementation details

3. **Remove orphaned TSDoc**
   - Delete TSDoc blocks for deleted functions/types
   - Remove invalid @see references to deleted code
   - Report uncertain cases for manual review

4. **Update TSDoc blocks**
   - Sync parameter names and types
   - Update return type descriptions
   - Verify generic parameter documentation

5. **Convert valuable inline to TSDoc**
   - Move complexity notes to @remarks
   - Move important context to @remarks

6. **Validate completeness**
   - All public exports have TSDoc
   - All public APIs have @param/@returns
   - Types have @property for all properties
   - @internal marker on non-public code

## Safety Guidelines

1. **Start small** - Test on one file before batch processing
2. **Review changes** - Examine diffs before committing
3. **Preserve TODOs** - Never remove TODO/FIXME comments
4. **No code changes** - Only modify comments and TSDoc
