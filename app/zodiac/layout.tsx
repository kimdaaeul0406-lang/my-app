import { Metadata } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export const metadata: Metadata = {
    title: '별자리 운세 - LUMEN | 오늘의 흐름',
    description: 'AI가 해석하는 12별자리 오늘의 운세. 양자리, 황소자리, 쌍둥이자리 등 연애, 직장, 금전 운세. 무료 별자리 운세.',
    keywords: ['별자리', '별자리 운세', '오늘의 별자리 운세', '12별자리', '양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'],
    openGraph: {
        title: '별자리 운세 - LUMEN',
        description: 'AI가 해석하는 12별자리 오늘의 운세. 연애, 직장, 금전 운세.',
        url: `${siteUrl}/zodiac`,
        siteName: 'LUMEN',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: `${siteUrl}/og-image.png`,
                width: 1200,
                height: 630,
                alt: 'LUMEN 별자리 운세',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '별자리 운세 - LUMEN',
        description: 'AI가 해석하는 12별자리 오늘의 운세. 연애, 직장, 금전 운세.',
        images: [`${siteUrl}/og-image.png`],
    },
    alternates: {
        canonical: `${siteUrl}/zodiac`,
    },
}

export default function ZodiacLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
