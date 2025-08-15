'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Info, Download, Pencil, Copy, Image as ImageIcon, Upload, ExternalLink, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOptimizedTags, getDownloadUrl, getRewrittenDetails, getGeneratedThumbnail, uploadToYouTube, checkAuthStatus } from '@/app/actions';
import type { Video } from '@/types';

type VideoDetailsModalProps = {
  video: Video;
  onUpdateVideo: (id: string, updates: Partial<Video>) => void;
};

const VideoDetailsModal = ({ video, onUpdateVideo }: VideoDetailsModalProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [watermark, setWatermark] = useState(video.watermarkText || '');
  const [thumbnailPrompt, setThumbnailPrompt] = useState(video.thumbnailPrompt || '');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      checkAuthStatus().then(setIsAuthenticated);
    }
  }, [open]);

  const handleCopy = (text: string | string[] | undefined, toastDescription: string) => {
    if (!text || (Array.isArray(text) && text.length === 0)) {
      toast({
        variant: 'destructive',
        title: 'Nothing to Copy',
        description: 'The content is empty.',
      });
      return;
    }

    const textToCopy = Array.isArray(text) ? text.join(',') : text;

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: 'Copied to Clipboard',
        description: toastDescription,
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy text to the clipboard.',
      });
    });
  };

  const handleOptimizeTags = async () => {
    setIsOptimizing(true);
    const result = await getOptimizedTags({
      title: video.title,
      description: video.description,
      existingTags: video.tags,
    });
    setIsOptimizing(false);

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
  
  const handleRewriteDetails = async () => {
    setIsRewriting(true);
    const result = await getRewrittenDetails({
      title: video.title,
      description: video.description,
    });
    setIsRewriting(false);

    if (result.success && result.data) {
      onUpdateVideo(video.id, {
        rewrittenTitle: result.data.rewrittenTitle,
        rewrittenDescription: result.data.rewrittenDescription,
      });
      toast({
        title: 'Rewrite Complete',
        description: 'The title and description have been rewritten by AI.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Rewrite Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };

  const handleGenerateThumbnail = async () => {
    setIsGeneratingThumbnail(true);
    const result = await getGeneratedThumbnail({
      title: video.rewrittenTitle || video.title,
      description: video.rewrittenDescription || video.description,
      existingThumbnailUrl: video.thumbnailUrl,
      customPrompt: thumbnailPrompt,
    });
    setIsGeneratingThumbnail(false);

    if (result.success && result.data) {
      onUpdateVideo(video.id, {
        thumbnailUrl: result.data.thumbnailDataUri,
        thumbnailPrompt: result.data.revisedPrompt,
      });
      toast({
        title: 'Thumbnail Generated',
        description: 'A new AI-powered thumbnail has been generated.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Thumbnail Generation Failed',
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
        const safeTitle = result.data.title.replace(/[^a-z0-9_.-]/gi, '_');
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

  const handleDownloadThumbnail = () => {
    try {
      const link = document.createElement('a');
      link.href = video.thumbnailUrl;
      const safeTitle = (video.rewrittenTitle || video.title).replace(/[^a-z0-9_.-]/gi, '_');

      let extension = 'jpg';
      if (video.thumbnailUrl.startsWith('data:image/png')) {
        extension = 'png';
      } else if (video.thumbnailUrl.startsWith('data:image/jpeg')) {
        extension = 'jpg';
      } else if (video.thumbnailUrl.startsWith('data:image/webp')) {
        extension = 'webp';
      }

      link.setAttribute('download', `${safeTitle}_thumbnail.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast({
        title: 'Download Started',
        description: `Downloading thumbnail for "${video.rewrittenTitle || video.title}".`,
      });
    } catch (error) {
      console.error("Failed to download thumbnail:", error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not trigger the thumbnail download in your browser.',
      });
    }
  };

  const handleApplyWatermark = () => {
    onUpdateVideo(video.id, { watermarkText: watermark });
    toast({
      title: 'Watermark Applied',
      description: 'The watermark will be burned into the video during the YouTube upload.',
    });
  };

  const handleUploadToYouTube = async () => {
    setIsUploading(true);
    const result = await uploadToYouTube(video);
    setIsUploading(false);

    if (result.success) {
      toast({
        title: 'Upload Successful!',
        description: 'Your video has been uploaded to YouTube.',
        action: (
          <a href={result.data.youtubeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Video
            </Button>
          </a>
        )
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: result.error,
      });
    }
  };


  const currentTitle = video.rewrittenTitle || video.title;
  const currentDescription = video.rewrittenDescription || video.description;
  const isAiBusy = isRewriting || isOptimizing || isGeneratingThumbnail || isUploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle>{currentTitle}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => handleCopy(currentTitle, 'The title has been copied.')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            View video details, download, and use AI tools.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          <Accordion type="single" collapsible defaultValue="description">
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent>
                <div className="relative">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap pr-10">
                    {currentDescription}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 right-0"
                    onClick={() => handleCopy(currentDescription, 'The description has been copied.')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tags">
              <AccordionTrigger>Original Tags</AccordionTrigger>
              <AccordionContent>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 pr-10">
                    {video.tags.length > 0 ? (
                      video.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No original tags found.</p>
                    )}
                  </div>
                  {video.tags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 right-0"
                      onClick={() => handleCopy(video.tags, 'The original tags have been copied.')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="rounded-lg border bg-card/50 p-4 space-y-4">
            <div>
                <h4 className="font-semibold text-foreground">AI Thumbnail Generator</h4>
                <p className="text-sm text-muted-foreground">
                    Describe your ideal thumbnail and let the AI create it.
                </p>
            </div>
            <Textarea
              placeholder="e.g., A dramatic shot of a programmer, code on the screen reflecting in their glasses, with a cinematic, blue-toned lighting."
              value={thumbnailPrompt}
              onChange={(e) => setThumbnailPrompt(e.target.value)}
              className="text-sm"
              rows={3}
            />
            {video.thumbnailPrompt && (
                <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-md border">
                    <p className="font-semibold mb-1">Last prompt used by AI:</p>
                    <p className="italic">"{video.thumbnailPrompt}"</p>
                </div>
            )}
            <div className="flex gap-2">
              <Button
                className="w-full"
                onClick={handleGenerateThumbnail}
                disabled={isAiBusy}
              >
                {isGeneratingThumbnail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                Generate Thumbnail
              </Button>
               <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadThumbnail}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card/50 p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-foreground">AI Content Rewriter</h4>
                <p className="text-sm text-muted-foreground">
                  Use AI to improve the title and description for engagement.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleRewriteDetails}
                disabled={isAiBusy}
              >
                {isRewriting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                Rewrite
              </Button>
            </div>
          </div>

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
                disabled={isAiBusy}
              >
                {isOptimizing ? (
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
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium text-sm">Optimized Tags</h5>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(video.optimizedTags, 'The optimized tags have been copied.')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
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
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h4 className="font-semibold text-foreground">Add Watermark</h4>
                <p className="text-sm text-muted-foreground">
                  Enter text to burn into the video upon upload.
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Your watermark text..."
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  className="w-48"
                />
                <Button
                  size="sm"
                  onClick={handleApplyWatermark}
                  disabled={!watermark || watermark === video.watermarkText}
                >
                  Apply
                </Button>
              </div>
            </div>
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

          <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 space-y-2">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h4 className="font-semibold text-primary-foreground">Upload to YouTube</h4>
                <p className="text-sm text-muted-foreground">
                  {isAuthenticated
                    ? 'Automatically upload the video with all AI enhancements.'
                    : 'Connect your YouTube account to enable uploads.'}
                </p>
              </div>
              {isAuthenticated ? (
                <Button
                  size="sm"
                  onClick={handleUploadToYouTube}
                  disabled={isAiBusy || isDownloading}
                  variant="default"
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
              ) : (
                <a href="/api/auth/google/login">
                  <Button size="sm" variant="default">
                    <LogIn className="mr-2 h-4 w-4" />
                    Connect to Upload
                  </Button>
                </a>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoDetailsModal;
