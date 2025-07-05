import { getAuthenticatedUser } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import Link from 'next/link';

export default async function AccountPage() {
    const result = await getAuthenticatedUser();

    if(!result.success || !result.data) {
        redirect('/login');
    }

    const user = result.data;

    return (
        <div className="container mx-auto px-4 py-8">
             <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>My Account</CardTitle>
                        <CardDescription>
                            Your connected account information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user.picture} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{user.name}</h2>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 border-t pt-6">
                             <Link href="/api/auth/google/logout">
                                <Button variant="destructive">
                                    <LogOut className="mr-2 h-4 w-4"/>
                                    Log Out
                                </Button>
                            </Link>
                             <Link href="/">
                                <Button variant="outline">
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
