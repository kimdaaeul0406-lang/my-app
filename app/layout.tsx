import "./globals.css";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

const siteUrl = "https://my-app-jade-eight-85.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "LUMEN - 오늘의 흐름",
  description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리. AI가 해석하는 무료 운세 서비스.",
  keywords: ["운세", "타로", "사주", "별자리", "무료 운세", "오늘의 운세", "AI 운세", "타로점", "사주풀이", "별자리 운세", "LUMEN"],
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
        url: "/og-image.png",
        secureUrl: "https://my-app-jade-eight-85.vercel.app/og-image.png",
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
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  verification: {
    // Google Search Console 인증 시 여기에 추가
    // google: "your-google-verification-code",
  },
  alternates: {
    canonical: siteUrl,
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

// JSON-LD 구조화 데이터
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LUMEN",
  description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리. AI가 해석하는 무료 운세 서비스.",
  url: siteUrl,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  creator: {
    "@type": "Organization",
    name: "LUMEN",
    url: siteUrl,
  },
  inLanguage: "ko",
  keywords: "운세, 타로, 사주, 별자리, 무료 운세, 오늘의 운세, AI 운세",
};

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
        <meta name="naver-site-verification" content="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

