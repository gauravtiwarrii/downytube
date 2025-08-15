'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getViralIdeas } from '@/app/actions';
import { Loader2, Lightbulb, Wand2, Star, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ViralIdea = {
  title: string;
  hook: string;
  reasoning: string;
  viralityScore: number;
};

const FormSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters long.'),
});

export default function ViralIdeasPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      topic: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    setIdeas([]);
    const result = await getViralIdeas(data);
    setIsLoading(false);

    if (result.success && result.data) {
      setIdeas(result.data.ideas);
      toast({
        title: 'Ideas Generated!',
        description: 'The AI has brainstormed some viral video ideas for you.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to get ideas',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Viral Ideas Finder</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Stuck for ideas? Enter a topic and let our AI brainstorm viral video concepts for you.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Brainstorming Topic</CardTitle>
            <CardDescription>What general topic, niche, or keyword do you want ideas for?</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-2">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input placeholder="e.g., 'sustainable living', 'AI for beginners', 'home cooking'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                  Generate Ideas
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading && (
             <Card className="text-center p-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <h3 className="mt-4 text-lg font-semibold">Brainstorming...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                   The AI is thinking up some viral ideas...
                </p>
            </Card>
        )}

        {ideas.length > 0 && (
          <div className="space-y-4">
            {ideas.map((idea, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="text-xl">{idea.title}</span>
                    <Badge variant="secondary" className="flex items-center gap-1.5 text-amber-500 border-amber-500/50">
                        <Star className="h-4 w-4" /> Virality: {idea.viralityScore}/10
                    </Badge>
                  </CardTitle>
                  <CardDescription><strong>Hook:</strong> {idea.hook}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground bg-background/50 p-3 rounded-md border">
                        <p><strong className="font-semibold text-foreground">AI Reasoning:</strong> {idea.reasoning}</p>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(idea.title);
                        toast({ title: "Copied!", description: "Title copied to clipboard."})
                    }}>
                        Copy Title
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

    