# Behavior Tests

Good tests verify behavior through public interfaces. They describe what the system does, not how
the implementation happens internally.

```ts
describe("cart checkout", () => {
  test("confirms checkout for a valid cart", async () => {
    const cart = createCart();
    cart.add(product);

    const result = await checkout({ cart, paymentMethod });

    expect(result.status).toBe("confirmed");
  });
});
```

Good behavior tests:

- exercise a public API, CLI, process boundary, event contract, schema, or controller surface
- use names that match the domain language in the codebase
- survive internal refactors when externally visible behavior is unchanged
- keep assertions focused on one behavior
- cover happy paths, edge cases, and error paths according to risk

Implementation-detail tests are brittle. Avoid tests that mainly assert:

- private helper behavior when a public contract can prove the same behavior
- internal call counts or call order
- internal collaborator shape
- database rows, files, or process internals when a public read path exists
- renamed functions, extracted helpers, or other implementation structure

Prefer:

```ts
test("created users can be retrieved", async () => {
  const user = await createUser({ name: "Alice" });

  const retrieved = await getUser({ id: user.id });

  expect(retrieved.name).toBe("Alice");
});
```

Over:

```ts
test("createUser writes a user row", async () => {
  await createUser({ name: "Alice" });

  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);

  expect(row).toBeDefined();
});
```
