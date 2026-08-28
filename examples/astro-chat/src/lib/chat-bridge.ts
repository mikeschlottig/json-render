/**
 * Bridge between generated UI and the chat it lives in.
 *
 * The `ask` action is dispatched from inside a rendered spec, which sits below
 * the chat state in the tree and has no access to it. Rather than thread a
 * sender through every registry component, the chat registers one here on
 * mount. There is exactly one chat per page, so a module-level slot is honest
 * about the cardinality.
 */

type Sender = (prompt: string) => void;

let sender: Sender | null = null;

export function registerSender(next: Sender | null): void {
  sender = next;
}

export function ask(prompt: string): void {
  if (!sender) {
    console.warn("[astro-chat] ask() called before the chat mounted");
    return;
  }
  sender(prompt);
}
