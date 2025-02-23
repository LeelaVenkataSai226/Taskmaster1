import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import EmailList from "@/components/email-list";
import PdfList from "@/components/pdf-list";
import { Plus, RefreshCw } from "lucide-react";
import type { EmailConfig, PdfMetadata } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const { data: emailConfigs, isLoading: configsLoading } = useQuery<EmailConfig[]>({
    queryKey: ["/api/email-configs"],
  });

  const { data: pdfMetadata, isLoading: pdfLoading } = useQuery<PdfMetadata[]>({
    queryKey: ["/api/pdf-metadata"],
  });

  const checkInboxMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/check-inbox");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Checking inboxes for new PDFs...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-metadata"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Email PDF Monitor</h1>
        <div className="flex gap-4">
          <Button 
            variant="outline"
            onClick={() => checkInboxMutation.mutate()}
            disabled={checkInboxMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${checkInboxMutation.isPending ? 'animate-spin' : ''}`} />
            Check Inbox
          </Button>
          <Link href="/email-config">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Email Config
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Email Configurations</h2>
          <EmailList 
            configs={emailConfigs || []} 
            isLoading={configsLoading} 
          />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Downloaded PDFs</h2>
          <PdfList 
            metadata={pdfMetadata || []} 
            isLoading={pdfLoading} 
          />
        </div>
      </div>
    </div>
  );
}