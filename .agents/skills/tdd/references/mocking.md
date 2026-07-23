# Mocking

Mock only at boundaries the code does not own:

- remote APIs and provider SDKs
- time and randomness
- network failures
- expensive or unavailable services
- filesystem behavior only when a real temporary directory is worse for the test

Do not mock:

- local modules/classes/functions owned by the repo
- internal collaborators
- behavioral handlers or event wiring that can be exercised through the runtime boundary
- schema parsers when the real parser is available

Prefer dependency injection for true external boundaries:

```ts
type PaymentClient = {
  charge: (input: { amount: number }) => Promise<{ id: string }>;
};

const processPayment = async ({
  order,
  paymentClient,
}: {
  order: Order;
  paymentClient: PaymentClient;
}) => {
  return paymentClient.charge({ amount: order.total });
};
```

Prefer specific SDK-style boundary methods over a generic fetcher that forces conditional mock
logic:

```ts
type UserApi = {
  getUser: (id: string) => Promise<User>;
  getOrders: (userId: string) => Promise<Order[]>;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
};
```

If a mock needs branches that mirror production logic, the boundary is probably too generic or the
test is too implementation-aware.
