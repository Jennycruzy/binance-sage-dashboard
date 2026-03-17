import { NextResponse } from 'next/server';

const BINANCE_BASE = 'https://api.binance.com';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT', 'AVAXUSDT'];

export async function GET() {
    try {
        const results = await Promise.all(
            SYMBOLS.map(async (symbol) => {
                try {
                    const [tickerRes, klinesRes] = await Promise.all([
                        fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`, { next: { revalidate: 15 } }),
                        fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1d&limit=50`, { next: { revalidate: 60 } })
                    ]);

                    const ticker = await tickerRes.json();
                    const klines = await klinesRes.json();

                    const price = parseFloat(ticker.lastPrice);
                    const change24h = parseFloat(ticker.priceChangePercent);
                    const high24h = parseFloat(ticker.highPrice);
                    const low24h = parseFloat(ticker.lowPrice);
                    const volume = parseFloat(ticker.quoteVolume);

                    const closes = klines.map(k => parseFloat(k[4]));
                    const ma50 = closes.reduce((a, b) => a + b, 0) / closes.length;

                    // RSI calculation
                    let rsi = 50;
                    if (closes.length >= 15) {
                        const gains = [];
                        const losses = [];
                        for (let i = 1; i < Math.min(15, closes.length); i++) {
                            const diff = closes[i] - closes[i - 1];
                            gains.push(Math.max(diff, 0));
                            losses.push(Math.max(-diff, 0));
                        }
                        const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
                        const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
                        const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
                        rsi = 100 - (100 / (1 + rs));
                    }

                    return {
                        symbol,
                        name: symbol.replace('USDT', ''),
                        price,
                        change24h,
                        high24h,
                        low24h,
                        volume,
                        ma50,
                        rsi,
                        aboveMA: price > ma50
                    };
                } catch {
                    return { symbol, name: symbol.replace('USDT', ''), error: true };
                }
            })
        );

        return NextResponse.json({ coins: results, updatedAt: new Date().toISOString() });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
