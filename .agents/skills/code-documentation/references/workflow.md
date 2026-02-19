# TSDoc Generation Workflow

When creating or updating TSDoc comments, follow this systematic exploration process.

**Prerequisite**: Use the **typescript-lsp** skill for type verification throughout this workflow. The LSP tools provide accurate type information directly from the TypeScript compiler.

## Phase 1: Type & Interface Analysis

1. **Identify the target** (function, type, class, or module)
2. **Analyze type signatures** using typescript-lsp:
   - Run `lsp-symbols` to get file structure overview
   - Run `lsp-hover` on the target to get exact type signatures
   - Parameter types and constraints
   - Return types
   - Generic type parameters
   - Type relationships and dependencies
3. **Trace type dependencies:**
   - Run `lsp-references` to find what depends on this type
   - What types does this depend on?
   - What types depend on this?
   - Are there related utility types?

## Phase 2: Usage Reference Discovery

1. **Find all usage locations** using typescript-lsp:
   - Run `lsp-references` on the target symbol
   - Run `lsp-find` to search for related patterns
   - Identify calling patterns
   - Note common usage contexts
2. **Analyze integration points:**
   - How is this used in the architecture?
   - What modules consume this?
   - What are the typical call chains?

## Phase 3: Test & Story Analysis

1. **Review test files** (`.test.ts`, `.spec.ts`):
   - What behaviors are tested?
   - What edge cases are covered?
   - What scenarios are validated?
2. **Review story files** (`.stories.tsx`):
   - How is this used in practice?
   - What real-world scenarios exist?
   - What configurations are demonstrated?

## Phase 4: Documentation Generation

1. **Synthesize findings** from phases 1-3
2. **Apply appropriate TSDoc template** from this skill
3. **Cross-reference related APIs** using `@see` tags
4. **Document discovered constraints** in `@remarks`
5. **Note performance characteristics** if evident from usage
6. **Identify limitations** found in tests or usage patterns

## Templates

After completing the workflow phases, apply the appropriate template:
- @public-api-templates.md - Public-facing APIs
- @internal-templates.md - Internal code and modules
- @type-documentation.md - Type documentation
