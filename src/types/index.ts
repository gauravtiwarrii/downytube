export interface Video {
  id: string;
  youtubeUrl: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string; // This will be a mock URL
  tags: string[];
  optimizedTags?: string[];
  reasoning?: string;
  rewrittenTitle?: string;
  rewrittenDescription?: string;
  watermarkText?: string;
}
