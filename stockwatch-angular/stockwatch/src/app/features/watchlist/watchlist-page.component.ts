import { Component, inject, signal, computed } from '@angular/core';
import { WatchlistService } from '@core/services/watchlist.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { StockQuote } from '@core/models/stock.model';

@Component({
  selector: 'app-watchlist-page',
  standalone: false,
  templateUrl: './watchlist-page.component.html',
  styleUrls:   ['./watchlist-page.component.scss']
})
export class WatchlistPageComponent {
  private watchlistSvc = inject(WatchlistService);
  private apiKeyService = inject(ApiKeyService);

  newTicker   = signal('');
  apiKeyDraft = signal('');
  refreshing  = signal(false);

  // Expose service signals as plain getters so Angular templates can read them
  get quotes()    { return this.watchlistSvc.quotes(); }
  get alerts()    { return this.watchlistSvc.alerts(); }
  get hasKey()    { return this.apiKeyService.hasKey(); }
  get isLive()    { return this.apiKeyService.hasKey(); }

  get quotesArray(): StockQuote[] {
    return Array.from(this.watchlistSvc.quotes().values());
  }

  trackByTicker(_index: number, quote: StockQuote): string {
    return quote.ticker;
  }

  addStock(): void {
    const t = this.newTicker().trim().toUpperCase();
    if (!t) return;
    this.watchlistSvc.add(t);
    this.newTicker.set('');
  }

  refreshAll(): void {
    this.refreshing.set(true);
    this.watchlistSvc.refreshAll();
    setTimeout(() => this.refreshing.set(false), 1200);
  }

  saveKey(): void {
    const k = this.apiKeyDraft().trim();
    if (!k) return;
    this.apiKeyService.save(k);
    this.apiKeyDraft.set('');
    this.watchlistSvc.refreshAll();
  }

  clearKey(): void {
    this.apiKeyService.clear();
  }
}
