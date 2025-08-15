'use server';
/**
 * @fileOverview AI-powered YouTube thumbnail generator.
 *
 * - generateThumbnail - A function that generates a thumbnail based on video details.
 * - GenerateThumbnailInput - The input type for the generateThumbnail function.
 * - GenerateThumbnailOutput - The return type for the generateThumbnail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateThumbnailInputSchema = z.object({
  title: z.string().describe('The title of the YouTube video.'),
  description: z.string().describe('The description of the YouTube video.'),
  existingThumbnailUrl: z.string().describe('The URL or data URI of the existing thumbnail to base the new one on.'),
  customPrompt: z.string().optional().describe('A custom prompt from the user to guide the AI creative director.')
});
export type GenerateThumbnailInput = z.infer<typeof GenerateThumbnailInputSchema>;

const GenerateThumbnailOutputSchema = z.object({
  thumbnailDataUri: z.string().describe("The generated thumbnail image as a data URI."),
  revisedPrompt: z.string().describe("The AI's revised, more detailed prompt that was used for generation.")
});
export type GenerateThumbnailOutput = z.infer<typeof GenerateThumbnailOutputSchema>;

export async function generateThumbnail(input: GenerateThumbnailInput): Promise<GenerateThumbnailOutput> {
  return generateThumbnailFlow(input);
}

const CreativeDirectorPromptSchema = z.object({
    finalPrompt: z.string().describe("A detailed, vibrant, and descriptive prompt for an image generation model that captures the essence of the request. This prompt should be a single paragraph and optimized for creating a visually stunning, clickable thumbnail."),
});

const creativeDirectorPrompt = ai.definePrompt({
    name: 'thumbnailCreativeDirector',
    model: 'googleai/gemini-1.5-pro',
    input: { schema: GenerateThumbnailInputSchema },
    output: { schema: CreativeDirectorPromptSchema },
    prompt: `You are an expert Creative Director for YouTube thumbnails. Your task is to take a video's details and an optional user idea, and then write a single, perfect, highly-detailed prompt for an image generation AI.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Input:** Review the video title, description, and the user's custom prompt.
2.  **Synthesize a Vision:** Combine the elements into a single, cohesive, and visually compelling concept. If the user prompt is specific, build upon it. If it's vague, use the title and description to invent a powerful concept.
3.  **Think Virally:** Your generated prompt must be designed to create a thumbnail that is:
    *   **Emotionally Charged:** High-contrast emotions (shock, joy, curiosity).
    *   **Visually Striking:** Hyper-realistic, cinematic lighting, vibrant colors, and a clear focal point.
    *   **Story-Driven:** Tells a simple story or asks a question visually.
4.  **Write the Final Prompt:** The final output 'finalPrompt' must be a single paragraph. It should be descriptive, using dynamic verbs and rich adjectives. Describe the scene, the subject, the lighting, the colors, and the overall mood.
5.  **No Text:** Explicitly instruct the image model NOT to include any text, letters, or words in the final image.

**Video Title:** "{{title}}"
**Video Description:** "{{description}}"
{{#if customPrompt}}**User's Idea:** "{{customPrompt}}"{{/if}}

Based on all this information, write the perfect image generation prompt.`,
});


const generateThumbnailFlow = ai.defineFlow(
  {
    name: 'generateThumbnailFlow',
    inputSchema: GenerateThumbnailInputSchema,
    outputSchema: GenerateThumbnailOutputSchema,
  },
  async (input) => {
    // Step 1: Use the Creative Director to generate the perfect image prompt
    const directorResponse = await creativeDirectorPrompt(input);
    const imagePrompt = directorResponse.output?.finalPrompt;

    if (!imagePrompt) {
        throw new Error('The AI creative director failed to generate a prompt.');
    }

    // Step 2: Generate the image using the director's prompt
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: imagePrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return a data URI.');
    }
    
    return { 
        thumbnailDataUri: media.url,
        revisedPrompt: imagePrompt,
    };
  }
);
