import { MetadataRoute } from 'next'

const siteUrl = 'https://my-app-jade-eight-85.vercel.app'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/_next/'],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    }
}
