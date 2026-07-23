# Deep Modules

A deep module has a small interface and a substantial hidden implementation. It is easier to test
because callers have fewer operations and fewer shapes to understand.

When designing during TDD, ask:

- Can the public surface have fewer methods?
- Can parameters be simpler or more domain-specific?
- Can implementation complexity stay behind the public contract?
- Can tests prove behavior through the contract without reaching into helpers?

Avoid shallow modules: large interfaces with thin pass-through implementations. They create more
test setup, more brittle tests, and less useful abstraction.
