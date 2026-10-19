export interface RpcApplicationLifecycle {
  onInstance(instance: unknown): void;
  onBoot(): void;
  onApplicationReady(): Promise<void>;
  onShutdown(): Promise<void>;
}
