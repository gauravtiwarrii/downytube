'use server';
/**
 * @fileOverview AI-powered tool for brainstorming viral video ideas.
 *
 * - generateViralIdeas - Analyzes a topic and suggests viral video concepts.
 * - GenerateViralIdeasInput - The input type.
 * - GenerateViralIdeasOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ViralIdeaSchema = z.object({
  title: z.string().describe("A catchy, clickable, and SEO-friendly title for the video."),
  hook: z.string().describe("The opening sentence or question for the video, designed to grab the viewer's attention in the first 3 seconds."),
  reasoning: z.string().describe("A brief explanation of why this idea has viral potential (e.g., targets a common pain point, taps into a current trend, is highly controversial)."),
  viralityScore: z.number().min(1).max(10).describe("A score from 1-10 indicating the viral potential of this video idea."),
});

const GenerateViralIdeasInputSchema = z.object({
  topic: z.string().describe('The general topic, niche, or keyword to brainstorm ideas for.'),
});
export type GenerateViralIdeasInput = z.infer<typeof GenerateViralIdeasInputSchema>;


const GenerateViralIdeasOutputSchema = z.object({
    ideas: z.array(ViralIdeaSchema),
});
export type GenerateViralIdeasOutput = z.infer<typeof GenerateViralIdeasOutputSchema>;


export async function generateViralIdeas(input: GenerateViralIdeasInput): Promise<GenerateViralIdeasOutput> {
  return generateViralIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateViralIdeasPrompt',
  input: {schema: GenerateViralIdeasInputSchema},
  output: {schema: GenerateViralIdeasOutputSchema},
  prompt: `You are a YouTube growth hacking expert and viral strategist. Your job is to brainstorm 5 viral video ideas based on a given topic.

**Input Topic:** {{{topic}}}

**Analysis Criteria:**
For each idea, you must develop a concept that has a high potential for engagement. Think about:
- **Audience Pain Points:** What problems can you solve?
- **Current Trends:** What's happening in this niche right now?
- **Contrarian Takes:** What is an unpopular opinion you could defend?
- **Curiosity Gaps:** What common knowledge can you reveal is wrong?
- **Proven Formats:** (e.g., 'X Mistakes You're Making', 'I Tried X for 30 Days', 'X vs Y: The Surprising Winner')

**CRITICAL INSTRUCTIONS:**
1.  Generate exactly 5 distinct video ideas.
2.  For each idea, provide a compelling, clickable **title**.
3.  For each idea, write a powerful **hook** (the first sentence of the video).
4.  For each idea, provide a **virality score** from 1-10.
5.  For each idea, explain your **reasoning** for why it has viral potential.
`,
});

const generateViralIdeasFlow = ai.defineFlow(
  {
    name: 'generateViralIdeasFlow',
    inputSchema: GenerateViralIdeasInputSchema,
    outputSchema: GenerateViralIdeasOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    
    if (!output) {
      throw new Error("AI failed to generate viral ideas. Please try a different topic.");
    }

    return output;
  }
);

    