import type { Video } from '@/types';
import VideoCard from './VideoCard';
import { FileQuestion } from 'lucide-react';

type VideoGridProps = {
  videos: Video[];
  onDeleteVideo: (id: string) => void;
  onUpdateVideo: (id: string, updates: Partial<Video>) => void;
};

const VideoGrid = ({ videos, onDeleteVideo, onUpdateVideo }: VideoGridProps) => {
  if (videos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <FileQuestion className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-lg font-semibold">No Videos Yet</h3>
        <p className="mt-1 text-sm">
          Paste a YouTube URL above to start downloading.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onDeleteVideo={onDeleteVideo}
          onUpdateVideo={onUpdateVideo}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
