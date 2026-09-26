import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edutrack-fe.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register', '/forgot-password', '/verify-otp'],
      disallow: [
        '/dashboard',
        '/profile',
        '/classes',
        '/students',
        '/schedule',
        '/api/',
        '/settings/',
        '/upload',
        '/notifications'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
