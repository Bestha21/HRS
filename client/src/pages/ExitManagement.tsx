import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, UserX, ClipboardList, CheckCircle2, Clock, FileText,
  MessageSquare, DollarSign, Laptop, CreditCard,
  Key, Shield, Users, Calendar, ArrowRight, Check, AlertCircle,
  IndianRupee, Building2, X
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { ExitRecord, Employee, ClearanceTask } from "@shared/schema";
import { useState } from "react";

const exitSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  exitType: z.string().min(1, "Exit type is required"),
  resignationDate: z.string().min(1, "Resignation date is required"),
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  noticePeriodDays: z.string().optional(),
  reason: z.string().optional(),
});

type ExitFormData = z.infer<typeof exitSchema>;

const deptIcons: Record<string, any> = {
  IT: Laptop,
  Admin: CreditCard,
  Finance: IndianRupee,
  HR: Users,
  Security: Shield,
};

export default function ExitManagement() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedExitId, setSelectedExitId] = useState<number | null>(null);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewRecordId, setInterviewRecordId] = useState<number | null>(null);
  const [interviewNotes, setInterviewNotes] = useState("");
  const [addClearanceOpen, setAddClearanceOpen] = useState(false);
  const [newClearanceDept, setNewClearanceDept] = useState("");
  const [newClearanceTask, setNewClearanceTask] = useState("");

  const { data: exitRecords, isLoading } = useQuery<ExitRecord[]>({
    queryKey: ["/api/exit-records"],
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

  const { data: clearanceTasks } = useQuery<ClearanceTask[]>({
    queryKey: ["/api/clearance-tasks", selectedExitId],
    enabled: !!selectedExitId,
    queryFn: async () => {
      const res = await fetch(`/api/clearance-tasks/${selectedExitId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clearance tasks");
      return res.json();
    },
  });

  const form = useForm<ExitFormData>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      employeeId: "",
      exitType: "",
      resignationDate: format(new Date(), "yyyy-MM-dd"),
      lastWorkingDate: "",
      noticePeriodDays: "30",
      reason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExitFormData) => 
      apiRequest("POST", "/api/exit-records", {
        employeeId: parseInt(data.employeeId),
        exitType: data.exitType,
        resignationDate: data.resignationDate,
        lastWorkingDate: data.lastWorkingDate,
        noticePeriodDays: parseInt(data.noticePeriodDays || "30"),
        reason: data.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exit-records"] });
      toast({ title: "Exit record created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create exit record", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, clearanceStatus }: { id: number; clearanceStatus: string }) =>
      apiRequest("PATCH", `/api/exit-records/${id}/status`, { clearanceStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exit-records"] });
      toast({ title: "Status updated successfully" });
    },
  });

  const updateClearanceTaskMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
      apiRequest("PATCH", `/api/clearance-tasks/${id}`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-tasks", selectedExitId] });
      toast({ title: "Clearance task updated" });
    },
  });

  const addClearanceTaskMutation = useMutation({
    mutationFn: ({ exitRecordId, department, taskName }: { exitRecordId: number; department: string; taskName: string }) =>
      apiRequest("POST", "/api/clearance-tasks", { exitRecordId, department, taskName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-tasks", selectedExitId] });
      toast({ title: "Clearance task added" });
      setAddClearanceOpen(false);
      setNewClearanceDept("");
      setNewClearanceTask("");
    },
  });

  const deleteClearanceTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/clearance-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-tasks", selectedExitId] });
      toast({ title: "Clearance task removed" });
    },
  });

  const interviewMutation = useMutation({
    mutationFn: ({ id, exitInterviewDone, exitInterviewNotes }: { id: number; exitInterviewDone: boolean; exitInterviewNotes: string }) =>
      apiRequest("PATCH", `/api/exit-records/${id}/interview`, { exitInterviewDone, exitInterviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exit-records"] });
      toast({ title: "Exit interview updated" });
      setInterviewDialogOpen(false);
      setInterviewNotes("");
    },
  });

  const fnfMutation = useMutation({
    mutationFn: ({ id, fnfStatus, fnfAmount }: { id: number; fnfStatus: string; fnfAmount?: string }) =>
      apiRequest("PATCH", `/api/exit-records/${id}/fnf`, { fnfStatus, fnfAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exit-records"] });
      toast({ title: "F&F status updated" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "approved": return "bg-green-100 text-green-700";
      case "calculated": return "bg-blue-100 text-blue-700";
      case "paid": return "bg-emerald-100 text-emerald-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  const getExitTypeLabel = (type: string) => {
    switch (type) {
      case "resignation": return "Resignation";
      case "termination": return "Termination";
      case "retirement": return "Retirement";
      case "absconding": return "Absconding";
      default: return type;
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const getEmployeeDesignation = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp?.designation || "";
  };

  const pendingCount = exitRecords?.filter(e => e.clearanceStatus === "pending").length || 0;
  const inProgressCount = exitRecords?.filter(e => e.clearanceStatus === "in_progress").length || 0;
  const completedCount = exitRecords?.filter(e => e.clearanceStatus === "completed").length || 0;

  const selectedExitRecord = exitRecords?.find(r => r.id === selectedExitId);
  const clearanceCompletedCount = clearanceTasks?.filter(t => t.status === "completed").length || 0;
  const clearanceTotalCount = clearanceTasks?.length || 0;
  const clearanceProgress = clearanceTotalCount > 0 ? Math.round((clearanceCompletedCount / clearanceTotalCount) * 100) : 0;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exit & Offboarding Management</h1>
          <p className="text-slate-500">Manage resignations, clearances, and settlements</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-initiate-exit">
              <Plus className="w-4 h-4 mr-2" />
              Initiate Exit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Employee Exit</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.filter(e => e.status === "active").map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.firstName} {emp.lastName} - {emp.designation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exit Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-exit-type">
                            <SelectValue placeholder="Select exit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="resignation">Resignation</SelectItem>
                          <SelectItem value="termination">Termination</SelectItem>
                          <SelectItem value="retirement">Retirement</SelectItem>
                          <SelectItem value="absconding">Absconding</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="resignationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resignation Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-resignation-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastWorkingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Working Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-lwd" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="noticePeriodDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice Period (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-notice-period" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Reason for leaving..." {...field} data-testid="input-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-exit">
                  {createMutation.isPending ? "Processing..." : "Initiate Exit"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Exits</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-total-exits">{exitRecords?.length || 0}</p>
              </div>
              <UserX className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Clearance</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-count">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-inprogress-count">{inProgressCount}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-count">{completedCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="workflow" data-testid="tab-workflow">Resignation Workflow</TabsTrigger>
          <TabsTrigger value="clearance" data-testid="tab-clearance">Exit Clearance</TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">Exit Interviews</TabsTrigger>
          <TabsTrigger value="fnf" data-testid="tab-fnf">F&F Settlement</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resignation & Termination Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Exit Process Flow</h4>
                <div className="flex items-center justify-between text-sm">
                  {[
                    { step: "Resignation", icon: FileText },
                    { step: "Manager Approval", icon: Check },
                    { step: "HR Review", icon: Users },
                    { step: "Clearance", icon: ClipboardList },
                    { step: "F&F Settlement", icon: DollarSign },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-blue-700 mt-2 text-center max-w-16">{item.step}</p>
                      </div>
                      {idx < 4 && <ArrowRight className="w-5 h-5 text-blue-400 mx-2" />}
                    </div>
                  ))}
                </div>
              </div>

              {!exitRecords?.length ? (
                <div className="text-center py-8">
                  <UserX className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-400">No exit records found</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Initiate Exit" to start an offboarding process</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exitRecords.map((record) => (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-lg border" data-testid={`exit-record-${record.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <UserX className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{getEmployeeName(record.employeeId)}</p>
                            <p className="text-sm text-slate-500">{getEmployeeDesignation(record.employeeId)}</p>
                            <Badge variant="secondary" className="mt-1">{getExitTypeLabel(record.exitType)}</Badge>
                            {record.reason && (
                              <p className="text-sm text-slate-500 mt-2">"{record.reason}"</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Resignation: {record.resignationDate ? format(new Date(record.resignationDate + "T00:00:00"), "MMM dd, yyyy") : "-"}
                              </span>
                              <span>LWD: {record.lastWorkingDate ? format(new Date(record.lastWorkingDate + "T00:00:00"), "MMM dd, yyyy") : "-"}</span>
                              <span>Notice: {record.noticePeriodDays} days</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(record.clearanceStatus || "pending")}>
                            {record.clearanceStatus || "pending"}
                          </Badge>
                          {record.clearanceStatus === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200"
                                onClick={() => updateStatusMutation.mutate({ id: record.id, clearanceStatus: "rejected" })}
                                data-testid={`button-reject-${record.id}`}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: record.id, clearanceStatus: "in_progress" })}
                                data-testid={`button-approve-${record.id}`}
                              >
                                Approve
                              </Button>
                            </div>
                          )}
                          {record.clearanceStatus === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({ id: record.id, clearanceStatus: "completed" })}
                              data-testid={`button-complete-${record.id}`}
                            >
                              Mark Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Exit Clearance Process
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!exitRecords?.length ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-400">No exit records to process clearance for</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Select Exit Record</label>
                    <Select
                      value={selectedExitId?.toString() || ""}
                      onValueChange={(v) => setSelectedExitId(Number(v))}
                    >
                      <SelectTrigger data-testid="select-clearance-exit">
                        <SelectValue placeholder="Select an employee exit record" />
                      </SelectTrigger>
                      <SelectContent>
                        {exitRecords.map((record) => (
                          <SelectItem key={record.id} value={record.id.toString()}>
                            {getEmployeeName(record.employeeId)} - {getExitTypeLabel(record.exitType)} ({record.clearanceStatus})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedExitRecord && (
                    <>
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-semibold text-slate-900">{getEmployeeName(selectedExitRecord.employeeId)} - Exit Clearance</p>
                            <p className="text-sm text-slate-500">
                              Last Working Day: {selectedExitRecord.lastWorkingDate
                                ? format(new Date(selectedExitRecord.lastWorkingDate + "T00:00:00"), "MMM dd, yyyy")
                                : "Not set"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Overall Progress</p>
                            <div className="flex items-center gap-2">
                              <Progress value={clearanceProgress} className="w-32 h-2" />
                              <span className="text-sm font-medium">{clearanceProgress}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end mb-4">
                        <Dialog open={addClearanceOpen} onOpenChange={setAddClearanceOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" data-testid="button-add-clearance-task">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Clearance Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Clearance Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Department</label>
                                <Select value={newClearanceDept} onValueChange={setNewClearanceDept}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="IT">IT</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Finance">Finance</SelectItem>
                                    <SelectItem value="HR">HR</SelectItem>
                                    <SelectItem value="Security">Security</SelectItem>
                                    <SelectItem value="Reporting Manager">Reporting Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Task Name</label>
                                <Input
                                  value={newClearanceTask}
                                  onChange={(e) => setNewClearanceTask(e.target.value)}
                                  placeholder="e.g., Return company vehicle"
                                />
                              </div>
                              <Button
                                className="w-full"
                                disabled={!newClearanceDept || !newClearanceTask || addClearanceTaskMutation.isPending}
                                onClick={() => {
                                  if (selectedExitId) {
                                    addClearanceTaskMutation.mutate({
                                      exitRecordId: selectedExitId,
                                      department: newClearanceDept,
                                      taskName: newClearanceTask,
                                    });
                                  }
                                }}
                              >
                                {addClearanceTaskMutation.isPending ? "Adding..." : "Add Task"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {!clearanceTasks?.length ? (
                        <div className="text-center py-6">
                          <p className="text-slate-400">No clearance tasks found for this exit record</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {clearanceTasks.map((task) => {
                            const IconComp = deptIcons[task.department] || Building2;
                            return (
                              <div key={task.id} className="flex items-center justify-between p-4 bg-white border rounded-lg" data-testid={`clearance-task-${task.id}`}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    task.status === "completed" ? "bg-green-100 text-green-600" :
                                    task.status === "not_applicable" ? "bg-slate-100 text-slate-400" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    <IconComp className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{task.taskName}</p>
                                    <p className="text-sm text-slate-500">{task.department}</p>
                                    {task.remarks && <p className="text-xs text-slate-400 mt-1">{task.remarks}</p>}
                                    {task.completedAt && (
                                      <p className="text-xs text-green-600 mt-1">
                                        Completed: {format(new Date(task.completedAt), "MMM dd, yyyy")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className={getStatusColor(task.status || "pending")}>
                                    {task.status || "pending"}
                                  </Badge>
                                  {task.status === "pending" && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => updateClearanceTaskMutation.mutate({ id: task.id, status: "completed" })}
                                        data-testid={`button-complete-task-${task.id}`}
                                      >
                                        Complete
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-slate-400"
                                        onClick={() => updateClearanceTaskMutation.mutate({ id: task.id, status: "not_applicable" })}
                                      >
                                        N/A
                                      </Button>
                                    </div>
                                  )}
                                  {task.status === "completed" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-yellow-600"
                                      onClick={() => updateClearanceTaskMutation.mutate({ id: task.id, status: "pending" })}
                                    >
                                      Reopen
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-600 h-8 w-8"
                                    onClick={() => deleteClearanceTaskMutation.mutate(task.id)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                          <p className="text-2xl font-bold text-green-600" data-testid="text-clearance-completed">
                            {clearanceTasks?.filter(t => t.status === "completed").length || 0}
                          </p>
                          <p className="text-sm text-green-700">Completed</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                          <p className="text-2xl font-bold text-slate-600">
                            {clearanceTasks?.filter(t => t.status === "not_applicable").length || 0}
                          </p>
                          <p className="text-sm text-slate-600">N/A</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                          <p className="text-2xl font-bold text-yellow-600" data-testid="text-clearance-pending">
                            {clearanceTasks?.filter(t => t.status === "pending").length || 0}
                          </p>
                          <p className="text-sm text-yellow-700">Pending</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Exit Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!exitRecords?.length ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-400">No exit records to conduct interviews for</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exitRecords.map((record) => (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-lg border" data-testid={`interview-record-${record.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{getEmployeeName(record.employeeId)}</p>
                          <p className="text-sm text-slate-500">{getEmployeeDesignation(record.employeeId)} - {getExitTypeLabel(record.exitType)}</p>
                        </div>
                        <Badge className={record.exitInterviewDone ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                          {record.exitInterviewDone ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 mb-3">
                        <span>LWD: {record.lastWorkingDate ? format(new Date(record.lastWorkingDate + "T00:00:00"), "MMM dd, yyyy") : "-"}</span>
                      </div>
                      {record.exitInterviewNotes && (
                        <div className="p-3 bg-white rounded border mb-3">
                          <p className="text-sm text-slate-600 font-medium mb-1">Interview Notes:</p>
                          <p className="text-sm text-slate-500">{record.exitInterviewNotes}</p>
                        </div>
                      )}
                      {!record.exitInterviewDone ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setInterviewRecordId(record.id);
                            setInterviewNotes("");
                            setInterviewDialogOpen(true);
                          }}
                          data-testid={`button-conduct-interview-${record.id}`}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Conduct Interview
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-yellow-600"
                          onClick={() => {
                            interviewMutation.mutate({ id: record.id, exitInterviewDone: false, exitInterviewNotes: "" });
                          }}
                        >
                          Reset Interview
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conduct Exit Interview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Record notes from the exit interview with{" "}
                  <span className="font-medium text-slate-700">
                    {interviewRecordId ? getEmployeeName(exitRecords?.find(r => r.id === interviewRecordId)?.employeeId || 0) : ""}
                  </span>
                </p>
                <div>
                  <label className="text-sm font-medium">Interview Notes</label>
                  <Textarea
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    placeholder="Reason for leaving, feedback about the organization, suggestions for improvement..."
                    rows={6}
                    data-testid="input-interview-notes"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={interviewMutation.isPending}
                  onClick={() => {
                    if (interviewRecordId) {
                      interviewMutation.mutate({
                        id: interviewRecordId,
                        exitInterviewDone: true,
                        exitInterviewNotes: interviewNotes,
                      });
                    }
                  }}
                  data-testid="button-submit-interview"
                >
                  {interviewMutation.isPending ? "Saving..." : "Mark Interview Complete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="fnf">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Full & Final Settlement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!exitRecords?.length ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-400">No exit records for F&F settlement</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {exitRecords.map((record) => (
                    <div key={record.id} className="p-6 bg-slate-50 rounded-lg border" data-testid={`fnf-record-${record.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {getEmployeeName(record.employeeId).split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{getEmployeeName(record.employeeId)}</p>
                            <p className="text-sm text-slate-500">
                              LWD: {record.lastWorkingDate ? format(new Date(record.lastWorkingDate + "T00:00:00"), "MMM dd, yyyy") : "-"}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(record.fnfStatus || "pending")}>
                          F&F: {record.fnfStatus || "pending"}
                        </Badge>
                      </div>

                      {record.fnfAmount && (
                        <div className="p-4 bg-white rounded-lg border-2 border-primary/20 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">Net Settlement Amount</p>
                              <p className="text-3xl font-bold text-primary">
                                Rs. {Number(record.fnfAmount).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <h4 className="font-medium text-slate-700 mb-3">Settlement Workflow</h4>
                        <div className="flex items-center justify-between">
                          {[
                            { step: "Initiated", status: "completed" },
                            { step: "Clearance", status: record.clearanceStatus === "completed" ? "completed" : (record.clearanceStatus === "in_progress" ? "current" : "pending") },
                            { step: "Calculated", status: record.fnfStatus === "calculated" || record.fnfStatus === "approved" || record.fnfStatus === "paid" ? "completed" : (record.clearanceStatus === "completed" ? "current" : "pending") },
                            { step: "Approved", status: record.fnfStatus === "approved" || record.fnfStatus === "paid" ? "completed" : (record.fnfStatus === "calculated" ? "current" : "pending") },
                            { step: "Paid", status: record.fnfStatus === "paid" ? "completed" : (record.fnfStatus === "approved" ? "current" : "pending") },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  item.status === "completed" ? "bg-green-600 text-white" :
                                  item.status === "current" ? "bg-blue-600 text-white" :
                                  "bg-slate-200 text-slate-500"
                                }`}>
                                  {item.status === "completed" ? <Check className="w-4 h-4" /> : (i + 1)}
                                </div>
                                <p className={`text-xs mt-1 ${item.status === "current" ? "text-blue-600 font-medium" : "text-slate-500"}`}>
                                  {item.step}
                                </p>
                              </div>
                              {i < 4 && (
                                <div className={`w-12 h-0.5 mx-1 ${
                                  item.status === "completed" ? "bg-green-600" : "bg-slate-200"
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        {record.fnfStatus === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fnfMutation.mutate({ id: record.id, fnfStatus: "calculated" })}
                            data-testid={`button-calculate-fnf-${record.id}`}
                          >
                            Mark as Calculated
                          </Button>
                        )}
                        {record.fnfStatus === "calculated" && (
                          <Button
                            size="sm"
                            onClick={() => fnfMutation.mutate({ id: record.id, fnfStatus: "approved" })}
                            data-testid={`button-approve-fnf-${record.id}`}
                          >
                            Approve F&F
                          </Button>
                        )}
                        {record.fnfStatus === "approved" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => fnfMutation.mutate({ id: record.id, fnfStatus: "paid" })}
                            data-testid={`button-pay-fnf-${record.id}`}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
