import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'polygon_api_key';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  readonly apiKey = signal<string>(localStorage.getItem(STORAGE_KEY) ?? '');
  readonly hasKey = signal<boolean>(!!localStorage.getItem(STORAGE_KEY));

  save(key: string): void {
    localStorage.setItem(STORAGE_KEY, key);
    this.apiKey.set(key);
    this.hasKey.set(true);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.apiKey.set('');
    this.hasKey.set(false);
  }
}
