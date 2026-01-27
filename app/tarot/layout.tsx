import { Metadata } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export const metadata: Metadata = {
    title: '타로 운세 - LUMEN | 오늘의 흐름',
    description: 'AI가 해석하는 타로 카드 리딩. 연애, 금전, 직장 운세를 과장 없이 정리해드려요. 무료 타로 점 보기.',
    keywords: ['타로', '타로 점', '무료 타로', 'AI 타로', '오늘의 타로', '연애운', '금전운', '직장운'],
    openGraph: {
        title: '타로 운세 - LUMEN',
        description: 'AI가 해석하는 타로 카드 리딩. 연애, 금전, 직장 운세를 과장 없이 정리해드려요.',
        url: `${siteUrl}/tarot`,
        siteName: 'LUMEN',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'LUMEN 타로 운세',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '타로 운세 - LUMEN',
        description: 'AI가 해석하는 타로 카드 리딩. 연애, 금전, 직장 운세를 과장 없이 정리해드려요.',
        images: ['/og-image.png'],
    },
    alternates: {
        canonical: `${siteUrl}/tarot`,
    },
}

export default function TarotLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
