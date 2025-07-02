'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import ClippingForm from '@/components/features/ClippingForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzeVideoForClips } from '@/app/actions';
import { Loader2, Scissors, Wand2, Star } from 'lucide-react';
import type { Video, TranscriptItem } from '@/types';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/utils';


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

type AnalysisState = 'idle' | 'loading' | 'success' | 'error';

export default function ClippingPage() {
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<Video | null>(null);
    const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
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

        const result = await analyzeVideoForClips(url);

        if (result.success && result.data) {
            setVideoInfo(result.data.video);
            setSuggestions(result.data.suggestions);
            setTranscript(result.data.transcript);
            setAnalysisState('success');
            if (result.data.transcriptError) {
                toast({
                    variant: 'destructive',
                    title: 'AI Analysis Skipped',
                    description: result.data.transcriptError,
                    duration: 7000,
                });
                setShowManualForm(true); // Go straight to manual form
            } else {
                toast({ title: 'Analysis Complete!', description: 'AI has found some viral clip ideas for you.' });
            }
        } else {
            setError(result.error || 'An unknown error occurred.');
            setAnalysisState('error');
            setVideoInfo(null);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
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
    }
    
    const onUploadSuccess = (finalUrl: string) => {
        toast({ title: "Clip Uploaded!", description: "You can create another clip from the same video or start over."});
        setUploadedClipUrl(finalUrl);
        setSelectedClip(null); 
    }

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
                            AI is scanning the transcript for viral moments. This may take a moment.
                        </p>
                    </Card>
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
                                    <AccordionTrigger>View Full Transcript</AccordionTrigger>
                                    <AccordionContent>
                                        <ScrollArea className="h-72 w-full rounded-md border p-4">
                                            {transcript.map((item, index) => (
                                                <p key={index} className="mb-3 text-sm">
                                                    <span className="font-mono text-xs text-muted-foreground mr-3 bg-background/50 p-1 rounded">
                                                        {formatTime(item.offset / 1000)}
                                                    </span>
                                                    {item.text}
                                                </p>
                                            ))}
                                        </ScrollArea>
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
                                <h3 className="text-2xl font-bold tracking-tight text-center mb-2">AI Clip Suggestions</h3>
                                <p className="text-muted-foreground text-center mb-6">Here are the best moments found by our AI. Pick one to get started.</p>
                                
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
                                        <h3 className="text-lg font-semibold">AI Analysis Skipped</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            A transcript could not be found for this video. You can still create a clip manually.
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
                         <h3 className="text-lg font-semibold text-destructive">Analysis Failed</h3>
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
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                    disabled={analysisState === 'loading'}
                                    className="text-base"
                                />
                                <Button onClick={handleAnalyze} disabled={!url || analysisState === 'loading'} className="w-full sm:w-auto">
                                    {analysisState === 'loading' ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                    Analyze Video
                                </Button>
                            </div>
                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                             <div className="text-center mt-6">
                                <Button variant="link" onClick={() => { setAnalysisState('success'); setShowManualForm(true); setVideoInfo(null) }}>
                                    Or, skip analysis and clip manually
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight">AI Podcast Clipper</h2>
                        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                           Let AI find the most viral-worthy clips from any YouTube video and turn them into Shorts, Reels, or TikToks.
                        </p>
                    </div>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
