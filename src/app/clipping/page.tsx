'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import ClippingForm from '@/components/features/ClippingForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

export default function ClippingPage() {
  const [uploadedClipUrl, setUploadedClipUrl] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Podcast Clipper</h2>
            <p className="text-muted-foreground mt-2">
              Create vertical clips (9:16) from YouTube videos for Shorts, Reels, or TikTok.
            </p>
          </div>

          {!uploadedClipUrl ? (
            <ClippingForm onUploadSuccess={setUploadedClipUrl} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-2xl font-semibold text-green-500">Clip Uploaded Successfully!</h3>
                <p className="text-muted-foreground mt-2">Your vertical clip is now on YouTube.</p>
                <div className="mt-6 flex flex-col gap-4 items-center">
                  <a href={uploadedClipUrl} target="_blank" rel="noopener noreferrer">
                    <Button>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on YouTube
                    </Button>
                  </a>
                  <Button variant="outline" onClick={() => setUploadedClipUrl(null)}>
                    Create Another Clip
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
