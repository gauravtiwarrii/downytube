'use server';
/**
 * @fileOverview AI-powered clip finder for YouTube videos.
 *
 * - findViralClips - Analyzes a video transcript to find viral clip opportunities.
 * - FindViralClipsInput - The input type.
 * - FindViralClipsOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClipSuggestionSchema = z.object({
  startTime: z.number().describe('The start time of the clip in seconds from the beginning of the video.'),
  endTime: z.number().describe('The end time of the clip in seconds from the beginning of the video.'),
  title: z.string().describe('A catchy, viral title for this specific clip.'),
  summary: z.string().describe('A brief summary of what happens in this clip.'),
  viralityScore: z.number().min(1).max(10).describe('A score from 1-10 indicating the viral potential of this clip.'),
  reasoning: z.string().describe('A short explanation of why this clip has high viral potential (e.g., emotional peak, controversial statement).'),
});

const FindViralClipsInputSchema = z.object({
  videoTitle: z.string(),
  transcript: z.array(z.object({
    text: z.string(),
    offset: z.number(), // in milliseconds
    duration: z.number(), // in milliseconds
  })),
  customInstructions: z.string().optional().describe('Specific instructions from the user on what kind of clips to look for.'),
});
export type FindViralClipsInput = z.infer<typeof FindViralClipsInputSchema>;


const FindViralClipsOutputSchema = z.object({
    clips: z.array(ClipSuggestionSchema),
});
export type FindViralClipsOutput = z.infer<typeof FindViralClipsOutputSchema>;

export async function findViralClips(input: FindViralClipsInput): Promise<FindViralClipsOutput> {
  return findViralClipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findViralClipsPrompt',
  input: {schema: FindViralClipsInputSchema},
  output: {schema: FindViralClipsOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert viral video producer for YouTube Shorts, Instagram Reels, and TikTok. Your job is to analyze a podcast transcript and identify the most viral-worthy segments between 15 and 60 seconds long.

**Video Title:** {{{videoTitle}}}

**Analysis Criteria:**
Look for segments that have high potential for engagement. Focus on:
- **Strong Emotions:** Peaks of excitement, anger, laughter, or vulnerability.
- **Controversial or Hot Takes:** Strong, polarizing opinions that will spark discussion.
- **Actionable Insights:** "Aha!" moments, clever tips, or profound advice that viewers will want to save and share.
- **Humor:** Jokes, funny stories, or witty banter that is genuinely entertaining.
- **Narrative Hooks:** The start of a compelling story or a question that makes the viewer need to know what happens next.

{{#if customInstructions}}
**CRITICAL USER INSTRUCTION: The user has provided a specific request. Prioritize finding clips that match this description:**
"{{customInstructions}}"
{{/if}}

**Input Transcript Format:**
The transcript is provided as a JSON array. Each object has 'text' and 'offset' (in milliseconds). Use the offset to calculate the startTime and endTime in SECONDS for each clip.

**CRITICAL INSTRUCTIONS:**
1.  Identify 3-5 of the absolute BEST segments for creating viral short-form clips.
2.  Each clip must be between 15 and 60 seconds long.
3.  For each segment, provide the start and end times in **total seconds**.
4.  Generate a short, extremely catchy, viral-style title for the clip. Think like a top creator (e.g., "He DESTROYED the argument in 5 seconds...").
5.  Provide a virality score from 1-10.
6.  Briefly explain your reasoning for why the clip is viral-worthy. If the user provided custom instructions, explain how the clip fulfills their request.
7.  Do not select overlapping clips.

**Transcript:**
\`\`\`json
{{{json transcript}}}
\`\`\`
`,
config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
});

const findViralClipsFlow = ai.defineFlow(
  {
    name: 'findViralClipsFlow',
    inputSchema: FindViralClipsInputSchema,
    outputSchema: FindViralClipsOutputSchema,
  },
  async (input) => {
    // Due to context window limitations, we might need to truncate the transcript.
    // A typical token is ~4 characters. Let's aim for a safe limit, e.g., ~100k characters.
    const maxChars = 100000;
    const transcriptString = JSON.stringify(input.transcript);
    
    let truncatedTranscript = input.transcript;

    if (transcriptString.length > maxChars) {
      // Don't slice mid-object, find a good place to cut.
      // A simple way is to just filter the array.
      let currentLength = 0;
      const filteredTranscript = [];
      for (const item of input.transcript) {
          const itemLength = JSON.stringify(item).length;
          if (currentLength + itemLength > maxChars) {
              break;
          }
          filteredTranscript.push(item);
          currentLength += itemLength;
      }
      truncatedTranscript = filteredTranscript;
    }

    const {output} = await prompt({
        videoTitle: input.videoTitle,
        transcript: truncatedTranscript,
        customInstructions: input.customInstructions,
    });
    
    if (!output || !output.clips) {
        throw new Error("AI failed to find clips. This can happen if the transcript is too short or doesn't contain clear conversational segments. Try a different video.");
    }
    
    return output;
  }
);

    