'use server';
/**
 * @fileOverview AI-powered A/B test generator for YouTube titles and thumbnails.
 *
 * - generateABTests - A function that generates title and thumbnail variations.
 * - GenerateABTestsInput - The input type for the function.
 * - GenerateABTestsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TitleVariationSchema = z.object({
    title: z.string().describe("A unique, catchy, and viral-style title for the video."),
    reasoning: z.string().describe("A brief explanation of the psychological or strategic hook behind this title."),
    confidenceScore: z.number().min(1).max(10).describe("A score from 1-10 indicating the AI's confidence in this title's viral potential compared to the other options.")
});

const ThumbnailVariationSchema = z.object({
    prompt: z.string().describe("A detailed, vibrant prompt for an image generation model to create a compelling thumbnail. This should be a visual concept."),
    reasoning: z.string().describe("A brief explanation of why this visual concept would be effective and attention-grabbing."),
    confidenceScore: z.number().min(1).max(10).describe("A score from 1-10 indicating the AI's confidence in this thumbnail concept's click-through-rate potential.")
});


const GenerateABTestsInputSchema = z.object({
  title: z.string().describe('The current title of the YouTube video.'),
  description: z.string().describe('The description of the YouTube video.'),
});
export type GenerateABTestsInput = z.infer<typeof GenerateABTestsInputSchema>;

const GenerateABTestsOutputSchema = z.object({
  titleVariations: z.array(TitleVariationSchema).describe("An array of 3-5 distinct title variations."),
  thumbnailVariations: z.array(ThumbnailVariationSchema).describe("An array of 3-5 distinct thumbnail concept variations."),
});
export type GenerateABTestsOutput = z.infer<typeof GenerateABTestsOutputSchema>;


export async function generateABTests(input: GenerateABTestsInput): Promise<GenerateABTestsOutput> {
  return generateABTestsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateABTestsPrompt',
  input: {schema: GenerateABTestsInputSchema},
  output: {schema: GenerateABTestsOutputSchema},
  model: 'googleai/gemini-1.5-pro',
  prompt: `You are a YouTube growth strategist with deep expertise in A/B testing titles and thumbnails to maximize click-through-rate (CTR). Your task is to generate several compelling variations for a given video.

**Video Information:**
- **Title:** "{{title}}"
- **Description:** "{{description}}"

**CRITICAL INSTRUCTIONS:**

1.  **Generate Title Variations (3-5 options):**
    *   Create a diverse set of titles. Each title must use a different psychological angle (e.g., Curiosity Gap, Direct Value, Controversy, Urgency, Listicle).
    *   Do not just rephrase the original title. Create fundamentally different concepts.
    *   For each title, provide a 'confidenceScore' (1-10) on its potential to outperform a standard title.
    *   For each title, provide your 'reasoning' for why it would work.

2.  **Generate Thumbnail Concept Variations (3-5 options):**
    *   For each concept, write a detailed image generation 'prompt'. The prompt should describe a visually arresting scene, focusing on emotion, clarity, and intrigue.
    *   These concepts should visually complement the title ideas but also be strong enough to stand alone.
    *   For each thumbnail concept, provide a 'confidenceScore' (1-10) and your 'reasoning'.

Your output must be a perfectly formatted JSON object matching the requested schema.`,
});

const generateABTestsFlow = ai.defineFlow(
  {
    name: 'generateABTestsFlow',
    inputSchema: GenerateABTestsInputSchema,
    outputSchema: GenerateABTestsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    if (!output) {
        throw new Error('AI failed to generate A/B test variations.');
    }
    
    return output;
  }
);
