import { NextResponse } from 'next/server';

const BINANCE_BASE = 'https://api.binance.com';

export async function GET() {
    try {
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_API_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ error: 'Binance API keys not configured' }, { status: 500 });
        }

        const crypto = await import('crypto');
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

        const accountRes = await fetch(
            `${BINANCE_BASE}/api/v3/account?${queryString}&signature=${signature}`,
            { headers: { 'X-MBX-APIKEY': apiKey }, next: { revalidate: 30 } }
        );

        if (!accountRes.ok) {
            const err = await accountRes.text();
            return NextResponse.json({ error: `Binance API error: ${err}` }, { status: accountRes.status });
        }

        const account = await accountRes.json();
        const balances = account.balances.filter(
            b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
        );

        const tickerRes = await fetch(`${BINANCE_BASE}/api/v3/ticker/price`, { next: { revalidate: 30 } });
        const tickers = await tickerRes.json();
        const priceMap = {};
        tickers.forEach(t => { priceMap[t.symbol] = parseFloat(t.price); });

        const portfolio = balances.map(b => {
            const asset = b.asset;
            const free = parseFloat(b.free);
            const locked = parseFloat(b.locked);
            const total = free + locked;
            let usdValue = 0;

            for (const quote of ['USDT', 'BUSD', 'USDC']) {
                const pair = `${asset}${quote}`;
                if (priceMap[pair]) {
                    usdValue = total * priceMap[pair];
                    break;
                }
            }
            if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(asset)) {
                usdValue = total;
            }

            return { asset, free, locked, total, usdValue };
        });

        portfolio.sort((a, b) => b.usdValue - a.usdValue);
        const totalValue = portfolio.reduce((sum, p) => sum + p.usdValue, 0);

        return NextResponse.json({
            totalValue,
            assets: portfolio.map(p => ({
                ...p,
                percentage: totalValue > 0 ? (p.usdValue / totalValue * 100) : 0
            })),
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
