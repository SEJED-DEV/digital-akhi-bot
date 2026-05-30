export interface APIKey {
  provider: string;
  key: string;
  isCoolingDown: boolean;
  cooldownUntil?: number;
}

export class KeyRingService {
  private keys: APIKey[] = [];
  private currentIndex: number = 0;

  constructor() {
    // Initialize with keys from environment or config
    this.initializeKeys();
  }

  private initializeKeys() {
    const rawKeys = process.env.API_KEYS; // Expected format: provider:key,provider:key
    if (rawKeys) {
      this.keys = rawKeys.split(',').map(pair => {
        const [provider, key] = pair.split(':');
        return { provider: provider || 'unknown', key: key || 'unknown', isCoolingDown: false };
      });
    }
  }

  public getNextKey(): APIKey | null {
    // Reset cooldown for keys that are past their cooldown time
    this.keys.forEach(k => {
      if (k.isCoolingDown && k.cooldownUntil && k.cooldownUntil < Date.now()) {
        k.isCoolingDown = false;
      }
    });

    const availableKeys = this.keys.filter(k => !k.isCoolingDown);

    if (availableKeys.length === 0) return null;

    const key = availableKeys[this.currentIndex % availableKeys.length];
    this.currentIndex = (this.currentIndex + 1) % availableKeys.length;
    return key || null;
  }

  public markKeyCoolingDown(key: string, cooldownDurationMs: number = 60000) {
    const keyEntry = this.keys.find(k => k.key === key);
    if (keyEntry) {
      keyEntry.isCoolingDown = true;
      keyEntry.cooldownUntil = Date.now() + cooldownDurationMs;
    }
  }
}
