import { NextResponse } from 'next/server';

const BINANCE_BASE = 'https://api.binance.com';
const WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT', 'AVAXUSDT'];

export async function GET() {
    try {
        const alerts = [];

        const results = await Promise.all(
            WATCHLIST.map(async (symbol) => {
                try {
                    const [tickerRes, klinesRes] = await Promise.all([
                        fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`, { next: { revalidate: 30 } }),
                        fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1d&limit=50`, { next: { revalidate: 120 } })
                    ]);

                    const ticker = await tickerRes.json();
                    const klines = await klinesRes.json();
                    const name = symbol.replace('USDT', '');
                    const price = parseFloat(ticker.lastPrice);
                    const change24h = parseFloat(ticker.priceChangePercent);
                    const volume24h = parseFloat(ticker.quoteVolume);

                    const closes = klines.map(k => parseFloat(k[4]));
                    const volumes = klines.map(k => parseFloat(k[5]));
                    const ma50 = closes.reduce((a, b) => a + b, 0) / closes.length;
                    const prevClose = closes.length > 1 ? closes[closes.length - 2] : price;

                    // RSI
                    let rsi = 50;
                    if (closes.length >= 15) {
                        const gains = [], losses = [];
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

                    // Price alerts
                    if (prevClose < ma50 && price >= ma50) {
                        alerts.push({
                            type: 'price', severity: 'bullish',
                            message: `${name} just broke ABOVE its 50-day MA ($${ma50.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Price: $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            time: new Date().toISOString()
                        });
                    } else if (prevClose > ma50 && price <= ma50) {
                        alerts.push({
                            type: 'price', severity: 'bearish',
                            message: `${name} dropped BELOW its 50-day MA ($${ma50.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Price: $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            time: new Date().toISOString()
                        });
                    }

                    if (Math.abs(change24h) > 5) {
                        const dir = change24h > 0 ? 'surged' : 'dropped';
                        alerts.push({
                            type: 'price', severity: change24h > 0 ? 'bullish' : 'bearish',
                            message: `${name} ${dir} ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}% in 24h. Now $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            time: new Date().toISOString()
                        });
                    }

                    if (rsi > 70) {
                        alerts.push({
                            type: 'price', severity: 'warning',
                            message: `${name} RSI at ${rsi.toFixed(0)} — overbought territory, potential pullback ahead`,
                            time: new Date().toISOString()
                        });
                    } else if (rsi < 30) {
                        alerts.push({
                            type: 'price', severity: 'bullish',
                            message: `${name} RSI at ${rsi.toFixed(0)} — oversold territory, potential bounce zone`,
                            time: new Date().toISOString()
                        });
                    }

                    // Sentiment from volume
                    const avgVol7d = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
                    const avgVol30d = volumes.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, volumes.length);
                    const volRatio = avgVol30d > 0 ? avgVol7d / avgVol30d : 1;

                    if (volRatio > 1.5 && change24h > 2) {
                        alerts.push({
                            type: 'sentiment', severity: 'bullish',
                            message: `${name} — Bullish momentum. Volume ${volRatio.toFixed(1)}x above 30d average with positive price action`,
                            time: new Date().toISOString()
                        });
                    } else if (volRatio > 1.5 && change24h < -2) {
                        alerts.push({
                            type: 'sentiment', severity: 'bearish',
                            message: `${name} — Heavy sell pressure. Volume ${volRatio.toFixed(1)}x above 30d average with negative price action`,
                            time: new Date().toISOString()
                        });
                    }

                    // Whale detection via large volume spikes
                    if (volume24h > avgVol30d * 3 && Math.abs(change24h) > 3) {
                        alerts.push({
                            type: 'whale', severity: change24h > 0 ? 'bullish' : 'bearish',
                            message: `Unusual activity on ${name} — 24h volume $${(volume24h / 1e6).toFixed(0)}M is ${(volume24h / avgVol30d).toFixed(1)}x above average. Large players may be moving.`,
                            time: new Date().toISOString()
                        });
                    }

                } catch {
                    // skip failed symbols
                }
            })
        );

        // Add some static educational alerts if no signals found
        if (alerts.length === 0) {
            alerts.push({
                type: 'sentiment', severity: 'neutral',
                message: 'Markets are calm — no significant signals on your watchlist right now. Good time to review your positions.',
                time: new Date().toISOString()
            });
        }

        return NextResponse.json({
            alerts: alerts.slice(0, 20),
            totalSignals: alerts.length,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
