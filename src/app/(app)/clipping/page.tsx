'use client';

import { useState, useMemo } from 'react';
import ClippingForm from '@/components/features/ClippingForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoForClips, getGeneratedTranscript, findClipsFromTranscript } from '@/app/actions';
import { Loader2, Scissors, Wand2, Star, FileText, Lightbulb } from 'lucide-react';
import type { Video, TranscriptItem } from '@/types';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';


type ClipSuggestion = {
    startTime: number;
    endTime: number;
    startTimeString: string;
    endTimeString: string;
    title: string;
    summary: string;
    viralityScore: number;
    reasoning: string;
};

type AnalysisState = 'idle' | 'loading' | 'success' | 'error' | 'needsGeneration';

export default function ClippingPage() {
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [url, setUrl] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<Video | null>(null);
    const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [transcriptQuery, setTranscriptQuery] = useState('');
    const [selectedClip, setSelectedClip] = useState<ClipSuggestion | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [uploadedClipUrl, setUploadedClipUrl] = useState<string | null>(null);

    const { toast } = useToast();

    const handleAnalyze = async () => {
        if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
            setError('Please enter a valid YouTube URL.');
            return;
        }
        setError(null);
        setAnalysisState('loading');
        setSelectedClip(null);
        setShowManualForm(false);
        setUploadedClipUrl(null);
        setIsAnalyzing(true);

        const result = await analyzeVideoForClips(url, customInstructions || undefined);
        setIsAnalyzing(false);

        if (result.success && result.data) {
            setVideoInfo(result.data.video);
            if (result.data.transcriptError === 'NEEDS_GENERATION') {
                setAnalysisState('needsGeneration');
            } else {
                setTranscript(result.data.transcript);
                setSuggestions(result.data.suggestions);
                setAnalysisState('success');
                toast({ title: 'Analysis Complete!', description: 'AI has found some viral clip ideas for you.' });
            }
        } else {
            setError(result.error || 'An unknown error occurred.');
            setAnalysisState('error');
            setVideoInfo(null);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
        }
    };
    
    const findClipsAgain = async () => {
        if (!videoInfo || transcript.length === 0) return;
        setIsAnalyzing(true);
        toast({ title: 'Re-analyzing with new instructions...'});
        
        try {
            const clipsResult = await findClipsFromTranscript({
                videoTitle: videoInfo.title,
                transcript: transcript,
                customInstructions: customInstructions || undefined,
            });

            const newSuggestions = clipsResult.clips.map((clip) => ({
                ...clip,
                startTimeString: formatTime(clip.startTime),
                endTimeString: formatTime(clip.endTime),
            }));

            setSuggestions(newSuggestions);
            setAnalysisState('success');
            toast({ title: 'Analysis Complete!', description: 'AI has found new clips based on your instructions.' });
        } catch (e) {
            const clipError = e instanceof Error ? e.message : 'Unknown error finding clips.';
            setError(clipError);
            toast({ variant: 'destructive', title: 'Clip Analysis Failed', description: clipError });
        } finally {
            setIsAnalyzing(false);
        }
    }


    const handleGenerateTranscript = async () => {
        if (!videoInfo) return;

        setIsGenerating(true);
        toast({
            title: 'Generating Transcript...',
            description: 'This may take several minutes for longer videos.',
        });

        const transcriptResult = await getGeneratedTranscript(videoInfo.youtubeUrl);

        if (!transcriptResult.success || !transcriptResult.data?.transcript) {
            setError(transcriptResult.error || 'Failed to generate transcript.');
            setAnalysisState('error');
            toast({ variant: 'destructive', title: 'Transcription Failed', description: transcriptResult.error });
            setIsGenerating(false);
            return;
        }

        const newTranscript = transcriptResult.data.transcript;
        setTranscript(newTranscript);
        toast({ title: 'Transcript Generated!', description: 'Now analyzing for viral clips...' });

        try {
            const clipsResult = await findClipsFromTranscript({
                videoTitle: videoInfo.title,
                transcript: newTranscript,
                customInstructions: customInstructions || undefined
            });

            const newSuggestions = clipsResult.clips.map((clip) => ({
                ...clip,
                startTimeString: formatTime(clip.startTime),
                endTimeString: formatTime(clip.endTime),
            }));

            setSuggestions(newSuggestions);
            setAnalysisState('success');
            toast({ title: 'Analysis Complete!', description: 'AI has found viral clips from the generated transcript.' });
        } catch (e) {
            const clipError = e instanceof Error ? e.message : 'Unknown error finding clips.';
            setError(clipError);
            setAnalysisState('error');
            toast({ variant: 'destructive', title: 'Clip Analysis Failed', description: clipError });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSelectClip = (clip: ClipSuggestion) => {
        setSelectedClip(clip);
        setShowManualForm(false);
    };

    const handleBack = () => {
        setAnalysisState('idle');
        setUrl('');
        setVideoInfo(null);
        setSuggestions([]);
        setTranscript([]);
        setSelectedClip(null);
        setShowManualForm(false);
        setUploadedClipUrl(null);
        setTranscriptQuery('');
        setCustomInstructions('');
    }
    
    const onUploadSuccess = (finalUrl: string) => {
        toast({ title: "Clip Uploaded!", description: "You can create another clip from the same video or start over."});
        setUploadedClipUrl(finalUrl);
        setSelectedClip(null); 
    }

    const highlightText = (text: string, query: string): React.ReactNode => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
          <span>
            {parts.map((part, i) =>
              part.toLowerCase() === query.toLowerCase() ? (
                <mark key={i}>{part}</mark>
              ) : (
                part
              )
            )}
          </span>
        );
      };

    const filteredTranscript = useMemo(() => {
        if (!transcriptQuery) return transcript;
        return transcript.filter(item => item.text.toLowerCase().includes(transcriptQuery.toLowerCase()));
    }, [transcript, transcriptQuery]);


    const renderContent = () => {
        if (uploadedClipUrl) {
            return (
                <Card className="text-center p-8">
                     <h3 className="text-2xl font-semibold text-primary">Clip Uploaded Successfully!</h3>
                     <p className="text-muted-foreground mt-2">Your vertical clip is now on YouTube.</p>
                     <div className="mt-6 flex flex-col gap-4 items-center">
                         <a href={uploadedClipUrl} target="_blank" rel="noopener noreferrer">
                             <Button>View on YouTube</Button>
                         </a>
                         <Button variant="outline" onClick={() => setUploadedClipUrl(null)}>
                           Create Another Clip from this Video
                         </Button>
                         <Button variant="ghost" onClick={handleBack}>Analyze a New Video</Button>
                     </div>
                </Card>
            )
        }


        switch (analysisState) {
            case 'loading':
                return (
                    <Card className="text-center p-8">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                        <h3 className="mt-4 text-lg font-semibold">Analyzing Video...</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                           Checking for transcripts and metadata...
                        </p>
                    </Card>
                );
            case 'needsGeneration':
                return (
                    <div>
                         <Card className="mb-8 overflow-hidden">
                           <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="relative w-full md:w-48 aspect-video flex-shrink-0 rounded-lg overflow-hidden">
                                        {videoInfo && (
                                            <Image src={videoInfo.thumbnailUrl} alt={videoInfo.title} layout="fill" objectFit="cover" />
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold">{videoInfo?.title}</h3>
                                        <div className="mt-4 flex gap-2">
                                            <Button variant="outline" onClick={handleBack}>Analyze New Video</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="text-center p-8">
                            <FileText className="mx-auto h-12 w-12 text-primary" />
                            <h3 className="mt-4 text-lg font-semibold">AI Transcription Required</h3>
                            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                                A transcript was not found for this video. Generate one with AI to find viral clips. This may take several minutes for longer videos.
                            </p>
                             <Button onClick={handleGenerateTranscript} disabled={isGenerating} className="mt-6">
                                {isGenerating ? (
                                    <>
                                     <Loader2 className="animate-spin" />
                                     Generating...
                                    </>
                                ) : (
                                    <>
                                     <Wand2 />
                                     Generate Transcript
                                    </>
                                )}
                            </Button>
                        </Card>
                    </div>
                );
            case 'success':
                return (
                    <div>
                        <Card className="mb-8 overflow-hidden">
                           <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="relative w-full md:w-48 aspect-video flex-shrink-0 rounded-lg overflow-hidden">
                                        {videoInfo && (
                                            <Image src={videoInfo.thumbnailUrl} alt={videoInfo.title} layout="fill" objectFit="cover" />
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold">{videoInfo?.title}</h3>
                                        <div className="mt-4 flex gap-2">
                                            <Button variant="outline" onClick={handleBack}>Analyze New Video</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {transcript.length > 0 && (
                            <Accordion type="single" collapsible className="w-full mb-8">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>View & Search Full Transcript</AccordionTrigger>
                                    <AccordionContent>
                                      <div className="p-1">
                                          <Input
                                            placeholder="Search transcript..."
                                            value={transcriptQuery}
                                            onChange={(e) => setTranscriptQuery(e.target.value)}
                                            className="mb-4"
                                          />
                                          <ScrollArea className="h-72 w-full rounded-md border p-4">
                                              {filteredTranscript.length > 0 ? (
                                                filteredTranscript.map((item, index) => (
                                                  <p key={index} className="mb-3 text-sm leading-relaxed">
                                                      <span className="font-mono text-xs text-muted-foreground mr-3 bg-background p-1 rounded">
                                                          {formatTime(item.offset / 1000)}
                                                      </span>
                                                      {highlightText(item.text, transcriptQuery)}
                                                  </p>
                                                ))
                                              ) : (
                                                <p className="text-sm text-muted-foreground text-center">
                                                  No results found for "{transcriptQuery}"
                                                </p>
                                              )}
                                          </ScrollArea>
                                      </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}
                        
                        {selectedClip ? (
                             <ClippingForm
                                youtubeUrl={url}
                                prefillData={{
                                    startTime: selectedClip.startTimeString,
                                    endTime: selectedClip.endTimeString,
                                    title: selectedClip.title,
                                }}
                                onUploadSuccess={onUploadSuccess}
                                onCancel={() => setSelectedClip(null)}
                            />
                        ) : showManualForm ? (
                             <ClippingForm
                                youtubeUrl={url}
                                onUploadSuccess={onUploadSuccess}
                                onCancel={() => setShowManualForm(false)}
                            />
                        ) : (
                            <div>
                                <div className="text-center">
                                  <h3 className="text-2xl font-bold tracking-tight mb-2">AI Clip Suggestions</h3>
                                  <p className="text-muted-foreground mb-6">Here are the best moments found by our AI. Pick one to get started.</p>
                                </div>
                                <Card className="mb-6 p-4">
                                   <label htmlFor="custom-instructions" className="text-sm font-medium text-muted-foreground">Give the AI specific instructions (optional)</label>
                                   <Textarea
                                        id="custom-instructions"
                                        placeholder="e.g., Find a moment where the guest talks about their first job"
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        className="mt-2"
                                   />
                                   <Button onClick={findClipsAgain} disabled={isAnalyzing} className="mt-2 w-full sm:w-auto">
                                       {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                       Re-analyze
                                   </Button>
                                </Card>
                                
                                {suggestions.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {suggestions.map((clip, index) => (
                                            <Card key={index} className="flex flex-col">
                                                <CardHeader>
                                                    <CardTitle className="text-lg">{clip.title}</CardTitle>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                                                        <span>{clip.startTimeString} - {clip.endTimeString}</span>
                                                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                                                            <Star className="h-4 w-4" /> {clip.viralityScore}/10
                                                        </span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                    <p className="text-sm text-muted-foreground">{clip.summary}</p>
                                                    <div className="mt-3 p-3 bg-background/50 rounded-md border text-sm">
                                                        <p><span className="font-semibold text-foreground">AI Reasoning:</span> {clip.reasoning}</p>
                                                    </div>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button className="w-full" onClick={() => handleSelectClip(clip)}>
                                                        <Scissors className="mr-2 h-4 w-4" />
                                                        Create this Clip
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                     <Card className="text-center p-8">
                                        <h3 className="text-lg font-semibold">AI Could Not Find Suggestions</h3>
                                        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                                            The AI analyzed the transcript but couldn't find any clear clip suggestions. You can try giving it different instructions or create a clip manually.
                                        </p>
                                    </Card>
                                )}
                                
                                <div className="text-center mt-8 border-t pt-6">
                                    <Button variant="outline" onClick={() => setShowManualForm(true)}>
                                        <Scissors className="mr-2 h-4 w-4" />
                                        Create a clip manually instead
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'error':
                 return (
                    <Card className="text-center p-8 border-destructive">
                         <h3 className="text-lg font-semibold text-destructive">Process Failed</h3>
                         <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                         <Button onClick={handleBack} className="mt-4">Try Again</Button>
                    </Card>
                 );
            case 'idle':
            default:
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Analyze a YouTube Video</CardTitle>
                            <CardDescription>Paste a YouTube URL to find the best moments for viral clips.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Input
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                    disabled={isAnalyzing}
                                    className="text-base"
                                />
                                <div>
                                   <label htmlFor="custom-instructions-initial" className="text-sm font-medium text-muted-foreground">Give the AI specific instructions (optional)</label>
                                   <Textarea
                                        id="custom-instructions-initial"
                                        placeholder="e.g., Find a moment where the guest gets emotional"
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        className="mt-2"
                                        disabled={isAnalyzing}
                                   />
                                </div>
                                <Button onClick={handleAnalyze} disabled={!url || isAnalyzing} className="w-full">
                                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                    Analyze Video
                                </Button>
                            </div>
                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">AI Podcast Clipper</h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        Let AI find the most viral-worthy clips from any YouTube video and turn them into Shorts, Reels, or TikToks.
                    </p>
                </div>
                {renderContent()}
            </div>
        </div>
    );
}

    