import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { StockQuote, AlertEntry } from '@core/models/stock.model';
import { PolygonService, PrevCloseResult } from '@core/services/polygon.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { SignalService } from '@core/services/signal.service';

const MOCK_PRICES: Record<string, number> = {
  AAPL: 189.5, MSFT: 415.2, TSLA: 248.7, NVDA: 875.4, GOOGL: 171.6,
  AMZN: 195.8, META: 518.3, AMD: 162.4, NFLX: 641.2, SPY: 512.8, QQQ: 442.5
};

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private polygon   = inject(PolygonService);
  private apiKeySvc = inject(ApiKeyService);
  private signalSvc = inject(SignalService);

  readonly quotes  = signal<Map<string, StockQuote>>(new Map());
  readonly alerts  = signal<AlertEntry[]>([]);
  readonly loading = signal<Set<string>>(new Set());

  readonly tickers = computed(() => Array.from(this.quotes().keys()));

  // ── Simulation ────────────────────────────────────
  private simulate(ticker: string): StockQuote {
    const base = MOCK_PRICES[ticker] ?? 50 + Math.random() * 450;
    const history: number[] = [];
    let p = base * 0.94;
    for (let i = 0; i < 30; i++) { p *= 1 + (Math.random() - 0.499) * 0.012; history.push(p); }
    const price = history.at(-1)!;
    const prevClose = history.at(-2)!;
    return {
      ticker, price, prevClose,
      changePerc: ((price - prevClose) / prevClose) * 100,
      history, source: 'sim',
      updatedAt: new Date().toLocaleTimeString()
    };
  }

  // ── Load one ticker ───────────────────────────────
  // First load: 2 API calls (prevClose + history).
  // Subsequent refreshes: 1 API call (prevClose only; history served from cache).
  load(ticker: string): void {
    this.setLoading(ticker, true);

    if (!this.apiKeySvc.hasKey()) {
      this.upsert(ticker, this.simulate(ticker));
      this.setLoading(ticker, false);
      return;
    }

    this.polygon.getStockData(ticker).pipe(
      catchError(err => {
        console.warn(`[${ticker}] API error:`, err.message);
        return of(null);
      })
    ).subscribe(data => {
      if (!data) {
        const fallback = this.simulate(ticker);
        fallback.error = '⚠ API error — showing simulated data';
        this.upsert(ticker, fallback);
      } else {
        this.upsertFromApiData(ticker, data.prevClose, data.history);
      }
      this.setLoading(ticker, false);
    });
  }

  // ── Refresh all — N prevClose calls, 0 history calls (all cached) ──
  refreshAll(): void {
    this.tickers().forEach(t => this.load(t));
  }

  private upsertFromApiData(ticker: string, prevClose: PrevCloseResult, history: number[]): void {
    // Previous close IS the price on the free tier — no real-time last trade available
    const price     = prevClose.close;
    const prevDay   = history.at(-2) ?? price;
    const fullHistory = [...history];
    if (price !== fullHistory.at(-1)) fullHistory.push(price);

    const changePerc = prevDay !== 0
      ? ((price - prevDay) / prevDay) * 100
      : 0;

    this.upsert(ticker, {
      ticker, price, prevClose: prevDay, changePerc,
      history: fullHistory, source: 'live',
      updatedAt: `${prevClose.from} close`
    });
  }

  private upsert(ticker: string, incoming: StockQuote): void {
    const prevQuote  = this.quotes().get(ticker);
    const prevSignal = prevQuote ? this.signalSvc.getSignal(prevQuote.history).signal : null;
    const newSignal  = this.signalSvc.getSignal(incoming.history).signal;

    if (prevSignal && newSignal !== prevSignal && (newSignal === 'buy' || newSignal === 'sell')) {
      this.alerts.update(a => [{
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ticker, signal: newSignal, price: incoming.price
      }, ...a].slice(0, 50));
    }

    this.quotes.update(m => {
      const next = new Map(m);
      next.set(ticker, incoming);
      return next;
    });
  }

  private setLoading(ticker: string, state: boolean): void {
    this.loading.update(s => {
      const n = new Set(s);
      state ? n.add(ticker) : n.delete(ticker);
      return n;
    });
  }

  // ── Public API ────────────────────────────────────
  add(ticker: string): void {
    if (this.quotes().has(ticker)) return;
    this.quotes.update(m => { const n = new Map(m); n.set(ticker, this.simulate(ticker)); return n; });
    this.load(ticker);
  }

  remove(ticker: string): void {
    this.polygon.clearHistoryCache(ticker);
    this.quotes.update(m => { const n = new Map(m); n.delete(ticker); return n; });
  }

  isLoading(ticker: string): boolean {
    return this.loading().has(ticker);
  }
}
