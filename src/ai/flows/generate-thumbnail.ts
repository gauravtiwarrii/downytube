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
  existingThumbnailUrl: z.string().describe('The URL or data URI of the existing thumbnail to base the new one on.')
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

    // If the thumbnail is a placeholder or already a data URI from our app, generate a new one from scratch.
    if (input.existingThumbnailUrl.startsWith('data:') || input.existingThumbnailUrl.includes('placehold.co')) {
        prompt = `You are a professional graphic designer specializing in viral YouTube thumbnails. Your task is to create a thumbnail for a video with the title and description below.

**Key principles for this thumbnail:**
*   **Visually Arresting:** Use vibrant, saturated colors and strong contrast to grab attention immediately.
*   **Cinematic Quality:** The image should look like a still from a high-quality film. Think dynamic lighting, interesting angles, and a sense of depth.
*   **Single Focal Point:** The thumbnail must have one clear, compelling subject. Avoid clutter.
*   **Emotionally Evocative:** The image should spark curiosity, excitement, or another strong emotion relevant to the video's topic.
*   **Absolutely No Text:** Do not include any letters, words, or logos in the image. The visual alone should tell the story.

**Video Details:**
*   **Title:** "${input.title}"
*   **Description:** "${input.description}"

Create a high-resolution, 16:9 aspect ratio image that embodies these principles.`;
    } else {
        // If it's a real URL, fetch it and use it as context to improve upon.
        const existingThumbnailDataUri = await imageUrlToDataUri(input.existingThumbnailUrl);
        prompt = [
            {media: {url: existingThumbnailDataUri}},
            {text: `You are a world-class photo editor and YouTube strategist. Your goal is to take the provided image and video details and create a dramatically improved version for a YouTube thumbnail.

**Your improvements should focus on:**
*   **Enhanced Dynamism:** Re-imagine the composition with more dramatic angles, a sense of motion, or a more compelling focus on the subject.
*   **Cinematic Lighting:** Add professional, cinematic lighting. Increase contrast, deepen shadows, and add highlights to make the subject pop.
*   **Vibrant Color Grading:** Apply a professional color grade to make the image more vibrant and eye-catching. The colors should be saturated but look realistic and high-quality.
*   **Maintain the Core Subject:** The new image must be clearly based on the original, retaining the same subject and general theme.
*   **Absolutely No Text:** Do not add any text, logos, or watermarks.

**Video Details:**
*   **Title:** "${input.title}"
*   **Description:** "${input.description}"

Generate a new, high-resolution image that is visually superior and more clickable than the original, following all the principles above.`},
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
