'use server';

import { optimizeYouTubeTags, OptimizeYouTubeTagsInput } from '@/ai/flows/optimize-youtube-tags';
import { rewriteVideoDetails, RewriteVideoDetailsInput } from '@/ai/flows/rewrite-video-details';
import { generateThumbnail, GenerateThumbnailInput } from '@/ai/flows/generate-thumbnail';
import { findViralClips, FindViralClipsInput } from '@/ai/flows/find-viral-clips';
import { generateTranscript } from '@/ai/flows/generate-transcript';
import { generateSocialPost, GenerateSocialPostInput } from '@/ai/flows/generate-social-post';
import { generateViralIdeas, GenerateViralIdeasInput } from '@/ai/flows/generate-viral-ideas';
import { generateABTests, GenerateABTestsInput } from '@/ai/flows/generate-ab-tests';
import { getYouTubeClient, checkAuthStatus as checkAuthStatusFromLib, getGoogleUserInfo } from '@/lib/youtube-auth';
import { formatTime, extractVideoId, parseISO8601Duration } from '@/lib/utils';
import ytdl from '@distube/ytdl-core';
import type { Video, TranscriptItem } from '@/types';
import { PassThrough, Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { YoutubeTranscript } from 'youtube-transcript';
import { redirect } from 'next/navigation';


export async function checkAuthStatus() {
  return checkAuthStatusFromLib();
}

export async function getAuthenticatedUser() {
    try {
        const user = await getGoogleUserInfo();
        if (!user || !user.name || !user.email || !user.picture) {
            return { success: false, error: 'User not found or missing details.' };
        }
        return { success: true, data: { name: user.name, email: user.email, picture: user.picture } };
    } catch(error) {
        console.error("Error in getAuthenticatedUser action", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
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

export async function getSocialPost(data: GenerateSocialPostInput) {
  try {
    const result = await generateSocialPost(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating social post:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getViralIdeas(data: GenerateViralIdeasInput) {
  try {
    const result = await generateViralIdeas(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating viral ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getABTestIdeas(data: GenerateABTestsInput) {
  try {
    const result = await generateABTests(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating A/B test ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getVideoMetadata(url: string) {
  try {
    const youtube = await getYouTubeClient({ forceRedirect: true });
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }

    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      return { success: false, error: 'Video not found or access is denied.' };
    }
    const videoDetails = response.data.items[0].snippet;

    const newVideo: Video = {
      id: videoId,
      title: videoDetails?.title || 'No title available',
      description: videoDetails?.description || 'No description available.',
      thumbnailUrl: videoDetails?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      tags: videoDetails?.tags || [],
      videoUrl: '#',
    };

    return { success: true, data: newVideo };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching video metadata.';
    if (errorMessage.includes('NOT_AUTHENTICATED')) {
        redirect('/login');
    }
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
    const youtube = await getYouTubeClient({ forceRedirect: true });

    const ytdlStream = ytdl(video.youtubeUrl, {
      filter: 'videoandaudio',
      quality: 'highest',
      dlChunkSize: 0,
    });

    let streamToUpload: Readable = ytdlStream;
    let ffmpegError: Error | null = null;

    if (video.watermarkText) {
      const passThrough = new PassThrough();
      
      const ffmpegCommand = ffmpeg(ytdlStream)
        .videoFilter(
          `drawtext=text='${video.watermarkText.replace(/'/g, "''")}':x=10:y=H-th-10:fontsize=36:fontcolor=white@0.8:shadowcolor=black@0.5:shadowx=2:shadowy=2`
        )
        .format('mp4')
        .addOutputOptions('-movflags', 'frag_keyframe+empty_moov')
        .on('error', (err) => {
          console.error('FFmpeg Error:', err.message);
          ffmpegError = new Error(`FFmpeg error: ${err.message}. Make sure ffmpeg is installed on the server environment.`);
          passThrough.destroy(ffmpegError);
        });

      streamToUpload = ffmpegCommand.pipe(passThrough, { end: true });
    }

    // 1. Upload video
    const videoResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: video.rewrittenTitle || video.title,
          description: video.rewrittenDescription || video.description,
          tags: video.optimizedTags || video.tags,
          categoryId: '22',
        },
        status: {
          privacyStatus: 'private',
        },
      },
      media: {
        body: streamToUpload,
      },
    });

    if (ffmpegError) {
      throw ffmpegError;
    }

    const videoId = videoResponse.data.id;
    if (!videoId) {
      throw new Error('Failed to get video ID after upload.');
    }

    // 2. Upload thumbnail
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
        if (error.message.includes('NOT_AUTHENTICATED')) {
            errorMessage = 'You are not connected to a YouTube account. Please connect your account first.'
        } else {
            errorMessage = error.message;
        }
    }
    if (errorMessage.includes('NOT_AUTHENTICATED')) {
        redirect('/login');
    }
    return { success: false, error: errorMessage };
  }
}

const timeStringToSeconds = (time: string): number => {
    const parts = time.split(':').map(part => parseInt(part, 10));
    if (parts.length === 2) { // MM:SS
        return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) { // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return NaN;
};

export async function analyzeVideoForClips(url: string, customInstructions?: string) {
  let video: Video;
  const metadataResult = await getVideoMetadata(url);
  if (!metadataResult.success || !metadataResult.data) {
      return { success: false, error: metadataResult.error || 'Failed to get video metadata.'};
  }
  video = metadataResult.data;

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    if (!transcript || transcript.length === 0) {
      // This is not a fatal error, we will just prompt for AI transcription.
      return {
        success: true,
        data: {
          video,
          transcript: [],
          suggestions: [],
          transcriptError: 'NEEDS_GENERATION',
        },
      };
    }

    const suggestionsResult = await findClipsFromTranscript({
      videoTitle: video.title,
      transcript: transcript.map((t) => ({ ...t, offset: t.offset, duration: t.duration })),
      customInstructions,
    });

    return {
      success: true,
      data: {
        video,
        transcript,
        suggestions: suggestionsResult.clips.map((clip) => ({
          ...clip,
          startTimeString: formatTime(clip.startTime),
          endTimeString: formatTime(clip.endTime),
        })),
        transcriptError: null,
      },
    };
  } catch (e) {
    console.error('Error fetching transcript or running AI in analyzeVideoForClips:', e);
    // This is not a fatal error for the user, just means they need to generate a transcript
    return {
      success: true,
      data: {
        video,
        transcript: [],
        suggestions: [],
        transcriptError: 'NEEDS_GENERATION',
      },
    };
  }
}

export async function findClipsFromTranscript(input: FindViralClipsInput) {
    try {
      const suggestionsResult = await findViralClips(input);
      if (!suggestionsResult || !suggestionsResult.clips) {
        throw new Error('The AI could not find any clip suggestions from the provided transcript.');
      }
      return suggestionsResult;
    } catch (error) {
        console.error('Error in findClipsFromTranscript:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown AI error occurred.';
        throw new Error(errorMessage);
    }
}

export async function getGeneratedTranscript(youtubeUrl: string) {
  try {
    const info = await ytdl.getInfo(youtubeUrl);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format) {
      return { success: false, error: 'Could not find a compatible audio-only stream for this video.' };
    }
    
    // Download the audio stream directly into a buffer
    const audioStream = ytdl(youtubeUrl, { format: format, dlChunkSize: 0 });
    
    const audioChunks: Buffer[] = [];
    for await (const chunk of audioStream) {
        audioChunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(audioChunks);

    if (audioBuffer.length === 0) {
      return { success: false, error: 'Downloaded audio was empty. The video may be protected or unavailable.' };
    }
    
    const mimeType = format.mimeType?.split(';')[0] || 'audio/mp4';
    const audioDataUri = `data:${mimeType};base64,${audioBuffer.toString('base64')}`;
    
    // Send to the AI for transcription
    const result = await generateTranscript({ audioDataUri });

    if (!result || !result.transcript) {
        throw new Error("AI failed to generate a transcript. The model may have been unable to process the audio.");
    }
    
    return { success: true, data: { transcript: result.transcript } };

  } catch (error) {
    console.error('Error in getGeneratedTranscript:', error);
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during transcript generation.';
    
    if (errorMessage.includes('Request payload size exceeds the limit')) {
      errorMessage = 'The video audio is too large for the AI to process. Please try a shorter video.';
    } else if (errorMessage.includes('Invalid media') || errorMessage.includes('403') || errorMessage.includes('Unable to process')) {
      errorMessage = 'The AI could not process the audio format from this video. This might be due to a protected video or an unsupported format. Please try a different one.';
    } else if (errorMessage.toLowerCase().includes('ffmpeg')) {
        errorMessage = `A video processing tool (ffmpeg) is required but could not be run. This is a server environment issue that cannot be fixed with code.`;
    }

    return { success: false, error: errorMessage };
  }
}

export async function generateAndUploadClip(input: {
  youtubeUrl: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
}) {
  try {
    const youtube = await getYouTubeClient({ forceRedirect: true });

    const ytdlStream = ytdl(input.youtubeUrl, {
      quality: 'highest',
      dlChunkSize: 0,
    });
    
    const passThrough = new PassThrough();
    let ffmpegError: Error | null = null;
    
    const duration = timeStringToSeconds(input.endTime) - timeStringToSeconds(input.startTime);
    if (isNaN(duration) || duration <= 0) {
        return { success: false, error: "Invalid start or end time provided." };
    }

    const ffmpegCommand = ffmpeg(ytdlStream)
      .setStartTime(input.startTime)
      .setDuration(duration)
      .withVideoFilter([
        'split[original][copy]',
        '[copy]scale=720:1280,crop=720:1280,boxblur=20[background]',
        '[original]scale=720:-1[scaled_video]',
        '[background][scaled_video]overlay=(W-w)/2:(H-h)/2'
      ])
      .withAspectRatio('9:16')
      .toFormat('mp4')
      .addOutputOptions('-movflags', 'frag_keyframe+empty_moov')
      .on('error', (err) => {
        console.error('FFmpeg Error:', err.message);
        ffmpegError = new Error(`FFmpeg error: ${err.message}. Make sure ffmpeg is installed on the server environment.`);
        passThrough.destroy(ffmpegError);
      });

    const streamToUpload = ffmpegCommand.pipe(passThrough, { end: true });

    const videoResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: input.title,
          description: input.description,
          categoryId: '22',
        },
        status: {
          privacyStatus: 'private',
        },
      },
      media: {
        body: streamToUpload,
      },
    });

    if (ffmpegError) {
      throw ffmpegError;
    }

    const videoId = videoResponse.data.id;
    if (!videoId) {
      throw new Error('Failed to get video ID after upload.');
    }
    
    return { 
        success: true, 
        data: { 
            videoId: videoId, 
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}` 
        } 
    };
  } catch (error) {
    console.error('Error generating or uploading clip:', error);
    let errorMessage = 'An unknown error occurred during the process.';
    if (error instanceof Error) {
        if (error.message.includes('NOT_AUTHENTICATED')) {
            errorMessage = 'You are not connected to a YouTube account. Please connect your account first.'
        } else {
            errorMessage = error.message;
        }
    }
    if (errorMessage.includes('NOT_AUTHENTICATED')) {
        redirect('/login');
    }
    return { success: false, error: errorMessage };
  }
}

function extractChannelInfoFromUrl(url: string): { id?: string; username?: string; handle?: string } {
    if (!url) return {};
    // Match /channel/UC...
    const channelIdMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelIdMatch?.[1]) {
        return { id: channelIdMatch[1] };
    }
    // Match /c/Username or /user/Username
    const usernameMatch = url.match(/youtube\.com\/(?:c\/|user\/)([a-zA-Z0-9_-]+)/);
    if (usernameMatch?.[1]) {
        return { username: usernameMatch[1] };
    }
    // Match /@Handle
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch?.[1]) {
        return { handle: `@${handleMatch[1]}` };
    }
    return {};
}

export async function getChannelVideos(channelUrl: string) {
  try {
    const youtube = await getYouTubeClient({ forceRedirect: true });
    const { id, username, handle } = extractChannelInfoFromUrl(channelUrl);

    if (!id && !username && !handle) {
      return { success: false, error: 'Invalid or unsupported channel URL format. Please use a full channel URL.' };
    }

    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      ...(id && { id: [id] }),
      ...(username && { forUsername: username }),
      ...(handle && { forHandle: handle }),
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel?.contentDetails?.relatedPlaylists?.uploads) {
      return { success: false, error: 'Could not find the specified YouTube channel or its videos.' };
    }

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    const playlistItemsResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 25, // Limiting to 25 to prevent timeouts and long load times.
    });
    
    if (!playlistItemsResponse.data.items) {
      return { success: true, data: [] }; // Channel exists but has no videos
    }

    const videos: Video[] = playlistItemsResponse.data.items.map(item => {
      const snippet = item.snippet!;
      const videoId = snippet.resourceId?.videoId!;
      return {
        id: videoId,
        title: snippet.title || 'No Title',
        description: snippet.description || 'No Description',
        thumbnailUrl: snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        tags: [], // Tags aren't returned in playlistItems, would require extra API calls.
        videoUrl: '#',
      };
    }).filter(video => video.id); // Filter out any items that might not be videos

    return { success: true, data: videos };

  } catch (error: any) {
    console.error('Error fetching channel videos:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error.message) {
      if (error.message.includes('noLinkedYouTubeAccount')) {
        errorMessage = 'The provided channel URL does not seem to be associated with a valid YouTube channel.';
      } else {
        errorMessage = error.message;
      }
    }
    if (error.message?.includes('NOT_AUTHENTICATED')) {
        redirect('/login');
    }
    return { success: false, error: errorMessage };
  }
}

export async function getChannelShorts(channelUrl: string) {
  try {
    const youtube = await getYouTubeClient({ forceRedirect: true });
    const { id, username, handle } = extractChannelInfoFromUrl(channelUrl);

    if (!id && !username && !handle) {
      return { success: false, error: 'Invalid or unsupported channel URL format. Please use a full channel URL.' };
    }

    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      ...(id && { id: [id] }),
      ...(username && { forUsername: username }),
      ...(handle && { forHandle: handle }),
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel?.contentDetails?.relatedPlaylists?.uploads) {
      return { success: false, error: 'Could not find the specified YouTube channel or its videos.' };
    }

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    const playlistItemsResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
    });
    
    if (!playlistItemsResponse.data.items || playlistItemsResponse.data.items.length === 0) {
      return { success: true, data: [] };
    }

    const videoIds = playlistItemsResponse.data.items
      .map(item => item.snippet?.resourceId?.videoId)
      .filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return { success: true, data: [] };
    }
    
    // Get contentDetails for all videos at once to check duration
    const videosResponse = await youtube.videos.list({
      part: ['contentDetails', 'snippet'],
      id: videoIds,
    });

    const shorts: Video[] = videosResponse.data.items
      ?.filter(video => {
        const duration = video.contentDetails?.duration;
        if (!duration) return false;
        const durationInSeconds = parseISO8601Duration(duration);
        return durationInSeconds > 0 && durationInSeconds <= 61; // A little buffer for 60s videos
      })
      .map(video => {
        const snippet = video.snippet!;
        const videoId = video.id!;
        return {
          id: videoId,
          title: snippet.title || 'No Title',
          description: snippet.description || 'No Description',
          thumbnailUrl: snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          tags: [],
          videoUrl: '#',
        };
      }) || [];

    return { success: true, data: shorts };

  } catch (error: any) {
    console.error('Error fetching channel shorts:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error.message) {
      if (error.message.includes('noLinkedYouTubeAccount')) {
        errorMessage = 'The provided channel URL does not seem to be associated with a valid YouTube channel.';
      } else {
        errorMessage = error.message;
      }
    }
    if (error.message?.includes('NOT_AUTHENTICATED')) {
        redirect('/login');
    }
    return { success: false, error: errorMessage };
  }
}
