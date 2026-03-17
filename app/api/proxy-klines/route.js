import { NextResponse } from 'next/server';

const BINANCE_BASE = 'https://api.binance.com';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol') || 'BTCUSDT';

        // Proxy the request through our European Vercel server
        const res = await fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1d&limit=90`, {
            next: { revalidate: 60 } // Cache for 1 minute
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Binance returned ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (err) {
        console.error('Klines proxy error:', err);
        return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
    }
}
