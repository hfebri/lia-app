import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookTemplate,
  Sparkles,
  Users,
  Briefcase,
  BookOpen,
  Code,
  Heart,
} from "lucide-react";

const templateCategories = [
  {
    id: "business",
    name: "Business",
    icon: Briefcase,
    color: "bg-blue-500/10 text-blue-700",
    templates: [
      {
        title: "Email Generator",
        description: "Create professional emails for any situation",
        usageCount: 1234,
      },
      {
        title: "Meeting Notes",
        description: "Generate structured meeting summaries",
        usageCount: 856,
      },
    ],
  },
  {
    id: "creative",
    name: "Creative",
    icon: Sparkles,
    color: "bg-purple-500/10 text-purple-700",
    templates: [
      {
        title: "Story Writer",
        description: "Generate creative stories and narratives",
        usageCount: 2341,
      },
      {
        title: "Blog Post",
        description: "Create engaging blog content",
        usageCount: 1876,
      },
    ],
  },
  {
    id: "education",
    name: "Education",
    icon: BookOpen,
    color: "bg-green-500/10 text-green-700",
    templates: [
      {
        title: "Study Guide",
        description: "Create comprehensive study materials",
        usageCount: 1543,
      },
      {
        title: "Quiz Generator",
        description: "Generate questions for any topic",
        usageCount: 987,
      },
    ],
  },
  {
    id: "technical",
    name: "Technical",
    icon: Code,
    color: "bg-orange-500/10 text-orange-700",
    templates: [
      {
        title: "Code Review",
        description: "Get code analysis and suggestions",
        usageCount: 765,
      },
      {
        title: "Documentation",
        description: "Generate technical documentation",
        usageCount: 654,
      },
    ],
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Choose from pre-built conversation templates to get started quickly
          </p>
        </div>
      </div>

      {/* Popular Templates */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-semibold">Popular Templates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templateCategories.slice(0, 3).map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {category.templates[0].title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {category.templates[0].usageCount.toLocaleString()} uses
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {category.templates[0].description}
                  </CardDescription>
                  <Button className="w-full mt-4" variant="outline">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* All Categories */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Categories</h2>
        <div className="space-y-6">
          {templateCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-medium">{category.name}</h3>
                  <Badge variant="outline">
                    {category.templates.length} templates
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.templates.map((template) => (
                    <Card
                      key={template.title}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {template.title}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {template.usageCount.toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">
                          {template.description}
                        </CardDescription>
                        <Button className="w-full" variant="outline" size="sm">
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
