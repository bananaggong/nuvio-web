import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nuvio.local"),
  title: {
    default: "NUVIO - 여행지원금과 로컬 체류 프로그램",
    template: "%s | NUVIO",
  },
  description:
    "국내외 여행지원금, 워케이션, 한달살기, 반값여행, 로컬 프로젝트를 탐색하고 지원 과정을 기록하세요.",
  openGraph: {
    title: "NUVIO - 여행지원금과 로컬 체류 프로그램",
    description:
      "여행지원금과 로컬 체류 프로그램을 검색, 비교, 기록하는 독자 플랫폼.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
