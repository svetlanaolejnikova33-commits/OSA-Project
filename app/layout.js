import "./globals.css";

export const metadata = {
  title: "OSA",
  description: "OSA interior workspace",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
