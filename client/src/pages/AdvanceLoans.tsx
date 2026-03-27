import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Plus, Eye, CheckCircle, XCircle, AlertTriangle, Search, IndianRupee, Clock, ArrowRight } from "lucide-react";
import type { Loan, Employee } from "@shared/schema";

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    foreclosed: "bg-purple-100 text-purple-800",
  };
  return <Badge className={variants[status] || "bg-gray-100 text-gray-800"} data-testid={`badge-status-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "₹0";
  return `₹${parseFloat(String(val)).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function ApprovalTimeline({ loan, employees }: { loan: Loan; employees: Employee[] }) {
  const getApproverName = (code: string | null | undefined) => {
    if (!code) return '';
    const emp = employees.find(e => e.employeeCode === code);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : code;
  };
  const levels = [
    { label: "Reporting Manager", status: (loan as any).level1Status || 'pending', approvedBy: (loan as any).level1ApprovedBy, approvedAt: (loan as any).level1ApprovedAt, remarks: (loan as any).level1Remarks },
    { label: "VP", status: (loan as any).level2Status || 'pending', approvedBy: (loan as any).level2ApprovedBy, approvedAt: (loan as any).level2ApprovedAt, remarks: (loan as any).level2Remarks },
    { label: "Finance", status: (loan as any).level3Status || 'pending', approvedBy: (loan as any).level3ApprovedBy, approvedAt: (loan as any).level3ApprovedAt, remarks: (loan as any).level3Remarks },
  ];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Approval Workflow</p>
      <div className="flex items-center gap-2">
        {levels.map((level, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              level.status === 'approved' ? 'bg-green-100 text-green-800' :
              level.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {level.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
               level.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
               <Clock className="w-3 h-3" />}
              {level.label}
            </div>
            {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground space-y-1 mt-2">
        {levels.map((level, i) => level.approvedBy && (
          <p key={i}>{level.label}: {level.status === 'approved' ? 'Validated' : 'Rejected'} by {getApproverName(level.approvedBy)}
            {level.approvedAt && ` on ${new Date(level.approvedAt).toLocaleDateString('en-IN')}`}
            {level.remarks && ` — ${level.remarks}`}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AdvanceLoans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });
  const currentEmployee = employees.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const userRoles = (currentEmployee?.accessRole || "employee").split(",").map((r: string) => r.trim());
  const isAdmin = userRoles.includes("admin") || userRoles.includes("hr_manager");
  const isPayrollTeam = userRoles.includes("payroll_team");
  const canManage = isAdmin || isPayrollTeam;

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionRemarks, setActionRemarks] = useState("");
  const [showActionDialog, setShowActionDialog] = useState<{ type: string; level: number; loan: Loan } | null>(null);
  const [showForecloseDialog, setShowForecloseDialog] = useState(false);
  const [foreclosureRemarks, setForeclosureRemarks] = useState("");

  const [newLoan, setNewLoan] = useState({
    employeeId: "",
    amount: "",
    repaymentMonths: "",
    reason: "",
    eligibilityMonths: "",
  });

  const { data: loansData = [], isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const employeeMap = new Map(employees.map(e => [e.id, e]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/loans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setShowNewDialog(false);
      setNewLoan({ employeeId: "", amount: "", repaymentMonths: "", reason: "", eligibilityMonths: "" });
      toast({ title: "Loan application submitted successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const levelActionMutation = useMutation({
    mutationFn: ({ id, level, action, remarks }: { id: number; level: number; action: string; remarks: string }) =>
      apiRequest("POST", `/api/loans/${id}/level${level}`, { action, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setShowActionDialog(null);
      setActionRemarks("");
      toast({ title: "Action completed successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const quickApproveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      apiRequest("POST", `/api/loans/${id}/approve`, { approvedBy: user?.employeeId, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      toast({ title: "Loan approved (all levels)" });
    },
  });

  const quickRejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      apiRequest("POST", `/api/loans/${id}/reject`, { approvedBy: user?.employeeId, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      toast({ title: "Loan rejected" });
    },
  });

  const forecloseMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      apiRequest("POST", `/api/loans/${id}/foreclose`, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      setShowForecloseDialog(false);
      setForeclosureRemarks("");
      toast({ title: "Loan foreclosed" });
    },
  });

  const filteredLoans = loansData.filter((loan) => {
    const emp = employeeMap.get(loan.employeeId);
    const matchesSearch = !searchTerm ||
      emp?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = loansData.filter(l => l.status === "pending").length;
  const activeCount = loansData.filter(l => l.status === "approved").length;
  const totalDisbursed = loansData
    .filter(l => l.status === "approved" || l.status === "completed")
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const totalOutstanding = loansData
    .filter(l => l.status === "approved")
    .reduce((sum, l) => sum + parseFloat(l.remainingBalance || "0"), 0);

  function getCurrentApprovalLevel(loan: any): number {
    if ((loan.level1Status || 'pending') === 'pending') return 1;
    if (loan.level1Status === 'approved' && (loan.level2Status || 'pending') === 'pending') return 2;
    if (loan.level1Status === 'approved' && loan.level2Status === 'approved' && (loan.level3Status || 'pending') === 'pending') return 3;
    return 0;
  }

  function getApprovalLevelLabel(level: number) {
    if (level === 1) return "Reporting Manager";
    if (level === 2) return "VP";
    if (level === 3) return "Finance";
    return "";
  }

  function handleCreateLoan() {
    if (!newLoan.employeeId || !newLoan.amount || !newLoan.repaymentMonths) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const months = parseInt(newLoan.repaymentMonths);
    if (months > 12) {
      toast({ title: "Maximum repayment term is 12 months", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      employeeId: parseInt(newLoan.employeeId),
      type: "loan",
      amount: newLoan.amount,
      repaymentMonths: months,
      reason: newLoan.reason || null,
      eligibilityMonths: newLoan.eligibilityMonths ? parseInt(newLoan.eligibilityMonths) : null,
    });
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-loans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Loans</h1>
          <p className="text-muted-foreground">Manage employee loans with 3-level approval workflow</p>
        </div>
        {canManage && (
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-loan"><Plus className="w-4 h-4 mr-2" /> New Loan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Loan Application</DialogTitle>
                <DialogDescription>Fill in the details. Max repayment: 12 months. Employee must not have an active loan.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employee *</Label>
                  <Select value={newLoan.employeeId} onValueChange={v => setNewLoan(p => ({ ...p, employeeId: v }))}>
                    <SelectTrigger data-testid="select-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.status === "active").map(e => (
                        <SelectItem key={e.id} value={String(e.id)} data-testid={`option-employee-${e.id}`}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (₹) *</Label>
                    <Input type="number" value={newLoan.amount} onChange={e => setNewLoan(p => ({ ...p, amount: e.target.value }))} data-testid="input-amount" />
                  </div>
                  <div>
                    <Label>Repayment Months * (max 12)</Label>
                    <Input type="number" max={12} min={1} value={newLoan.repaymentMonths} onChange={e => {
                      const val = e.target.value;
                      if (parseInt(val) > 12) return;
                      setNewLoan(p => ({ ...p, repaymentMonths: val }));
                    }} data-testid="input-repayment-months" />
                  </div>
                </div>
                <div>
                  <Label>Eligibility (N × Monthly Salary)</Label>
                  <Input type="number" placeholder="e.g. 6 for 6 months salary" value={newLoan.eligibilityMonths} onChange={e => setNewLoan(p => ({ ...p, eligibilityMonths: e.target.value }))} data-testid="input-eligibility" />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={newLoan.reason} onChange={e => setNewLoan(p => ({ ...p, reason: e.target.value }))} placeholder="Purpose of loan" data-testid="input-reason" />
                </div>
                {newLoan.amount && newLoan.repaymentMonths && (
                  <div className="bg-muted p-3 rounded-lg text-sm" data-testid="text-emi-preview">
                    <strong>EMI Preview:</strong> {formatCurrency(parseFloat(newLoan.amount) / parseInt(newLoan.repaymentMonths))} /month for {newLoan.repaymentMonths} months
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                  <strong>Approval Flow:</strong> Reporting Manager (validates) → VP (approves) → Finance (processes)
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)} data-testid="button-cancel-new">Cancel</Button>
                <Button onClick={handleCreateLoan} disabled={createMutation.isPending} data-testid="button-submit-loan">
                  {createMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-pending-count">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-active-count">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Loans</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-total-disbursed">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><IndianRupee className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Disbursed</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalDisbursed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-outstanding">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><Banknote className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>All Loans</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 w-64" placeholder="Search by name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40" data-testid="select-filter-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="foreclosed">Foreclosed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loansLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-loans">
              No loans found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>EMI</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Repaid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Approval Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => {
                  const emp = employeeMap.get(loan.employeeId);
                  const currentLevel = getCurrentApprovalLevel(loan);
                  return (
                    <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${loan.employeeId}`}</p>
                          <p className="text-xs text-muted-foreground">{emp?.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{formatCurrency(loan.emiAmount)}</TableCell>
                      <TableCell>{loan.repaymentMonths} months</TableCell>
                      <TableCell>{formatCurrency(loan.totalRepaid)}</TableCell>
                      <TableCell>{formatCurrency(loan.remainingBalance)}</TableCell>
                      <TableCell>
                        {loan.status === 'pending' && currentLevel > 0 ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map(l => {
                              const lStatus = (loan as any)[`level${l}Status`] || 'pending';
                              return (
                                <div key={l} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  lStatus === 'approved' ? 'bg-green-500 text-white' :
                                  lStatus === 'rejected' ? 'bg-red-500 text-white' :
                                  'bg-gray-200 text-gray-600'
                                }`} title={`${getApprovalLevelLabel(l)}: ${lStatus}`}>
                                  {l}
                                </div>
                              );
                            })}
                            <span className="text-xs text-muted-foreground ml-1">
                              L{currentLevel}: {getApprovalLevelLabel(currentLevel)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(loan.status || "pending")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLoan(loan); setShowDetailDialog(true); }} data-testid={`button-view-${loan.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManage && loan.status === "pending" && (
                            <>
                              {currentLevel > 0 && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-green-600" title={`Approve L${currentLevel}`}
                                    onClick={() => setShowActionDialog({ type: 'approve', level: currentLevel, loan })} data-testid={`button-approve-l${currentLevel}-${loan.id}`}>
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600" title={`Reject L${currentLevel}`}
                                    onClick={() => setShowActionDialog({ type: 'reject', level: currentLevel, loan })} data-testid={`button-reject-l${currentLevel}-${loan.id}`}>
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          {canManage && loan.status === "approved" && (
                            <Button variant="ghost" size="sm" className="text-purple-600" onClick={() => { setSelectedLoan(loan); setShowForecloseDialog(true); }} data-testid={`button-foreclose-${loan.id}`}>
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>View details and approval progress.</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-medium">{(() => { const e = employeeMap.get(selectedLoan.employeeId); return e ? `${e.firstName} ${e.lastName}` : `#${selectedLoan.employeeId}`; })()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {statusBadge(selectedLoan.status || "pending")}
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">EMI</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.emiAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tenure</p>
                  <p className="font-medium">{selectedLoan.repaymentMonths} months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Repaid</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.totalRepaid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.remainingBalance)}</p>
                </div>
                {selectedLoan.startDate && (
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">{selectedLoan.startDate}</p>
                  </div>
                )}
                {selectedLoan.reason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedLoan.reason}</p>
                  </div>
                )}
                {selectedLoan.remarks && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Remarks</p>
                    <p className="font-medium">{selectedLoan.remarks}</p>
                  </div>
                )}
                {selectedLoan.foreclosureDate && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Foreclosure</p>
                    <p className="font-medium">{selectedLoan.foreclosureDate} — {selectedLoan.foreclosureRemarks}</p>
                  </div>
                )}
              </div>
              <ApprovalTimeline loan={selectedLoan} employees={employees} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showActionDialog} onOpenChange={() => { setShowActionDialog(null); setActionRemarks(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showActionDialog?.type === 'approve' ? 'Approve' : 'Reject'} — Level {showActionDialog?.level} ({showActionDialog ? getApprovalLevelLabel(showActionDialog.level) : ''})
            </DialogTitle>
            <DialogDescription>
              {showActionDialog?.type === 'approve'
                ? `Approve this loan at Level ${showActionDialog?.level} (${showActionDialog ? getApprovalLevelLabel(showActionDialog.level) : ''}).`
                : `Reject this loan. The application will be marked as rejected.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Loan of {formatCurrency(showActionDialog?.loan?.amount)} for {showActionDialog?.loan?.repaymentMonths} months
            </p>
            <Textarea placeholder="Remarks (optional)" value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} data-testid="input-action-remarks" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(null)}>Cancel</Button>
            <Button
              variant={showActionDialog?.type === 'reject' ? 'destructive' : 'default'}
              onClick={() => {
                if (showActionDialog) {
                  levelActionMutation.mutate({
                    id: showActionDialog.loan.id,
                    level: showActionDialog.level,
                    action: showActionDialog.type,
                    remarks: actionRemarks,
                  });
                }
              }}
              disabled={levelActionMutation.isPending}
              data-testid="button-confirm-action"
            >
              {levelActionMutation.isPending ? "Processing..." : showActionDialog?.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForecloseDialog} onOpenChange={setShowForecloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foreclose Loan</DialogTitle>
            <DialogDescription>Close this loan early. The remaining balance will be marked as settled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Outstanding: {formatCurrency(selectedLoan?.remainingBalance)}</p>
            <Textarea placeholder="Foreclosure remarks" value={foreclosureRemarks} onChange={e => setForeclosureRemarks(e.target.value)} data-testid="input-foreclosure-remarks" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForecloseDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedLoan && forecloseMutation.mutate({ id: selectedLoan.id, remarks: foreclosureRemarks })} disabled={forecloseMutation.isPending} data-testid="button-confirm-foreclose">
              {forecloseMutation.isPending ? "Processing..." : "Foreclose"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
