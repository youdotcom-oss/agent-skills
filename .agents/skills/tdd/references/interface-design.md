# Interface Design

Testable interfaces make behavior easy to prove without exposing internals.

Prefer interfaces that:

- accept dependencies instead of constructing external clients internally
- return structured results instead of hiding outcomes in side effects
- expose a small surface with clear domain operations
- keep validation and error behavior observable through the same public path callers use
- use object parameters once there are more than two arguments

Example:

```ts
type ProcessOrderOptions = {
  order: Order;
  paymentClient: PaymentClient;
};

const processOrder = async ({ order, paymentClient }: ProcessOrderOptions) => {
  const charge = await paymentClient.charge({ amount: order.total });

  return {
    orderId: order.id,
    chargeId: charge.id,
    status: "paid" as const,
  };
};
```

Avoid one-off wrappers that only rename or pass through another function. In Plaited runtime
boundary code, explicit callsite wiring is often clearer than indirection.
