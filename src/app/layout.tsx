import type { Metadata } from "next";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import "./globals.css";
const body = Be_Vietnam_Pro({ subsets: ["vietnamese"], weight: ["400","500","600","700"], variable: "--font-body" });
const heading = Quicksand({ subsets: ["vietnamese"], variable: "--font-heading" });
export const metadata: Metadata = { title: "LTHNK Handmade Management", description: "Quản lý nội bộ LTHNK Handmade" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="vi"><body className={body.variable+" "+heading.variable}>{children}</body></html>;
}
