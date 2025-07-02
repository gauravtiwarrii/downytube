'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Info, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOptimizedTags, getDownloadUrl } from '@/app/actions';
import type { Video } from '@/types';

type VideoDetailsModalProps = {
  video: Video;
  onUpdateVideo: (id: string, updates: Partial<Video>) => void;
};

const VideoDetailsModal = ({ video, onUpdateVideo }: VideoDetailsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleOptimizeTags = async () => {
    setIsLoading(true);
    const result = await getOptimizedTags({
      title: video.title,
      description: video.description,
      existingTags: video.tags,
    });
    setIsLoading(false);

    if (result.success && result.data) {
      onUpdateVideo(video.id, {
        optimizedTags: result.data.optimizedTags,
        reasoning: result.data.reasoning,
      });
      toast({
        title: 'Optimization Complete',
        description: 'New AI-powered tags have been generated.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Optimization Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };

  const handleDownloadVideo = async () => {
    setIsDownloading(true);
    const result = await getDownloadUrl(video.youtubeUrl);

    if (result.success && result.data) {
      try {
        const link = document.createElement('a');
        link.href = result.data.downloadUrl;
        const safeTitle = result.data.title.replace(/[^a-z0-9_\-. ]/gi, '_');
        link.setAttribute('download', `${safeTitle}.mp4`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        toast({
          title: 'Download Started',
          description: `Downloading "${result.data.title}".`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: 'Could not trigger the download in your browser.',
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
    setIsDownloading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
          <DialogDescription>
            View video details and optimize tags with AI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          <Accordion type="single" collapsible defaultValue="description">
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                {video.description}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tags">
              <AccordionTrigger>Original Tags</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="rounded-lg border bg-card/50 p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-foreground">AI Tag Optimizer</h4>
                <p className="text-sm text-muted-foreground">
                  Generate SEO-friendly tags to improve discovery.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOptimizeTags}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4 text-accent" />
                )}
                Optimize
              </Button>
            </div>
            
            {video.optimizedTags && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h5 className="font-medium text-sm">Optimized Tags</h5>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {video.optimizedTags.map((tag) => (
                      <Badge key={tag} variant="default" className="bg-primary/20 text-primary-foreground border-primary/50 hover:bg-primary/30">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" /> Reasoning
                  </h5>
                  <p className="text-sm text-muted-foreground mt-2 bg-background/50 p-3 rounded-md border">
                    {video.reasoning}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card/50 p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-foreground">Download Video</h4>
                <p className="text-sm text-muted-foreground">
                  Download the video file in the highest available quality with audio.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadVideo}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoDetailsModal;
