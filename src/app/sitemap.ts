import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://meteohuescar.es';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${base}/huescar`, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${base}/huescar/horas`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/huescar/semana`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/huescar/campo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/huescar/alertas`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${base}/huescar/fuentes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.3 },
    { url: `${base}/huescar/visualizacion`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.4 },
  ];
}
