import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, Circle, Clock, FileText, Users, Shield, 
  Heart, CreditCard, Key, Send, Download, Plus, Eye,
  UserPlus, Mail, FileCheck, AlertCircle, Building2, Link2, Copy, Loader2,
  Trash2, Edit, Upload, X
} from "lucide-react";
import { format } from "date-fns";
import type { Employee, LetterTemplate, GeneratedLetter, OnboardingDocument, OnboardingTask } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Onboarding() {
  const { toast } = useToast();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingLetterId, setRejectingLetterId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [templateForm, setTemplateForm] = useState({
    name: "",
    type: "offer",
    subject: "",
    content: "",
    status: "active"
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: letterTemplates = [], isLoading: templatesLoading } = useQuery<LetterTemplate[]>({
    queryKey: ["/api/letter-templates"],
  });

  const { data: generatedLetters = [] } = useQuery<GeneratedLetter[]>({
    queryKey: ["/api/generated-letters"],
  });

  const { data: onboardingDocs = [] } = useQuery<OnboardingDocument[]>({
    queryKey: ["/api/onboarding-documents"],
  });

  const { data: allOnboardingTasks = [] } = useQuery<OnboardingTask[]>({
    queryKey: ["/api/onboarding"],
  });

  const seededRef = useRef(false);
  useEffect(() => {
    if (!templatesLoading && letterTemplates.length === 0 && !seededRef.current) {
      seededRef.current = true;
      apiRequest("POST", "/api/letter-templates/seed-defaults", {})
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
        })
        .catch(() => {});
    }
  }, [templatesLoading, letterTemplates.length]);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskEmployeeId, setNewTaskEmployeeId] = useState<string>("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("general");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!newTaskEmployeeId || !newTaskName) throw new Error("Employee and task name are required");
      return apiRequest("POST", "/api/onboarding", {
        employeeId: Number(newTaskEmployeeId),
        taskName: newTaskName,
        category: newTaskCategory,
        dueDate: newTaskDueDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      setTaskDialogOpen(false);
      setNewTaskName("");
      setNewTaskCategory("general");
      setNewTaskDueDate("");
      setNewTaskEmployeeId("");
      toast({ title: "Task added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add task", description: err.message, variant: "destructive" });
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string }) => {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      return apiRequest("PATCH", `/api/onboarding/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update task", description: err.message, variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/onboarding/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      toast({ title: "Task removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete task", description: err.message, variant: "destructive" });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateForm) => {
      const res = await apiRequest("POST", "/api/letter-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      setTemplateDialogOpen(false);
      resetTemplateForm();
      toast({ title: "Success", description: "Template created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof templateForm }) => {
      const res = await apiRequest("PATCH", `/api/letter-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast({ title: "Success", description: "Template updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/letter-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letter-templates"] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const generateLetterMutation = useMutation({
    mutationFn: async ({ templateId, employeeId }: { templateId: number; employeeId: number }) => {
      const res = await apiRequest("POST", `/api/generate-letter/${templateId}/${employeeId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-letters"] });
      setGenerateDialogOpen(false);
      setPreviewContent(data.content);
      setPreviewDialogOpen(true);
      toast({ title: "Success", description: "Letter generated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (letterId: number) => {
      const res = await apiRequest("PATCH", `/api/generated-letters/${letterId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-letters"] });
      toast({ title: "Letter accepted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ letterId, reason }: { letterId: number; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/generated-letters/${letterId}/reject`, { rejectionReason: reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-letters"] });
      setRejectDialogOpen(false);
      setRejectingLetterId(null);
      setRejectionReason("");
      toast({ title: "Letter rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    }
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      type: "offer",
      subject: "",
      content: "",
      status: "active"
    });
  };

  const openEditTemplate = (template: LetterTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject || "",
      content: template.content,
      status: template.status || "active"
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const openGenerateDialog = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setGenerateDialogOpen(true);
  };

  const onboardingEmployees = employees?.filter(e => {
    const joinDate = new Date(e.joinDate);
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(today.getDate() + 30);
    // Include employees who joined recently (last 30 days) or will join soon (next 30 days)
    return joinDate > thirtyDaysAgo && joinDate < thirtyDaysAhead;
  }) || [];

  const [emailSent, setEmailSent] = useState(false);
  const [selectedEmployeeForLetter, setSelectedEmployeeForLetter] = useState<number | null>(null);

  const generateOnboardingLink = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setGeneratingLink(true);
    setLinkDialogOpen(true);
    setGeneratedUrl("");
    setEmailSent(false);
    
    try {
      const res = await apiRequest("POST", "/api/onboarding/generate-token", { employeeId: employee.id });
      const data = await res.json();
      setGeneratedUrl(data.signupUrl);
      setEmailSent(data.emailSent);
      if (data.emailSent) {
        toast({ title: "Email sent!", description: `Onboarding link sent to ${employee.email}` });
      } else {
        toast({ title: "Link generated!", description: "Copy and share the link manually." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLinkDialogOpen(false);
    }
    setGeneratingLink(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedUrl);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const pendingTasksCount = allOnboardingTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const completedTasksCount = allOnboardingTasks.filter(t => t.status === "completed").length;
  const bgvPendingCount = employees?.filter(e => e.bgvStatus && e.bgvStatus !== "verified" && e.bgvStatus !== "completed").length || 0;
  const docsUploadedCount = onboardingDocs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Onboarding Management</h1>
        <p className="text-slate-500">Complete employee onboarding workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New Joiners</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-new-joiners">{onboardingEmployees.length}</p>
              </div>
              <UserPlus className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Tasks</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-tasks">{pendingTasksCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed Tasks</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-tasks">{completedTasksCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Documents Uploaded</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-docs-uploaded">{docsUploadedCount}</p>
              </div>
              <FileCheck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pre-onboarding" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="pre-onboarding" data-testid="tab-pre-onboarding">Pre-Onboarding</TabsTrigger>
          <TabsTrigger value="letters" data-testid="tab-letters">Letter Generation</TabsTrigger>
          <TabsTrigger value="workflow" data-testid="tab-workflow">Workflow</TabsTrigger>
          <TabsTrigger value="bgv" data-testid="tab-bgv">BGV</TabsTrigger>
          <TabsTrigger value="insurance" data-testid="tab-insurance">Insurance</TabsTrigger>
          <TabsTrigger value="id-card" data-testid="tab-id-card">ID Card</TabsTrigger>
          <TabsTrigger value="sso" data-testid="tab-sso">SSO</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-onboarding">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Pre-Onboarding Checklist
                </CardTitle>
                <Button data-testid="button-add-task" onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {onboardingEmployees.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No employees in pre-onboarding phase</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {onboardingEmployees.map(emp => {
                    const empTasks = allOnboardingTasks.filter(t => t.employeeId === emp.id);
                    const empCompleted = empTasks.filter(t => t.status === "completed").length;
                    const empTotal = empTasks.length;
                    const empProgress = empTotal > 0 ? Math.round((empCompleted / empTotal) * 100) : 0;
                    return (
                      <div key={emp.id} className="p-4 bg-slate-50 rounded-lg" data-testid={`onboarding-employee-${emp.id}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {emp.firstName?.[0]}{(emp.lastName || emp.firstName)?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName || ''}</p>
                              <p className="text-sm text-slate-500">Joining: {format(new Date(emp.joinDate), "MMM dd, yyyy")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">{empCompleted}/{empTotal} tasks</span>
                            <Badge className={empProgress === 100 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                              {empProgress === 100 ? "Complete" : "In Progress"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => generateOnboardingLink(emp)}
                              data-testid={`button-send-link-${emp.id}`}
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              Send Link
                            </Button>
                          </div>
                        </div>
                        {empTotal > 0 && <Progress value={empProgress} className="h-2 mb-4" />}
                        {empTasks.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-sm">
                            <p>No tasks assigned yet. Click "Add Task" to create one.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {empTasks.map(task => (
                              <div 
                                key={task.id} 
                                className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-primary/30 transition-colors group"
                                data-testid={`task-item-${task.id}`}
                              >
                                <button
                                  onClick={() => toggleTaskMutation.mutate({ id: task.id, currentStatus: task.status || "pending" })}
                                  className="flex-shrink-0"
                                  data-testid={`button-toggle-task-${task.id}`}
                                >
                                  {task.status === "completed" ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : task.status === "in_progress" ? (
                                    <Clock className="w-5 h-5 text-blue-500" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-300 hover:text-primary" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                    {task.taskName}
                                  </span>
                                  {task.category && task.category !== "general" && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {task.category.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-delete-task-${task.id}`}
                                >
                                  <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="letters">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Letter Templates
                  </CardTitle>
                  <Button 
                    data-testid="button-add-template"
                    onClick={() => {
                      resetTemplateForm();
                      setEditingTemplate(null);
                      setTemplateDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : letterTemplates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No letter templates yet</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {letterTemplates.map(template => (
                      <div key={template.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border hover-elevate">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={template.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
                              {template.status || "active"}
                            </Badge>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => openEditTemplate(template)}
                              data-testid={`button-edit-template-${template.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{template.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          {template.type.charAt(0).toUpperCase() + template.type.slice(1)} letter template
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setPreviewContent(template.content);
                              setPreviewDialogOpen(true);
                            }}
                            data-testid={`button-preview-template-${template.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openGenerateDialog(template)}
                            data-testid={`button-generate-letter-${template.id}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedLetters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" />
                    Generated Letters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Letter Type</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Generated Date</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedLetters.map(letter => {
                          const emp = employees?.find(e => e.id === letter.employeeId);
                          const approvalStatus = (letter as any).approvalStatus || 'pending';
                          return (
                            <tr key={letter.id} className="border-b last:border-0">
                              <td className="py-4 font-medium text-slate-900 dark:text-slate-100">
                                {emp ? `${emp.firstName} ${emp.lastName || ''}` : 'Unknown'}
                              </td>
                              <td className="py-4">
                                <Badge variant="secondary">{letter.letterType}</Badge>
                              </td>
                              <td className="py-4">
                                <Badge className={
                                  approvalStatus === "approved" ? "bg-green-100 text-green-700" :
                                  approvalStatus === "rejected" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }>
                                  {approvalStatus === "approved" ? "accepted" : approvalStatus === "rejected" ? "denied" : approvalStatus}
                                </Badge>
                                {approvalStatus === "rejected" && (letter as any).rejectionReason && (
                                  <p className="text-xs text-red-500 mt-1">{(letter as any).rejectionReason}</p>
                                )}
                              </td>
                              <td className="py-4 text-slate-500">
                                {letter.generatedAt ? format(new Date(letter.generatedAt), "MMM dd, yyyy") : "-"}
                              </td>
                              <td className="py-4">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setPreviewContent(letter.content);
                                      setPreviewDialogOpen(true);
                                    }}
                                    data-testid={`button-preview-letter-${letter.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {approvalStatus === 'pending' && letter.letterType?.toLowerCase() === 'offer' && (
                                    <>
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => {
                                          if (confirm('Accept this letter?')) approveMutation.mutate(letter.id);
                                        }}
                                        disabled={approveMutation.isPending}
                                        data-testid={`button-approve-letter-${letter.id}`}
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Accept
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => {
                                          setRejectingLetterId(letter.id);
                                          setRejectionReason("");
                                          setRejectDialogOpen(true);
                                        }}
                                        data-testid={`button-reject-letter-${letter.id}`}
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Deny
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(`<html><head><title>Letter</title><style>body{font-family:'Times New Roman',serif;font-size:13px;line-height:1.6;padding:40px 60px;color:#000}pre{font-family:'Times New Roman',serif;font-size:13px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;margin:0}@media print{body{padding:20px 40px}}</style></head><body><pre></pre></body></html>`);
                                      printWindow.document.querySelector('pre')!.textContent = letter.content;
                                      printWindow.document.close();
                                      printWindow.print();
                                    }
                                  }}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Onboarding Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onboardingEmployees.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active onboarding workflows</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {onboardingEmployees.map(emp => {
                    const empTasks = allOnboardingTasks.filter(t => t.employeeId === emp.id);
                    const categories = ["documents", "hr_formalities", "it_setup", "training", "general"];
                    const categoryLabels: Record<string, string> = {
                      documents: "Documents",
                      hr_formalities: "HR Formalities",
                      it_setup: "IT Setup",
                      training: "Training",
                      general: "General",
                    };
                    const categoryTasks = categories.map(cat => {
                      const tasks = empTasks.filter(t => (t.category || "general") === cat);
                      const completed = tasks.filter(t => t.status === "completed").length;
                      const total = tasks.length;
                      const status = total === 0 ? "none" : completed === total ? "completed" : tasks.some(t => t.status === "in_progress") ? "in_progress" : completed > 0 ? "in_progress" : "pending";
                      return { category: cat, label: categoryLabels[cat], tasks, completed, total, status };
                    }).filter(c => c.total > 0);

                    const totalTasks = empTasks.length;
                    const totalCompleted = empTasks.filter(t => t.status === "completed").length;
                    const progress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

                    return (
                      <div key={emp.id} className="p-4 bg-slate-50 rounded-lg" data-testid={`workflow-employee-${emp.id}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {emp.firstName?.[0]}{(emp.lastName || emp.firstName)?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName || ''}</p>
                              <p className="text-sm text-slate-500">{emp.designation || "New Joiner"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{Math.round(progress)}%</p>
                            <p className="text-xs text-slate-500">{totalCompleted}/{totalTasks} tasks complete</p>
                          </div>
                        </div>
                        <Progress value={progress} className="h-2 mb-4" />
                        {categoryTasks.length === 0 ? (
                          <p className="text-center text-slate-400 text-sm py-4">No tasks assigned yet</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {categoryTasks.map((cat) => (
                              <div key={cat.category} className={`p-3 rounded-lg text-center ${
                                cat.status === "completed" ? "bg-green-100" :
                                cat.status === "in_progress" ? "bg-blue-100" : "bg-white border"
                              }`}>
                                {cat.status === "completed" ? (
                                  <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
                                ) : cat.status === "in_progress" ? (
                                  <Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                                ) : (
                                  <Circle className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                                )}
                                <p className="text-xs font-medium text-slate-700">{cat.label}</p>
                                <p className="text-xs text-slate-400">{cat.completed}/{cat.total} done</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bgv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Background Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bgvEmployees = employees?.filter(e => e.bgvStatus) || [];
                if (bgvEmployees.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No background verification records found</p>
                      <p className="text-sm mt-1">Set BGV status on employee profiles to track verifications here</p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Employee Code</th>
                          <th className="pb-3 font-medium">Department</th>
                          <th className="pb-3 font-medium">BGV Status</th>
                          <th className="pb-3 font-medium">Join Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bgvEmployees.map(emp => (
                          <tr key={emp.id} className="border-b last:border-0" data-testid={`bgv-row-${emp.id}`}>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                  {emp.firstName?.[0]}{(emp.lastName || emp.firstName)?.[0]}
                                </div>
                                <span className="font-medium text-slate-900">{emp.firstName} {emp.lastName || ''}</span>
                              </div>
                            </td>
                            <td className="py-4 text-sm text-slate-500">{emp.employeeCode || '-'}</td>
                            <td className="py-4 text-sm text-slate-500">{emp.department || '-'}</td>
                            <td className="py-4">
                              <Badge className={
                                emp.bgvStatus === "verified" || emp.bgvStatus === "completed" ? "bg-green-100 text-green-700" :
                                emp.bgvStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                                emp.bgvStatus === "in_progress" ? "bg-blue-100 text-blue-700" :
                                emp.bgvStatus === "failed" ? "bg-red-100 text-red-700" :
                                "bg-slate-100 text-slate-700"
                              }>
                                {emp.bgvStatus?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </Badge>
                            </td>
                            <td className="py-4 text-sm text-slate-500">
                              {emp.joinDate ? format(new Date(emp.joinDate), "MMM dd, yyyy") : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Insurance & Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-400">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Insurance management coming soon</p>
                <p className="text-sm mt-1">Employee insurance plans will be managed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="id-card">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                ID Card Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-400">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ID card management coming soon</p>
                <p className="text-sm mt-1">Employee ID card requests and tracking will be managed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sso">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Single Sign-On Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-400">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>SSO integrations coming soon</p>
                <p className="text-sm mt-1">Workspace integrations will be managed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Onboarding Link
            </DialogTitle>
            <DialogDescription>
              Share this link with {selectedEmployee?.firstName} {selectedEmployee?.lastName} to complete their onboarding.
            </DialogDescription>
          </DialogHeader>
          
          {generatingLink ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={generatedUrl} 
                  readOnly 
                  className="font-mono text-sm"
                  data-testid="input-onboarding-url"
                />
                <Button onClick={copyToClipboard} size="icon" variant="outline" data-testid="button-copy-url">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              {emailSent && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Email sent successfully!</span>
                  </div>
                  <p className="text-green-600 dark:text-green-400 mt-1">
                    Onboarding link has been sent to {selectedEmployee?.email}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {emailSent ? "What happens next:" : "Instructions:"}
                </p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                  <li>This link is valid for 7 days</li>
                  <li>It can only be used once</li>
                  <li>The employee will need to provide personal information and upload documents</li>
                  {!emailSent && <li>Copy the link below and share it manually</li>}
                </ul>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={copyToClipboard} data-testid="button-copy-link">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={(open) => {
        setTemplateDialogOpen(open);
        if (!open) {
          setEditingTemplate(null);
          resetTemplateForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingTemplate ? "Edit Letter Template" : "Create Letter Template"}
            </DialogTitle>
            <DialogDescription>
              Create or modify a letter template. Use placeholders like {"{{employee_name}}"}, {"{{designation}}"}, {"{{department}}"}, {"{{join_date}}"}, {"{{current_date}}"} etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="e.g., Offer Letter"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Letter Type</Label>
                <Select 
                  value={templateForm.type}
                  onValueChange={(value) => setTemplateForm({...templateForm, type: value})}
                >
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offer">Offer Letter</SelectItem>
                    <SelectItem value="appointment">Appointment Letter</SelectItem>
                    <SelectItem value="nda">NDA Agreement</SelectItem>
                    <SelectItem value="confirmation">Probation Confirmation</SelectItem>
                    <SelectItem value="experience">Experience Letter</SelectItem>
                    <SelectItem value="relieving">Relieving Letter</SelectItem>
                    <SelectItem value="promotion">Promotion Letter</SelectItem>
                    <SelectItem value="transfer">Transfer Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input 
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                placeholder="e.g., Offer of Employment"
                data-testid="input-template-subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea 
                value={templateForm.content}
                onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                placeholder="Dear {{employee_name}},

We are pleased to offer you the position of {{designation}} at FCT Energy...

Date: {{current_date}}"
                rows={12}
                className="font-mono text-sm"
                data-testid="textarea-template-content"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-sm">
              <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {["{{employee_name}}", "{{first_name}}", "{{last_name}}", "{{employee_code}}", "{{designation}}", "{{department}}", "{{email}}", "{{phone}}", "{{join_date}}", "{{address}}", "{{city}}", "{{state}}", "{{country}}", "{{current_date}}", "{{company_name}}"].map(p => (
                  <Badge key={p} variant="secondary" className="cursor-pointer" onClick={() => {
                    setTemplateForm({...templateForm, content: templateForm.content + p});
                  }}>
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setTemplateDialogOpen(false);
                setEditingTemplate(null);
                resetTemplateForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTemplate}
                disabled={!templateForm.name || !templateForm.content || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Generate Letter
            </DialogTitle>
            <DialogDescription>
              Select an employee to generate the {selectedTemplate?.name || "letter"} for.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select 
                value={selectedEmployeeForLetter?.toString() || ""}
                onValueChange={(value) => setSelectedEmployeeForLetter(Number(value))}
              >
                <SelectTrigger data-testid="select-employee-for-letter">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName || ''} - {emp.designation || emp.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedTemplate && selectedEmployeeForLetter) {
                    generateLetterMutation.mutate({
                      templateId: selectedTemplate.id,
                      employeeId: selectedEmployeeForLetter
                    });
                  }
                }}
                disabled={!selectedEmployeeForLetter || generateLetterMutation.isPending}
                data-testid="button-confirm-generate"
              >
                {generateLetterMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Letter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Letter Preview
            </DialogTitle>
          </DialogHeader>
          
          <div id="letter-preview-content" className="bg-white border rounded-lg p-8 whitespace-pre-wrap font-serif text-sm leading-relaxed text-black">
            {previewContent}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html><head><title>Letter</title>
                  <style>
                    body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.6; padding: 40px 60px; color: #000; }
                    pre { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; margin: 0; }
                    @media print { body { padding: 20px 40px; } }
                  </style></head>
                  <body><pre></pre></body></html>
                `);
                printWindow.document.querySelector('pre')!.textContent = previewContent;
                printWindow.document.close();
                printWindow.print();
              }
            }}>
              <Eye className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => {
              const blob = new Blob([previewContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'letter.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Onboarding Task
            </DialogTitle>
            <DialogDescription>
              Create a new task for an employee's onboarding checklist.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); createTaskMutation.mutate(); }}>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newTaskEmployeeId} onValueChange={setNewTaskEmployeeId}>
                <SelectTrigger data-testid="select-task-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {onboardingEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName || ''} — {emp.designation || emp.employeeCode}
                    </SelectItem>
                  ))}
                  {onboardingEmployees.length === 0 && employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName || ''} — {emp.designation || emp.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Name</Label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g., Setup email account"
                data-testid="input-task-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                  <SelectTrigger data-testid="select-task-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="hr_formalities">HR Formalities</SelectItem>
                    <SelectItem value="it_setup">IT Setup</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTaskMutation.isPending || !newTaskEmployeeId || !newTaskName} data-testid="button-submit-task">
                {createTaskMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Letter</DialogTitle>
            <DialogDescription>Provide a reason for denying this letter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason for Denial</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for denial..."
                rows={3}
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (rejectingLetterId) {
                  rejectMutation.mutate({ letterId: rejectingLetterId, reason: rejectionReason });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Deny Letter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
