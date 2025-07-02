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
  existingThumbnailUrl: z.string().url().describe('The URL of the existing thumbnail to base the new one on.')
});
export type GenerateThumbnailInput = z.infer<typeof GenerateThumbnailInputSchema>;

const GenerateThumbnailOutputSchema = z.object({
  thumbnailDataUri: z.string().describe("The generated thumbnail image as a data URI."),
});
export type GenerateThumbnailOutput = z.infer<typeof GenerateThumbnailOutputSchema>;

export async function generateThumbnail(input: GenerateThumbnailInput): Promise<GenerateThumbnailOutput> {
  return generateThumbnailFlow(input);
}

async function imageUrlToDataUri(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(blob).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("Error converting image URL to data URI:", error);
        throw new Error("Could not process the existing thumbnail image.");
    }
}

const generateThumbnailFlow = ai.defineFlow(
  {
    name: 'generateThumbnailFlow',
    inputSchema: GenerateThumbnailInputSchema,
    outputSchema: GenerateThumbnailOutputSchema,
  },
  async (input) => {
    let prompt: any;

    if (input.existingThumbnailUrl.startsWith('data:') || input.existingThumbnailUrl.includes('placehold.co')) {
        prompt = `Generate a visually appealing and clickable YouTube thumbnail for a video with the following details. The thumbnail should be vibrant, high-contrast, and clearly represent the video's content. Avoid using any text in the image.
      
        Title: "${input.title}"
        Description: "${input.description}"`;
    } else {
        const existingThumbnailDataUri = await imageUrlToDataUri(input.existingThumbnailUrl);
        prompt = [
            {media: {url: existingThumbnailDataUri}},
            {text: `Generate a new, visually appealing and clickable YouTube thumbnail that is similar in style and subject to the provided image, but with a different composition or angle. The thumbnail should be vibrant, high-contrast, and clearly represent the video's content. Use the following video details for context. Avoid using any text in the image.
            
            Title: "${input.title}"
            Description: "${input.description}"`},
        ];
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return a data URI.');
    }
    
    return { thumbnailDataUri: media.url };
  }
);
