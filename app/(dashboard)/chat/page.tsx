import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
          <p className="text-muted-foreground">
            Start a conversation with AI models
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Welcome State */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Welcome to Chat</CardTitle>
            <CardDescription>
              Start a conversation with our AI assistant. Ask questions, get
              help, or explore creative ideas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <Link href="/chat/new">
                <Sparkles className="mr-2 h-4 w-4" />
                Start New Conversation
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">
              Or choose from{" "}
              <Link href="/templates" className="text-primary hover:underline">
                conversation templates
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Conversations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Conversations</h2>
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No conversations yet. Start your first chat above!</p>
        </div>
      </div>
    </div>
  );
}
