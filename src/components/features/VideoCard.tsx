import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { Video } from '@/types';
import VideoDetailsModal from './VideoDetailsModal';

type VideoCardProps = {
  video: Video;
  onDeleteVideo: (id: string) => void;
  onUpdateVideo: (id: string, updates: Partial<Video>) => void;
};

const VideoCard = ({ video, onDeleteVideo, onUpdateVideo }: VideoCardProps) => {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative aspect-video">
          <Image
            src={video.thumbnailUrl}
            alt={`Thumbnail for ${video.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            data-ai-hint="video thumbnail"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
          {video.title}
        </CardTitle>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <VideoDetailsModal video={video} onUpdateVideo={onUpdateVideo} />
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDeleteVideo(video.id)}
          aria-label="Delete video"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VideoCard;
