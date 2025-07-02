'use server';

/**
 * @fileOverview AI-powered YouTube tag optimizer.
 *
 * - optimizeYouTubeTags - A function that optimizes YouTube tags for better SEO.
 * - OptimizeYouTubeTagsInput - The input type for the optimizeYouTubeTags function.
 * - OptimizeYouTubeTagsOutput - The return type for the optimizeYouTubeTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeYouTubeTagsInputSchema = z.object({
  title: z.string().describe('The title of the YouTube video.'),
  description: z.string().describe('The description of the YouTube video.'),
  existingTags: z.array(z.string()).describe('The existing tags for the YouTube video.'),
});

export type OptimizeYouTubeTagsInput = z.infer<typeof OptimizeYouTubeTagsInputSchema>;

const OptimizeYouTubeTagsOutputSchema = z.object({
  optimizedTags: z.array(z.string()).describe('The AI-optimized tags for the YouTube video.'),
  reasoning: z.string().describe('The AI reasoning behind the tag optimization.'),
});

export type OptimizeYouTubeTagsOutput = z.infer<typeof OptimizeYouTubeTagsOutputSchema>;

export async function optimizeYouTubeTags(input: OptimizeYouTubeTagsInput): Promise<OptimizeYouTubeTagsOutput> {
  return optimizeYouTubeTagsFlow(input);
}

const optimizeYouTubeTagsPrompt = ai.definePrompt({
  name: 'optimizeYouTubeTagsPrompt',
  input: {schema: OptimizeYouTubeTagsInputSchema},
  output: {schema: OptimizeYouTubeTagsOutputSchema},
  prompt: `You are a YouTube SEO and viral growth expert. Your task is to generate a list of highly optimized tags that will make a video go viral.

**CRITICAL INSTRUCTIONS:**
1.  **Language Analysis:** Analyze the language of the video title and description. Your generated tags and reasoning MUST be in the same language. If the content is in Hindi, all tags and the reasoning must be in Hindi.
2.  **Tag Strategy:** Generate a comprehensive list of tags using the following categories:
    *   **Broad Tags:** High-level keywords describing the video's main topic (e.g., "tech review", "comedy sketch").
    *   **Specific Tags:** Detailed keywords describing the specific subjects in the video (e.g., "iPhone 15 Pro Max", "unboxing", "camera test").
    *   **Trending/Viral Tags:** Include relevant tags that are currently trending or have viral potential. Think about what people are searching for *right now*.
    *   **Misspelling Tags:** Include common misspellings of your main keywords to capture that traffic.
3.  **Leverage Competitors:** Think about what tags the top-ranking videos on this topic are using and incorporate similar ideas.

**Video Information:**
Title: {{{title}}}
Description: {{{description}}}
Existing Tags: {{#each existingTags}}{{{this}}}, {{/each}}

Based on this, provide a list of optimized tags and a concise reasoning explaining your strategy, covering why the mix of broad, specific, and viral tags will maximize discoverability. Your reasoning should also be in the same language as the title.
`,
});

const optimizeYouTubeTagsFlow = ai.defineFlow(
  {
    name: 'optimizeYouTubeTagsFlow',
    inputSchema: OptimizeYouTubeTagsInputSchema,
    outputSchema: OptimizeYouTubeTagsOutputSchema,
  },
  async input => {
    const {output} = await optimizeYouTubeTagsPrompt(input);
    return output!;
  }
);
