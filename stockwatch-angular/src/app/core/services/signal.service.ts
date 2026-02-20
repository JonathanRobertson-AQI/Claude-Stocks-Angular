import { Injectable } from '@angular/core';
import { SignalType, StockSignal } from '@core/models/stock.model';

@Injectable({ providedIn: 'root' })
export class SignalService {

  calcRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1];
      d > 0 ? (gains += d) : (losses -= d);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  calcSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  getSignal(history: number[]): StockSignal {
    const rsi   = this.calcRSI(history);
    const sma9  = this.calcSMA(history, 9);
    const sma20 = this.calcSMA(history, 20);
    const price = history.at(-1)!;
    const reasons: string[] = [];
    let score = 0;

    // RSI
    if (rsi < 30)      { score += 2; reasons.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 40) { score += 1; reasons.push(`RSI low (${rsi.toFixed(0)})`); }
    else if (rsi > 70) { score -= 2; reasons.push(`RSI overbought (${rsi.toFixed(0)})`); }
    else if (rsi > 60) { score -= 1; reasons.push(`RSI elevated (${rsi.toFixed(0)})`); }

    // MA crossover
    if (sma9 > sma20 * 1.005 && price > sma9)      { score++; reasons.push('Bullish MA cross'); }
    else if (sma9 < sma20 * 0.995 && price < sma9) { score--; reasons.push('Bearish MA cross'); }

    // Short-term momentum
    const recent5 = history.slice(-5);
    const momentum = (recent5.at(-1)! - recent5[0]) / recent5[0];
    if (momentum > 0.015)       { score--; reasons.push('Sharp recent rise'); }
    else if (momentum < -0.015) { score++; reasons.push('Sharp recent drop'); }

    let signal: SignalType;
    let label: string;
    if (score >= 2)       { signal = 'buy';   label = '▲ Buy Signal'; }
    else if (score <= -2) { signal = 'sell';  label = '▼ Sell Signal'; }
    else if (score === 1) { signal = 'watch'; label = '◎ Watch — Leaning Buy'; }
    else if (score === -1){ signal = 'watch'; label = '◎ Watch — Leaning Sell'; }
    else                  { signal = 'hold';  label = '— Hold'; }

    return { signal, label, reasons, rsi, sma9, sma20 };
  }
}
