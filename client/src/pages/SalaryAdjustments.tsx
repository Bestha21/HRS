import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEntity } from "@/lib/entityContext";
import type { Employee } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, X, Clock, ArrowUpRight, History, FileText, IndianRupee, CircleDot } from "lucide-react";

interface SalaryAdjustment {
  id: number;
  employeeId: number;
  adjustmentType: string;
  month: string;
  year: number;
  amount: string;
  lopDaysReversed: string;
  leaveTypeUsed: string | null;
  leaveDaysDeducted: string | null;
  reason: string;
  supportingInfo: string | null;
  status: string;
  requestedBy: number;
  approvedBy: number | null;
  approvedAt: string | null;
  approvalRemarks: string | null;
  processedInMonth: string | null;
  processedInYear: number | null;
  payrollId: number | null;
  createdAt: string;
}

interface LeaveType {
  id: number;
  name: string;
  code: string;
}

interface LeaveBalance {
  id: number;
  leaveTypeId: number;
  balance: string;
  used: string;
  year: number;
}

interface HrActionLogEntry {
  id: number;
  action: string;
  module: string;
  referenceId: number | null;
  referenceType: string | null;
  employeeId: number | null;
  performedBy: number;
  performedByName: string | null;
  details: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function SalaryAdjustments() {
  const { toast } = useToast();
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const [createOpen, setCreateOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState<SalaryAdjustment | null>(null);
  const [processDialog, setProcessDialog] = useState<SalaryAdjustment | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [procMonth, setProcMonth] = useState(months[new Date().getMonth()]);
  const [procYear, setProcYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    employeeId: 0, adjustmentType: "arrear_lop_reversal", month: "", year: new Date().getFullYear(),
    amount: "", lopDaysReversed: "", leaveTypeUsed: "", leaveDaysDeducted: "", reason: "", supportingInfo: "",
  });

  const { data: adjustments = [], isLoading } = useQuery<SalaryAdjustment[]>({
    queryKey: ["/api/salary-adjustments"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: empLeaveBalances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave-balances", form.employeeId],
    queryFn: async () => {
      if (!form.employeeId) return [];
      const res = await fetch(`/api/leave-balances?employeeId=${form.employeeId}`, { credentials: "include" });
      return res.json();
    },
    enabled: form.employeeId > 0,
  });

  const { data: lopInfo } = useQuery<{ lopDays: number; lopAmount: number; grossSalary: number; perDaySalary: number; lopLeaveUsed: number }>({
    queryKey: ["/api/salary-adjustments/lop-info", form.employeeId, form.month, form.year],
    queryFn: async () => {
      const res = await fetch(`/api/salary-adjustments/lop-info?employeeId=${form.employeeId}&month=${form.month}&year=${form.year}`, { credentials: "include" });
      return res.json();
    },
    enabled: form.employeeId > 0 && !!form.month && form.year > 0 && form.adjustmentType === "arrear_lop_reversal",
  });

  const { data: actionLogs = [] } = useQuery<HrActionLogEntry[]>({
    queryKey: ["/api/hr-action-log", "salary_adjustments"],
    queryFn: async () => {
      const res = await fetch("/api/hr-action-log?module=salary_adjustments", { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/salary-adjustments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-action-log"] });
      toast({ title: "Adjustment request created" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: "Failed to create", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number; status: string; remarks: string }) =>
      apiRequest("PATCH", `/api/salary-adjustments/${id}/approve`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-action-log"] });
      toast({ title: "Adjustment updated" });
      setApproveDialog(null);
      setApprovalRemarks("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, processedInMonth, processedInYear }: { id: number; processedInMonth: string; processedInYear: number }) =>
      apiRequest("PATCH", `/api/salary-adjustments/${id}/process`, { processedInMonth, processedInYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-action-log"] });
      toast({ title: "Marked as processed" });
      setProcessDialog(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => setForm({ employeeId: 0, adjustmentType: "arrear_lop_reversal", month: "", year: new Date().getFullYear(), amount: "", lopDaysReversed: "", leaveTypeUsed: "", leaveDaysDeducted: "", reason: "", supportingInfo: "" });

  const getEmpName = (id: number) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Emp #${id}`;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending Approval" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      processed: { variant: "secondary", label: "Processed in Payroll" },
    };
    const cfg = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={cfg.variant} data-testid={`badge-status-${status}`}>{cfg.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      arrear_lop_reversal: "Arrear (LOP Reversal)",
      arrear_salary_revision: "Arrear (Salary Revision)",
      bonus: "Bonus / Incentive",
      deduction_correction: "Deduction Correction",
      other: "Other Adjustment",
    };
    return map[type] || type;
  };

  const pending = adjustments.filter(a => a.status === "pending");
  const approved = adjustments.filter(a => a.status === "approved");
  const all = adjustments;

  const filteredEmployees = empSearch
    ? employees.filter(e => e.status === "active" && (`${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) || e.employeeCode?.toLowerCase().includes(empSearch.toLowerCase()) || e.email?.toLowerCase().includes(empSearch.toLowerCase())))
    : [];

  return (
    <div className="p-6 space-y-6" data-testid="page-salary-adjustments">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" data-testid="text-page-title">Salary Adjustments & Arrears</h1>
          <p className="text-sm text-slate-500 mt-1">Manage LOP reversals, arrears, and salary corrections with approval tracking</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-adjustment">
          <Plus className="w-4 h-4 mr-2" /> New Adjustment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-stat-pending">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">{pending.length}</p><p className="text-xs text-slate-500">Pending Approval</p></div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-approved">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Check className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{approved.length}</p><p className="text-xs text-slate-500">Approved (Pending Process)</p></div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-processed">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{adjustments.filter(a => a.status === "processed").length}</p><p className="text-xs text-slate-500">Processed</p></div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-total">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><IndianRupee className="w-5 h-5 text-slate-600" /></div>
            <div><p className="text-2xl font-bold">{adjustments.filter(a => a.status !== "rejected").reduce((s, a) => s + Number(a.amount || 0), 0).toLocaleString('en-IN')}</p><p className="text-xs text-slate-500">Total Amount</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">All Requests</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {renderTable(pending, true, false)}
        </TabsContent>
        <TabsContent value="approved">
          {renderTable(approved, false, true)}
        </TabsContent>
        <TabsContent value="all">
          {renderTable(all, false, false)}
        </TabsContent>
        <TabsContent value="audit">
          {renderAuditLog()}
        </TabsContent>
      </Tabs>

      {renderCreateDialog()}
      {renderApproveDialog()}
      {renderProcessDialog()}
    </div>
  );

  function renderTable(data: SalaryAdjustment[], showApproveActions: boolean, showProcessAction: boolean) {
    if (isLoading) return <div className="text-center py-12 text-slate-400">Loading...</div>;
    if (data.length === 0) return (
      <Card><CardContent className="text-center py-12 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No adjustment requests found</p>
      </CardContent></Card>
    );
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-adjustments">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500 bg-slate-50">
                  <th className="p-3 font-medium">Employee</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">For Month</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">LOP Days</th>
                  <th className="p-3 font-medium">Reason</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Requested By</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(adj => (
                  <tr key={adj.id} className="border-b last:border-0 hover:bg-slate-50" data-testid={`row-adj-${adj.id}`}>
                    <td className="p-3 font-medium text-sm">{getEmpName(adj.employeeId)}</td>
                    <td className="p-3 text-sm">{getTypeLabel(adj.adjustmentType)}</td>
                    <td className="p-3 text-sm">{adj.month} {adj.year}</td>
                    <td className="p-3 text-sm font-medium text-green-700">Rs. {Number(adj.amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sm">{Number(adj.lopDaysReversed) > 0 ? adj.lopDaysReversed : "-"}</td>
                    <td className="p-3 text-sm max-w-[200px] truncate" title={adj.reason}>{adj.reason}</td>
                    <td className="p-3">{getStatusBadge(adj.status)}</td>
                    <td className="p-3 text-sm text-slate-500">{getEmpName(adj.requestedBy)}</td>
                    <td className="p-3 text-sm text-slate-500">{new Date(adj.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {showApproveActions && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => { setApproveDialog(adj); setApprovalRemarks(""); }} data-testid={`button-approve-${adj.id}`}>
                              <Check className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setApproveDialog(adj); setApprovalRemarks(""); }} data-testid={`button-reject-${adj.id}`}>
                              <X className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {showProcessAction && (
                          <Button size="sm" variant="outline" onClick={() => setProcessDialog(adj)} data-testid={`button-process-${adj.id}`}>
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Process
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderAuditLog() {
    if (actionLogs.length === 0) return (
      <Card><CardContent className="text-center py-12 text-slate-400">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No audit records yet</p>
      </CardContent></Card>
    );
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> HR Action Audit Trail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {actionLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50" data-testid={`audit-row-${log.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <CircleDot className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                      {log.oldValue && log.newValue && (
                        <p className="text-xs mt-1"><span className="text-red-500 line-through">{log.oldValue}</span> <span className="mx-1">→</span> <span className="text-green-600">{log.newValue}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400 shrink-0">
                    <p>{log.performedByName || `User #${log.performedBy}`}</p>
                    <p>{new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderCreateDialog() {
    return (
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Salary Adjustment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <div className="relative">
                <Input placeholder="Search by name, code, or email..." value={empSearch} onChange={e => { setEmpSearch(e.target.value); setForm({ ...form, employeeId: 0 }); }} data-testid="input-emp-search" />
                {form.employeeId > 0 && (
                  <div className="mt-1 text-sm text-green-700 font-medium">Selected: {getEmpName(form.employeeId)}</div>
                )}
                {empSearch && form.employeeId === 0 && filteredEmployees.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredEmployees.slice(0, 10).map(emp => (
                      <button key={emp.id} className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm" onClick={() => { setForm({ ...form, employeeId: emp.id }); setEmpSearch(`${emp.firstName} ${emp.lastName}`); }}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Adjustment Type *</Label>
              <Select value={form.adjustmentType} onValueChange={v => setForm({ ...form, adjustmentType: v })}>
                <SelectTrigger data-testid="select-adj-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arrear_lop_reversal">Arrear - LOP Reversal</SelectItem>
                  <SelectItem value="arrear_salary_revision">Arrear - Salary Revision</SelectItem>
                  <SelectItem value="bonus">Bonus / Incentive</SelectItem>
                  <SelectItem value="deduction_correction">Deduction Correction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>For Month *</Label>
                <Select value={form.month} onValueChange={v => setForm({ ...form, month: v })}>
                  <SelectTrigger data-testid="select-month"><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year *</Label>
                <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} data-testid="input-year" />
              </div>
            </div>
            {form.adjustmentType === "arrear_lop_reversal" && lopInfo && form.employeeId > 0 && form.month && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2" data-testid="lop-info-panel">
                <p className="text-xs font-semibold text-blue-800">LOP Details for {form.month} {form.year}</p>
                {lopInfo.lopDays > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">LOP Days:</span><span className="font-bold text-red-600">{lopInfo.lopDays}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">LOP Deduction:</span><span className="font-bold text-red-600">Rs. {lopInfo.lopAmount.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Per Day Salary:</span><span className="font-medium">Rs. {lopInfo.perDaySalary.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Total LOP (Year):</span><span className="font-medium">{lopInfo.lopLeaveUsed} days</span></div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-600">No LOP days found for this month.</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (Rs.) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder={lopInfo && lopInfo.perDaySalary > 0 ? `Per day: Rs. ${lopInfo.perDaySalary}` : "e.g. 2500"} data-testid="input-amount" />
              </div>
              <div>
                <Label>LOP Days Reversed</Label>
                <Input type="number" step="0.5" value={form.lopDaysReversed} onChange={e => setForm({ ...form, lopDaysReversed: e.target.value })} placeholder={lopInfo && lopInfo.lopDays > 0 ? `Max: ${lopInfo.lopDays}` : "e.g. 1"} data-testid="input-lop-days" />
              </div>
            </div>
            {form.adjustmentType === "arrear_lop_reversal" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-amber-800">Leave Balance Deduction (Required for LOP Reversal)</p>
                <p className="text-xs text-amber-600">Select which leave type to deduct from. The reversed LOP days will be deducted from this leave balance.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Leave Type to Use *</Label>
                    <Select value={form.leaveTypeUsed} onValueChange={v => setForm({ ...form, leaveTypeUsed: v })}>
                      <SelectTrigger data-testid="select-leave-type"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                      <SelectContent>
                        {leaveTypes.filter(lt => lt.code !== 'LOP').map(lt => {
                          const bal = empLeaveBalances.find(b => b.leaveTypeId === lt.id);
                          const available = bal ? (Number(bal.balance) - Number(bal.used)) : 0;
                          return (
                            <SelectItem key={lt.id} value={lt.code} disabled={available <= 0}>
                              {lt.name} ({lt.code}) — {available > 0 ? `${available} days available` : 'No balance'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Days to Deduct *</Label>
                    <Input type="number" step="0.5" value={form.leaveDaysDeducted} onChange={e => setForm({ ...form, leaveDaysDeducted: e.target.value })} placeholder="e.g. 1" data-testid="input-leave-days-deduct" />
                  </div>
                </div>
                {form.employeeId > 0 && empLeaveBalances.length > 0 && (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-medium">Current Balances:</p>
                    <div className="flex flex-wrap gap-2">
                      {leaveTypes.filter(lt => lt.code !== 'LOP').map(lt => {
                        const bal = empLeaveBalances.find(b => b.leaveTypeId === lt.id);
                        const available = bal ? (Number(bal.balance) - Number(bal.used)) : 0;
                        return <span key={lt.id} className={`px-2 py-0.5 rounded ${available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>{lt.code}: {available}</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Reason / Justification *</Label>
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="e.g. Employee had 1 LOP in Feb but regularization was approved in March after cycle lock. Arrears for 1 day salary." data-testid="input-reason" />
            </div>
            <div>
              <Label>Supporting Information</Label>
              <Textarea value={form.supportingInfo} onChange={e => setForm({ ...form, supportingInfo: e.target.value })} rows={2} placeholder="e.g. Regularization approved on 15-Mar-2026, Email ref: Subject line..." data-testid="input-supporting" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.employeeId || !form.month || !form.amount || !form.reason || (form.adjustmentType === "arrear_lop_reversal" && (!form.leaveTypeUsed || !form.leaveDaysDeducted)) || createMutation.isPending} data-testid="button-submit-adjustment">
                {createMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function renderApproveDialog() {
    if (!approveDialog) return null;
    const adj = approveDialog;
    return (
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Adjustment Request</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
              <div><span className="text-slate-500">Employee:</span> <span className="font-medium">{getEmpName(adj.employeeId)}</span></div>
              <div><span className="text-slate-500">Type:</span> <span className="font-medium">{getTypeLabel(adj.adjustmentType)}</span></div>
              <div><span className="text-slate-500">Month:</span> <span className="font-medium">{adj.month} {adj.year}</span></div>
              <div><span className="text-slate-500">Amount:</span> <span className="font-medium text-green-700">Rs. {Number(adj.amount).toLocaleString('en-IN')}</span></div>
              {Number(adj.lopDaysReversed) > 0 && <div><span className="text-slate-500">LOP Days:</span> <span className="font-medium">{adj.lopDaysReversed}</span></div>}
            </div>
            <div><span className="text-slate-500">Reason:</span> <p className="mt-1">{adj.reason}</p></div>
            {adj.supportingInfo && <div><span className="text-slate-500">Supporting Info:</span> <p className="mt-1">{adj.supportingInfo}</p></div>}
            <div>
              <Label>Approval Remarks</Label>
              <Textarea value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} rows={2} placeholder="Add your remarks..." data-testid="input-approval-remarks" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => approveMutation.mutate({ id: adj.id, status: "rejected", remarks: approvalRemarks })} disabled={approveMutation.isPending} data-testid="button-confirm-reject">
                Reject
              </Button>
              <Button onClick={() => approveMutation.mutate({ id: adj.id, status: "approved", remarks: approvalRemarks })} disabled={approveMutation.isPending} data-testid="button-confirm-approve">
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function renderProcessDialog() {
    if (!processDialog) return null;
    return (
      <Dialog open={!!processDialog} onOpenChange={() => setProcessDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Processed in Payroll</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>This adjustment of <strong>Rs. {Number(processDialog.amount).toLocaleString('en-IN')}</strong> for <strong>{getEmpName(processDialog.employeeId)}</strong> will be marked as processed.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Processed in Month</Label>
                <Select value={procMonth} onValueChange={setProcMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={procYear} onChange={e => setProcYear(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setProcessDialog(null)}>Cancel</Button>
              <Button onClick={() => processMutation.mutate({ id: processDialog.id, processedInMonth: procMonth, processedInYear: procYear })} disabled={processMutation.isPending} data-testid="button-confirm-process">
                Mark as Processed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
