import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { StockQuote, AlertEntry } from '@core/models/stock.model';
import { PolygonService } from '@core/services/polygon.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { SignalService } from '@core/services/signal.service';

const MOCK_PRICES: Record<string, number> = {
  AAPL: 189.5, MSFT: 415.2, TSLA: 248.7, NVDA: 875.4, GOOGL: 171.6,
  AMZN: 195.8, META: 518.3, AMD: 162.4, NFLX: 641.2, SPY: 512.8, QQQ: 442.5
};

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private polygon    = inject(PolygonService);
  private apiKeySvc  = inject(ApiKeyService);
  private signalSvc  = inject(SignalService);

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
  load(ticker: string): void {
    this.loading.update(s => { const n = new Set(s); n.add(ticker); return n; });

    if (!this.apiKeySvc.hasKey()) {
      const quote = this.simulate(ticker);
      this.upsert(ticker, quote);
      this.loading.update(s => { const n = new Set(s); n.delete(ticker); return n; });
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
        fallback.error = `⚠ API error — showing simulated data`;
        this.upsert(ticker, fallback);
      } else {
        const { snapshot, history } = data;
        const price = snapshot.lastTrade?.p ?? snapshot.day?.c ?? snapshot.prevDay?.c ?? history.at(-1)!;
        const prevClose = snapshot.prevDay?.c ?? history.at(-2)!;
        const fullHistory = [...history];
        if (price !== fullHistory.at(-1)) fullHistory.push(price);

        this.upsert(ticker, {
          ticker, price, prevClose,
          changePerc: snapshot.todaysChangePerc ?? ((price - prevClose) / prevClose * 100),
          history: fullHistory, source: 'live',
          updatedAt: new Date().toLocaleTimeString()
        });
      }
      this.loading.update(s => { const n = new Set(s); n.delete(ticker); return n; });
    });
  }

  private upsert(ticker: string, incoming: StockQuote): void {
    const prevQuote = this.quotes().get(ticker);
    const prevSignal = prevQuote ? this.signalSvc.getSignal(prevQuote.history).signal : null;
    const newSignal  = this.signalSvc.getSignal(incoming.history).signal;

    // Fire alert if signal changed to buy/sell
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

  // ── Public API ────────────────────────────────────
  add(ticker: string): void {
    if (this.quotes().has(ticker)) return;
    this.quotes.update(m => { const n = new Map(m); n.set(ticker, this.simulate(ticker)); return n; });
    this.load(ticker);
  }

  remove(ticker: string): void {
    this.quotes.update(m => { const n = new Map(m); n.delete(ticker); return n; });
  }

  refreshAll(): void {
    this.tickers().forEach(t => this.load(t));
  }

  isLoading(ticker: string): boolean {
    return this.loading().has(ticker);
  }
}
