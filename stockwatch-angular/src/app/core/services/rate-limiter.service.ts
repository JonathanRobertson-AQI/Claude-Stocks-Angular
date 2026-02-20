import { Injectable, signal } from '@angular/core';
import { Observable, Subject, Subscriber } from 'rxjs';

interface QueuedTask<T> {
  factory: () => Observable<T>;
  subscriber: Subscriber<T>;
}

/**
 * Enforces a maximum of MAX_REQUESTS API calls per WINDOW_MS.
 * Callers wrap their Observable factory in `schedule()`; the service
 * delays execution until a slot is available and emits the result.
 */
@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  // 5 requests per 60 000 ms  →  one slot opens every 12 s
  private readonly MAX_REQUESTS = 5;
  private readonly WINDOW_MS    = 60_000;

  /** Timestamps (ms) of requests dispatched within the current window */
  private timestamps: number[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedTask<any>[] = [];
  private tickTimer: ReturnType<typeof setTimeout> | null = null;

  /** How many requests are waiting in the queue */
  readonly queueDepth = signal(0);

  /**
   * Wrap any Observable factory so it only executes when a rate-limit
   * slot is available.
   */
  schedule<T>(factory: () => Observable<T>): Observable<T> {
    return new Observable<T>(subscriber => {
      this.queue.push({ factory, subscriber });
      this.queueDepth.set(this.queue.length);
      this.tick();
    });
  }

  // ── internal ──────────────────────────────────────────────────────────────

  private tick(): void {
    if (this.queue.length === 0) return;

    const now = Date.now();

    // Drop timestamps outside the rolling window
    this.timestamps = this.timestamps.filter(t => now - t < this.WINDOW_MS);

    if (this.timestamps.length < this.MAX_REQUESTS) {
      // Slot available — dispatch immediately
      const task = this.queue.shift()!;
      this.queueDepth.set(this.queue.length);
      this.timestamps.push(now);

      task.factory().subscribe({
        next:     v   => task.subscriber.next(v),
        error:    e   => task.subscriber.error(e),
        complete: ()  => task.subscriber.complete()
      });

      // If there are more items, schedule next tick right away
      if (this.queue.length > 0) this.tick();

    } else {
      // All slots used — wait until the oldest timestamp expires
      const oldestExpiry = this.timestamps[0] + this.WINDOW_MS;
      const delay = oldestExpiry - now + 50; // +50 ms buffer

      if (!this.tickTimer) {
        this.tickTimer = setTimeout(() => {
          this.tickTimer = null;
          this.tick();
        }, delay);
      }
    }
  }
}
