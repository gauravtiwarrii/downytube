'use server';
/**
 * @fileOverview AI-powered transcript generator from audio.
 *
 * - generateTranscript - Transcribes an audio file and returns a structured transcript.
 * - GenerateTranscriptInput - The input type.
 * - GenerateTranscriptOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscriptSegmentSchema = z.object({
  text: z.string().describe('The transcribed text for this segment.'),
  offset: z.number().describe('The start time of the segment in milliseconds from the beginning of the audio.'),
  duration: z.number().describe('The duration of the segment in milliseconds.'),
});

const GenerateTranscriptInputSchema = z.object({
  audioDataUri: z.string().describe("The audio file to transcribe, as a data URI."),
});
export type GenerateTranscriptInput = z.infer<typeof GenerateTranscriptInputSchema>;


const GenerateTranscriptOutputSchema = z.object({
    transcript: z.array(TranscriptSegmentSchema),
});
export type GenerateTranscriptOutput = z.infer<typeof GenerateTranscriptOutputSchema>;

export async function generateTranscript(input: GenerateTranscriptInput): Promise<GenerateTranscriptOutput> {
  return generateTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTranscriptPrompt',
  input: {schema: GenerateTranscriptInputSchema},
  output: {schema: GenerateTranscriptOutputSchema},
  model: 'googleai/gemini-1.5-pro-preview-0514', // Use a powerful model for this task
  prompt: `You are an expert audio transcription service. Your task is to transcribe the provided audio file and format the output as a structured JSON object.

**CRITICAL INSTRUCTIONS:**
1.  Listen to the entire audio file carefully.
2.  Break down the speech into logical segments or sentences.
3.  For each segment, create a JSON object with three fields: 'text', 'offset', and 'duration'.
4.  'text': The transcribed text for that segment.
5.  'offset': The start time of the segment in **milliseconds** from the beginning of the audio.
6.  'duration': The duration of the segment in **milliseconds**.
7.  You MUST accurately estimate the offset and duration for every single segment. The entire audio should be covered.
8.  Return a single JSON object with a single key "transcript" which is an array of these segment objects.

**Audio Input:**
{{media url=audioDataUri}}
`,
});

const generateTranscriptFlow = ai.defineFlow(
  {
    name: 'generateTranscriptFlow',
    inputSchema: GenerateTranscriptInputSchema,
    outputSchema: GenerateTranscriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
