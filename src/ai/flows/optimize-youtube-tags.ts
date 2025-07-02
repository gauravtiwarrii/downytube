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
  prompt: `You are an expert in YouTube SEO and tag optimization.
  Given the title, description, and existing tags of a YouTube video, you will generate a list of optimized tags to improve its search ranking and discoverability.

  Title: {{{title}}}
  Description: {{{description}}}
  Existing Tags: {{#each existingTags}}{{{this}}}, {{/each}}

  Provide a list of optimized tags, and a short reasoning for each tag.
  Ensure that the tags are relevant to the video content and target audience.
  Do not include any of the existing tags unless they are highly relevant.
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
