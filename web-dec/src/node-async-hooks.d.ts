// Minimal types for the one Node API the Worker uses (available at runtime via
// the `nodejs_compat` flag). tsconfig pins `types` to vite/client, so @types/node
// isn't loaded — declare just what src/services/llm/trace.ts needs.
declare module "node:async_hooks" {
  export class AsyncLocalStorage<T> {
    getStore(): T | undefined;
    run<R>(store: T, callback: () => R): R;
  }
}
