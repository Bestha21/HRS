import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  CalendarPlus, CheckCircle, XCircle, Calendar, Clock, 
  Gift, AlertTriangle, Plus, Shield, FileText,
  CalendarDays, Heart, Baby, Award, Info, Search, Users, User
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, LeaveRequest, Holiday, LeaveType, LeaveBalance } from "@shared/schema";

const LEAVE_POLICY = [
  {
    code: "EL", name: "Earned Leave", entitlement: 18, icon: Gift,
    credited: "End of Quarter", halfDay: true, probation: false,
    onJoining: "Pro-rata basis", maxAtOnce: "As per availability",
    carryForward: "Max 30 days, rest lapsed", encashment: "Yes, on exit",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700"
  },
  {
    code: "CL", name: "Casual Leave", entitlement: 7, icon: Calendar,
    credited: "Bi-Annually (Jan & Jul)", halfDay: true, probation: true,
    onJoining: "Pro-rata basis", maxAtOnce: "Max 02 days",
    carryForward: "No", encashment: "No",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700"
  },
  {
    code: "SL", name: "Sick Leave", entitlement: 7, icon: AlertTriangle,
    credited: "Bi-Annually (Jan & Jul)", halfDay: true, probation: true,
    onJoining: "Pro-rata basis", maxAtOnce: "As per availability",
    carryForward: "No", encashment: "No",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-red-500", bgColor: "bg-red-50", textColor: "text-red-700"
  },
  {
    code: "BL", name: "Bereavement Leave", entitlement: 2, icon: Heart,
    credited: "Per Occurrence", halfDay: true, probation: true,
    onJoining: "-", maxAtOnce: "-",
    carryForward: "No", encashment: "No",
    clubbing: "Yes, with EL", sandwich: "No", noticePeriod: "No",
    color: "bg-slate-500", bgColor: "bg-slate-50", textColor: "text-slate-700"
  },
  {
    code: "PL", name: "Paternity Leave", entitlement: 4, icon: Baby,
    credited: "Per Occurrence", halfDay: false, probation: false,
    onJoining: "-", maxAtOnce: "4 days",
    carryForward: "No", encashment: "No",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700",
    gender: "male"
  },
  {
    code: "ML", name: "Maternity Leave", entitlement: 182, icon: Baby,
    credited: "Per Occurrence", halfDay: false, probation: false,
    onJoining: "-", maxAtOnce: "26 weeks (182 days)",
    carryForward: "No", encashment: "No",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-pink-500", bgColor: "bg-pink-50", textColor: "text-pink-700",
    gender: "female"
  },
  {
    code: "CO", name: "Comp Off", entitlement: null, icon: Award,
    credited: "AM & above", halfDay: true, probation: true,
    onJoining: "-", maxAtOnce: "As per availability",
    carryForward: "Yes", encashment: "No",
    clubbing: "No", sandwich: "No", noticePeriod: "No",
    color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700"
  },
];

const BASE_LEAVE_TYPE_OPTIONS = [
  { value: "earned", label: "Earned Leave (EL)" },
  { value: "casual", label: "Casual Leave (CL)" },
  { value: "sick", label: "Sick Leave (SL)" },
  { value: "bereavement", label: "Bereavement Leave (BL)" },
  { value: "paternity", label: "Paternity Leave (PL)", gender: "male" },
  { value: "maternity", label: "Maternity Leave (ML)", gender: "female" },
  { value: "comp_off", label: "Comp Off (CO)" },
  { value: "lop", label: "Loss of Pay (LOP)" },
];

function getLeaveStatusBadge(status: string | null) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    case 'cancelled':
      return <Badge className="bg-slate-100 text-slate-700">Cancelled</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
  }
}

