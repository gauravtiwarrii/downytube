'use server';

import { optimizeYouTubeTags, OptimizeYouTubeTagsInput } from '@/ai/flows/optimize-youtube-tags';
import ytdl from 'ytdl-core';
import type { Video } from '@/types';

export async function getOptimizedTags(data: OptimizeYouTubeTagsInput) {
  try {
    const result = await optimizeYouTubeTags(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error optimizing tags:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getVideoMetadata(url: string) {
  try {
    if (!ytdl.validateURL(url)) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;

    const newVideo: Video = {
      id: videoDetails.videoId,
      title: videoDetails.title,
      description: videoDetails.description || 'No description available.',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoDetails.videoId}/hqdefault.jpg`,
      youtubeUrl: videoDetails.video_url,
      tags: videoDetails.keywords || [],
      videoUrl: '#',
    };

    return {
      success: true,
      data: newVideo,
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching video metadata.';
    return { success: false, error: errorMessage };
  }
}
