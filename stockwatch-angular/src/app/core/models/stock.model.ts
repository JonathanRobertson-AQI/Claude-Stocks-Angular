export interface StockQuote {
  ticker: string;
  price: number;
  prevClose: number;
  changePerc: number;
  history: number[];  // daily close prices, oldest → newest
  source: 'live' | 'sim';
  updatedAt: string;
  error?: string;
}

export type SignalType = 'buy' | 'sell' | 'watch' | 'hold';

export interface StockSignal {
  signal: SignalType;
  label: string;
  reasons: string[];
  rsi: number;
  sma9: number;
  sma20: number;
}

export interface AlertEntry {
  time: string;
  ticker: string;
  signal: 'buy' | 'sell';
  price: number;
}

// Polygon API response shapes
export interface PolygonAgg {
  c: number;  // close
  o: number;  // open
  h: number;  // high
  l: number;  // low
  v: number;  // volume
  t: number;  // timestamp
}
