# Type Documentation Guidelines

**IMPORTANT**: This project prefers `type` over `interface` in both code and TSDoc comments. Always use `type` declarations unless there's a specific need for interface features like declaration merging.

## Type Analysis Process

When documenting types, use the **typescript-lsp** skill for accurate type discovery:

1. **Analyze type structure** using typescript-lsp:
   - Run `lsp-symbols` to list all type definitions in a file
   - Run `lsp-hover` on the type to get the full signature
   - Identify all properties and their types
   - Find optional vs required properties
   - Trace generic type parameters
   - Identify union and intersection types

2. **Find type relationships** using typescript-lsp:
   - Run `lsp-references` to find all usages of the type
   - Run `lsp-find` to search for related types by name pattern
   - What types does this extend or implement?
   - What types reference this type?
   - What utility types are derived from this?
   - Are there branded/nominal types involved?

3. **Discover usage patterns:**
   - How is this type constructed?
   - What validation occurs?
   - Are there Zod schemas associated?
   - What are the common configurations?

4. **Document from analysis:**
   - Property purposes from usage context
   - Constraints from validation/tests
   - Relationships from type dependencies
   - Patterns from real usage in framework code, stories, and test files

## Type Documentation Requirements

All TypeScript type patterns (complex objects, unions, functions, mapped types, recursive types, etc.) should follow standard TSDoc format with these conventions:

### Core Requirements

- **Always use `type` over `interface`** (unless extending a single interface for branding)
- **Include `@property`** for all properties with: purpose, constraints, and when to use
- **Document `@template`** parameters with: constraint, purpose, and where it flows
- **Add `@remarks`** for: validation rules, constraints, common patterns, performance notes
- **Cross-reference** related types, factory functions, type guards, and Zod schemas using `@see`
- **Mark internal types** with `@internal` for non-public APIs

### Zod Schema Integration

When types have associated Zod schemas, document validation in `@remarks`:

```typescript
/**
 * @remarks
 * Validation:
 * - Schema: {@link ConfigSchema}
 * - Required fields: [list]
 * - Optional fields: [list]
 * - Default values: [from schema defaults]
 */
```

## Property Documentation

**Required for each property:**
```typescript
@property propName - [Purpose] [Constraints] [When to use]
```

**Discovery sources:**
1. From usage: How the property is accessed/used
2. From tests: What values are tested, edge cases
3. From validation: Zod schemas, type guards
4. From defaults: Default values in code

## Generic Type Parameters

**Always document with:**
```typescript
@template T - [Constraint] [Purpose] [Where it flows]
```

**Discovery process:**
1. Find where T is used in type body
2. Identify constraints (extends clauses)
3. Trace how T flows through type
4. Note variance (in/out if relevant)

## Cross-Referencing Types

**Always link:**
- Related types (subtypes, supertypes)
- Factory functions that create instances
- Type guards that check instances
- Validation schemas
- Consumer functions/classes

**Format:**
```typescript
/**
 * @see {@link ParentType} for base type definition
 * @see {@link createInstance} for creating valid instances
 * @see {@link isInstanceOf} for runtime type checking
 * @see {@link InstanceSchema} for validation schema
 * @see {@link Consumer} for primary consumer
 */
```

## Required Elements for All Types

- Description of what it represents
- `@property` documentation for all properties
- `@template` for generic parameters
- `@remarks` for constraints and patterns
