import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertEmailConfigSchema } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HelpCircle } from "lucide-react";

// Extend the schema with more validation
const formSchema = insertEmailConfigSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1, "Port is required"),
  password: z.string().min(1, "Password is required"),
});

// Common email provider presets
const emailPresets = {
  GMAIL: {
    host: "imap.gmail.com",
    port: 993,
    type: "IMAP"
  },
  OUTLOOK: {
    host: "outlook.office365.com",
    port: 993,
    type: "IMAP"
  },
  YAHOO: {
    host: "imap.mail.yahoo.com",
    port: 993,
    type: "IMAP"
  }
};

export default function EmailConfig() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: config } = useQuery({
    queryKey: ["/api/email-configs", id],
    enabled: !!id
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: config || {
      email: "",
      password: "",
      host: "imap.gmail.com", // Default to Gmail
      port: 993,
      type: "IMAP",
      active: true
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (id) {
        return apiRequest("PATCH", `/api/email-configs/${id}`, data);
      }
      return apiRequest("POST", "/api/email-configs", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Email configuration ${id ? "updated" : "created"} successfully`
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    data.port = parseInt(data.port);
    mutation.mutate(data);
  };

  // Auto-fill settings based on email domain
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const email = event.target.value;
    const domain = email.split('@')[1]?.toLowerCase();

    if (domain?.includes('gmail.com')) {
      form.setValue('host', emailPresets.GMAIL.host);
      form.setValue('port', emailPresets.GMAIL.port);
      form.setValue('type', emailPresets.GMAIL.type);
    } else if (domain?.includes('outlook.com') || domain?.includes('hotmail.com')) {
      form.setValue('host', emailPresets.OUTLOOK.host);
      form.setValue('port', emailPresets.OUTLOOK.port);
      form.setValue('type', emailPresets.OUTLOOK.type);
    } else if (domain?.includes('yahoo.com')) {
      form.setValue('host', emailPresets.YAHOO.host);
      form.setValue('port', emailPresets.YAHOO.port);
      form.setValue('type', emailPresets.YAHOO.type);
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <h1 className="text-2xl font-bold">
              {id ? "Edit Email Configuration" : "New Email Configuration"}
            </h1>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label>Email</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Enter your email address. Settings will be auto-filled for common providers.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    {...form.register("email")} 
                    onChange={(e) => {
                      form.register("email").onChange(e);
                      handleEmailChange(e);
                    }}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label>Password</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        For Gmail, use an App Password. Enable 2FA and generate one at Google Account settings.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input type="password" {...form.register("password")} />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label>Host</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        IMAP server address. Auto-filled for common email providers.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input {...form.register("host")} />
                  {form.formState.errors.host && (
                    <p className="text-sm text-red-500">{form.formState.errors.host.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label>Port</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Default is 993 for secure IMAP connections.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input type="number" {...form.register("port")} />
                  {form.formState.errors.port && (
                    <p className="text-sm text-red-500">{form.formState.errors.port.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label>Type</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Currently supporting IMAP protocol.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select 
                    onValueChange={(value) => form.setValue("type", value)}
                    defaultValue={form.getValues("type")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMAP">IMAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : (id ? "Update" : "Create")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}