import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nearby Chat M2",
  description: "Temporary anonymous rooms. No accounts. Expires in 45 minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
