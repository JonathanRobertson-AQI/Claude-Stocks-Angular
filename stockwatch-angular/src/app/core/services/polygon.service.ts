import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import { environment } from '@env/environment';
import { ApiKeyService } from '@core/services/api-key.service';
import { PolygonAgg } from '@core/models/stock.model';

export interface PrevCloseResult {
  ticker:  string;
  close:   number;
  open:    number;
  high:    number;
  low:     number;
  volume:  number;
  from:    string;  // date string e.g. "2024-01-09"
}

@Injectable({ providedIn: 'root' })
export class PolygonService {
  private http = inject(HttpClient);
  private apiKeyService = inject(ApiKeyService);

  /** In-memory history cache: ticker → close prices. Populated once per session. */
  private historyCache = new Map<string, number[]>();

  private get key(): string {
    return this.apiKeyService.apiKey();
  }

  private get base(): string {
    return environment.polygonBaseUrl;
  }

  /**
   * Previous close — free tier compatible.
   * Returns the prior trading day's OHLCV for a ticker.
   */
  getPreviousClose(ticker: string): Observable<PrevCloseResult> {
    return this.http
      .get<{ results: any[]; status: string; error?: string }>(
        `${this.base}/v2/aggs/ticker/${ticker}/prev`,
        {
          params: new HttpParams()
            .set('adjusted', 'true')
            .set('apiKey', this.key)
        }
      )
      .pipe(
        map(res => {
          if (!res.results?.length) throw new Error(res.error ?? 'No previous close data');
          const r = res.results[0];
          return {
            ticker,
            close:  r.c,
            open:   r.o,
            high:   r.h,
            low:    r.l,
            volume: r.v,
            from:   new Date(r.t).toISOString().slice(0, 10)
          };
        })
      );
  }

  /**
   * Fetch history for a single ticker.
   * Returns cached data immediately if already fetched this session;
   * otherwise makes one API call and stores the result.
   */
  getHistory(ticker: string): Observable<number[]> {
    if (this.historyCache.has(ticker)) {
      return of(this.historyCache.get(ticker)!);
    }

    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 80 * 86_400_000).toISOString().slice(0, 10);

    return this.http
      .get<{ results: PolygonAgg[]; status: string; error?: string }>(
        `${this.base}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`,
        {
          params: new HttpParams()
            .set('adjusted', 'true')
            .set('sort', 'asc')
            .set('limit', '50')
            .set('apiKey', this.key)
        }
      )
      .pipe(
        map(res => {
          if (!res.results?.length) throw new Error(res.error ?? 'No history data');
          return res.results.map(c => c.c);
        }),
        tap(closes => this.historyCache.set(ticker, closes))
      );
  }

  /**
   * Fetch previous close + history for a ticker.
   * History is served from cache on repeat calls — only prevClose hits the network.
   */
  getStockData(ticker: string): Observable<{ prevClose: PrevCloseResult; history: number[] }> {
    return forkJoin({
      prevClose: this.getPreviousClose(ticker),
      history:   this.getHistory(ticker)
    });
  }

  /** Evict a ticker's cached history (call when ticker is removed from watchlist) */
  clearHistoryCache(ticker: string): void {
    this.historyCache.delete(ticker);
  }

  /** True if history for this ticker has already been fetched */
  hasHistory(ticker: string): boolean {
    return this.historyCache.has(ticker);
  }

  /** Retrieve cached history for a ticker (returns undefined if not cached) */
  getCachedHistory(ticker: string): number[] | undefined {
    return this.historyCache.get(ticker);
  }
}
