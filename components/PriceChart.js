'use client';
import { useEffect, useRef } from 'react';

export default function PriceChart({ symbol = 'BTCUSDT' }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function loadChart() {
            try {
                const lc = await import('lightweight-charts');

                if (cancelled || !chartRef.current) return;

                // Clean up previous chart
                if (chartInstance.current) {
                    chartInstance.current.remove();
                }

                const chart = lc.createChart(chartRef.current, {
                    width: chartRef.current.clientWidth,
                    height: 340,
                    layout: {
                        background: { color: '#16161f' },
                        textColor: '#8a8a9a',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                    },
                    grid: {
                        vertLines: { color: 'rgba(42, 42, 58, 0.4)' },
                        horzLines: { color: 'rgba(42, 42, 58, 0.4)' },
                    },
                    crosshair: {
                        mode: 0,
                        vertLine: { color: 'rgba(240, 185, 11, 0.3)', labelBackgroundColor: '#f0b90b' },
                        horzLine: { color: 'rgba(240, 185, 11, 0.3)', labelBackgroundColor: '#f0b90b' },
                    },
                    rightPriceScale: {
                        borderColor: '#2a2a3a',
                    },
                    timeScale: {
                        borderColor: '#2a2a3a',
                        timeVisible: false,
                    },
                });

                chartInstance.current = chart;

                // lightweight-charts v5 API
                const candlestickSeries = chart.addSeries(lc.CandlestickSeries, {
                    upColor: '#0ecb81',
                    downColor: '#f6465d',
                    borderUpColor: '#0ecb81',
                    borderDownColor: '#f6465d',
                    wickUpColor: '#0ecb81',
                    wickDownColor: '#f6465d',
                });

                const volumeSeries = chart.addSeries(lc.HistogramSeries, {
                    priceFormat: { type: 'volume' },
                    priceScaleId: '',
                });

                volumeSeries.priceScale().applyOptions({
                    scaleMargins: { top: 0.85, bottom: 0 },
                });

                // Fetch klines
                const res = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=90`
                );
                const klines = await res.json();

                if (cancelled) return;

                const candleData = klines.map(k => ({
                    time: Math.floor(k[0] / 1000),
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                }));

                const volumeData = klines.map(k => ({
                    time: Math.floor(k[0] / 1000),
                    value: parseFloat(k[5]),
                    color: parseFloat(k[4]) >= parseFloat(k[1])
                        ? 'rgba(14, 203, 129, 0.3)'
                        : 'rgba(246, 70, 93, 0.3)',
                }));

                candlestickSeries.setData(candleData);
                volumeSeries.setData(volumeData);
                chart.timeScale().fitContent();

                // Resize handler
                const handleResize = () => {
                    if (chartRef.current) {
                        chart.applyOptions({ width: chartRef.current.clientWidth });
                    }
                };
                window.addEventListener('resize', handleResize);

                return () => {
                    window.removeEventListener('resize', handleResize);
                };
            } catch (err) {
                console.error('Chart error:', err);
            }
        }

        loadChart();

        return () => {
            cancelled = true;
            if (chartInstance.current) {
                chartInstance.current.remove();
                chartInstance.current = null;
            }
        };
    }, [symbol]);

    return <div ref={chartRef} className="chart-container" />;
}
