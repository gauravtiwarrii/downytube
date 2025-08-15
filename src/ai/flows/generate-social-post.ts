'use server';

/**
 * @fileOverview AI-powered social media post generator.
 *
 * - generateSocialPost - A function that generates a social media post.
 * - GenerateSocialPostInput - The input type for the function.
 * - GenerateSocialPostOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSocialPostInputSchema = z.object({
  title: z.string().describe('The title of the YouTube video.'),
  description: z.string().describe('The description of the YouTube video.'),
  platform: z.enum(['Twitter', 'LinkedIn']).describe('The social media platform to generate the post for.'),
});
export type GenerateSocialPostInput = z.infer<typeof GenerateSocialPostInputSchema>;

const GenerateSocialPostOutputSchema = z.object({
  postText: z.string().describe('The generated social media post text.'),
});
export type GenerateSocialPostOutput = z.infer<typeof GenerateSocialPostOutputSchema>;


export async function generateSocialPost(input: GenerateSocialPostInput): Promise<GenerateSocialPostOutput> {
  return generateSocialPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSocialPostPrompt',
  input: {schema: GenerateSocialPostInputSchema},
  output: {schema: GenerateSocialPostOutputSchema},
  prompt: `You are a social media marketing expert specializing in promoting YouTube videos. Your task is to write an engaging post for {{{platform}}} to drive traffic to a new video.

**Platform Constraints:**
{{#if (eq platform "Twitter")}}
- Keep it concise, under 280 characters.
- Use 2-3 relevant hashtags.
- Ask a question to encourage engagement.
{{/if}}
{{#if (eq platform "LinkedIn")}}
- Write in a professional yet engaging tone.
- Use 3-5 professional hashtags.
- Start with a strong hook to grab attention.
- Structure the post with paragraphs for readability.
{{/if}}

**Video Information:**
- **Title:** "{{title}}"
- **Description:** "{{description}}"

Based on the video information and platform constraints, generate the perfect post.
`,
});

const generateSocialPostFlow = ai.defineFlow(
  {
    name: 'generateSocialPostFlow',
    inputSchema: GenerateSocialPostInputSchema,
    outputSchema: GenerateSocialPostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    if (!output) {
        throw new Error('AI failed to generate a social media post.');
    }
    
    return output;
  }
);

    