'use server';

/**
 * @fileOverview AI-powered YouTube video title and description rewriter.
 *
 * - rewriteVideoDetails - A function that rewrites video details for better engagement.
 * - RewriteVideoDetailsInput - The input type for the rewriteVideoDetails function.
 * - RewriteVideoDetailsOutput - The return type for the rewriteVideoDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteVideoDetailsInputSchema = z.object({
  title: z.string().describe('The original title of the YouTube video.'),
  description: z.string().describe('The original description of the YouTube video.'),
});

export type RewriteVideoDetailsInput = z.infer<typeof RewriteVideoDetailsInputSchema>;

const RewriteVideoDetailsOutputSchema = z.object({
  rewrittenTitle: z.string().describe('The AI-rewritten, SEO-friendly title.'),
  rewrittenDescription: z.string().describe('The AI-rewritten, engaging, and SEO-friendly description.'),
});

export type RewriteVideoDetailsOutput = z.infer<typeof RewriteVideoDetailsOutputSchema>;

export async function rewriteVideoDetails(input: RewriteVideoDetailsInput): Promise<RewriteVideoDetailsOutput> {
  return rewriteVideoDetailsFlow(input);
}

const rewriteVideoDetailsPrompt = ai.definePrompt({
  name: 'rewriteVideoDetailsPrompt',
  input: {schema: RewriteVideoDetailsInputSchema},
  output: {schema: RewriteVideoDetailsOutputSchema},
  prompt: `You are a world-class YouTube growth hacker and viral marketing expert. Your task is to rewrite a video's title and description to make it go viral.

**CRITICAL INSTRUCTIONS:**
1.  **Language Matching:** First, detect the primary language of the 'Original Title'. Your entire response—both the rewritten title and description—MUST be in that same language. If it's Hindi, you write in Hindi. If it's English, you write in English. Do not mix languages.
2.  **Viral Title Formula:** The title must be extremely compelling and create a strong sense of curiosity or urgency. Use proven formulas:
    *   X vs. Y (e.g., "Budget Phone vs. Pro Phone: The UNEXPECTED Winner")
    *   The Shocking Truth About...
    *   I Tried X For 7 Days And This Happened...
    *   Numbered Lists (e.g., "5 Mistakes You're Making...")
    *   Questions (e.g., "Is This The End of...?")
3.  **High-Engagement Description:** The description must be structured for maximum engagement and SEO.
    *   **Hook First:** The first 1-2 sentences must repeat the title's hook and promise to deliver on it, making people want to watch.
    *   **Detailed Summary:** Provide a compelling summary of the video's key moments. Use timestamps if possible to increase watch time.
    *   **Keyword Rich:** Naturally weave in relevant keywords and search terms throughout the description.
    *   **Call to Action (CTA):** End with a clear call to action (e.g., "Subscribe for more!", "Watch our last video here: [link]").

**Original Video Details:**
Original Title: {{{title}}}
Original Description: {{{description}}}

Now, apply these viral techniques to rewrite the title and description.
`,
});

const rewriteVideoDetailsFlow = ai.defineFlow(
  {
    name: 'rewriteVideoDetailsFlow',
    inputSchema: RewriteVideoDetailsInputSchema,
    outputSchema: RewriteVideoDetailsOutputSchema,
  },
  async input => {
    const {output} = await rewriteVideoDetailsPrompt(input);
    return output!;
  }
);
