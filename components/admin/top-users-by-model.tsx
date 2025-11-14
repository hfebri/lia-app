"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import type { UserModelUsage } from "@/lib/services/analytics";

interface TopUsersByModelProps {
  users: UserModelUsage[];
  modelName?: string;
  modelId?: string;
}

export function TopUsersByModel({
  users,
  modelName,
  modelId,
}: TopUsersByModelProps) {
  // Filter users when a specific model is selected
  const filteredUsers = modelId
    ? users.filter(user => user.modelUsage.some(m => m.model === modelId))
    : users;

  // Sort by a composite score: conversations + (messages / 10)
  // This gives weight to both conversations and messages
  // Messages are divided by 10 so conversations have more weight
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (modelId) {
      // Find usage for this specific model
      const aUsage = a.modelUsage.find(m => m.model === modelId);
      const bUsage = b.modelUsage.find(m => m.model === modelId);
      const aScore = (aUsage?.conversationCount || 0) + (aUsage?.messageCount || 0) / 10;
      const bScore = (bUsage?.conversationCount || 0) + (bUsage?.messageCount || 0) / 10;
      return bScore - aScore;
    }
    const aScore = a.totalConversations + a.totalMessages / 10;
    const bScore = b.totalConversations + b.totalMessages / 10;
    return bScore - aScore;
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="h-6 w-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {rank}
          </div>
        );
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white";
      case 2:
        return "bg-gray-400 text-white";
      case 3:
        return "bg-amber-600 text-white";
      default:
        return "bg-muted";
    }
  };

  if (sortedUsers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No users found for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="max-h-[700px] overflow-y-auto pr-2">
      <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Top Users Leaderboard
          </CardTitle>
          <CardDescription>
            {modelName
              ? `Ranking users by ${modelName} usage`
              : "Ranking users by total conversations across all models"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Top 3 Podium Style */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {sortedUsers.slice(0, 3).map((user, index) => {
          const rank = index + 1;
          const modelUsage = modelId
            ? user.modelUsage.find(m => m.model === modelId)
            : null;
          const conversations = modelUsage?.conversationCount ?? user.totalConversations;
          const messages = modelUsage?.messageCount ?? user.totalMessages;

          return (
            <Card
              key={user.userId}
              className={`relative overflow-hidden ${
                rank === 1
                  ? "border-yellow-500 shadow-lg shadow-yellow-500/20"
                  : rank === 2
                  ? "border-gray-400"
                  : "border-amber-600"
              }`}
            >
              <div className={`absolute top-0 right-0 ${getRankBadgeColor(rank)} px-3 py-1 rounded-bl-lg`}>
                <span className="text-xs font-bold">#{rank}</span>
              </div>
              <CardContent className="pt-6 pb-4 text-center">
                <div className="flex justify-center mb-3">
                  {getRankIcon(rank)}
                </div>
                <Avatar className="h-16 w-16 mx-auto mb-3 ring-2 ring-primary/20">
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback className="text-lg font-bold">
                    {(user.userName || user.email).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-sm mb-1 truncate">
                  {user.userName || "No name"}
                </p>
                <p className="text-xs text-muted-foreground truncate mb-3">
                  {user.email}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {conversations}
                    </span>
                    <span className="text-xs text-muted-foreground">convos</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {messages} messages
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rest of the rankings */}
      {sortedUsers.length > 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Full Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedUsers.slice(3).map((user, index) => {
                const rank = index + 4;
                const modelUsage = modelId
                  ? user.modelUsage.find(m => m.model === modelId)
                  : null;
                const conversations = modelUsage?.conversationCount ?? user.totalConversations;
                const messages = modelUsage?.messageCount ?? user.totalMessages;

                return (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-sm font-bold text-muted-foreground">
                          {rank}
                        </span>
                      </div>

                      {/* User Avatar & Info */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.userName || user.email)
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {user.userName || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 ml-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {conversations}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          conversations
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-muted-foreground">
                          {messages}
                        </p>
                        <p className="text-xs text-muted-foreground">messages</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {sortedUsers.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {sortedUsers.reduce((sum, u) => {
                  if (modelId) {
                    const usage = u.modelUsage.find(m => m.model === modelId);
                    return sum + (usage?.conversationCount || 0);
                  }
                  return sum + u.totalConversations;
                }, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Conversations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {sortedUsers.reduce((sum, u) => {
                  if (modelId) {
                    const usage = u.modelUsage.find(m => m.model === modelId);
                    return sum + (usage?.messageCount || 0);
                  }
                  return sum + u.totalMessages;
                }, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
