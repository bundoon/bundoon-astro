import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    publishDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    featured_image: image().or(z.string()).optional(),
    images: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
  })
});

export const collections = { posts };
