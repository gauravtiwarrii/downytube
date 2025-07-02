'use server';

import { optimizeYouTubeTags, OptimizeYouTubeTagsInput } from '@/ai/flows/optimize-youtube-tags';
import { rewriteVideoDetails, RewriteVideoDetailsInput } from '@/ai/flows/rewrite-video-details';
import { generateThumbnail, GenerateThumbnailInput } from '@/ai/flows/generate-thumbnail';
import { getYouTubeClient, getTokensFromCookie } from '@/lib/youtube-auth';
import ytdl from '@distube/ytdl-core';
import type { Video } from '@/types';
import { Readable } from 'stream';


export async function checkAuthStatus() {
  const tokens = await getTokensFromCookie();
  return !!tokens;
}

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

export async function getRewrittenDetails(data: RewriteVideoDetailsInput) {
  try {
    const result = await rewriteVideoDetails(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error rewriting details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getGeneratedThumbnail(data: GenerateThumbnailInput) {
  try {
    const result = await generateThumbnail(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
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

    if (!info || !info.videoDetails) {
      return { success: false, error: 'Could not retrieve video details.' };
    }

    const videoDetails = info.videoDetails;

    const newVideo: Video = {
      id: videoDetails.videoId,
      title: videoDetails.title || 'No title available',
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
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while fetching video metadata.';
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

async function imageUrlToDataUri(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(blob).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("Error converting image URL to data URI:", error);
        throw new Error("Could not process the thumbnail image.");
    }
}

function dataUriToReadableStream(dataUri: string): Readable {
  const base64Data = dataUri.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signal the end of the stream
  return stream;
}

export async function uploadToYouTube(video: Video) {
  try {
    const youtube = await getYouTubeClient();

    // 1. Get video stream
    const videoStream = ytdl(video.youtubeUrl, { 
      filter: 'videoandaudio',
      quality: 'highest' 
    });

    // 2. Upload video
    const videoResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: video.rewrittenTitle || video.title,
          description: video.rewrittenDescription || video.description,
          tags: video.optimizedTags || video.tags,
          categoryId: '22', // Default category, e.g., 'People & Blogs'
        },
        status: {
          privacyStatus: 'private', // or 'public', 'unlisted'
        },
      },
      media: {
        body: videoStream,
      },
    });

    const videoId = videoResponse.data.id;
    if (!videoId) {
      throw new Error('Failed to get video ID after upload.');
    }

    // 3. Upload thumbnail
    let thumbnailDataUri = video.thumbnailUrl;
    if (!thumbnailDataUri.startsWith('data:')) {
      thumbnailDataUri = await imageUrlToDataUri(thumbnailDataUri);
    }
    
    const thumbnailStream = dataUriToReadableStream(thumbnailDataUri);
    await youtube.thumbnails.set({
      videoId: videoId,
      media: {
        mimeType: thumbnailDataUri.substring(thumbnailDataUri.indexOf(':') + 1, thumbnailDataUri.indexOf(';')),
        body: thumbnailStream,
      },
    });

    return { success: true, data: { videoId: videoId, youtubeUrl: `https://www.youtube.com/watch?v=${videoId}` } };
  } catch (error) {
    console.error('Error uploading to YouTube:', error);
    let errorMessage = 'An unknown error occurred during upload.';
    if (error instanceof Error) {
        if (error.message === 'NOT_AUTHENTICATED') {
            errorMessage = 'You are not connected to a YouTube account. Please connect your account first.'
        } else {
            errorMessage = error.message;
        }
    }
    return { success: false, error: errorMessage };
  }
}
