'use server';

import { optimizeYouTubeTags, OptimizeYouTubeTagsInput } from '@/ai/flows/optimize-youtube-tags';
import ytdl from '@distube/ytdl-core';
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

    const description =
      (typeof videoDetails.description === 'object' && videoDetails.description !== null
        ? (videoDetails.description as any)?.simpleText
        : videoDetails.description) || 'No description available.';

    const newVideo: Video = {
      id: videoDetails.videoId,
      title: videoDetails.title,
      description: description,
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

export async function getDownloadUrl(url: string) {
  try {
    if (!ytdl.validateURL(url)) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: 'videoandaudio',
    });
    
    if (!format.url) {
      return {
        success: false,
        error: 'Could not find a downloadable format with both video and audio. This can happen with some high-quality or protected videos.',
      };
    }
    return {
      success: true,
      data: { downloadUrl: format.url, title: info.videoDetails.title },
    };
  } catch (error) {
    console.error('Error fetching download URL:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while fetching the download URL.';
    return { success: false, error: errorMessage };
  }
}
