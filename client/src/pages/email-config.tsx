import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import React from "react";

// Gmail-specific help content
const GMAIL_APP_PASSWORD_HELP = `
For Gmail accounts, you need to use an App Password:
1. Go to your Google Account Settings
2. Enable 2-Step Verification if not already enabled
3. Go to Security > App Passwords
4. Generate a new App Password for 'Mail'
5. Use that 16-character password here
`;

// Update the formSchema
const formSchema = insertEmailConfigSchema.extend({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  host: z.string()
    .min(1, "Host is required"),
  port: z.number()
    .min(1, "Port must be greater than 0")
    .max(65535, "Port must be less than 65536"),
  type: z.literal("IMAP"),
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
  const queryClient = useQueryClient(); // Use the hook instead of direct import

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

  const testConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/test-connection", data);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Connection test successful! You can now save the configuration."
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/email-configs"] });
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

  const handleTestConnection = () => {
    const values = form.getValues();
    if (form.formState.isValid) {
      testConnectionMutation.mutate({ ...values, port: parseInt(values.port) });
    } else {
      form.trigger();
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly before testing the connection.",
        variant: "destructive"
      });
    }
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
            {form.getValues("email")?.includes("gmail.com") && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h2 className="text-sm font-semibold text-yellow-800">Important: Gmail App Password Required</h2>
                <p className="mt-1 text-sm text-yellow-700">
                  For Gmail accounts, you must use an App Password, not your regular password.
                  <a 
                    href="https://myaccount.google.com/apppasswords" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    Generate an App Password
                  </a>
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Email Address</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Enter your email address. Settings will be auto-filled for Gmail, Outlook, and Yahoo.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    {...form.register("email")} 
                    onChange={(e) => {
                      form.register("email").onChange(e);
                      handleEmailChange(e);
                    }}
                    placeholder="your.email@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Password</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">For Gmail accounts:</p>
                        <p>{GMAIL_APP_PASSWORD_HELP}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    type="password" 
                    {...form.register("password")} 
                    placeholder={form.getValues("email")?.includes("gmail.com") ? "16-character App Password" : "Email password"}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Host</label>
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
                    <label className="font-medium">Port</label>
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
                    <label className="font-medium">Type</label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Currently supporting IMAP protocol only.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select 
                    onValueChange={(value) => form.setValue("type", value)}
                    defaultValue="IMAP"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMAP">IMAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-6 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Testing...
                      </>
                    ) : "Test Connection"}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || !form.formState.isValid}
                  >
                    {mutation.isPending ? "Saving..." : (id ? "Update" : "Create")}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation("/")}
                  >
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