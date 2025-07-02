'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Scissors } from 'lucide-react';
import { generateAndUploadClip } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const timeStringToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number);
    if (parts.length === 2) { // MM:SS
        return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) { // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return NaN;
};

const FormSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).refine(
    (url) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      return youtubeRegex.test(url);
    },
    { message: 'Please enter a valid YouTube URL.' }
  ),
  startTime: z.string().regex(/^\d{1,3}:\d{2}(:\d{2})?$/, { message: 'Use MM:SS or HH:MM:SS format.' }),
  endTime: z.string().regex(/^\d{1,3}:\d{2}(:\d{2})?$/, { message: 'Use MM:SS or HH:MM:SS format.' }),
  title: z.string().min(1, 'Title is required.').max(100, 'Title must be 100 characters or less.'),
  description: z.string().optional(),
}).refine(data => timeStringToSeconds(data.startTime) < timeStringToSeconds(data.endTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
});

type ClippingFormProps = {
  onUploadSuccess: (url: string) => void;
};

const ClippingForm = ({ onUploadSuccess }: ClippingFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: '', startTime: '00:00', endTime: '00:30', title: '', description: '' },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    toast({
        title: 'Processing Clip...',
        description: 'This may take several minutes depending on the clip length. Please do not navigate away.',
        duration: 300000,
    });

    const result = await generateAndUploadClip({
        youtubeUrl: data.url,
        startTime: data.startTime,
        endTime: data.endTime,
        title: data.title,
        description: data.description || '',
    });

    setIsLoading(false);

    if (result.success && result.data?.youtubeUrl) {
      toast({
        title: 'Upload Complete!',
        description: 'Your clip has been successfully uploaded to YouTube.',
      });
      onUploadSuccess(result.data.youtubeUrl);
    } else {
      toast({
        variant: 'destructive',
        title: 'Clipping Failed',
        description: result.error || 'An unknown error occurred during clipping or upload.',
        duration: 9000,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Clip</CardTitle>
        <CardDescription>Provide video details and the time range to clip.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input placeholder="MM:SS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input placeholder="MM:SS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clip Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Awesome Clip Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clip Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a description and hashtags..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating and Uploading...
                </>
              ) : (
                <>
                  <Scissors />
                  Create and Upload Clip
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ClippingForm;
