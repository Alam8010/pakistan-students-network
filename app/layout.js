import './globals.css';

export const metadata = {
  title: 'Pakistan Students Network',
  description: 'Connect with student groups across Pakistan',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
