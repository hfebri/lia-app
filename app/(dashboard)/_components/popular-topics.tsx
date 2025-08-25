"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface PopularTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  examples: string[];
  keywords?: string[];
}

interface PopularTopicsProps {
  data?: PopularTopic[];
}

export function PopularTopics({ data }: PopularTopicsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <h3 className="text-sm font-medium mb-2">No topic data available</h3>
        <p className="text-xs text-muted-foreground">
          Start conversations to see popular topics
        </p>
      </div>
    );
  }

  const getTrendIcon = (trend: PopularTopic["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case "stable":
        return <Minus className="h-3 w-3 text-gray-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: PopularTopic["trend"]) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "stable":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const maxCount = Math.max(...data.map(topic => topic.count));

  return (
    <ScrollArea className="h-96">
      <div className="space-y-4 pr-4">
        {data.map((topic, index) => (
        <Card key={topic.topic} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{topic.topic}</h4>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(topic.trend)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{topic.count.toLocaleString()} conversations</span>
                  <span>•</span>
                  <span className={getTrendColor(topic.trend)}>
                    {topic.percentage}% of total
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                #{index + 1}
              </Badge>
            </div>

            <div className="mb-3">
              <Progress 
                value={(topic.count / maxCount) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              {/* Keywords */}
              {topic.keywords && topic.keywords.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Matched keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {topic.keywords.slice(0, 5).map((keyword, keywordIndex) => (
                      <Badge
                        key={keywordIndex}
                        variant="outline"
                        className="text-xs px-2 py-0 h-5"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {topic.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                        +{topic.keywords.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Examples */}
              {topic.examples && topic.examples.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Example conversations:</p>
                  <div className="space-y-1">
                    {topic.examples.slice(0, 2).map((example, exampleIndex) => (
                      <div
                        key={exampleIndex}
                        className="text-xs bg-muted/30 rounded px-2 py-1 text-muted-foreground line-clamp-2"
                      >
                        &quot;{example.length > 80 ? example.substring(0, 80) + "..." : example}&quot;
                      </div>
                    ))}
                    {topic.examples.length > 2 && (
                      <div className="text-xs text-muted-foreground italic">
                        +{topic.examples.length - 2} more examples
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        ))}
      </div>
    </ScrollArea>
  );
}