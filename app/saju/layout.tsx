import { Metadata } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export const metadata: Metadata = {
    title: '사주 운세 - LUMEN | 오늘의 흐름',
    description: 'AI가 해석하는 사주팔자 운세. 생년월일로 보는 성격, 연애, 직장, 금전 운세. 무료 사주 풀이.',
    keywords: ['사주', '사주팔자', '무료 사주', 'AI 사주', '생년월일 운세', '사주 풀이', '오늘의 사주'],
    openGraph: {
        title: '사주 운세 - LUMEN',
        description: 'AI가 해석하는 사주팔자 운세. 생년월일로 보는 성격, 연애, 직장, 금전 운세.',
        url: `${siteUrl}/saju`,
        siteName: 'LUMEN',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'LUMEN 사주 운세',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '사주 운세 - LUMEN',
        description: 'AI가 해석하는 사주팔자 운세. 생년월일로 보는 성격, 연애, 직장, 금전 운세.',
        images: ['/og-image.png'],
    },
    alternates: {
        canonical: `${siteUrl}/saju`,
    },
}

export default function SajuLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
