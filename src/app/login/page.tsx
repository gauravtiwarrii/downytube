import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Youtube, LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <Youtube className="h-10 w-10 text-primary" />
                         <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            DownyTube
                        </h1>
                    </div>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>
                        Sign in with your YouTube account to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/api/auth/google/login" className="w-full">
                        <Button className="w-full">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign in with YouTube
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
