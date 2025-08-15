'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getChannelVideos, uploadToYouTube } from '@/app/actions';
import { Loader2, Copy, CheckCircle, RefreshCw, XCircle, Trash2, StopCircle, Repeat } from 'lucide-react';
import type { Video } from '@/types';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';


type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export default function SyncPage() {
    const [channelUrl, setChannelUrl] = useState('');
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
    const [syncProgress, setSyncProgress] = useState(0);
    const { toast } = useToast();
    
    const stopSyncingRef = useRef(false);

    const handleFetchVideos = async () => {
        setIsLoading(true);
        setError(null);
        setVideos([]);
        setSyncStatuses({});
        setSyncProgress(0);

        const result = await getChannelVideos(channelUrl);
        setIsLoading(false);

        if (result.success && result.data) {
            setVideos(result.data);
            if(result.data.length === 0) {
              toast({ title: 'No videos found', description: 'This channel may not have any public videos.' });
            }
        } else {
            setError(result.error || 'An unknown error occurred');
            toast({ variant: 'destructive', title: 'Failed to fetch videos', description: result.error });
        }
    };
    
    const handleSyncVideo = useCallback(async (video: Video) => {
        setSyncStatuses(prev => ({ ...prev, [video.id]: 'syncing' }));
        toast({ title: 'Sync started...', description: `Uploading "${video.title}" to your channel.`});

        try {
            const result = await uploadToYouTube(video);

            if (result.success && result.data?.youtubeUrl) {
                setSyncStatuses(prev => ({ ...prev, [video.id]: 'synced' }));
                toast({ 
                    title: 'Sync Complete!', 
                    description: `"${video.title}" has been uploaded to your channel.`,
                    action: (
                      <a href={result.data.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">View Video</Button>
                      </a>
                    )
                });
                return true;
            } else {
                setSyncStatuses(prev => ({ ...prev, [video.id]: 'error' }));
                toast({ variant: 'destructive', title: 'Sync Failed', description: result.error, duration: 9000 });
                return false;
            }
        } catch (e: any) {
             setSyncStatuses(prev => ({ ...prev, [video.id]: 'error' }));
             toast({ variant: 'destructive', title: 'Sync Failed', description: e.message, duration: 9000 });
             return false;
        }
    }, [toast]);
    
    const handleSyncAll = async () => {
        setIsSyncingAll(true);
        stopSyncingRef.current = false;
        setSyncProgress(0);
        const videosToSync = videos.filter(v => syncStatuses[v.id] !== 'synced');
        
        for (let i = 0; i < videosToSync.length; i++) {
            if (stopSyncingRef.current) {
                toast({ title: 'Sync Stopped', description: 'The bulk sync operation was cancelled.' });
                break;
            }
            const video = videosToSync[i];
            await handleSyncVideo(video);
            setSyncProgress(((i + 1) / videosToSync.length) * 100);
        }

        setIsSyncingAll(false);
        stopSyncingRef.current = false;
    };
    
    const stopSyncing = () => {
        stopSyncingRef.current = true;
    };

    const clearSynced = () => {
        const newStatuses = { ...syncStatuses };
        Object.keys(newStatuses).forEach(key => {
            if (newStatuses[key] === 'synced') {
                delete newStatuses[key];
            }
        });
        setSyncStatuses(newStatuses);
        setVideos(prev => prev.filter(v => syncStatuses[v.id] !== 'synced'));
        toast({ title: 'Cleared Synced Items' });
    };

    const getSyncButton = (video: Video) => {
        const status = syncStatuses[video.id] || 'idle';
        switch (status) {
            case 'syncing':
                return <Button className="w-full" disabled><Loader2 className="animate-spin" /> Syncing...</Button>;
            case 'synced':
                return <Button className="w-full" disabled variant="secondary"><CheckCircle /> Synced</Button>;
            case 'error':
                return <Button className="w-full" variant="destructive" onClick={() => handleSyncVideo(video)}><RefreshCw /> Retry Sync</Button>;
            case 'idle':
            default:
                return <Button className="w-full" onClick={() => handleSyncVideo(video)} disabled={isSyncingAll}><Copy /> Sync to My Channel</Button>;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">Channel Sync</h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        Enter a YouTube channel URL to fetch its videos and re-upload them to your own channel.
                    </p>
                </div>
                
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Source Channel</CardTitle>
                        <CardDescription>Paste the full URL of the channel you want to sync from.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="https://www.youtube.com/channel/..."
                                value={channelUrl}
                                onChange={(e) => setChannelUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchVideos()}
                                disabled={isLoading || isSyncingAll}
                                className="text-base"
                            />
                            <Button onClick={handleFetchVideos} disabled={!channelUrl || isLoading || isSyncingAll} className="w-full sm:w-auto">
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Fetch Videos'}
                            </Button>
                        </div>
                         {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                    </CardContent>
                </Card>

                {videos.length > 0 && (
                     <Card>
                        <CardHeader>
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div>
                                    <CardTitle>Fetched Videos</CardTitle>
                                    <CardDescription>Found {videos.length} videos. Click sync to upload them to your channel.</CardDescription>
                                </div>
                                <div>
                                    <Select defaultValue="manual">
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Sync Frequency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="manual">Manual Sync</SelectItem>
                                        <SelectItem value="daily" disabled>Daily (soon)</SelectItem>
                                        <SelectItem value="weekly" disabled>Weekly (soon)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
                                {isSyncingAll ? (
                                    <Button variant="destructive" onClick={stopSyncing}>
                                        <StopCircle /> Stop Sync
                                    </Button>
                                ) : (
                                    <Button onClick={handleSyncAll} disabled={isLoading}>
                                        <Repeat /> Sync All
                                    </Button>
                                )}
                                <Button variant="outline" onClick={clearSynced} disabled={isSyncingAll}>
                                    <Trash2 /> Clear Synced
                                </Button>
                            </div>
                            {isSyncingAll && (
                                <div className="pt-4 space-y-2">
                                    <Progress value={syncProgress} />
                                    <p className="text-sm text-muted-foreground">Syncing... {Math.round(syncProgress)}% complete.</p>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {videos.map(video => (
                                    <div key={video.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
                                        <div className="relative w-full sm:w-32 aspect-video flex-shrink-0 rounded-md overflow-hidden">
                                            <Image src={video.thumbnailUrl} alt={video.title} layout="fill" objectFit="cover" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold line-clamp-2">{video.title}</p>
                                        </div>
                                        <div className="w-full sm:w-48 flex-shrink-0">
                                          {getSyncButton(video)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
