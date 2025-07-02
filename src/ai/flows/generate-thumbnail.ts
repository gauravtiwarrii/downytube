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
        prompt = `You are a viral marketing expert who creates thumbnails that get millions of clicks on YouTube. Your task is to create a thumbnail for a video with the title and description below, following proven viral strategies.

**Key principles for a viral thumbnail:**
*   **Extreme Visual Impact:** Use hyper-saturated, vibrant colors and extreme contrast. The image must be impossible to ignore.
*   **Dynamic & Action-Packed:** The scene should feel like it's in motion. Use dynamic angles, action poses, and a sense of energy.
*   **One Clear Story:** The thumbnail must tell a simple, powerful story or ask a question. Have a single, unmissable focal point. Avoid clutter at all costs.
*   **Intense Emotion:** If a person is the subject, their face must show an exaggerated, high-stakes emotion (e.g., shock, joy, fear, curiosity). This is critical for engagement.
*   **Absolutely No Text:** Do not include any text, logos, or watermarks. The visual must do all the work.

**Video Details:**
*   **Title:** "${input.title}"
*   **Description:** "${input.description}"

Create a high-resolution, 16:9 aspect ratio image that embodies these viral principles. Make it look like a top creator's thumbnail.`;
    } else {
        // If it's a real URL, fetch it and use it as context to improve upon.
        const existingThumbnailDataUri = await imageUrlToDataUri(input.existingThumbnailUrl);
        prompt = [
            {media: {url: existingThumbnailDataUri}},
            {text: `You are a viral marketing expert specializing in YouTube thumbnails. Your task is to take the provided image and transform it into an incredibly click-worthy thumbnail that will maximize views. While you should use the original image as a base, you must make it dramatically more eye-catching.

**Your transformation should focus on:**
*   **Dramatize, Don't Replace:** Use the core subject from the original image, but re-imagine the scene to be more dynamic and visually exciting. Change the background if needed to create a more compelling story.
*   **Extreme Contrast and Saturation:** Make the colors pop. Use vibrant, almost unnatural colors to grab attention in a crowded feed. Boost the contrast significantly.
*   **Dynamic Lighting:** Add dramatic lighting effects, like lens flares, glows, or cinematic rim lighting, to make the subject stand out.
*   **Exaggerated Emotion:** If there is a person, subtly amplify their emotional expression to be more intense (e.g., more surprise, more shock, more excitement).
*   **Focus and Clarity:** Ensure the main subject is tack-sharp and pops from the background, which can be slightly blurred.
*   **Absolutely No Text:** Do not add any text, logos, or watermarks to the image itself.

**Video Details (for context only):**
*   **Title:** "${input.title}"
*   **Description:** "${input.description}"

Generate a new, high-resolution image that is a viral, attention-grabbing version of the original, following all the principles above.`},
        ];
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
        ],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return a data URI.');
    }
    
    return { thumbnailDataUri: media.url };
  }
);
