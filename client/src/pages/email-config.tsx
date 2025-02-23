import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmailConfigSchema } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function EmailConfig() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: config } = useQuery({
    queryKey: ["/api/email-configs", id],
    enabled: !!id
  });

  const form = useForm({
    resolver: zodResolver(insertEmailConfigSchema),
    defaultValues: config || {
      email: "",
      password: "",
      host: "",
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

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">
            {id ? "Edit Email Configuration" : "New Email Configuration"}
          </h1>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <label>Email</label>
                <Input {...form.register("email")} />
              </div>

              <div className="space-y-2">
                <label>Password</label>
                <Input type="password" {...form.register("password")} />
              </div>

              <div className="space-y-2">
                <label>Host</label>
                <Input {...form.register("host")} />
              </div>

              <div className="space-y-2">
                <label>Port</label>
                <Input type="number" {...form.register("port")} />
              </div>

              <div className="space-y-2">
                <label>Type</label>
                <Select 
                  onValueChange={(value) => form.setValue("type", value)}
                  defaultValue={form.getValues("type")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMAP">IMAP</SelectItem>
                    <SelectItem value="POP3">POP3</SelectItem>
                    <SelectItem value="GMAIL">Gmail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {id ? "Update" : "Create"}
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
  );
}
