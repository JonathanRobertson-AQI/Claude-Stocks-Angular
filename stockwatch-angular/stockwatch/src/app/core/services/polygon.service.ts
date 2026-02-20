import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { ApiKeyService } from '@core/services/api-key.service';
import { PolygonSnapshot, PolygonAgg } from '@core/models/stock.model';

@Injectable({ providedIn: 'root' })
export class PolygonService {
  private http = inject(HttpClient);
  private apiKeyService = inject(ApiKeyService);

  private get key(): string {
    return this.apiKeyService.apiKey();
  }

  private get base(): string {
    return environment.polygonBaseUrl;
  }

  /** Previous close + today's change via snapshot endpoint */
  getSnapshot(ticker: string): Observable<PolygonSnapshot> {
    return this.http
      .get<{ ticker: PolygonSnapshot; status: string; error?: string }>(
        `${this.base}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
        { params: new HttpParams().set('apiKey', this.key) }
      )
      .pipe(
        map(res => {
          if (!res.ticker) throw new Error(res.error ?? 'No snapshot data');
          return res.ticker;
        })
      );
  }

  /** Last 50 daily closes for sparkline + indicator calculation */
  getHistory(ticker: string): Observable<number[]> {
    const to = new Date().toISOString().slice(0, 10);
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
        })
      );
  }

  /** Fetch both snapshot + history in parallel */
  getStockData(ticker: string): Observable<{ snapshot: PolygonSnapshot; history: number[] }> {
    return forkJoin({
      snapshot: this.getSnapshot(ticker),
      history: this.getHistory(ticker)
    });
  }
}
