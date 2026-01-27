import "./globals.css";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

const siteUrl = "https://my-app-jade-eight-85.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "LUMEN - 오늘의 흐름",
  description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LUMEN",
  },
  openGraph: {
    title: "LUMEN - 오늘의 흐름",
    description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리",
    url: siteUrl,
    siteName: "LUMEN",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "LUMEN - 오늘의 흐름을 정리하다",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUMEN - 오늘의 흐름",
    description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리",
    images: [`${siteUrl}/og-image.png`],
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  other: {
    // 카카오톡 및 기타 메신저 호환성을 위한 추가 메타 태그
    "og:image:width": "1200",
    "og:image:height": "630",
  },
};

export const viewport = {
  themeColor: "#1a2332",
};

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
});

const serif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
