import './globals.css';

export const metadata = {
  title: 'Sage Trading Dashboard',
  description: 'Bloomberg-style crypto trading dashboard powered by Sage Trading Bot',
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
