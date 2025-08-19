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
  Upload,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  MoreHorizontal,
  Download,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fileTypes = [
  { type: "document", icon: FileText, count: 12, color: "text-blue-600" },
  { type: "image", icon: Image, count: 8, color: "text-green-600" },
  { type: "video", icon: Film, count: 3, color: "text-purple-600" },
  { type: "audio", icon: Music, count: 5, color: "text-orange-600" },
  { type: "archive", icon: Archive, count: 2, color: "text-gray-600" },
];

const recentFiles = [
  {
    id: 1,
    name: "Project Proposal.pdf",
    type: "document",
    size: "2.4 MB",
    uploadedAt: "2 hours ago",
    analysis: "Completed",
  },
  {
    id: 2,
    name: "Meeting Recording.mp3",
    type: "audio",
    size: "15.2 MB",
    uploadedAt: "1 day ago",
    analysis: "Processing",
  },
  {
    id: 3,
    name: "Data Export.xlsx",
    type: "document",
    size: "856 KB",
    uploadedAt: "3 days ago",
    analysis: "Completed",
  },
  {
    id: 4,
    name: "Product Screenshots.zip",
    type: "archive",
    size: "12.1 MB",
    uploadedAt: "1 week ago",
    analysis: "Completed",
  },
];

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">
            Upload and manage your documents for AI analysis
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">Upload your files</CardTitle>
          <CardDescription className="text-center max-w-sm">
            Drag and drop files here, or click to browse. Supports PDF, Word,
            Excel, images, and more.
          </CardDescription>
          <div className="mt-4 text-sm text-muted-foreground">
            Maximum file size: 10MB
          </div>
          <Button className="mt-4" variant="outline">
            Choose Files
          </Button>
        </CardContent>
      </Card>

      {/* File Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {fileTypes.map((fileType) => {
          const Icon = fileType.icon;
          return (
            <Card key={fileType.type}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {fileType.type}s
                  </p>
                  <p className="text-2xl font-bold">{fileType.count}</p>
                </div>
                <Icon className={`h-8 w-8 ${fileType.color}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Files */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Files</h2>
        <div className="space-y-3">
          {recentFiles.map((file) => {
            const typeConfig = fileTypes.find((t) => t.type === file.type);
            const Icon = typeConfig?.icon || FileText;

            return (
              <Card key={file.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <Icon
                      className={`h-8 w-8 ${
                        typeConfig?.color || "text-gray-600"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.uploadedAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant={
                        file.analysis === "Completed" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {file.analysis}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          View Analysis
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
