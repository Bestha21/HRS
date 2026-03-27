import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Scale, FileText, Plus, Trash2, Edit, Download, Printer, Search,
  Building2, MapPin, IndianRupee, AlertCircle, CheckCircle, Loader2, Landmark
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee, PtRule, LwfRule } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function StatutoryCompliance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Statutory Compliance</h1>
        <p className="text-slate-600">Manage Professional Tax, Labour Welfare Fund rules, and Form 16 generation</p>
      </div>

      <Tabs defaultValue="pt-rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pt-rules" data-testid="tab-pt-rules">Professional Tax</TabsTrigger>
          <TabsTrigger value="lwf-rules" data-testid="tab-lwf-rules">Labour Welfare Fund</TabsTrigger>
          <TabsTrigger value="form16" data-testid="tab-form16">Form 16</TabsTrigger>
        </TabsList>

        <TabsContent value="pt-rules"><PTRulesTab /></TabsContent>
        <TabsContent value="lwf-rules"><LWFRulesTab /></TabsContent>
        <TabsContent value="form16"><Form16Tab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PTRulesTab() {
  const { toast } = useToast();
  const [filterState, setFilterState] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({ state: "", slabFrom: "", slabTo: "", ptAmount: "", frequency: "monthly" });

  const { data: rules = [], isLoading } = useQuery<PtRule[]>({
    queryKey: ["/api/pt-rules"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pt-rules/seed-defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-rules"] });
      toast({ title: "PT rules seeded for all states" });
    },
    onError: (err: Error) => toast({ title: "Failed to seed", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pt-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-rules"] });
      toast({ title: "PT rule added" });
      setAddOpen(false);
      setNewRule({ state: "", slabFrom: "", slabTo: "", ptAmount: "", frequency: "monthly" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pt-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-rules"] });
      toast({ title: "PT rule deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/pt-rules/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pt-rules"] }),
  });

  const states = [...new Set(rules.map(r => r.state))].sort();
  const filtered = filterState === "all" ? rules : rules.filter(r => r.state === filterState);
  const groupedByState: Record<string, PtRule[]> = {};
  filtered.forEach(r => {
    if (!groupedByState[r.state]) groupedByState[r.state] = [];
    groupedByState[r.state].push(r);
  });

  const num = (v: any) => Number(v || 0);
  const fmt = (v: any) => num(v).toLocaleString("en-IN");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Professional Tax Rules (State-wise Slab Table)
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-44" data-testid="select-pt-state-filter">
                <MapPin className="w-4 h-4 mr-1" />
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {rules.length === 0 && (
              <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-pt">
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Seed Default Rules
              </Button>
            )}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-add-pt-rule">
                  <Plus className="w-4 h-4 mr-1" /> Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add PT Rule</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>State</Label>
                    <Input value={newRule.state} onChange={e => setNewRule({ ...newRule, state: e.target.value })} placeholder="e.g. Karnataka" data-testid="input-pt-state" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Slab From (₹)</Label>
                      <Input type="number" value={newRule.slabFrom} onChange={e => setNewRule({ ...newRule, slabFrom: e.target.value })} data-testid="input-pt-slab-from" />
                    </div>
                    <div>
                      <Label>Slab To (₹)</Label>
                      <Input type="number" value={newRule.slabTo} onChange={e => setNewRule({ ...newRule, slabTo: e.target.value })} data-testid="input-pt-slab-to" />
                    </div>
                  </div>
                  <div>
                    <Label>PT Amount (₹/month)</Label>
                    <Input type="number" value={newRule.ptAmount} onChange={e => setNewRule({ ...newRule, ptAmount: e.target.value })} data-testid="input-pt-amount" />
                  </div>
                  <Button onClick={() => createMutation.mutate(newRule)} disabled={!newRule.state || !newRule.slabFrom || !newRule.slabTo || !newRule.ptAmount} data-testid="button-save-pt-rule">
                    Save Rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Scale className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No PT rules configured</p>
            <p className="text-sm mt-1">Click "Seed Default Rules" to load PT slabs for major Indian states</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByState).sort().map(([state, slabs]) => (
              <div key={state} className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{state}</span>
                    <Badge variant="secondary">{slabs.length} slabs</Badge>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gross Salary From</TableHead>
                      <TableHead>Gross Salary To</TableHead>
                      <TableHead>PT Amount/Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slabs.map(rule => (
                      <TableRow key={rule.id} data-testid={`pt-rule-${rule.id}`}>
                        <TableCell>₹{fmt(rule.slabFrom)}</TableCell>
                        <TableCell>{num(rule.slabTo) >= 99999999 ? "& above" : `₹${fmt(rule.slabTo)}`}</TableCell>
                        <TableCell className="font-semibold">₹{fmt(rule.ptAmount)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.isActive ?? true}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
                            data-testid={`switch-pt-${rule.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)} data-testid={`button-delete-pt-${rule.id}`}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LWFRulesTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    state: "", employeeContribution: "", employerContribution: "",
    frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: ""
  });

  const { data: rules = [], isLoading } = useQuery<LwfRule[]>({
    queryKey: ["/api/lwf-rules"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lwf-rules/seed-defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lwf-rules"] });
      toast({ title: "LWF rules seeded" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/lwf-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lwf-rules"] });
      toast({ title: "LWF rule added" });
      setAddOpen(false);
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/lwf-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lwf-rules"] });
      toast({ title: "LWF rule deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/lwf-rules/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lwf-rules"] }),
  });

  const num = (v: any) => Number(v || 0);
  const fmt = (v: any) => num(v).toLocaleString("en-IN");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Labour Welfare Fund (LWF) Rules
          </CardTitle>
          <div className="flex items-center gap-3">
            {rules.length === 0 && (
              <Button size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-lwf">
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Seed Default Rules
              </Button>
            )}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-add-lwf-rule">
                  <Plus className="w-4 h-4 mr-1" /> Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add LWF Rule</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>State</Label>
                    <Input value={newRule.state} onChange={e => setNewRule({ ...newRule, state: e.target.value })} placeholder="e.g. Karnataka" data-testid="input-lwf-state" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employee Contribution (₹)</Label>
                      <Input type="number" value={newRule.employeeContribution} onChange={e => setNewRule({ ...newRule, employeeContribution: e.target.value })} data-testid="input-lwf-emp" />
                    </div>
                    <div>
                      <Label>Employer Contribution (₹)</Label>
                      <Input type="number" value={newRule.employerContribution} onChange={e => setNewRule({ ...newRule, employerContribution: e.target.value })} data-testid="input-lwf-empr" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Frequency</Label>
                      <Select value={newRule.frequency} onValueChange={v => setNewRule({ ...newRule, frequency: v })}>
                        <SelectTrigger data-testid="select-lwf-freq"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Applicable Months</Label>
                      <Input value={newRule.applicableMonths} onChange={e => setNewRule({ ...newRule, applicableMonths: e.target.value })} placeholder="e.g. 6,12" data-testid="input-lwf-months" />
                    </div>
                  </div>
                  <div>
                    <Label>Gross Salary Threshold (₹, 0=no limit)</Label>
                    <Input type="number" value={newRule.grossSalaryThreshold} onChange={e => setNewRule({ ...newRule, grossSalaryThreshold: e.target.value })} data-testid="input-lwf-threshold" />
                  </div>
                  <Button onClick={() => createMutation.mutate(newRule)} disabled={!newRule.state || !newRule.employeeContribution || !newRule.employerContribution} data-testid="button-save-lwf-rule">
                    Save Rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Landmark className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No LWF rules configured</p>
            <p className="text-sm mt-1">Click "Seed Default Rules" to load LWF contributions for major Indian states</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Employee (₹)</TableHead>
                <TableHead className="text-right">Employer (₹)</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Applicable Months</TableHead>
                <TableHead className="text-right">Gross Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id} data-testid={`lwf-rule-${rule.id}`}>
                  <TableCell className="font-medium">{rule.state}</TableCell>
                  <TableCell className="text-right">₹{fmt(rule.employeeContribution)}</TableCell>
                  <TableCell className="text-right">₹{fmt(rule.employerContribution)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rule.frequency}</Badge>
                  </TableCell>
                  <TableCell>{rule.applicableMonths || "-"}</TableCell>
                  <TableCell className="text-right">{num(rule.grossSalaryThreshold) > 0 ? `₹${fmt(rule.grossSalaryThreshold)}` : "No limit"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive ?? true}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
                      data-testid={`switch-lwf-${rule.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)} data-testid={`button-delete-lwf-${rule.id}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Form16Tab() {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [form16Data, setForm16Data] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  const fetchForm16 = async () => {
    if (!selectedEmployee) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/form16/${selectedEmployee}/${financialYear}`);
      if (!res.ok) throw new Error("Failed to fetch Form 16 data");
      const data = await res.json();
      setForm16Data(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const printForm16 = () => {
    if (!form16Data) return;
    const d = form16Data;
    const e = d.employee;
    const b = d.partB;
    const pw = window.open('', '_blank');
    if (!pw) return;

    const fmt = (v: number) => v.toLocaleString("en-IN");

    pw.document.write(`<html><head><title>Form 16 - ${e.name} - ${d.financialYear}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
      h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
      h2 { font-size: 13px; text-align: center; color: #555; margin-top: 2px; }
      h3 { font-size: 12px; margin: 15px 0 8px; border-bottom: 2px solid #334155; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { border: 1px solid #ddd; padding: 4px 8px; font-size: 10px; }
      th { background: #f1f5f9; font-weight: 600; text-align: left; }
      .right { text-align: right; }
      .bold { font-weight: 700; }
      .section { margin-bottom: 20px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
      .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; }
      .info-label { color: #666; font-size: 10px; }
      .info-value { font-weight: 600; font-size: 10px; }
      .total-row { background: #f8fafc; font-weight: 700; }
      .highlight { background: #eff6ff; }
      @media print { body { margin: 10mm; } @page { size: A4; margin: 10mm; } }
    </style></head><body>
    <h1>FORM No. 16</h1>
    <h2>[See rule 31(1)(a)]</h2>
    <h2>Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary</h2>
    
    <div class="section">
      <h3>Part A — Details of Tax Deducted & Deposited</h3>
      <div class="info-grid">
        <div>
          <div class="info-row"><span class="info-label">Employer Name</span><span class="info-value">${d.employer.name}</span></div>
          <div class="info-row"><span class="info-label">TAN of Employer</span><span class="info-value">${d.employer.tan}</span></div>
          <div class="info-row"><span class="info-label">PAN of Employer</span><span class="info-value">${d.employer.pan}</span></div>
        </div>
        <div>
          <div class="info-row"><span class="info-label">Employee Name</span><span class="info-value">${e.name}</span></div>
          <div class="info-row"><span class="info-label">PAN of Employee</span><span class="info-value">${e.panNumber || "N/A"}</span></div>
          <div class="info-row"><span class="info-label">Employee Code</span><span class="info-value">${e.employeeCode || "N/A"}</span></div>
          <div class="info-row"><span class="info-label">Designation</span><span class="info-value">${e.designation || "N/A"}</span></div>
        </div>
      </div>
      <div class="info-row"><span class="info-label">Financial Year</span><span class="info-value">${d.financialYear}</span></div>
      <div class="info-row"><span class="info-label">Assessment Year</span><span class="info-value">${d.assessmentYear}</span></div>
      <div class="info-row"><span class="info-label">Period of Employment</span><span class="info-value">From ${e.joinDate || "N/A"} to 31-Mar-${2000 + parseInt(d.financialYear.split("-")[1])}</span></div>

      <h3 style="margin-top:15px">Summary of tax deducted at source</h3>
      <table>
        <thead><tr><th>Quarter</th><th class="right">Amount of Tax Deducted (₹)</th><th class="right">Amount of Tax Deposited (₹)</th></tr></thead>
        <tbody>
          ${d.partA.monthlyBreakdown.map((m: any) => `<tr><td>${MONTHS[parseInt(m.month) - 1] || m.month} ${m.year}</td><td class="right">${fmt(m.tds)}</td><td class="right">${fmt(m.tds)}</td></tr>`).join('')}
          <tr class="total-row"><td>Total</td><td class="right">${fmt(d.partA.totalTDSDeducted)}</td><td class="right">${fmt(d.partA.totalTDSDeposited)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Part B — Details of Salary Paid and Tax Deducted</h3>
      
      <table>
        <thead><tr><th colspan="2">1. Gross Salary</th></tr></thead>
        <tbody>
          <tr><td>(a) Salary as per provisions contained in section 17(1)</td><td class="right bold">₹${fmt(b.grossSalary)}</td></tr>
          <tr><td style="padding-left:30px">— Basic Salary</td><td class="right">₹${fmt(b.earnings.basic)}</td></tr>
          <tr><td style="padding-left:30px">— House Rent Allowance (HRA)</td><td class="right">₹${fmt(b.earnings.hra)}</td></tr>
          <tr><td style="padding-left:30px">— Dearness Allowance (DA)</td><td class="right">₹${fmt(b.earnings.da)}</td></tr>
          <tr><td style="padding-left:30px">— Conveyance Allowance</td><td class="right">₹${fmt(b.earnings.conveyance)}</td></tr>
          <tr><td style="padding-left:30px">— Communication Allowance</td><td class="right">₹${fmt(b.earnings.communication)}</td></tr>
          <tr><td style="padding-left:30px">— Medical Allowance</td><td class="right">₹${fmt(b.earnings.medical)}</td></tr>
          <tr><td style="padding-left:30px">— Variable Pay</td><td class="right">₹${fmt(b.earnings.variablePay)}</td></tr>
          ${b.earnings.other > 0 ? `<tr><td style="padding-left:30px">— Other Allowances</td><td class="right">₹${fmt(b.earnings.other)}</td></tr>` : ""}
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="2">2. Less: Allowances to the extent exempt under section 10</th></tr></thead>
        <tbody>
          <tr class="total-row"><td>3. Balance (1 - 2)</td><td class="right">₹${fmt(b.grossSalary)}</td></tr>
          <tr><td>4. Deductions under section 16</td><td class="right"></td></tr>
          <tr><td style="padding-left:20px">(a) Standard Deduction u/s 16(ia)</td><td class="right">₹${fmt(b.standardDeduction)}</td></tr>
          <tr><td style="padding-left:20px">(b) Entertainment Allowance u/s 16(ii)</td><td class="right">₹0</td></tr>
          <tr><td style="padding-left:20px">(c) Professional Tax u/s 16(iii)</td><td class="right">₹${fmt(b.professionalTax)}</td></tr>
          <tr class="total-row"><td>5. Income chargeable under the head "Salaries" (3 - 4)</td><td class="right">₹${fmt(b.incomeFromSalary)}</td></tr>
          <tr class="total-row"><td>6. Gross Total Income (5)</td><td class="right">₹${fmt(b.grossTotalIncome)}</td></tr>
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="3">7. Deductions under Chapter VI-A</th></tr></thead>
        <tbody>
          <tr><th>Section</th><th class="right">Gross Amount (₹)</th><th class="right">Deductible Amount (₹)</th></tr>
          <tr><td>(a) Section 80C (PF, LIC, PPF, ELSS, etc.)</td><td class="right">${fmt(b.deductions.section80C.declared)}</td><td class="right">${fmt(b.deductions.section80C.applied)}</td></tr>
          <tr><td>(b) Section 80D (Medical Insurance)</td><td class="right">${fmt(b.deductions.section80D.declared)}</td><td class="right">${fmt(b.deductions.section80D.applied)}</td></tr>
          <tr><td>(c) Section 24(b) (Home Loan Interest)</td><td class="right">${fmt(b.deductions.section24.declared)}</td><td class="right">${fmt(b.deductions.section24.applied)}</td></tr>
          <tr><td>(d) Section 80E (Education Loan Interest)</td><td class="right">${fmt(b.deductions.section80E.declared)}</td><td class="right">${fmt(b.deductions.section80E.applied)}</td></tr>
          <tr><td>(e) Section 80G (Donations)</td><td class="right">${fmt(b.deductions.section80G.declared)}</td><td class="right">${fmt(b.deductions.section80G.applied)}</td></tr>
          ${b.deductions.otherSections.declared > 0 ? `<tr><td>(f) Other Sections</td><td class="right">${fmt(b.deductions.otherSections.declared)}</td><td class="right">${fmt(b.deductions.otherSections.applied)}</td></tr>` : ""}
          <tr class="total-row"><td>Total Deductions under Chapter VI-A</td><td class="right"></td><td class="right">${fmt(b.deductions.total)}</td></tr>
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="2">8. Tax Computation</th></tr></thead>
        <tbody>
          <tr class="highlight"><td>Total Taxable Income (6 - 7)</td><td class="right bold">₹${fmt(b.taxableIncome)}</td></tr>
          <tr><td>Tax on Total Income (${e.taxRegime === "new" ? "New" : "Old"} Regime)</td><td class="right">₹${fmt(e.taxRegime === "new" ? b.taxNewRegime : b.taxOldRegime)}</td></tr>
          <tr><td>Health & Education Cess (4%)</td><td class="right">₹${fmt(b.cess)}</td></tr>
          <tr class="total-row"><td>Total Tax Liability</td><td class="right bold">₹${fmt(b.totalTaxLiability)}</td></tr>
          <tr><td>Less: Tax Deducted at Source (TDS)</td><td class="right">₹${fmt(b.totalTDSDeducted)}</td></tr>
          <tr class="total-row highlight"><td>${b.refundOrDue >= 0 ? "Tax Refundable" : "Balance Tax Due"}</td><td class="right bold" style="color:${b.refundOrDue >= 0 ? "#16a34a" : "#dc2626"}">₹${fmt(Math.abs(b.refundOrDue))}</td></tr>
        </tbody>
      </table>
    </div>

    <div style="margin-top:40px">
      <p style="font-size:10px;color:#666">This is a computer-generated document. Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
      <div style="display:flex;justify-content:space-between;margin-top:40px">
        <div style="text-align:center">
          <div style="border-top:1px solid #333;width:200px;padding-top:5px">Signature of Employee</div>
        </div>
        <div style="text-align:center">
          <div style="border-top:1px solid #333;width:200px;padding-top:5px">Signature of Employer</div>
        </div>
      </div>
    </div>
    </body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Form 16 — Tax Certificate Generation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1">
            <Label>Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger data-testid="select-form16-employee">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.employeeCode || ""} — {emp.firstName} {emp.lastName || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label>Financial Year</Label>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger data-testid="select-form16-fy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-25">2024-25</SelectItem>
                <SelectItem value="2025-26">2025-26</SelectItem>
                <SelectItem value="2026-27">2026-27</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchForm16} disabled={!selectedEmployee || isLoading} data-testid="button-generate-form16">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
            Generate
          </Button>
        </div>

        {form16Data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div>
                <p className="font-bold text-lg">{form16Data.employee.name}</p>
                <p className="text-sm text-slate-500">
                  {form16Data.employee.employeeCode} | PAN: {form16Data.employee.panNumber || "N/A"} | FY: {form16Data.financialYear} (AY: {form16Data.assessmentYear})
                </p>
                <p className="text-sm text-slate-500">Tax Regime: {form16Data.employee.taxRegime === "new" ? "New Regime" : "Old Regime"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printForm16} data-testid="button-print-form16">
                  <Printer className="w-4 h-4 mr-1" /> Print / Download PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-600 font-medium">Gross Salary</p>
                <p className="text-lg font-bold text-green-700">₹{form16Data.partB.grossSalary.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-xs text-blue-600 font-medium">Taxable Income</p>
                <p className="text-lg font-bold text-blue-700">₹{form16Data.partB.taxableIncome.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                <p className="text-xs text-orange-600 font-medium">Total Tax Liability</p>
                <p className="text-lg font-bold text-orange-700">₹{form16Data.partB.totalTaxLiability.toLocaleString("en-IN")}</p>
              </div>
              <div className={`p-3 rounded-lg border text-center ${form16Data.partB.refundOrDue >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <p className={`text-xs font-medium ${form16Data.partB.refundOrDue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {form16Data.partB.refundOrDue >= 0 ? "Tax Refund" : "Tax Due"}
                </p>
                <p className={`text-lg font-bold ${form16Data.partB.refundOrDue >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  ₹{Math.abs(form16Data.partB.refundOrDue).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" /> Earnings Breakdown (Annual)
                </h3>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Basic Salary</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.basic.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>HRA</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.hra.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>DA</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.da.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Conveyance</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.conveyance.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Communication</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.communication.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Medical</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.medical.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Variable Pay</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.variablePay.toLocaleString("en-IN")}</TableCell></TableRow>
                    {form16Data.partB.earnings.other > 0 && (
                      <TableRow><TableCell>Other</TableCell><TableCell className="text-right">₹{form16Data.partB.earnings.other.toLocaleString("en-IN")}</TableCell></TableRow>
                    )}
                    <TableRow className="font-bold bg-green-50">
                      <TableCell>Total Gross Salary</TableCell>
                      <TableCell className="text-right">₹{form16Data.partB.grossSalary.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-1">
                  <Scale className="w-4 h-4" /> Deductions & Tax Computation
                </h3>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Standard Deduction u/s 16(ia)</TableCell><TableCell className="text-right">₹{form16Data.partB.standardDeduction.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Professional Tax u/s 16(iii)</TableCell><TableCell className="text-right">₹{form16Data.partB.professionalTax.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow className="bg-slate-50 font-semibold"><TableCell>Income from Salary</TableCell><TableCell className="text-right">₹{form16Data.partB.incomeFromSalary.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>80C (PF, LIC, etc.)</TableCell><TableCell className="text-right">₹{form16Data.partB.deductions.section80C.applied.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>80D (Medical Insurance)</TableCell><TableCell className="text-right">₹{form16Data.partB.deductions.section80D.applied.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>24(b) (Home Loan Interest)</TableCell><TableCell className="text-right">₹{form16Data.partB.deductions.section24.applied.toLocaleString("en-IN")}</TableCell></TableRow>
                    {form16Data.partB.deductions.section80E.applied > 0 && (
                      <TableRow><TableCell>80E (Education Loan)</TableCell><TableCell className="text-right">₹{form16Data.partB.deductions.section80E.applied.toLocaleString("en-IN")}</TableCell></TableRow>
                    )}
                    {form16Data.partB.deductions.section80G.applied > 0 && (
                      <TableRow><TableCell>80G (Donations)</TableCell><TableCell className="text-right">₹{form16Data.partB.deductions.section80G.applied.toLocaleString("en-IN")}</TableCell></TableRow>
                    )}
                    <TableRow className="bg-blue-50 font-semibold"><TableCell>Taxable Income</TableCell><TableCell className="text-right">₹{form16Data.partB.taxableIncome.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Tax ({form16Data.employee.taxRegime === "new" ? "New" : "Old"} Regime)</TableCell><TableCell className="text-right">₹{(form16Data.employee.taxRegime === "new" ? form16Data.partB.taxNewRegime : form16Data.partB.taxOldRegime).toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>Cess (4%)</TableCell><TableCell className="text-right">₹{form16Data.partB.cess.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow className="bg-orange-50 font-bold"><TableCell>Total Tax Liability</TableCell><TableCell className="text-right">₹{form16Data.partB.totalTaxLiability.toLocaleString("en-IN")}</TableCell></TableRow>
                    <TableRow><TableCell>TDS Deducted</TableCell><TableCell className="text-right">₹{form16Data.partB.totalTDSDeducted.toLocaleString("en-IN")}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {form16Data.partA.monthlyBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Monthly TDS Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">EPF</TableHead>
                      <TableHead className="text-right">PT</TableHead>
                      <TableHead className="text-right">TDS</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form16Data.partA.monthlyBreakdown.map((m: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{MONTHS[parseInt(m.month) - 1] || m.month} {m.year}</TableCell>
                        <TableCell className="text-right">₹{m.gross.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">₹{m.epf.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">₹{m.pt.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">₹{m.tds.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-semibold">₹{m.net.toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Select an employee to generate Form 16</p>
            <p className="text-sm mt-1">Choose the employee and financial year, then click Generate</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
