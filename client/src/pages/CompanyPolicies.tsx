import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Upload, FileText, Trash2, Edit, Eye, Users, CheckCircle2, Mail, Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CompanyPolicies() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", category: "general", version: "1.0" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewAcksPolicy, setViewAcksPolicy] = useState<any>(null);
  const [downloadPermsPolicy, setDownloadPermsPolicy] = useState<any>(null);
  const [localAllowedIds, setLocalAllowedIds] = useState<string[]>([]);
  const [previewPolicy, setPreviewPolicy] = useState<any>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!previewPolicy) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      return;
    }
    setPreviewLoading(true);
    fetch(`/api/company-policies/${previewPolicy.id}/view`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load policy file");
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
        setPreviewLoading(false);
      })
      .catch(() => {
        setPreviewLoading(false);
        toast({ title: "Error", description: "Could not load policy file for preview", variant: "destructive" });
        setPreviewPolicy(null);
      });
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewPolicy?.id]);

  const { data: policies, isLoading } = useQuery<any[]>({
    queryKey: ["/api/company-policies"],
  });

  const { data: allAcknowledgments } = useQuery<any[]>({
    queryKey: ["/api/policy-acknowledgments"],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<any[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/company-policies", { method: "POST", body: data, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-policies"] });
      toast({ title: "Policy Created", description: "Policy uploaded and all employees notified via email." });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await fetch(`/api/company-policies/${id}`, { method: "PATCH", body: data, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-policies"] });
      toast({ title: "Policy Updated" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/company-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/policy-acknowledgments"] });
      toast({ title: "Policy Deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (policyId: number) => apiRequest("POST", `/api/company-policies/${policyId}/send-reminder`),
    onSuccess: (data: any) => {
      toast({ title: "Reminders Sent", description: `Sent to ${data.sentCount} unacknowledged employee(s).` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveDownloadPermsMutation = useMutation({
    mutationFn: async ({ policyId, allowedIds }: { policyId: number; allowedIds: string[] }) => {
      const fd = new FormData();
      fd.append("downloadAllowedEmployees", JSON.stringify(allowedIds));
      const res = await fetch(`/api/company-policies/${policyId}`, { method: "PATCH", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-policies"] });
      toast({ title: "Saved", description: "Download permissions updated." });
      setDownloadPermsPolicy(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setShowAddDialog(false);
    setEditingPolicy(null);
    setFormData({ name: "", description: "", category: "general", version: "1.0" });
    setSelectedFile(null);
  };

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("category", formData.category);
    fd.append("version", formData.version);
    if (selectedFile) fd.append("file", selectedFile);
    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, data: fd });
    } else {
      createPolicyMutation.mutate(fd);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryLabels: Record<string, string> = {
    general: "General",
    hr: "HR",
    compliance: "Compliance",
    safety: "Safety",
    it: "IT",
  };

  const categoryColors: Record<string, string> = {
    general: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    hr: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    compliance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    safety: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    it: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  const getAckCount = (policyId: number) => (allAcknowledgments || []).filter((a: any) => a.policyId === policyId && a.acknowledgedAt).length;
  const activeEmployees = (employees || []).filter((e: any) => e.status === 'active');
  const totalEmployees = activeEmployees.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Policies</h1>
          <p className="text-muted-foreground">Upload and manage company policies for employees</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-add-policy">
          <Plus className="w-4 h-4 mr-2" />
          Add Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-foreground">{(policies || []).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{(policies || []).filter((p: any) => p.isActive).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{(allAcknowledgments || []).filter((a: any) => a.acknowledgedAt).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Acknowledgments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600">{(policies || []).filter((p: any) => p.fileName).length}</div>
            <p className="text-sm text-muted-foreground mt-1">With Documents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            All Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (!policies || policies.length === 0) ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No policies yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Click "Add Policy" to upload your first company policy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((policy: any) => {
                const ackCount = getAckCount(policy.id);
                const unacknowledgedCount = totalEmployees - ackCount;
                return (
                  <div key={policy.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`admin-policy-${policy.id}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${policy.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-900/30'}`}>
                        <FileText className={`w-5 h-5 ${policy.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{policy.name}</p>
                          {!policy.isActive && <Badge variant="outline" className="text-[10px] text-gray-500">Inactive</Badge>}
                        </div>
                        {policy.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{policy.description}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-[10px] ${categoryColors[policy.category] || categoryColors.general}`}>
                            {categoryLabels[policy.category] || policy.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">v{policy.version}</span>
                          {policy.fileName && <span className="text-[10px] text-muted-foreground">{policy.fileName} ({formatSize(policy.fileSize)})</span>}
                          <span className="text-[10px] text-muted-foreground">Updated: {policy.updatedAt ? format(new Date(policy.updatedAt), "MMM dd, yyyy") : "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setViewAcksPolicy(policy)} data-testid={`view-acks-${policy.id}`} title="Acknowledgment Status">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        <span className="text-xs">{ackCount}/{totalEmployees}</span>
                      </Button>
                      {unacknowledgedCount > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600 hover:text-orange-700"
                          onClick={() => sendReminderMutation.mutate(policy.id)}
                          disabled={sendReminderMutation.isPending}
                          data-testid={`send-reminder-${policy.id}`}
                          title="Send reminder to unacknowledged employees"
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setLocalAllowedIds(policy.downloadAllowedEmployees || []); setDownloadPermsPolicy(policy); }}
                        data-testid={`download-perms-${policy.id}`}
                        title="Manage download permissions"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      {policy.fileName && (
                        <Button size="sm" variant="ghost" onClick={() => setPreviewPolicy(policy)} data-testid={`preview-policy-${policy.id}`} title="View policy">
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingPolicy(policy);
                        setFormData({ name: policy.name, description: policy.description || "", category: policy.category || "general", version: policy.version || "1.0" });
                        setShowAddDialog(true);
                      }} data-testid={`edit-policy-${policy.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => {
                        if (confirm("Delete this policy? This will also remove all acknowledgments.")) {
                          deletePolicyMutation.mutate(policy.id);
                        }
                      }} data-testid={`delete-policy-${policy.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); else setShowAddDialog(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Add Company Policy"}</DialogTitle>
            <DialogDescription>{editingPolicy ? "Update the policy details and optionally replace the document." : "Upload a new company policy document. All employees will be notified."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Policy Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Leave Policy" data-testid="input-policy-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the policy..." className="resize-none" data-testid="input-policy-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-policy-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Version</Label>
                <Input value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })} placeholder="1.0" data-testid="input-policy-version" />
              </div>
            </div>
            <div>
              <Label>Upload Document (PDF, DOC, etc.)</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedFile ? selectedFile.name : (editingPolicy?.fileName ? `Current: ${editingPolicy.fileName} (upload to replace)` : "Click to select file")}</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={e => setSelectedFile(e.target.files?.[0] || null)} data-testid="input-policy-file" />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              disabled={!formData.name.trim() || createPolicyMutation.isPending || updatePolicyMutation.isPending}
              onClick={handleSubmit}
              data-testid="button-submit-policy"
            >
              {createPolicyMutation.isPending || updatePolicyMutation.isPending ? "Saving..." : editingPolicy ? "Update Policy" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewAcksPolicy} onOpenChange={(open) => { if (!open) setViewAcksPolicy(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledgment Status</DialogTitle>
            <DialogDescription>{viewAcksPolicy?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {activeEmployees.map((emp: any) => {
              const ack = (allAcknowledgments || []).find((a: any) => a.policyId === viewAcksPolicy?.id && a.employeeId === emp.id);
              const hasViewed = ack?.viewedAt;
              const hasAcked = ack?.acknowledgedAt;
              return (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName || ''}</p>
                    <p className="text-xs text-muted-foreground">{emp.employeeCode || ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasViewed && (
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                        <Eye className="w-2.5 h-2.5 mr-0.5" />
                        Viewed
                      </Badge>
                    )}
                    {hasAcked ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {format(new Date(hasAcked), "MMM dd")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            {viewAcksPolicy && getAckCount(viewAcksPolicy.id) < totalEmployees && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendReminderMutation.mutate(viewAcksPolicy.id)}
                disabled={sendReminderMutation.isPending}
                data-testid="button-send-ack-reminder"
              >
                <Bell className="w-4 h-4 mr-1" />
                {sendReminderMutation.isPending ? "Sending..." : "Send Reminder to Pending"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!downloadPermsPolicy} onOpenChange={(open) => { if (!open) setDownloadPermsPolicy(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download Permissions</DialogTitle>
            <DialogDescription>Toggle which employees can download "{downloadPermsPolicy?.name}". All employees can view the policy, but only selected employees can download it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {activeEmployees.map((emp: any) => {
              const isAllowed = localAllowedIds.includes(String(emp.id));
              return (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName || ''}</p>
                    <p className="text-xs text-muted-foreground">{emp.employeeCode || ''}</p>
                  </div>
                  <Switch
                    checked={isAllowed}
                    onCheckedChange={(checked) => {
                      setLocalAllowedIds(prev =>
                        checked
                          ? [...prev, String(emp.id)]
                          : prev.filter(id => id !== String(emp.id))
                      );
                    }}
                    data-testid={`toggle-download-${emp.id}`}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadPermsPolicy(null)} data-testid="cancel-download-perms">Cancel</Button>
            <Button
              disabled={saveDownloadPermsMutation.isPending}
              onClick={() => {
                if (downloadPermsPolicy) {
                  saveDownloadPermsMutation.mutate({ policyId: downloadPermsPolicy.id, allowedIds: localAllowedIds });
                }
              }}
              data-testid="save-download-perms"
            >
              {saveDownloadPermsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPolicy} onOpenChange={(open) => { if (!open) setPreviewPolicy(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {previewPolicy?.name}
            </DialogTitle>
            {previewPolicy?.description && (
              <DialogDescription>{previewPolicy.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="px-4 pb-4" style={{ height: "70vh" }}>
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading document...</span>
              </div>
            ) : previewBlobUrl ? (
              <iframe
                src={`${previewBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded border"
                title={previewPolicy?.name || "Policy Preview"}
                style={{ pointerEvents: "auto" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Unable to load preview
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
