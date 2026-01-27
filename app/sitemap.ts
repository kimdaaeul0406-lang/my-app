import { MetadataRoute } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
    const currentDate = new Date()

    return [
        {
            url: siteUrl,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${siteUrl}/tarot`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/saju`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/zodiac`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/talk`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${siteUrl}/plan`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]
}
