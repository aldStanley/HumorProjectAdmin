import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Control Room · Caption Lab",
  description: "The private editorial desk for Caption Lab.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
