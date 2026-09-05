import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./admin.css";
import "./components/comments.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://off-air.github.io"),
  title: "OFF-AIR — 버추얼 크리에이터 기억 아카이브",
  description:
    "오래도록 소식이 닿지 않는 버추얼 크리에이터들의 활동을 기억하고 기록합니다.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    title: "OFF-AIR — 버추얼 크리에이터 기억 아카이브",
    description: "마지막 방송이 지나간 뒤에도 남아 있는 기록이 있습니다.",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "OFF-AIR, 버추얼 크리에이터 기억 아카이브",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OFF-AIR — 버추얼 크리에이터 기억 아카이브",
    description: "마지막 방송이 지나간 뒤에도 남아 있는 기록이 있습니다.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
