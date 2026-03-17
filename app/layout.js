import './globals.css';

export const metadata = {
  title: 'Binance Sage Terminal',
  description: 'Bloomberg-style crypto trading dashboard powered by Binance Sage AI',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
