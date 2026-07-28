/** Scoped idempotency key for the current stage submit (cleared after the write). */
let activeKey: string | undefined;

export function beginIdempotentWrite(key: string): void {
  activeKey = key;
}

export function endIdempotentWrite(): void {
  activeKey = undefined;
}

export function activeIdempotencyKey(): string | undefined {
  return activeKey;
}
