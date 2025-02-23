import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import EmailList from "@/components/email-list";
import PdfList from "@/components/pdf-list";
import { Plus } from "lucide-react";

export default function Home() {
  const { data: emailConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/email-configs"],
  });

  const { data: pdfMetadata, isLoading: pdfLoading } = useQuery({
    queryKey: ["/api/pdf-metadata"],
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Email PDF Monitor</h1>
        <Link href="/email-config">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Email Config
          </Button>
        </Link>
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
