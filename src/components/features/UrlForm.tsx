'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import type { Video } from '@/types';
import { getVideoMetadata } from '@/app/actions';

const FormSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).refine(
    (url) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      return youtubeRegex.test(url);
    },
    { message: 'Please enter a valid YouTube URL.' }
  ),
});

type UrlFormProps = {
  onAddVideo: (video: Video) => void;
  existingIds: string[];
};

function extractVideoId(url: string): string | null {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const UrlForm = ({ onAddVideo, existingIds }: UrlFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: '' },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    const videoId = extractVideoId(data.url);

    if (!videoId) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Could not extract video ID from the URL.',
      });
      setIsLoading(false);
      return;
    }
    
    if (existingIds.includes(videoId)) {
      toast({
        variant: 'destructive',
        title: 'Video Already Exists',
        description: 'This video is already in your download list.',
      });
      setIsLoading(false);
      return;
    }

    const result = await getVideoMetadata(data.url);

    if (result.success && result.data) {
      onAddVideo(result.data);
      toast({
        title: 'Video Added!',
        description: 'The video metadata has been fetched and added to your list.',
      });
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: result.error || 'Could not fetch video metadata.',
      });
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Paste a YouTube URL here..." {...field} />
                </FormControl>
                <Button type="submit" disabled={isLoading} className="whitespace-nowrap">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download />
                      Download
                    </>
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default UrlForm;