export default function Leaves() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState("first_half");
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [compOffDialogOpen, setCompOffDialogOpen] = useState(false);
  const [compOffWorkDate, setCompOffWorkDate] = useState("");
  const [compOffHours, setCompOffHours] = useState("8");
  const [compOffReason, setCompOffReason] = useState("");

  const [viewMode, setViewMode] = useState<"self" | "all" | "specific">("self");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: leaves } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leaves"],
  });

  const { data: holidays } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const { data: leaveTypesDb } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const userRoles = (currentEmployee?.accessRole || "employee").split(",").map((r: string) => r.trim());
  const isAdmin = userRoles.includes("admin") || userRoles.includes("hr") || userRoles.includes("hr_manager");
  const isManager = !isAdmin && employees?.some(e => e.reportingManagerId === currentEmployee?.employeeCode);
  const hasReportees = isAdmin || isManager;

  const { data: leaveBalances } = useQuery<LeaveBalance[]>({
    queryKey: [`/api/leave-balances?employeeId=${currentEmployee?.id}`],
    enabled: !!currentEmployee?.id,
  });

  const { data: myCompOffRequests } = useQuery<any[]>({
    queryKey: ["/api/my-comp-off-requests"],
    enabled: !!currentEmployee?.id,
  });

  const { data: compOffBalance } = useQuery<any>({
    queryKey: ["/api/my-comp-off-balance"],
    enabled: !!currentEmployee?.id,
  });

  const { data: allCompOffRequests } = useQuery<any[]>({
    queryKey: ["/api/comp-off-requests"],
    enabled: isAdmin || !!isManager,
  });

  const viewableMembers = useMemo(() => {
    if (!employees || !currentEmployee) return [];
    if (isAdmin) return employees.filter(e => e.status === "active");
    return employees.filter(e => e.status === "active" && e.reportingManagerId === currentEmployee.employeeCode);
  }, [employees, currentEmployee, isAdmin]);

  const filteredSearchMembers = useMemo(() => {
    if (!memberSearch.trim()) return viewableMembers;
    const q = memberSearch.toLowerCase();
    return viewableMembers.filter(e =>
      `${e.firstName} ${e.lastName || ''} ${e.employeeCode || ''} ${e.email || ''}`.toLowerCase().includes(q)
    );
  }, [viewableMembers, memberSearch]);

  const viewTargetEmployee = useMemo(() => {
    if (viewMode === "self") return currentEmployee;
    if (viewMode === "specific" && selectedMemberId) {
      return employees?.find(e => e.id === selectedMemberId) || null;
    }
    return null;
  }, [viewMode, selectedMemberId, currentEmployee, employees]);

  const { data: viewTargetBalances } = useQuery<LeaveBalance[]>({
    queryKey: [`/api/leave-balances?employeeId=${viewTargetEmployee?.id}`],
    enabled: !!viewTargetEmployee?.id && viewMode !== "self",
  });

  const activeBalances = viewMode === "self" ? leaveBalances : viewTargetBalances;

  const leaveTypeCodeMap: Record<string, string> = {
    earned: "EL", casual: "CL", sick: "SL",
    bereavement: "BL", paternity: "PL", maternity: "ML", comp_off: "CO", lop: "LOP"
  };

  const buildBalanceMap = (balances: LeaveBalance[] | undefined, empLeaves: LeaveRequest[]) => {
    const map: Record<string, { used: number; balance: number; total: number }> = {};
    if (balances && balances.length > 0 && leaveTypesDb) {
      for (const bal of balances) {
        const lt = leaveTypesDb.find(t => t.id === bal.leaveTypeId);
        if (lt) {
          const used = parseFloat(bal.used || "0");
          const total = lt.annualAllowance || 0;
          map[lt.code] = {
            used,
            balance: Math.max(total - used, 0),
            total,
          };
        }
      }
    } else if (leaveTypesDb && empLeaves.length > 0) {
      const approvedLeaves = empLeaves.filter(l => l.status === 'approved');
      for (const lt of leaveTypesDb) {
        const usedDays = approvedLeaves
          .filter(l => l.leaveTypeId === lt.id || leaveTypeCodeMap[l.leaveType] === lt.code)
          .reduce((sum, l) => sum + parseFloat(l.days || "1"), 0);
        if (usedDays > 0 || lt.annualAllowance) {
          map[lt.code] = {
            used: usedDays,
            balance: Math.max((lt.annualAllowance || 0) - usedDays, 0),
            total: lt.annualAllowance || 0,
          };
        }
      }
    }
    return map;
  };

  const getViewLeaves = () => {
    if (!leaves) return [];
    if (viewMode === "self") return leaves.filter(l => l.employeeId === currentEmployee?.id);
    if (viewMode === "specific" && selectedMemberId) return leaves.filter(l => l.employeeId === selectedMemberId);
    if (viewMode === "all") {
      if (isAdmin) return leaves;
      return leaves.filter(l => {
        const emp = employees?.find(e => e.id === l.employeeId);
        return emp?.reportingManagerId === currentEmployee?.employeeCode;
      });
    }
    return [];
  };

  const viewLeaves = getViewLeaves();
  const viewBalanceMap = buildBalanceMap(
    activeBalances,
    viewMode === "self" ? viewLeaves : viewLeaves
  );

  const myLeaves = leaves?.filter(l => l.employeeId === currentEmployee?.id) || [];
  const selfBalanceMap = buildBalanceMap(leaveBalances, myLeaves);

  const pendingCompOffs = (allCompOffRequests || []).filter((r: any) => {
    if (r.status !== 'pending') return false;
    if (r.employeeId === currentEmployee?.id) return false;
    if (isAdmin) return true;
    const reqEmp = employees?.find(e => e.id === r.employeeId);
    return reqEmp?.reportingManagerId === currentEmployee?.employeeCode;
  });

  const allPendingRequests = leaves?.filter(l => {
    if (l.status !== 'pending') return false;
    if (!currentEmployee) return false;
    if (l.employeeId === currentEmployee.id) return false;
    if (isAdmin) return true;
    const leaveEmp = employees?.find(e => e.id === l.employeeId);
    return leaveEmp?.reportingManagerId === currentEmployee?.employeeCode;
  }) || [];

  const pendingRequests = viewMode === "specific" && selectedMemberId
    ? allPendingRequests.filter(l => l.employeeId === selectedMemberId)
    : allPendingRequests;

  const teamLeaves = leaves?.filter(l => {
    if (!currentEmployee) return false;
    if (l.employeeId === currentEmployee.id) return false;
    if (isAdmin) return true;
    const leaveEmp = employees?.find(e => e.id === l.employeeId);
    return leaveEmp?.reportingManagerId === currentEmployee?.employeeCode;
  }) || [];

  const employeeGender = currentEmployee?.gender?.toLowerCase() || '';
  const isProbation = (currentEmployee?.employmentStatus || '').toLowerCase() === 'probation';
  const joinDate = currentEmployee?.joinDate ? new Date(currentEmployee.joinDate) : null;
  const daysSinceJoining = joinDate ? Math.floor((new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;

  const leaveTypeOptions = BASE_LEAVE_TYPE_OPTIONS.filter(opt => {
    if (!opt.gender) {
      if (isProbation && ['earned', 'paternity', 'bereavement'].includes(opt.value)) return false;
      if (opt.value === 'earned' && daysSinceJoining < 180) return false;
      return true;
    }
    if (isAdmin) return true;
    if (employeeGender === 'female') {
      if (opt.value === 'maternity' && isProbation) return false;
      return opt.gender === 'female';
    }
    if (opt.value === 'paternity' && isProbation) return false;
    return opt.gender === 'male';
  });

  const filteredLeavePolicy = LEAVE_POLICY.filter((p: any) => {
    if (!p.gender) return true;
    if (isAdmin) return true;
    if (employeeGender === 'female') return p.gender === 'female';
    return p.gender === 'male';
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmployee) throw new Error("Employee not found");
      if (!leaveType || !startDate || !endDate) throw new Error("Please fill all required fields");

      const res = await apiRequest("POST", "/api/leaves", {
        employeeId: currentEmployee.id,
        leaveType,
        startDate,
        endDate,
        reason: reason || "",
        days: isHalfDay ? "0.5" : undefined,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ queryKey: [`/api/leave-balances?employeeId=${currentEmployee?.id}`] });
      setDialogOpen(false);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setIsHalfDay(false);
      toast({ title: "Leave request submitted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit leave", description: err.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) => {
      return apiRequest("PATCH", `/api/leaves/${id}/status`, { status, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith('/api/leave-balances') });
      toast({ title: "Leave status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  });

  const applyCompOffMutation = useMutation({
    mutationFn: async () => {
      if (!compOffWorkDate) throw new Error("Work date is required");
      return apiRequest("POST", "/api/comp-off-requests", {
        workDate: compOffWorkDate,
        hours: compOffHours,
        reason: compOffReason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-requests"] });
      setCompOffDialogOpen(false);
      setCompOffWorkDate("");
      setCompOffHours("8");
      setCompOffReason("");
      toast({ title: "Comp-Off request submitted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit comp-off request", description: err.message, variant: "destructive" });
    }
  });

  const approveCompOffMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/comp-off-requests/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-balance"] });
      queryClient.invalidateQueries({ queryKey: [`/api/leave-balances?employeeId=${currentEmployee?.id}`] });
      toast({ title: "Comp-Off request approved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to approve", description: err.message, variant: "destructive" });
    }
  });

  const rejectCompOffMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: number; remarks?: string }) => {
      return apiRequest("POST", `/api/comp-off-requests/${id}/reject`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-comp-off-balance"] });
      toast({ title: "Comp-Off request rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to reject", description: err.message, variant: "destructive" });
    }
  });

  const getViewCompOffs = () => {
    if (viewMode === "self") return myCompOffRequests || [];
    if (viewMode === "specific" && selectedMemberId) {
      return (allCompOffRequests || []).filter((r: any) => r.employeeId === selectedMemberId);
    }
    if (viewMode === "all") return allCompOffRequests || [];
    return [];
  };

  const viewCompOffs = getViewCompOffs();

  const renderMemberFilter = () => {
    if (!hasReportees) return null;
    return (
      <Card className="mb-4" data-testid="card-member-filter">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-600">View:</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={viewMode === "self" ? "default" : "outline"}
                onClick={() => { setViewMode("self"); setSelectedMemberId(null); setMemberSearch(""); }}
                data-testid="button-view-self"
              >
                <User className="w-3.5 h-3.5 mr-1" /> Self
              </Button>
              <Button
                size="sm"
                variant={viewMode === "all" ? "default" : "outline"}
                onClick={() => { setViewMode("all"); setSelectedMemberId(null); setMemberSearch(""); }}
                data-testid="button-view-all"
              >
                <Users className="w-3.5 h-3.5 mr-1" /> All Members
              </Button>
              <Button
                size="sm"
                variant={viewMode === "specific" ? "default" : "outline"}
                onClick={() => { setViewMode("specific"); setMemberSearch(""); }}
                data-testid="button-view-specific"
              >
                <Search className="w-3.5 h-3.5 mr-1" /> Specific Member
              </Button>
            </div>
            {viewMode === "specific" && (
              <div className="flex-1 min-w-[250px] relative">
                <Input
                  placeholder="Search by name, email or employee code..."
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setSelectedMemberId(null); }}
                  className="h-9"
                  data-testid="input-member-search"
                />
                {memberSearch && !selectedMemberId && filteredSearchMembers.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSearchMembers.map(emp => (
                      <button
                        key={emp.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2"
                        onClick={() => {
                          setSelectedMemberId(emp.id);
                          setMemberSearch(`${emp.firstName} ${emp.lastName || ''} (${emp.employeeCode})`);
                        }}
                        data-testid={`option-member-${emp.id}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <span>{emp.firstName} {emp.lastName || ''}</span>
                        <Badge variant="outline" className="text-xs ml-auto">{emp.employeeCode}</Badge>
                      </button>
                    ))}
                  </div>
                )}
                {memberSearch && !selectedMemberId && filteredSearchMembers.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
                    No members found
                  </div>
                )}
              </div>
            )}
            {viewMode !== "self" && viewTargetEmployee && (
              <Badge variant="secondary" className="text-xs">
                Viewing: {viewTargetEmployee.firstName} {viewTargetEmployee.lastName || ''} ({viewTargetEmployee.employeeCode})
              </Badge>
            )}
            {viewMode === "all" && (
              <Badge variant="secondary" className="text-xs">
                Showing all {isAdmin ? "employees" : "reportees"} ({viewLeaves.length} records)
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBalanceCards = () => {
    if (viewMode === "all") {
      return (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Leave balances are shown per employee. Select <strong>Self</strong> or a <strong>Specific Member</strong> to view individual balances.</span>
        </div>
      );
    }
    if (viewMode === "specific" && !selectedMemberId) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border text-sm text-slate-500 flex items-center gap-2">
          <Search className="w-4 h-4 shrink-0" />
          <span>Search and select a member above to view their leave balances.</span>
        </div>
      );
    }
    const bMap = viewMode === "self" ? selfBalanceMap : viewBalanceMap;
    const showProbationInfo = viewMode === "self" && isProbation;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {filteredLeavePolicy.map(leave => {
          const bal = bMap[leave.code];
          const used = bal?.used || 0;
          const total = bal?.total || leave.entitlement || 0;
          const remaining = bal?.balance ?? (total - used);
          const showProbationLock = showProbationInfo && !leave.probation;
          return (
            <Card key={leave.code} data-testid={`card-balance-${leave.code}`} className={showProbationLock ? "opacity-60" : ""}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">{leave.code}</Badge>
                  <span className="text-xs text-slate-500">{used}/{total || 0}</span>
                </div>
                <p className="text-xs font-medium text-slate-700 mb-2">{leave.name}</p>
                {total > 0 && (
                  <Progress value={total > 0 ? (used / total) * 100 : 0} className="h-1.5" />
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {showProbationLock ? (
                    <span className="text-amber-600 flex items-center gap-1"><Shield className="w-3 h-3" /> Probation</span>
                  ) : (
                    leave.entitlement ? `${remaining} remaining` : 'As applicable'
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Leave Management</h1>
          <p className="text-slate-500">FC TecNergy Pvt. Ltd. - Leave Policy</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-4" onSubmit={(e) => { e.preventDefault(); applyLeaveMutation.mutate(); }}>
              {isProbation && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                  <Shield className="w-4 h-4 inline mr-1" />
                  You are on probation. Only Casual Leave (CL), Sick Leave (SL), Comp Off (CO), and Loss of Pay (LOP) are available.
                </div>
              )}
              {daysSinceJoining < 180 && !isProbation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  Earned Leave (EL) will be available after completing 180 days of service ({180 - daysSinceJoining} days remaining).
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Leave Type</label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypeOptions.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-half-day"
                />
                <label htmlFor="halfDay" className="text-sm font-medium">Half Day</label>
                {isHalfDay && (
                  <Select value={halfDayPeriod} onValueChange={setHalfDayPeriod}>
                    <SelectTrigger className="w-40" data-testid="select-half-day-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half">First Half</SelectItem>
                      <SelectItem value="second_half">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-start-date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="input-end-date" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason..." data-testid="input-reason" />
              </div>
              {leaveType === "sick" && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Medical certificate required for SL (MBBS/MD from registered hospital/clinic with proper sign and seal)
                </div>
              )}
              {leaveType === "bereavement" && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  Applicable to spouse, children, parents and blood relations (siblings)
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={applyLeaveMutation.isPending} data-testid="button-submit-leave">
                  {applyLeaveMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {renderMemberFilter()}
      {renderBalanceCards()}

      <Tabs defaultValue="leaves" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaves" data-testid="tab-leaves">
            {viewMode === "self" ? "My Leaves" : "Leave History"}
          </TabsTrigger>
          {hasReportees && viewMode !== "self" && (
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              Approvals{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}
            </TabsTrigger>
          )}
          <TabsTrigger value="compoff" data-testid="tab-compoff">
            Comp-Off{pendingCompOffs.length > 0 ? ` (${pendingCompOffs.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <div className="space-y-4">
            <Card data-testid="card-leave-history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {viewMode === "self" ? "My Leave History" : viewMode === "all" ? `All ${isAdmin ? "Employee" : "Reportee"} Leave History` : viewTargetEmployee ? `${viewTargetEmployee.firstName} ${viewTargetEmployee.lastName || ''}'s Leave History` : "Select a member"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === "specific" && !selectedMemberId ? (
                  <div className="text-center py-12 text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Search and select a member above to view their leave history</p>
                  </div>
                ) : viewLeaves.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No leave history found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-leaves">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          {viewMode !== "self" && <th className="pb-3 font-medium">Employee</th>}
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Duration</th>
                          <th className="pb-3 font-medium">Days</th>
                          <th className="pb-3 font-medium">Reason</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Applied On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewLeaves.map(leave => {
                          const emp = employees?.find(e => e.id === leave.employeeId);
                          const start = new Date(leave.startDate + 'T00:00:00');
                          const end = new Date(leave.endDate + 'T00:00:00');
                          return (
                            <tr key={leave.id} className="border-b last:border-0" data-testid={`row-leave-${leave.id}`}>
                              {viewMode !== "self" && (
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                      {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">{emp?.firstName} {emp?.lastName}</span>
                                      <p className="text-xs text-slate-400">{emp?.employeeCode}</p>
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td className="py-3">
                                <Badge variant="secondary" className="capitalize">{leave.leaveType}</Badge>
                              </td>
                              <td className="py-3 text-sm text-slate-600">
                                {format(start, 'dd MMM')} - {format(end, 'dd MMM yyyy')}
                              </td>
                              <td className="py-3 font-medium">{leave.days || '1'}</td>
                              <td className="py-3 text-sm text-slate-600 max-w-[200px] truncate">{leave.reason || '-'}</td>
                              <td className="py-3">{getLeaveStatusBadge(leave.status)}</td>
                              <td className="py-3 text-xs text-slate-500">
                                {leave.createdAt ? format(new Date(leave.createdAt), 'dd MMM yyyy') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {hasReportees && (
        <TabsContent value="approvals">
          <div className="space-y-4">
            <Card data-testid="card-pending-approvals">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Approvals ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending requests</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-pending-leaves">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Duration</th>
                          <th className="pb-3 font-medium">Days</th>
                          <th className="pb-3 font-medium">Reason</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRequests.map(leave => {
                          const emp = employees?.find(e => e.id === leave.employeeId);
                          const start = new Date(leave.startDate + 'T00:00:00');
                          const end = new Date(leave.endDate + 'T00:00:00');
                          return (
                            <tr key={leave.id} className="border-b last:border-0" data-testid={`row-pending-${leave.id}`}>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                    {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{emp?.firstName} {emp?.lastName}</p>
                                    <p className="text-xs text-slate-500">{emp?.designation}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <Badge variant="secondary" className="capitalize">{leave.leaveType}</Badge>
                              </td>
                              <td className="py-3 text-sm text-slate-600">
                                {format(start, 'dd MMM')} - {format(end, 'dd MMM yyyy')}
                              </td>
                              <td className="py-3 font-medium">{leave.days || '1'}</td>
                              <td className="py-3 text-sm text-slate-600 max-w-[200px] truncate italic">
                                {leave.reason || '-'}
                              </td>
                              <td className="py-3">
                                {rejectingId === leave.id ? (
                                  <div className="flex flex-col gap-2">
                                    <Input
                                      placeholder="Reason for rejection..."
                                      value={rejectRemarks}
                                      onChange={(e) => setRejectRemarks(e.target.value)}
                                      className="text-sm h-8"
                                      data-testid={`input-reject-remarks-${leave.id}`}
                                    />
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          updateStatusMutation.mutate({ id: leave.id, status: 'rejected', remarks: rejectRemarks });
                                          setRejectingId(null);
                                          setRejectRemarks("");
                                        }}
                                        disabled={updateStatusMutation.isPending}
                                        data-testid={`button-confirm-reject-${leave.id}`}
                                      >
                                        Confirm
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectRemarks(""); }}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => updateStatusMutation.mutate({ id: leave.id, status: 'approved' })}
                                      disabled={updateStatusMutation.isPending}
                                      data-testid={`button-approve-${leave.id}`}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200"
                                      onClick={() => setRejectingId(leave.id)}
                                      disabled={updateStatusMutation.isPending}
                                      data-testid={`button-reject-${leave.id}`}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {pendingCompOffs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Pending Comp-Off Approvals ({pendingCompOffs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Employee</th>
                          <th className="text-left p-2">Work Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Hours</th>
                          <th className="text-left p-2">Days</th>
                          <th className="text-left p-2">Reason</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCompOffs.map((r: any) => {
                          const emp = employees?.find(e => e.id === r.employeeId);
                          return (
                            <tr key={r.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{emp ? `${emp.firstName} ${emp.lastName || ''}` : `Emp #${r.employeeId}`}</td>
                              <td className="p-2">{r.workDate}</td>
                              <td className="p-2 capitalize">{r.workType}</td>
                              <td className="p-2">{r.hours}h</td>
                              <td className="p-2">{r.daysEarned}</td>
                              <td className="p-2 text-muted-foreground max-w-[200px] truncate">{r.reason || '-'}</td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 h-7 px-2"
                                    onClick={() => approveCompOffMutation.mutate(r.id)}
                                    disabled={approveCompOffMutation.isPending}
                                    data-testid={`button-approve-compoff-${r.id}`}>
                                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 h-7 px-2"
                                    onClick={() => rejectCompOffMutation.mutate({ id: r.id })}
                                    disabled={rejectCompOffMutation.isPending}
                                    data-testid={`button-reject-compoff-${r.id}`}>
                                    <XCircle className="w-3 h-3 mr-1" /> Reject
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

            <Card data-testid="card-team-leave-history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Team Leave History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamLeaves.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No team leave records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-team-leaves">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Duration</th>
                          <th className="pb-3 font-medium">Days</th>
                          <th className="pb-3 font-medium">Reason</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Applied On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamLeaves.map(leave => {
                          const emp = employees?.find(e => e.id === leave.employeeId);
                          const start = new Date(leave.startDate + 'T00:00:00');
                          const end = new Date(leave.endDate + 'T00:00:00');
                          return (
                            <tr key={leave.id} className="border-b last:border-0" data-testid={`row-team-leave-${leave.id}`}>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                    {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                                  </div>
                                  <span className="text-sm font-medium">{emp?.firstName} {emp?.lastName}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <Badge variant="secondary" className="capitalize">{leave.leaveType}</Badge>
                              </td>
                              <td className="py-3 text-sm text-slate-600">
                                {format(start, 'dd MMM')} - {format(end, 'dd MMM yyyy')}
                              </td>
                              <td className="py-3 font-medium">{leave.days || '1'}</td>
                              <td className="py-3 text-sm text-slate-600 max-w-[200px] truncate">{leave.reason || '-'}</td>
                              <td className="py-3">{getLeaveStatusBadge(leave.status)}</td>
                              <td className="py-3 text-xs text-slate-500">
                                {leave.createdAt ? format(new Date(leave.createdAt), 'dd MMM yyyy') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        <TabsContent value="compoff">
          <div className="space-y-4">
            {viewMode === "self" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-compoff-available">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{compOffBalance?.available || 0}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-compoff-availed">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{compOffBalance?.availed || 0}</p>
                    <p className="text-xs text-muted-foreground">Availed</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-compoff-expired">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{compOffBalance?.expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expired (60 days)</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-compoff-total">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-700">{compOffBalance?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  {viewMode === "self" ? "My Comp-Off Requests" : viewMode === "all" ? "All Comp-Off Requests" : viewTargetEmployee ? `${viewTargetEmployee.firstName}'s Comp-Off Requests` : "Comp-Off Requests"}
                </CardTitle>
                {viewMode === "self" && (
                  <Dialog open={compOffDialogOpen} onOpenChange={setCompOffDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-request-compoff">
                        <Plus className="w-4 h-4 mr-1" /> Request Comp-Off
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Comp-Off</DialogTitle>
                      </DialogHeader>
                      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); applyCompOffMutation.mutate(); }}>
                        <div>
                          <label className="text-sm font-medium">Date Worked (Weekend/Holiday) *</label>
                          <Input type="date" value={compOffWorkDate} onChange={(e) => setCompOffWorkDate(e.target.value)} required data-testid="input-compoff-date" />
                          <p className="text-xs text-muted-foreground mt-1">Only weekends (Sat/Sun) or company holidays are eligible</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Hours Worked</label>
                          <Select value={compOffHours} onValueChange={setCompOffHours}>
                            <SelectTrigger data-testid="select-compoff-hours">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4.5">4.5 Hours (Half Day)</SelectItem>
                              <SelectItem value="5">5 Hours (Half Day)</SelectItem>
                              <SelectItem value="5.5">5.5 Hours (Half Day)</SelectItem>
                              <SelectItem value="6">6 Hours (Full Day)</SelectItem>
                              <SelectItem value="7">7 Hours (Full Day)</SelectItem>
                              <SelectItem value="8">8 Hours (Full Day)</SelectItem>
                              <SelectItem value="9">9+ Hours (Full Day)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">4.5-5.5 hours = 0.5 day, 6+ hours = 1 full day</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Reason</label>
                          <Textarea value={compOffReason} onChange={(e) => setCompOffReason(e.target.value)} placeholder="Briefly describe the work done" data-testid="input-compoff-reason" />
                        </div>
                        <Button type="submit" className="w-full" disabled={applyCompOffMutation.isPending} data-testid="button-submit-compoff">
                          {applyCompOffMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {viewMode === "specific" && !selectedMemberId ? (
                  <div className="text-center py-8 text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Search and select a member above to view their comp-off requests</p>
                  </div>
                ) : viewCompOffs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No comp-off requests found</p>
                    {viewMode === "self" && <p className="text-xs mt-1">Work on a weekend or holiday? Request a comp-off!</p>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {viewMode !== "self" && <th className="text-left p-2">Employee</th>}
                          <th className="text-left p-2">Work Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Hours</th>
                          <th className="text-left p-2">Days Earned</th>
                          <th className="text-left p-2">Expiry</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewCompOffs.map((r: any) => {
                          const emp = employees?.find(e => e.id === r.employeeId);
                          const isExpired = r.status === 'approved' && !r.availedDate && r.expiryDate && r.expiryDate < format(new Date(), 'yyyy-MM-dd');
                          return (
                            <tr key={r.id} className="border-b hover:bg-muted/50">
                              {viewMode !== "self" && (
                                <td className="p-2 font-medium">{emp ? `${emp.firstName} ${emp.lastName || ''}` : `Emp #${r.employeeId}`}</td>
                              )}
                              <td className="p-2">{r.workDate}</td>
                              <td className="p-2 capitalize">{r.workType}</td>
                              <td className="p-2">{r.hours}h</td>
                              <td className="p-2">{r.daysEarned}</td>
                              <td className="p-2">
                                {r.expiryDate || '-'}
                                {isExpired && <Badge className="ml-1 bg-red-100 text-red-700 text-[10px]">Expired</Badge>}
                              </td>
                              <td className="p-2">{getLeaveStatusBadge(r.status)}</td>
                              <td className="p-2 text-muted-foreground max-w-[200px] truncate">{r.reason || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {viewMode === "self" && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Comp-Off Policy</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Comp-Off is earned when you work on a weekend (Saturday/Sunday) or a company holiday.</li>
                        <li>4.5+ hours of work earns 0.5 day; 6+ hours earns 1 full day.</li>
                        <li>Request must be raised and approved by your reporting manager.</li>
                        <li>Approved comp-off must be availed within <strong>60 days</strong> from the work date, or it expires automatically.</li>
                        <li>Comp-Off balance is reflected in your leave balance under "CO" leave type.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
