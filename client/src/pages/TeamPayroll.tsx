import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Search, Filter, Download, Users, TrendingUp, FileSpreadsheet, Printer } from "lucide-react";
import { useState } from "react";
import type { Employee, Payroll } from "@shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TeamPayroll() {
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [registerMonth, setRegisterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [registerYear, setRegisterYear] = useState(new Date().getFullYear().toString());

  const { data: payrolls = [], isLoading } = useQuery<Payroll[]>({
    queryKey: ["/api/team/payroll"],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const entityDisplayName = selectedEntity?.legalName || selectedEntity?.name || "FC TECNRGY PVT LTD";
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const getEmployeeName = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName || ''}` : "Unknown";
  };

  const getEmployeeCode = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.employeeCode || "-";
  };

  const getEmployeeDesignation = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.designation || "-";
  };

  const getEmployeeBankAccount = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.bankAccountNumber || "-";
  };

  const getEmployeePAN = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.panNumber || "-";
  };

  const getEmployeeUAN = (employeeId: number) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.uanNumber || "-";
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = 
      getEmployeeName(payroll.employeeId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployeeCode(payroll.employeeId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = monthFilter === "all" || payroll.month === monthFilter;
    return matchesSearch && matchesMonth;
  });

  const registerPayrolls = payrolls.filter(p => p.month === registerMonth && p.year?.toString() === registerYear);

  const totalGross = filteredPayrolls.reduce((sum, p) => sum + parseFloat(p.grossSalary?.toString() || "0"), 0);
  const totalNet = filteredPayrolls.reduce((sum, p) => sum + parseFloat(p.netSalary?.toString() || "0"), 0);
  const paidCount = filteredPayrolls.filter(p => p.status === "paid").length;

  const num = (v: any) => parseFloat(v?.toString() || "0");
  const fmt = (v: any) => num(v).toLocaleString("en-IN");

  const regTotalBasic = registerPayrolls.reduce((s, p) => s + num(p.basicSalary), 0);
  const regTotalHRA = registerPayrolls.reduce((s, p) => s + num(p.hra), 0);
  const regTotalDA = registerPayrolls.reduce((s, p) => s + num(p.da), 0);
  const regTotalConv = registerPayrolls.reduce((s, p) => s + num(p.conveyance), 0);
  const regTotalComm = registerPayrolls.reduce((s, p) => s + num(p.communicationAllowance), 0);
  const regTotalMed = registerPayrolls.reduce((s, p) => s + num(p.medicalAllowance), 0);
  const regTotalVar = registerPayrolls.reduce((s, p) => s + num(p.variablePay), 0);
  const regTotalOther = registerPayrolls.reduce((s, p) => s + num(p.otherEarnings) + num(p.arrear) + num(p.bonus) + num(p.highAltitudeAllowance) + num(p.birthdayAllowance), 0);
  const regTotalGross = registerPayrolls.reduce((s, p) => s + num(p.grossSalary), 0);
  const regTotalEPF = registerPayrolls.reduce((s, p) => s + num(p.epf), 0);
  const regTotalTDS = registerPayrolls.reduce((s, p) => s + num(p.tds), 0);
  const regTotalPT = registerPayrolls.reduce((s, p) => s + num(p.professionalTax), 0);
  const regTotalLWF = registerPayrolls.reduce((s, p) => s + num(p.lwf), 0);
  const regTotalIns = registerPayrolls.reduce((s, p) => s + num(p.insurancePremium), 0);
  const regTotalAdv = registerPayrolls.reduce((s, p) => s + num(p.advance), 0);
  const regTotalLOP = registerPayrolls.reduce((s, p) => s + num(p.lopDeduction), 0);
  const regTotalOtherDed = registerPayrolls.reduce((s, p) => s + num(p.otherDeductions), 0);
  const regTotalDed = registerPayrolls.reduce((s, p) => s + num(p.deductions), 0);
  const regTotalNet = registerPayrolls.reduce((s, p) => s + num(p.netSalary), 0);

  const exportSalaryRegister = () => {
    if (registerPayrolls.length === 0) return;
    const headers = [
      "S.No", "Emp Code", "Employee Name", "Designation", "PAN", "UAN", "Bank A/c",
      "Basic", "HRA", "DA", "Conveyance", "Communication", "Medical", "Variable Pay", "Other Earnings", "Gross Salary",
      "EPF", "TDS", "Prof. Tax", "LWF", "Insurance", "Advance/Loan", "LOP Deduction", "Other Deductions", "Total Deductions",
      "Net Salary", "LOP Days", "Status"
    ];

    const rows = registerPayrolls.map((p, idx) => {
      const otherEarn = num(p.otherEarnings) + num(p.arrear) + num(p.bonus) + num(p.highAltitudeAllowance) + num(p.birthdayAllowance);
      return [
        idx + 1,
        `"${getEmployeeCode(p.employeeId)}"`,
        `"${getEmployeeName(p.employeeId)}"`,
        `"${getEmployeeDesignation(p.employeeId)}"`,
        `"${getEmployeePAN(p.employeeId)}"`,
        `"${getEmployeeUAN(p.employeeId)}"`,
        `"${getEmployeeBankAccount(p.employeeId)}"`,
        num(p.basicSalary), num(p.hra), num(p.da), num(p.conveyance),
        num(p.communicationAllowance), num(p.medicalAllowance), num(p.variablePay), otherEarn,
        num(p.grossSalary),
        num(p.epf), num(p.tds), num(p.professionalTax), num(p.lwf), num(p.insurancePremium),
        num(p.advance), num(p.lopDeduction), num(p.otherDeductions), num(p.deductions),
        num(p.netSalary), num(p.lop), `"${p.status}"`
      ].join(",");
    });

    const totalRow = [
      "", "", "\"TOTAL\"", "", "", "", "",
      regTotalBasic, regTotalHRA, regTotalDA, regTotalConv, regTotalComm, regTotalMed, regTotalVar, regTotalOther, regTotalGross,
      regTotalEPF, regTotalTDS, regTotalPT, regTotalLWF, regTotalIns, regTotalAdv, regTotalLOP, regTotalOtherDed, regTotalDed,
      regTotalNet, "", ""
    ].join(",");

    const titleRow = `"SALARY REGISTER - ${entityDisplayName} - ${registerMonth} ${registerYear}"`;
    const csv = [titleRow, "", headers.join(","), ...rows, "", totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salary_Register_${registerMonth}_${registerYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printSalaryRegister = () => {
    if (registerPayrolls.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = registerPayrolls.map((p, idx) => {
      const otherEarn = num(p.otherEarnings) + num(p.arrear) + num(p.bonus) + num(p.highAltitudeAllowance) + num(p.birthdayAllowance);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${getEmployeeCode(p.employeeId)}</td>
        <td style="text-align:left">${getEmployeeName(p.employeeId)}</td>
        <td>${getEmployeeDesignation(p.employeeId)}</td>
        <td style="text-align:right">${fmt(p.basicSalary)}</td>
        <td style="text-align:right">${fmt(p.hra)}</td>
        <td style="text-align:right">${fmt(p.da)}</td>
        <td style="text-align:right">${fmt(p.conveyance)}</td>
        <td style="text-align:right">${fmt(p.communicationAllowance)}</td>
        <td style="text-align:right">${fmt(p.medicalAllowance)}</td>
        <td style="text-align:right">${fmt(p.variablePay)}</td>
        <td style="text-align:right">${otherEarn.toLocaleString("en-IN")}</td>
        <td style="text-align:right;font-weight:600">${fmt(p.grossSalary)}</td>
        <td style="text-align:right">${fmt(p.epf)}</td>
        <td style="text-align:right">${fmt(p.tds)}</td>
        <td style="text-align:right">${fmt(p.professionalTax)}</td>
        <td style="text-align:right">${fmt(p.lwf)}</td>
        <td style="text-align:right">${fmt(p.insurancePremium)}</td>
        <td style="text-align:right">${fmt(p.advance)}</td>
        <td style="text-align:right">${fmt(p.lopDeduction)}</td>
        <td style="text-align:right">${fmt(p.otherDeductions)}</td>
        <td style="text-align:right;font-weight:600">${fmt(p.deductions)}</td>
        <td style="text-align:right;font-weight:700">${fmt(p.netSalary)}</td>
      </tr>`;
    }).join('');

    const totalRowHtml = `<tr style="font-weight:700;background:#e2e8f0">
      <td colspan="4" style="text-align:right">TOTAL</td>
      <td style="text-align:right">${regTotalBasic.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalHRA.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalDA.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalConv.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalComm.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalMed.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalVar.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalOther.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalGross.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalEPF.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalTDS.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalPT.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalLWF.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalIns.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalAdv.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalLOP.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalOtherDed.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalDed.toLocaleString("en-IN")}</td>
      <td style="text-align:right">${regTotalNet.toLocaleString("en-IN")}</td>
    </tr>`;

    printWindow.document.write(`<html><head><title>Salary Register - ${registerMonth} ${registerYear}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 9px; margin: 10px; }
      h2 { text-align: center; margin-bottom: 2px; font-size: 14px; }
      h3 { text-align: center; margin-top: 0; font-size: 11px; color: #555; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 3px 5px; font-size: 9px; }
      th { background: #334155; color: white; font-weight: 600; text-align: center; }
      @media print { body { margin: 5mm; } @page { size: landscape; margin: 5mm; } }
    </style></head><body>
    <h2>${entityDisplayName}</h2>
    <h3>Salary Register — ${registerMonth} ${registerYear}</h3>
    <table>
      <thead><tr>
        <th>S.No</th><th>Code</th><th>Employee Name</th><th>Designation</th>
        <th>Basic</th><th>HRA</th><th>DA</th><th>Conv.</th><th>Comm.</th><th>Medical</th><th>Var. Pay</th><th>Other</th><th>Gross</th>
        <th>EPF</th><th>TDS</th><th>PT</th><th>LWF</th><th>Insurance</th><th>Adv/Loan</th><th>LOP Ded.</th><th>Other Ded.</th><th>Total Ded.</th>
        <th>Net Salary</th>
      </tr></thead>
      <tbody>${tableRows}${totalRowHtml}</tbody>
    </table>
    <p style="margin-top:20px;font-size:10px">Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Payroll Team Dashboard</h1>
          <p className="text-slate-600">Manage employee payroll, compensation, and salary registers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Records</p>
                <p className="text-2xl font-bold">{filteredPayrolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Gross</p>
                <p className="text-2xl font-bold">₹{totalGross.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Net</p>
                <p className="text-2xl font-bold">₹{totalNet.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Paid</p>
                <p className="text-2xl font-bold">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" data-testid="tab-payroll-records">Payroll Records</TabsTrigger>
          <TabsTrigger value="register" data-testid="tab-salary-register">Salary Register</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employee Payroll Details</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search-payroll"
                    />
                  </div>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-40" data-testid="select-month-filter">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrolls.map(payroll => (
                    <TableRow key={payroll.id} data-testid={`row-payroll-${payroll.id}`}>
                      <TableCell className="font-medium">{getEmployeeCode(payroll.employeeId)}</TableCell>
                      <TableCell>{getEmployeeName(payroll.employeeId)}</TableCell>
                      <TableCell>{getEmployeeDesignation(payroll.employeeId)}</TableCell>
                      <TableCell>{payroll.month} {payroll.year}</TableCell>
                      <TableCell>₹{parseFloat(payroll.grossSalary?.toString() || "0").toLocaleString()}</TableCell>
                      <TableCell>₹{parseFloat(payroll.deductions?.toString() || "0").toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">₹{parseFloat(payroll.netSalary?.toString() || "0").toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={payroll.status === "paid" ? "default" : "secondary"}>
                          {payroll.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayrolls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No payroll records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Salary Register
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={registerMonth} onValueChange={setRegisterMonth}>
                    <SelectTrigger className="w-36" data-testid="select-register-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={registerYear} onValueChange={setRegisterYear}>
                    <SelectTrigger className="w-24" data-testid="select-register-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={printSalaryRegister} disabled={registerPayrolls.length === 0} data-testid="button-print-register">
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                  <Button size="sm" onClick={exportSalaryRegister} disabled={registerPayrolls.length === 0} data-testid="button-export-register">
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {registerPayrolls.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-medium">No payroll data for {registerMonth} {registerYear}</p>
                  <p className="text-sm mt-1">Process payroll for this month to generate the salary register</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{entityDisplayName} — Salary Register</p>
                      <p className="text-sm text-slate-500">{registerMonth} {registerYear} | {registerPayrolls.length} employees</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Net Payout</p>
                      <p className="text-xl font-bold text-primary">₹{regTotalNet.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th colSpan={4} className="border border-slate-600 px-2 py-1.5 text-center font-semibold">Employee Details</th>
                          <th colSpan={9} className="border border-slate-600 px-2 py-1.5 text-center font-semibold bg-green-800">Earnings</th>
                          <th colSpan={9} className="border border-slate-600 px-2 py-1.5 text-center font-semibold bg-red-800">Deductions</th>
                          <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold bg-blue-800">Net</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="border px-2 py-1.5 text-left font-medium">S.No</th>
                          <th className="border px-2 py-1.5 text-left font-medium">Code</th>
                          <th className="border px-2 py-1.5 text-left font-medium">Employee Name</th>
                          <th className="border px-2 py-1.5 text-left font-medium">Designation</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Basic</th>
                          <th className="border px-2 py-1.5 text-right font-medium">HRA</th>
                          <th className="border px-2 py-1.5 text-right font-medium">DA</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Conv.</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Comm.</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Medical</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Var. Pay</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Other</th>
                          <th className="border px-2 py-1.5 text-right font-semibold bg-green-50">Gross</th>
                          <th className="border px-2 py-1.5 text-right font-medium">EPF</th>
                          <th className="border px-2 py-1.5 text-right font-medium">TDS</th>
                          <th className="border px-2 py-1.5 text-right font-medium">PT</th>
                          <th className="border px-2 py-1.5 text-right font-medium">LWF</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Insurance</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Adv/Loan</th>
                          <th className="border px-2 py-1.5 text-right font-medium">LOP Ded.</th>
                          <th className="border px-2 py-1.5 text-right font-medium">Other</th>
                          <th className="border px-2 py-1.5 text-right font-semibold bg-red-50">Total Ded.</th>
                          <th className="border px-2 py-1.5 text-right font-semibold bg-blue-50">Net Salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registerPayrolls.map((p, idx) => {
                          const otherEarn = num(p.otherEarnings) + num(p.arrear) + num(p.bonus) + num(p.highAltitudeAllowance) + num(p.birthdayAllowance);
                          return (
                            <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"} data-testid={`register-row-${p.id}`}>
                              <td className="border px-2 py-1.5 text-center">{idx + 1}</td>
                              <td className="border px-2 py-1.5 font-medium">{getEmployeeCode(p.employeeId)}</td>
                              <td className="border px-2 py-1.5">{getEmployeeName(p.employeeId)}</td>
                              <td className="border px-2 py-1.5 text-slate-600">{getEmployeeDesignation(p.employeeId)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.basicSalary)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.hra)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.da)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.conveyance)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.communicationAllowance)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.medicalAllowance)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.variablePay)}</td>
                              <td className="border px-2 py-1.5 text-right">{otherEarn > 0 ? otherEarn.toLocaleString("en-IN") : "-"}</td>
                              <td className="border px-2 py-1.5 text-right font-semibold bg-green-50">{fmt(p.grossSalary)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.epf)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.tds)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.professionalTax)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.lwf)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.insurancePremium)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.advance)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.lopDeduction)}</td>
                              <td className="border px-2 py-1.5 text-right">{fmt(p.otherDeductions)}</td>
                              <td className="border px-2 py-1.5 text-right font-semibold bg-red-50">{fmt(p.deductions)}</td>
                              <td className="border px-2 py-1.5 text-right font-bold bg-blue-50">{fmt(p.netSalary)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-200 font-bold text-xs">
                          <td colSpan={4} className="border px-2 py-2 text-right">TOTAL</td>
                          <td className="border px-2 py-2 text-right">{regTotalBasic.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalHRA.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalDA.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalConv.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalComm.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalMed.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalVar.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalOther.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right bg-green-100">{regTotalGross.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalEPF.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalTDS.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalPT.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalLWF.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalIns.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalAdv.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalLOP.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right">{regTotalOtherDed.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right bg-red-100">{regTotalDed.toLocaleString("en-IN")}</td>
                          <td className="border px-2 py-2 text-right bg-blue-100">{regTotalNet.toLocaleString("en-IN")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                      <p className="text-xs text-green-600 font-medium">Total Gross</p>
                      <p className="text-lg font-bold text-green-700">₹{regTotalGross.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                      <p className="text-xs text-red-600 font-medium">Total Deductions</p>
                      <p className="text-lg font-bold text-red-700">₹{regTotalDed.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <p className="text-xs text-blue-600 font-medium">Net Payout</p>
                      <p className="text-lg font-bold text-blue-700">₹{regTotalNet.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <p className="text-xs text-slate-600 font-medium">Employees</p>
                      <p className="text-lg font-bold text-slate-700">{registerPayrolls.length}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
