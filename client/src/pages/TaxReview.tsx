import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  FileCheck, Search, CheckCircle2, XCircle, Clock, IndianRupee,
  User, Filter, AlertCircle, FileText, Eye, Unlock
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import type { Employee, TaxDeclaration } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

export default function TaxReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [reviewDialog, setReviewDialog] = useState<TaxDeclaration | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: declarations, isLoading } = useQuery<TaxDeclaration[]>({
    queryKey: ["/api/tax-declarations"],
  });

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks: string }) => {
      await apiRequest("PATCH", `/api/tax-declarations/${id}/review`, {
        status,
        reviewedBy: currentEmployee?.id,
        reviewRemarks: remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations"] });
      setReviewDialog(null);
      setReviewRemarks("");
      toast({ title: "Review Saved", description: "Tax declaration review has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update review status.", variant: "destructive" });
    },
  });

  const unlockRegimeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      await apiRequest("POST", `/api/tax-declarations/unlock-regime/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-declarations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Regime Unlocked", description: "The employee's tax regime has been unlocked and declarations reset to pending." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unlock tax regime.", variant: "destructive" });
    },
  });

  const getEmployeeName = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : `Employee #${employeeId}`;
  };

  const getEmployeeCode = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp?.employeeCode || '';
  };

  const getEmployeeDept = (employeeId: number) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp?.designation || '';
  };

  const getReviewerName = (reviewerId: number | null) => {
    if (!reviewerId) return '';
    const emp = employees?.find(e => e.id === reviewerId);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : '';
  };

  const filteredDeclarations = declarations?.filter(dec => {
    if (statusFilter !== "all" && dec.status !== statusFilter) return false;
    if (sectionFilter !== "all" && dec.section !== sectionFilter) return false;
    if (searchQuery) {
      const empName = getEmployeeName(dec.employeeId).toLowerCase();
      const empCode = getEmployeeCode(dec.employeeId).toLowerCase();
      const q = searchQuery.toLowerCase();
      if (!empName.includes(q) && !empCode.includes(q) && !dec.section.toLowerCase().includes(q) && !dec.investmentType.toLowerCase().includes(q)) return false;
    }
    return true;
  }) || [];

  const pendingCount = declarations?.filter(d => d.status === "pending").length || 0;
  const approvedCount = declarations?.filter(d => d.status === "approved").length || 0;
  const rejectedCount = declarations?.filter(d => d.status === "rejected").length || 0;
  const totalAmount = declarations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

  const uniqueSections = Array.from(new Set(declarations?.map(d => d.section) || [])).sort();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading tax declarations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tax Declaration Review</h1>
          <p className="text-muted-foreground">Review and approve employee tax exemption documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Declared</p>
                <p className="text-2xl font-bold text-foreground">Rs. {Math.round(totalAmount).toLocaleString()}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Employee Tax Declarations
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee or section..."
                  className="pl-8 w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-declarations"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-36" data-testid="select-section-filter">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {uniqueSections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeclarations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No declarations found</p>
              <p className="text-sm">
                {declarations?.length === 0 
                  ? "No tax declarations have been submitted by employees yet." 
                  : "No declarations match your current filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeclarations.map((dec) => (
                <div key={dec.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border" data-testid={`review-declaration-${dec.id}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{getEmployeeName(dec.employeeId)}</span>
                      {getEmployeeCode(dec.employeeId) && (
                        <Badge variant="outline" className="text-xs">{getEmployeeCode(dec.employeeId)}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{getEmployeeDept(dec.employeeId)}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">Section {dec.section}</Badge>
                      <span className="text-sm text-foreground">{dec.investmentType}</span>
                      {dec.otherDetails && <span className="text-xs text-muted-foreground">({dec.otherDetails})</span>}
                    </div>
                    {dec.submittedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {format(new Date(dec.submittedAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">Rs. {parseFloat(dec.amount).toLocaleString()}</p>
                    <Badge className={
                      dec.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1" :
                      dec.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-1" :
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 mt-1"
                    }>
                      {dec.status === "approved" ? "Approved" : dec.status === "rejected" ? "Rejected" : "Pending"}
                    </Badge>
                    {dec.reviewedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {getReviewerName(dec.reviewedBy)}
                      </p>
                    )}
                    {dec.reviewRemarks && (
                      <p className="text-xs text-muted-foreground">"{dec.reviewRemarks}"</p>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setReviewDialog(dec); setReviewRemarks(dec.reviewRemarks || ""); }}
                      data-testid={`button-review-${dec.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    {(dec.status === "approved" || dec.status === "submitted") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={() => {
                          if (confirm(`Unlock tax regime for ${getEmployeeName(dec.employeeId)}? This will reset their regime selection and set all submitted/approved declarations back to pending.`)) {
                            unlockRegimeMutation.mutate(dec.employeeId);
                          }
                        }}
                        disabled={unlockRegimeMutation.isPending}
                        data-testid={`button-unlock-regime-${dec.id}`}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        Unlock
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) setReviewDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Review Tax Declaration
            </DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Employee</span>
                  <span className="text-sm font-medium text-foreground">{getEmployeeName(reviewDialog.employeeId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Employee Code</span>
                  <span className="text-sm font-medium text-foreground">{getEmployeeCode(reviewDialog.employeeId) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Designation</span>
                  <span className="text-sm font-medium text-foreground">{getEmployeeDept(reviewDialog.employeeId) || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Section</span>
                  <span className="text-sm font-medium text-foreground">{reviewDialog.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Investment Type</span>
                  <span className="text-sm font-medium text-foreground">{reviewDialog.investmentType}</span>
                </div>
                {reviewDialog.otherDetails && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Details</span>
                    <span className="text-sm font-medium text-foreground">{reviewDialog.otherDetails}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Declared Amount</span>
                  <span className="text-sm font-bold text-foreground">Rs. {parseFloat(reviewDialog.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Financial Year</span>
                  <span className="text-sm font-medium text-foreground">{reviewDialog.financialYear}</span>
                </div>
                {reviewDialog.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Submitted On</span>
                    <span className="text-sm font-medium text-foreground">{format(new Date(reviewDialog.submittedAt), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Status</span>
                  <Badge className={
                    reviewDialog.status === "approved" ? "bg-green-100 text-green-700" :
                    reviewDialog.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }>
                    {reviewDialog.status === "approved" ? "Approved" : reviewDialog.status === "rejected" ? "Rejected" : "Pending"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Review Remarks</Label>
                <Textarea
                  placeholder="Add remarks for the employee (optional)..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  data-testid="textarea-review-remarks"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="destructive"
                  onClick={() => reviewMutation.mutate({ id: reviewDialog.id, status: "rejected", remarks: reviewRemarks })}
                  disabled={reviewMutation.isPending}
                  data-testid="button-reject-declaration"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate({ id: reviewDialog.id, status: "approved", remarks: reviewRemarks })}
                  disabled={reviewMutation.isPending}
                  data-testid="button-approve-declaration"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
