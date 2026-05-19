import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NATO Secretary General",
  description: "Single-player geopolitical strategy game",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
