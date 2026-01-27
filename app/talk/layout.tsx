import { Metadata } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export const metadata: Metadata = {
    title: 'LUMEN 인사이트 - AI 상담 | 오늘의 흐름',
    description: 'LUMEN과 대화하며 오늘의 운세를 더 깊이 이해해보세요. 타로, 사주, 별자리 결과를 바탕으로 한 AI 상담.',
    keywords: ['AI 상담', '운세 상담', '타로 상담', '사주 상담', 'LUMEN 인사이트'],
    openGraph: {
        title: 'LUMEN 인사이트 - AI 상담',
        description: 'LUMEN과 대화하며 오늘의 운세를 더 깊이 이해해보세요.',
        url: `${siteUrl}/talk`,
        siteName: 'LUMEN',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: `${siteUrl}/og-image.png`,
                width: 1200,
                height: 630,
                alt: 'LUMEN 인사이트',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'LUMEN 인사이트 - AI 상담',
        description: 'LUMEN과 대화하며 오늘의 운세를 더 깊이 이해해보세요.',
        images: [`${siteUrl}/og-image.png`],
    },
    alternates: {
        canonical: `${siteUrl}/talk`,
    },
}

export default function TalkLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
