import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Files live in src/content/articles/<lang>/<slug>.md; the same slug in every language.
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Image path inside /public, e.g. "img/products/02-01-1200x900.webp". */
    cover: z.string(),
    coverAlt: z.string(),
    /** Related product slugs from src/data/products.ts. */
    products: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
