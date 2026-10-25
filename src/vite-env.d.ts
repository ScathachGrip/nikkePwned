/// <reference types="vite/client" />

declare module "*.css";

interface ViewTransition {
  readonly finished: Promise<void>;
  readonly ready: Promise<void>;
  readonly updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

interface Document {
  startViewTransition?(updateCallback?: () => Promise<void> | void): ViewTransition;
}
