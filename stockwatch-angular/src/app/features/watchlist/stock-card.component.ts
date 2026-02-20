import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StockQuote } from '@core/models/stock.model';
import { SignalService } from '@core/services/signal.service';
import { WatchlistService } from '@core/services/watchlist.service';
import { SparklineComponent } from '@shared/components/sparkline/sparkline.component';

@Component({
  selector: 'app-stock-card',
  standalone: false,
  template: `
    <mat-card class="stock-card" [ngClass]="'signal-' + sig.signal">
      <div class="card-glow"></div>

      <mat-card-header>
        <div mat-card-avatar class="source-avatar" [ngClass]="quote.source">
          {{ quote.source === 'live' ? 'L' : 'S' }}
        </div>
        <mat-card-title>{{ quote.ticker }}</mat-card-title>
        <mat-card-subtitle *ngIf="quote.updatedAt">
          Updated {{ quote.updatedAt }}
        </mat-card-subtitle>
        <button mat-icon-button class="remove-btn" (click)="watchlist.remove(quote.ticker)">
          <mat-icon>close</mat-icon>
        </button>
      </mat-card-header>

      <mat-card-content>
        <!-- Price row -->
        <div class="price-row">
          <span class="price">{{ quote.price | currency:'USD':'symbol':'1.2-2' }}</span>
          <mat-chip [ngClass]="quote.changePerc >= 0 ? 'chip-up' : 'chip-down'">
            {{ quote.changePerc >= 0 ? '+' : '' }}{{ quote.changePerc | number:'1.2-2' }}%
          </mat-chip>
        </div>

        <!-- Sparkline -->
        <app-sparkline [history]="quote.history" [signal]="sig.signal"></app-sparkline>

        <!-- Metrics -->
        <div class="metrics-grid">
          <div class="metric">
            <span class="metric-label">RSI</span>
            <span class="metric-value" [ngClass]="rsiClass">{{ sig.rsi | number:'1.1-1' }}</span>
            <mat-progress-bar
              mode="determinate"
              [value]="sig.rsi"
              [color]="sig.rsi < 30 ? 'accent' : sig.rsi > 70 ? 'warn' : 'primary'">
            </mat-progress-bar>
          </div>
          <div class="metric">
            <span class="metric-label">SMA 9</span>
            <span class="metric-value">{{ sig.sma9 | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">SMA 20</span>
            <span class="metric-value">{{ sig.sma20 | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>

        <!-- Signal badge -->
        <div class="signal-row">
          <mat-chip class="signal-chip" [ngClass]="'chip-' + sig.signal">
            {{ sig.label }}
          </mat-chip>
        </div>
        <p class="signal-reasons">{{ sig.reasons.join(' · ') }}</p>

        <!-- Error -->
        <p *ngIf="quote.error" class="error-text">{{ quote.error }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./stock-card.component.scss']
})
export class StockCardComponent {
  @Input({ required: true }) quote!: StockQuote;
  readonly watchlist = inject(WatchlistService);
  private signalSvc  = inject(SignalService);

  get sig() {
    return this.signalSvc.getSignal(this.quote?.history ?? []);
  }

  get rsiClass(): string {
    const r = this.sig.rsi;
    if (r < 30) return 'rsi-low';
    if (r > 70) return 'rsi-high';
    return '';
  }
}
