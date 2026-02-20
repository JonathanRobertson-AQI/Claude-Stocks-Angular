import { Component, inject, OnInit } from '@angular/core';
import { WatchlistService } from './core/services/watchlist.service';

const REFRESH_INTERVAL_MS = 60_000;
const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'TSLA'];

@Component({
  selector: 'app-root',
  standalone: false,
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private watchlist = inject(WatchlistService);

  ngOnInit(): void {
    DEFAULT_TICKERS.forEach(t => this.watchlist.add(t));
    setInterval(() => this.watchlist.refreshAll(), REFRESH_INTERVAL_MS);
  }
}
