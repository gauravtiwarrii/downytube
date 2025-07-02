'use server';

import { optimizeYouTubeTags, OptimizeYouTubeTagsInput } from '@/ai/flows/optimize-youtube-tags';
import { rewriteVideoDetails, RewriteVideoDetailsInput } from '@/ai/flows/rewrite-video-details';
import { generateThumbnail, GenerateThumbnailInput } from '@/ai/flows/generate-thumbnail';
import { findViralClips, FindViralClipsInput } from '@/ai/flows/find-viral-clips';
import { generateTranscript } from '@/ai/flows/generate-transcript';
import { getYouTubeClient, getTokensFromCookie } from '@/lib/youtube-auth';
import { formatTime } from '@/lib/utils';
import ytdl from '@distube/ytdl-core';
import type { Video, TranscriptItem } from '@/types';
import { PassThrough, Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { YoutubeTranscript } from 'youtube-transcript';


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

    const ytdlStream = ytdl(video.youtubeUrl, {
      filter: 'videoandaudio',
      quality: 'highest',
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

export async function analyzeVideoForClips(url: string) {
  let video: Video;
  try {
    if (!ytdl.validateURL(url)) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }

    const info = await ytdl.getInfo(url);
    if (!info || !info.videoDetails) {
      return { success: false, error: 'Could not retrieve video details.' };
    }
    const videoDetails = info.videoDetails;
    video = {
      id: videoDetails.videoId,
      title: videoDetails.title || 'No title available',
      description: videoDetails.description || 'No description available.',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoDetails.videoId}/hqdefault.jpg`,
      youtubeUrl: videoDetails.video_url,
      tags: videoDetails.keywords || [],
      videoUrl: '#',
    };
  } catch (e) {
    console.error('Error fetching video info in analyzeVideoForClips:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during video analysis.';
    return { success: false, error: errorMessage };
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    if (!transcript || transcript.length === 0) {
      throw new Error('Transcript not found or is empty');
    }

    const suggestionsResult = await findClipsFromTranscript({
      videoTitle: video.title,
      transcript: transcript.map((t) => ({ ...t, offset: t.offset, duration: t.duration })),
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
    const suggestionsResult = await findViralClips(input);

    if (!suggestionsResult || !suggestionsResult.clips) {
      throw new Error('The AI could not find any clip suggestions from the provided transcript.');
    }

    return suggestionsResult;
}

export async function getGeneratedTranscript(youtubeUrl: string) {
  try {
    // 1. Get video info and find the best audio stream
    const info = await ytdl.getInfo(youtubeUrl);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format) {
      return { success: false, error: 'Could not find a compatible audio-only format for this video.' };
    }
    
    const audioStream = ytdl.downloadFromInfo(info, { format });

    // 2. Transcode the audio stream to a compatible format (MP3) on the fly
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const passThrough = new PassThrough();
        const chunks: Buffer[] = [];

        passThrough.on('data', (chunk) => {
            chunks.push(chunk);
        });
        passThrough.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        passThrough.on('error', (err) => {
            reject(new Error(`FFmpeg error during transcription pre-processing: ${err.message}`));
        });
        
        ffmpeg(audioStream)
            .toFormat('mp3')
            .on('error', (err) => {
                // This error is often more informative
                reject(new Error(`FFmpeg error: ${err.message}. Make sure ffmpeg is installed.`));
            })
            .pipe(passThrough, { end: true });
    });
    
    // 3. Create a data URI with the correct MIME type
    const mimeType = 'audio/mpeg';
    const audioDataUri = `data:${mimeType};base64,${audioBuffer.toString('base64')}`;
    
    // 4. Send to the AI for transcription
    const result = await generateTranscript({ audioDataUri });

    if (!result || !result.transcript) {
        throw new Error("AI failed to generate a transcript.");
    }
    
    return { success: true, data: { transcript: result.transcript } };

  } catch (error) {
    console.error('Error in getGeneratedTranscript:', error);
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during transcript generation.';
    
    if (errorMessage.includes('Request payload size exceeds the limit')) {
      errorMessage = 'The video audio is too large for the AI to process. Please try a shorter video.';
    } else if (errorMessage.includes('Invalid media') || errorMessage.includes('403')) {
      errorMessage = 'The AI could not process the audio format from this video. Please try a different one.';
    } else if (errorMessage.toLowerCase().includes('ffmpeg')) {
        errorMessage = `A video processing tool (ffmpeg) is required but could not be run. This is likely a server environment issue. Details: ${errorMessage}`;
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
    const youtube = await getYouTubeClient();

    const ytdlStream = ytdl(input.youtubeUrl, {
      quality: 'highest',
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
    return { success: false, error: errorMessage };
  }
}
