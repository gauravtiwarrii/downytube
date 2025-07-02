'use client';

import { useState, useEffect } from 'react';
import type { Video } from '@/types';
import Header from '@/components/layout/Header';
import UrlForm from '@/components/features/UrlForm';
import VideoGrid from '@/components/features/VideoGrid';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    try {
      const storedVideos = localStorage.getItem('downytube-videos');
      if (storedVideos) {
        setVideos(JSON.parse(storedVideos));
      }
    } catch (error) {
      console.error('Failed to parse videos from localStorage', error);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('downytube-videos', JSON.stringify(videos));
    }
  }, [videos, isMounted]);

  const handleAddVideo = (video: Video) => {
    setVideos((prevVideos) => [video, ...prevVideos]);
  };

  const handleDeleteVideo = (id: string) => {
    setVideos((prevVideos) => prevVideos.filter((video) => video.id !== id));
  };

  const handleUpdateVideo = (id: string, updates: Partial<Video>) => {
    setVideos((prevVideos) =>
      prevVideos.map((video) =>
        video.id === id ? { ...video, ...updates } : video
      )
    );
  };
  
  if (!isMounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto mb-12">
          <UrlForm onAddVideo={handleAddVideo} existingIds={videos.map(v => v.id)} />
        </div>
        <VideoGrid
          videos={videos}
          onDeleteVideo={handleDeleteVideo}
          onUpdateVideo={handleUpdateVideo}
        />
      </main>
    </div>
  );
}
