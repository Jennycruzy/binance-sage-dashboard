'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('../components/PriceChart'), { ssr: false });

const ASSET_COLORS = {
  BTC: '#f7931a', WBTC: '#f7931a', ETH: '#627eea', BNB: '#f0b90b', SOL: '#9945ff',
  XRP: '#23292f', ADA: '#0033ad', DOT: '#e6007a', AVAX: '#e84142', USDT: '#26a17b',
  BUSD: '#f0b90b', USDC: '#2775ca', CAKE: '#d1884f', DOGE: '#c2a633', MATIC: '#8247e5',
  LINK: '#2a5ada', UNI: '#ff007a', APT: '#000', ARB: '#28a0f0', OP: '#ff0420',
};

function formatUSD(val) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function formatPrice(val) {
  if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (val >= 1) return `$${val.toFixed(2)}`;
  return `$${val.toFixed(4)}`;
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [market, setMarket] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [activeChart, setActiveChart] = useState('BTCUSDT');
  const [clock, setClock] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, mRes, aRes] = await Promise.all([
        fetch('/api/portfolio').then(r => r.json()).catch(() => null),
        fetch('/api/market').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
      ]);
      if (pRes && !pRes.error) setPortfolio(pRes);
      if (mRes && !mRes.error) setMarket(mRes);
      if (aRes && !aRes.error) setAlerts(aRes);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const chartSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

  return (
    <>
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">S</div>
          <div>
            <div className="header-title">Sage Trading Dashboard</div>
            <div className="header-subtitle">Real-Time Market Intelligence</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-status">
            <span className="status-dot"></span>
            CONNECTED
          </div>
          <div className="header-time">{clock}</div>
          <a
            href="https://t.me/binancesage_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="bot-link"
          >
            🤖 Launch Bot
          </a>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <main className="dashboard">
        {/* PORTFOLIO WIDGET */}
        <div className="widget portfolio-widget">
          <div className="widget-header">
            <span className="widget-title">📊 Spot Balance</span>
            <span className="widget-badge badge-live">LIVE</span>
          </div>
          <div className="widget-body">
            {portfolio ? (
              <>
                <div className="portfolio-total">
                  {formatUSD(portfolio.totalValue)}
                </div>
                <div className="portfolio-label">Total Portfolio Value</div>
                <ul className="portfolio-list">
                  {portfolio.assets.slice(0, 8).map((a) => (
                    <li key={a.asset} className="portfolio-item">
                      <div className="portfolio-asset-info">
                        <div
                          className="asset-icon"
                          style={{
                            background: ASSET_COLORS[a.asset] || '#555',
                            color: '#fff',
                          }}
                        >
                          {a.asset.slice(0, 2)}
                        </div>
                        <div>
                          <div className="asset-name">{a.asset}</div>
                          <div className="asset-amount">{a.total.toFixed(6)}</div>
                        </div>
                      </div>
                      <div className="portfolio-value">
                        <div className="portfolio-usd">{formatPrice(a.usdValue)}</div>
                        <div className="portfolio-pct">{a.percentage.toFixed(1)}%</div>
                      </div>
                    </li>
                  ))}
                  {portfolio.assets.length > 8 && (
                    <li className="portfolio-item" style={{ justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      +{portfolio.assets.length - 8} more assets
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading portfolio...</div>
              </div>
            )}
          </div>
        </div>

        {/* MARKET HEATMAP */}
        <div className="widget heatmap-widget">
          <div className="widget-header">
            <span className="widget-title">🌐 Market Overview</span>
            <span className="widget-badge badge-live">24H</span>
          </div>
          <div className="widget-body">
            {market ? (
              <div className="heatmap-grid">
                {market.coins.filter(c => !c.error).map((coin) => (
                  <div
                    key={coin.symbol}
                    className={`heatmap-tile ${coin.change24h > 0.5 ? 'positive' : coin.change24h < -0.5 ? 'negative' : 'neutral'}`}
                    onClick={() => setActiveChart(coin.symbol)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="heatmap-symbol">{coin.name}</div>
                    <div className="heatmap-price">{formatPrice(coin.price)}</div>
                    <div className={`heatmap-change ${coin.change24h >= 0 ? 'up' : 'down'}`}>
                      {coin.change24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change24h).toFixed(2)}%
                    </div>
                    <div className="heatmap-volume">Vol: {formatUSD(coin.volume)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading market data...</div>
              </div>
            )}
          </div>
        </div>

        {/* CHART WIDGET */}
        <div className="widget chart-widget">
          <div className="widget-header">
            <span className="widget-title">📈 {activeChart.replace('USDT', '')}/USDT — Daily</span>
            <div className="chart-tabs">
              {chartSymbols.map((s) => (
                <button
                  key={s}
                  className={`chart-tab ${activeChart === s ? 'active' : ''}`}
                  onClick={() => setActiveChart(s)}
                >
                  {s.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="widget-body" style={{ padding: 0 }}>
            <PriceChart symbol={activeChart} />
          </div>
        </div>

        {/* SMART ALERTS WIDGET */}
        <div className="widget alerts-widget">
          <div className="widget-header">
            <span className="widget-title">⚡ Smart Alerts</span>
            <span className="widget-badge badge-live">
              {alerts ? `${alerts.totalSignals} signals` : '...'}
            </span>
          </div>
          <div className="widget-body">
            {alerts ? (
              <ul className="alerts-list">
                {alerts.alerts.map((alert, i) => (
                  <li key={i} className="alert-item">
                    <span className={`alert-type ${alert.type}`}>
                      {alert.type === 'price' ? '💹 PRICE' : alert.type === 'whale' ? '🐋 WHALE' : '📊 SENTIMENT'}
                    </span>
                    <p className="alert-message">{alert.message}</p>
                    <span className="alert-time">
                      {new Date(alert.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Scanning watchlist...</div>
              </div>
            )}
          </div>
        </div>

        {/* STATS BAR */}
        <div className="widget stats-widget">
          <div className="widget-header">
            <span className="widget-title">📋 Key Metrics</span>
          </div>
          <div className="widget-body">
            {market ? (
              <div className="stats-grid">
                {(() => {
                  const btc = market.coins.find(c => c.name === 'BTC');
                  const eth = market.coins.find(c => c.name === 'ETH');
                  return (
                    <>
                      <div className="stat-card">
                        <div className="stat-label">BTC Dominance Signal</div>
                        <div className="stat-value">{btc && !btc.error ? (btc.aboveMA ? '🟢 Bullish' : '🔴 Bearish') : '—'}</div>
                        <div className={`stat-change ${btc && btc.change24h >= 0 ? 'up' : 'down'}`}>
                          {btc && btc.change24h != null ? `${btc.change24h >= 0 ? '+' : ''}${btc.change24h.toFixed(2)}% 24h` : ''}
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">ETH/BTC Trend</div>
                        <div className="stat-value">{eth && btc && eth.price && btc.price ? `${(eth.price / btc.price).toFixed(5)}` : '—'}</div>
                        <div className="stat-change">{eth && eth.rsi != null ? `RSI: ${eth.rsi.toFixed(0)}` : ''}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Portfolio Value</div>
                        <div className="stat-value">{portfolio ? formatUSD(portfolio.totalValue) : '—'}</div>
                        <div className="stat-change">{portfolio ? `${portfolio.assets.length} assets` : ''}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Active Signals</div>
                        <div className="stat-value">{alerts ? alerts.totalSignals : '—'}</div>
                        <div className="stat-change">{alerts ? 'Updated 30s ago' : ''}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Calculating metrics...</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
