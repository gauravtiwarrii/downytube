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
  prompt: `You are a YouTube content strategist and SEO expert.
  Your goal is to rewrite a video's title and description to make them more clickable, engaging, and optimized for search algorithms.

  Original Title: {{{title}}}
  Original Description: {{{description}}}

  Rewrite the title to be catchy and intriguing, while including relevant keywords.
  Rewrite the description to be more detailed, engaging, and structured for better readability and SEO. Keep the tone of the original.
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
