import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { PdfMetadata } from "@shared/schema";
import { FileText } from "lucide-react";

interface PdfListProps {
  metadata: PdfMetadata[];
  isLoading: boolean;
}

export default function PdfList({ metadata, isLoading }: PdfListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!metadata || metadata.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No PDFs downloaded yet. Click "Check Inbox" to scan for new PDFs.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {metadata.map((pdf) => (
        <Card key={pdf.id} className="shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{pdf.filename}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  From: {pdf.fromAddress}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  Subject: {pdf.subject}
                </p>
                <p className="text-sm text-muted-foreground">
                  Received: {format(new Date(pdf.dateReceived), "PPp")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}