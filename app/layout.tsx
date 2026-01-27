import "./globals.css";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

export const metadata = {
  metadataBase: new URL("https://my-app-jade-eight-85.vercel.app"),
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
    siteName: "LUMEN",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "LUMEN",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "LUMEN - 오늘의 흐름",
    description: "과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
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
