import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Download, FileText, Calculator, Receipt, Upload,
  FileCheck, Eye, IndianRupee, Pencil,
  Shield, Search, Users, Printer, X, Check, BookOpen, Loader2
} from "lucide-react";
import type { Employee, Payroll, SalaryStructure } from "@shared/schema";
import { useEntity } from "@/lib/entityContext";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getMonthName(val: string) {
  return MONTHS.find(m => m.value === val)?.label || val;
}

function formatCurrency(val: number | string | null | undefined) {
  const num = Number(val) || 0;
  if (num % 1 !== 0) {
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString("en-IN");
}

function PayslipView({ record, employee, onClose, entityName, entityAddress, entityDetails }: { record: Payroll; employee: Employee | undefined; onClose: () => void; entityName?: string; entityAddress?: string; entityDetails?: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const isNonFCT = entityName === "";
  const companyDisplayName = isNonFCT ? "" : (entityName || "FC TECNRGY PVT LTD (FCT)");
  const companyAddress = isNonFCT ? "" : (entityAddress || "Plot no-45, Udyog Vihar- IV, Gurgaon - 122015 Haryana");
  const companyDetails = isNonFCT ? "" : (entityDetails || "Telefax- 0124-4263166, Email- info@fctecnrgy.com | www.fctecnrgy.com");

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const infoRow = (label: string, value: string) =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;"><span style="color:#666;">${label}</span><span style="font-weight:500;">${value}</span></div>`;

    const earnRowsHtml = earningsRows.map(row =>
      `<div style="display:grid;grid-template-columns:1fr 70px 70px;padding:3px 0;font-size:12px;">
        <span>${row.label}</span>
        <span style="font-weight:500;text-align:right;">${(row as any).actualOnly ? '-' : formatCurrency(row.gross)}</span>
        <span style="font-weight:500;text-align:right;">${formatCurrency(row.actual)}</span>
      </div>`
    ).join('');

    const dedRowsHtml = deductionRows.map(row =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
        <span>${row.label}</span>
        <span style="font-weight:500;">${formatCurrency(row.amount)}</span>
      </div>`
    ).join('');

    const lopSection = lopDays > 0
      ? `<div style="display:inline;margin-left:24px;"><span style="color:#666;">LOP Days:</span> <span style="font-weight:500;color:#dc2626;">${lopDays}</span></div>`
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${employee?.firstName} ${employee?.lastName || ''} - ${getMonthName(record.month)} ${record.year}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div style="max-width:800px;margin:0 auto;border:2px solid #333;overflow:hidden;">
            <div style="text-align:center;padding:15px;border-bottom:2px solid #333;background:#f8f9fa;">
              ${companyDisplayName ? `<h1 style="margin:0;font-size:18px;font-weight:bold;color:#1a5c2e;">${companyDisplayName}</h1>` : ''}
              ${companyAddress ? `<p style="margin:4px 0;font-size:11px;color:#666;">${companyAddress}</p>` : ''}
              ${companyDetails ? `<p style="margin:4px 0;font-size:11px;color:#666;">${companyDetails}</p>` : ''}
              <div style="margin-top:10px;padding:5px 16px;background:#1a5c2e;color:white;font-size:14px;font-weight:bold;display:inline-block;border-radius:4px;">PAY SLIP</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid #333;">
              <div style="padding:8px 12px;">
                ${infoRow("Employee Name", `${employee?.firstName || ''} ${employee?.lastName || ''}`)}
                ${infoRow("Employee Code", employee?.employeeCode || '-')}
                ${infoRow("Designation", employee?.designation || '-')}
                ${infoRow("Department", employee?.departmentId ? `Dept ${employee.departmentId}` : '-')}
                ${infoRow("Location", employee?.location || '-')}
                ${infoRow("Date of Joining", employee?.joinDate || '-')}
              </div>
              <div style="padding:8px 12px;border-left:1px solid #ddd;">
                ${infoRow("Month", `${getMonthName(record.month)} ${record.year}`)}
                ${infoRow("Mode of Payment", record.modeOfPayment || 'Account Transfer')}
                ${infoRow("Bank Name", employee?.bankName || '-')}
                ${infoRow("Bank A/C No", employee?.bankAccountNumber || '-')}
                ${infoRow("PAN No", employee?.panNumber || '-')}
              </div>
            </div>

            <div style="padding:8px 12px;border-bottom:2px solid #333;background:#fafafa;font-size:12px;">
              <span style="color:#666;">Total Days in Month:</span> <span style="font-weight:500;">${daysInMonth}</span>
              ${lopSection}
              <span style="margin-left:24px;color:#666;">Working Days:</span> <span style="font-weight:500;">${workingDays}</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;">
              <div style="padding:10px 12px;">
                <div style="font-weight:bold;font-size:13px;padding:6px 0;border-bottom:1px solid #333;margin-bottom:6px;">EARNINGS</div>
                <div style="display:grid;grid-template-columns:1fr 70px 70px;font-size:10px;font-weight:bold;color:#666;padding-bottom:4px;border-bottom:1px solid #eee;margin-bottom:4px;">
                  <span>Component</span>
                  <span style="text-align:right;">Gross/Mo</span>
                  <span style="text-align:right;">Amount</span>
                </div>
                ${earnRowsHtml}
                <div style="display:grid;grid-template-columns:1fr 70px 70px;padding:6px 0;font-size:13px;font-weight:bold;border-top:1px solid #333;margin-top:8px;">
                  <span>Total Earnings</span>
                  <span style="text-align:right;">${formatCurrency(grossTotal)}</span>
                  <span style="text-align:right;">${formatCurrency(actualTotal)}</span>
                </div>
              </div>
              <div style="padding:10px 12px;border-left:1px solid #ddd;">
                <div style="font-weight:bold;font-size:13px;padding:6px 0;border-bottom:1px solid #333;margin-bottom:6px;">DEDUCTION</div>
                ${dedRowsHtml}
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;font-weight:bold;border-top:1px solid #333;margin-top:8px;">
                  <span>Total Deductions</span>
                  <span>${formatCurrency(displayTotalDeductions)}</span>
                </div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;padding:10px 12px;font-size:14px;font-weight:bold;background:#e8f5e9;border-top:2px solid #333;">
              <span>Net Pay</span>
              <span style="color:#15803d;">Rs. ${formatCurrency(netPay)}</span>
            </div>

            <div style="text-align:center;padding:10px;font-size:10px;color:#999;border-top:1px solid #ddd;font-style:italic;">
              This is Computer generated advice & doesn't required a Signature.
            </div>
          </div>
          <script>window.print(); window.close();<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const daysInMonth = record.totalDays || 30;
  const lopDays = parseFloat(String(record.lop)) || 0;
  const workingDays = parseFloat(String(record.workingDays)) || (daysInMonth - lopDays);
  const lopFraction = lopDays > 0 ? (daysInMonth - lopDays) / daysInMonth : 1;

  const grossBasic = Number(record.basicSalary);
  const grossHra = Number(record.hra);
  const grossConveyance = Number(record.conveyance);
  const grossDa = Number(record.da);
  const grossComm = Number(record.communicationAllowance);
  const grossMedical = Number(record.medicalAllowance);
  const variablePay = Number(record.variablePay);
  const highAlt = Number(record.highAltitudeAllowance);
  const arrear = Number(record.arrear);
  const bonus = Number(record.bonus);
  const otherEarn = Number(record.otherEarnings);
  const birthdayAllow = Number(record.birthdayAllowance);

  const grossTotal = grossBasic + grossHra + grossConveyance + grossDa + grossComm + grossMedical + highAlt + arrear + bonus + otherEarn + birthdayAllow;

  const actualBasic = parseFloat((grossBasic * lopFraction).toFixed(2));
  const actualHra = parseFloat((grossHra * lopFraction).toFixed(2));
  const actualConveyance = parseFloat((grossConveyance * lopFraction).toFixed(2));
  const actualDa = parseFloat((grossDa * lopFraction).toFixed(2));
  const actualComm = parseFloat((grossComm * lopFraction).toFixed(2));
  const actualMedical = parseFloat((grossMedical * lopFraction).toFixed(2));
  const actualVariable = parseFloat((variablePay * lopFraction).toFixed(2));
  const actualHighAlt = parseFloat((highAlt * lopFraction).toFixed(2));
  const actualArrear = arrear;
  const actualBonus = bonus;
  const actualOtherEarn = otherEarn;
  const actualBirthdayAllow = birthdayAllow;
  const actualTotal = parseFloat((actualBasic + actualHra + actualConveyance + actualDa + actualComm + actualMedical + actualVariable + actualHighAlt + actualArrear + actualBonus + actualOtherEarn + actualBirthdayAllow).toFixed(2));

  const totalDeductions = Number(record.insurancePremium) + Number(record.incomeTax) + Number(record.advance) +
    Number(record.otherDeductions) + Number(record.epf);
  const lopDeduction = Number(record.lopDeduction) || 0;
  const netPay = Number(record.netSalary);

  const allEarningsRows = [
    { label: "Basic", gross: grossBasic, actual: actualBasic },
    { label: "HRA", gross: grossHra, actual: actualHra },
    { label: "DA", gross: grossDa, actual: actualDa },
    { label: "Variable Pay", gross: 0, actual: actualVariable, actualOnly: true },
    { label: "Travelling Allowance", gross: grossConveyance, actual: actualConveyance },
    { label: "Communication Allowance", gross: grossComm, actual: actualComm },
    { label: "Medical Allowance", gross: grossMedical, actual: actualMedical },
    { label: "High Altitude Allowance", gross: highAlt, actual: actualHighAlt },
    { label: "Birthday Allowance", gross: birthdayAllow, actual: actualBirthdayAllow },
    { label: "Arrear", gross: arrear, actual: actualArrear },
    { label: "Bonus", gross: bonus, actual: actualBonus },
    { label: "Other Earnings", gross: otherEarn, actual: actualOtherEarn },
  ];
  const earningsRows = allEarningsRows.filter(row => row.gross > 0 || row.actual > 0);

  const epfAmount = Number(record.epf);
  const incomeTaxAmount = Number(record.incomeTax);
  const insuranceAmount = Number(record.insurancePremium);
  const advanceAmount = Number(record.advance);
  const otherDedAmount = Number(record.otherDeductions);
  const ptAmount = Number(record.professionalTax) || 0;
  const lwfAmount = Number(record.lwf) || 0;
  const allDeductionRows = [
    { label: "EPF", amount: epfAmount },
    { label: "Income Tax", amount: incomeTaxAmount },
    { label: "Insurance Premium", amount: insuranceAmount },
    { label: "Professional Tax", amount: ptAmount },
    { label: "LWF", amount: lwfAmount },
    { label: "Advance / Loan", amount: advanceAmount },
    { label: "Other Deduction", amount: otherDedAmount },
  ];
  const deductionRows = allDeductionRows.filter(row => row.amount > 0);
  const displayTotalDeductions = totalDeductions + ptAmount + lwfAmount;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle>Payslip - {getMonthName(record.month)} {record.year}</DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} data-testid="button-print-payslip">
              <Printer className="w-4 h-4 mr-1" />
              Print / Download
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="p-4">
            <div ref={printRef}>
              <div className="payslip border-2 border-foreground/30 rounded-md overflow-hidden">
                <div className="text-center p-4 border-b-2 border-foreground/30 bg-muted/50">
                  {companyDisplayName && <h1 className="text-lg font-bold text-primary">{companyDisplayName}</h1>}
                  {companyAddress && <p className="text-xs text-muted-foreground mt-1">{companyAddress}</p>}
                  {companyDetails && <p className="text-xs text-muted-foreground">{companyDetails}</p>}
                  <div className="mt-2 py-1.5 px-4 bg-primary text-primary-foreground text-sm font-bold inline-block rounded">
                    PAY SLIP
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b-2 border-foreground/30">
                  <div className="p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Employee Name</span>
                      <span className="font-medium">{employee?.firstName} {employee?.lastName || ''}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Employee Code</span>
                      <span className="font-medium">{employee?.employeeCode || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Designation</span>
                      <span className="font-medium">{employee?.designation || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{employee?.departmentId ? `Dept ${employee.departmentId}` : '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{employee?.location || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Date of Joining</span>
                      <span className="font-medium">{employee?.joinDate || '-'}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1.5 border-l border-foreground/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Month</span>
                      <span className="font-medium">{getMonthName(record.month)} {record.year}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Mode of Payment</span>
                      <span className="font-medium">{record.modeOfPayment || 'Account Transfer'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Bank Name</span>
                      <span className="font-medium">{employee?.bankName || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Bank A/C No</span>
                      <span className="font-medium">{employee?.bankAccountNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">PAN No</span>
                      <span className="font-medium">{employee?.panNumber || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-b-2 border-foreground/30 bg-muted/30 flex flex-wrap gap-6 text-xs">
                  <div><span className="text-muted-foreground">Total Days in Month:</span> <span className="font-medium">{daysInMonth}</span></div>
                  {lopDays > 0 && (
                    <div><span className="text-muted-foreground">LOP Days:</span> <span className="font-medium text-red-600">{lopDays}</span></div>
                  )}
                  <div><span className="text-muted-foreground">Working Days:</span> <span className="font-medium">{workingDays}</span></div>
                </div>

                <div className="grid grid-cols-2">
                  <div className="p-3">
                    <div className="font-bold text-sm pb-1.5 border-b mb-1">EARNINGS</div>
                    <div className="grid grid-cols-[1fr_70px_70px] text-[10px] font-semibold text-muted-foreground pb-1 border-b border-dashed mb-1">
                      <span>Component</span>
                      <span className="text-right">Gross/Mo</span>
                      <span className="text-right">Amount</span>
                    </div>
                    <div className="space-y-1">
                      {earningsRows.map(row => (
                        <div key={row.label} className="grid grid-cols-[1fr_70px_70px] text-xs">
                          <span>{row.label}</span>
                          <span className="font-medium text-right">{(row as any).actualOnly ? '-' : formatCurrency(row.gross)}</span>
                          <span className="font-medium text-right">{formatCurrency(row.actual)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-[1fr_70px_70px] text-sm font-bold mt-3 pt-2 border-t">
                      <span>Total Earnings</span>
                      <span className="text-right">{formatCurrency(grossTotal)}</span>
                      <span className="text-right">{formatCurrency(actualTotal)}</span>
                    </div>
                  </div>
                  <div className="p-3 border-l border-foreground/20">
                    <div className="font-bold text-sm pb-1.5 border-b mb-2">DEDUCTION</div>
                    <div className="space-y-1.5">
                      {deductionRows.map(row => (
                        <div key={row.label} className="flex justify-between text-xs">
                          <span>{row.label}</span>
                          <span className="font-medium">{formatCurrency(row.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-3 pt-2 border-t">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(displayTotalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 border-t-2 border-foreground/30 text-sm font-bold">
                  <span>Net Pay</span>
                  <span className="text-green-700 dark:text-green-400">Rs. {formatCurrency(netPay)}</span>
                </div>

                <div className="text-center p-2 text-[10px] text-muted-foreground border-t italic">
                  This is Computer generated advice & doesn't required a Signature.
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RunPayrollDialog({ open, onClose, employees }: { open: boolean; onClose: () => void; employees: Employee[] }) {
  const { toast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [empData, setEmpData] = useState<Record<number, any>>({});
  const [step, setStep] = useState<"select" | "earnings" | "deductions" | "preview">("select");

  const { data: salaryStructures } = useQuery<SalaryStructure[]>({
    queryKey: ["/api/salary-structures"],
  });

  const { data: allLoans } = useQuery<any[]>({
    queryKey: ["/api/loans"],
  });

  const getEmployeeLoanEMI = (empId: number) => {
    if (!allLoans) return 0;
    const activeLoans = allLoans.filter((l: any) => l.employeeId === empId && l.status === 'approved' && Number(l.remainingBalance) > 0);
    return activeLoans.reduce((sum: number, l: any) => sum + (Number(l.emiAmount) || 0), 0);
  };

  const calculateNetPayout = () => {
    const daysInMonth = new Date(selectedYear, parseInt(selectedMonth), 0).getDate();
    return selectedEmployees.reduce((sum, emp) => {
      const ctcOverride = Number(empData[emp.id]?.ctcOverride) || 0;
      const ctc = Number(emp.ctc) || ctcOverride;
      if (ctc === 0) return sum;

      const monthlyCTC = ctc / 12;
      const structure = salaryStructures?.find(s => s.id === emp.salaryStructureId);

      let basic = 0, hra = 0, conveyance = 0, da = 0, communication = 0, medical = 0;
      if (structure) {
        basic = Math.round((Number(structure.basicPercent) / 100) * monthlyCTC);
        hra = Math.round((Number(structure.hraPercent) / 100) * monthlyCTC);
        conveyance = Math.round((Number(structure.conveyancePercent) / 100) * monthlyCTC);
        da = Math.round((Number(structure.daPercent) / 100) * monthlyCTC);
        communication = Math.round((Number(structure.communicationPercent) / 100) * monthlyCTC);
        medical = Math.round((Number(structure.medicalPercent) / 100) * monthlyCTC);
      } else {
        basic = Math.round(0.35 * monthlyCTC);
        hra = Math.round(0.19 * monthlyCTC);
        conveyance = Math.round(0.04 * monthlyCTC);
        da = Math.round(0.33 * monthlyCTC);
        communication = Math.round(0.03 * monthlyCTC);
        medical = Math.round(0.06 * monthlyCTC);
      }

      const earnings = empData[emp.id]?.earnings || {};
      const deds = empData[emp.id]?.deductions || {};

      const variablePay = Number(emp.variablePay) || 0;
      const highAltitudeAllowance = Number(earnings.highAltitudeAllowance) || 0;
      const arrear = Number(earnings.arrear) || 0;
      const bonus = Number(earnings.bonus) || 0;
      const otherEarnings = Number(earnings.otherEarnings) || 0;
      const birthdayAllowanceAmount = Number(emp.birthdayAllowance) || 0;

      const grossMonthly = basic + hra + conveyance + da + communication + medical + variablePay + highAltitudeAllowance + arrear + bonus + otherEarnings + birthdayAllowanceAmount;

      let insurancePremium = 0;
      const calcAgeSlabs = [
        { minAge: 0, maxAge: 18, share: 162 },
        { minAge: 19, maxAge: 35, share: 192 },
        { minAge: 36, maxAge: 45, share: 210 },
        { minAge: 46, maxAge: 55, share: 320 },
        { minAge: 56, maxAge: 60, share: 493 },
        { minAge: 61, maxAge: 65, share: 668 },
        { minAge: 66, maxAge: 70, share: 785 },
        { minAge: 71, maxAge: 75, share: 925 },
        { minAge: 76, maxAge: 90, share: 1065 },
      ];
      if (emp.dateOfBirth || emp.actualDateOfBirth) {
        const dob = new Date((emp.actualDateOfBirth || emp.dateOfBirth)!);
        const today = new Date();
        let empAge = today.getFullYear() - dob.getFullYear();
        const md = today.getMonth() - dob.getMonth();
        if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) empAge--;
        const slab = calcAgeSlabs.find(s => empAge >= s.minAge && empAge <= s.maxAge);
        if (slab) insurancePremium = slab.share;
      }
      const advanceAmt = getEmployeeLoanEMI(emp.id);
      const otherDeduction = Number(deds.otherDeduction) || 0;
      const lop = parseFloat(String(deds.lop || 0)) || 0;
      const epf = 3600;

      const totalDeductions = insurancePremium + advanceAmt + otherDeduction + epf;
      const perDaySalary = grossMonthly / daysInMonth;
      const lopDeduction = parseFloat((perDaySalary * lop).toFixed(2));
      const netSalary = parseFloat((grossMonthly - totalDeductions - lopDeduction).toFixed(2));

      return sum + netSalary;
    }, 0);
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  const filteredEmployees = activeEmployees.filter(e => {
    const name = `${e.firstName} ${e.lastName || ''} ${e.employeeCode || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const toggleAll = () => {
    if (selectedIds.length === filteredEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map(e => e.id));
    }
  };

  const toggleEmployee = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateField = (empId: number, section: string, field: string, value: string) => {
    setEmpData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [section]: { ...prev[empId]?.[section], [field]: value }
      }
    }));
  };

  const updateCtcOverride = (empId: number, value: string) => {
    setEmpData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], ctcOverride: value }
    }));
  };

  const [lopFetched, setLopFetched] = useState(false);
  const fetchCycleLop = async () => {
    if (lopFetched) return;
    try {
      const ids = selectedIds.join(',');
      const resp = await fetch(`/api/payroll/cycle-lop?month=${selectedMonth}&year=${selectedYear}&employeeIds=${ids}`);
      if (resp.ok) {
        const data = await resp.json();
        setEmpData(prev => {
          const updated = { ...prev };
          for (const [empIdStr, info] of Object.entries(data) as [string, any][]) {
            const empId = Number(empIdStr);
            const existing = updated[empId]?.deductions?.lop;
            if (existing === undefined || existing === "" || existing === "0") {
              updated[empId] = {
                ...updated[empId],
                deductions: { ...updated[empId]?.deductions, lop: String(info.lop) }
              };
            }
          }
          return updated;
        });
        setLopFetched(true);
      }
    } catch (e) {
      console.error("Failed to fetch cycle LOP:", e);
    }
  };

  const EMPLOYMENT_STATUSES = [
    { value: "probation", label: "Probation" },
    { value: "confirmed", label: "Confirmed" },
    { value: "probation_extension", label: "Ext. Probation" },
    { value: "on_hold", label: "On Hold" },
  ];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ empId, status }: { empId: number; status: string }) => {
      return apiRequest("PATCH", `/api/employees/${empId}`, { employmentStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employment status updated" });
    },
  });

  const runPayrollMutation = useMutation({
    mutationFn: async (saveAsDraft: boolean = false) => {
      return apiRequest("POST", "/api/payroll/run", {
        month: selectedMonth,
        year: selectedYear,
        employeeIds: selectedIds,
        deductions: empData,
        saveAsDraft,
      });
    },
    onSuccess: (_data, saveAsDraft) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: saveAsDraft ? "Payroll saved as draft" : "Payroll processed successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to process payroll", description: err.message, variant: "destructive" });
    },
  });

  const selectedEmployees = activeEmployees.filter(e => selectedIds.includes(e.id));

  const exportCSV = (type: "earnings" | "deductions") => {
    const exportList = selectedEmployees.length > 0 ? selectedEmployees : activeEmployees;
    let headers: string[];
    let fields: string[];
    if (type === "earnings") {
      headers = ["Employee Code", "Employee Name", "Variable Pay", "High Altitude Allowance", "Birthday Allowance", "Arrear", "Bonus", "Others", "Remarks"];
      fields = ["variablePay", "highAltitudeAllowance", "birthdayAllowance", "arrear", "bonus", "otherEarnings", "remarks"];
    } else {
      headers = ["Employee Code", "Employee Name", "Insurance", "Advance/Loan", "Other Deduction", "LOP Days", "Remarks"];
      fields = ["insurancePremium", "advance", "otherDeduction", "lop", "remarks"];
    }

    const rows = exportList.map(emp => {
      const data = empData[emp.id]?.[type] || {};
      return [
        emp.employeeCode || "",
        `${emp.firstName} ${emp.lastName || ""}`,
        ...fields.map(f => data[f] || "")
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${type}_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (type: "earnings" | "deductions", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return;

      const fields = type === "earnings"
        ? ["variablePay", "highAltitudeAllowance", "birthdayAllowance", "arrear", "bonus", "otherEarnings", "remarks"]
        : ["insurancePremium", "advance", "otherDeduction", "lop", "remarks"];

      let importedCount = 0;
      const newSelectedIds = [...selectedIds];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const empCode = cols[0]?.trim();
        if (!empCode) continue;

        const emp = activeEmployees.find(e => e.employeeCode === empCode);
        if (!emp) continue;

        if (!newSelectedIds.includes(emp.id)) {
          newSelectedIds.push(emp.id);
        }

        fields.forEach((field, idx) => {
          const value = cols[idx + 2]?.trim() || "";
          if (value) {
            updateField(emp.id, type, field, value);
          }
        });
        importedCount++;
      }
      setSelectedIds(newSelectedIds);
      toast({ title: `${type === "earnings" ? "Earnings" : "Deductions"} imported for ${importedCount} employee(s)` });
    };
    reader.readAsText(file);
  };

  const steps = ["select", "earnings", "deductions", "preview"];
  const stepLabels = ["Select Employees", "Earnings", "Deductions", "Preview & Confirm"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">Run Payroll - {getMonthName(selectedMonth)} {selectedYear}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center ${
                  step === s ? 'bg-primary text-primary-foreground' :
                  currentStepIndex > i ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStepIndex > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-sm ${step === s ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {stepLabels[i]}
                </span>
                {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh] px-4 pb-4">
          {step === "select" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger data-testid="select-payroll-month"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-32">
                  <label className="text-xs font-medium">Year</label>
                  <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger data-testid="select-payroll-year"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">Bulk Upload:</span>
                <Button size="sm" variant="outline" onClick={() => exportCSV("earnings")} data-testid="button-export-earnings">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Earnings
                </Button>
                <label>
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> Import Earnings</span>
                  </Button>
                  <input type="file" accept=".csv" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) importCSV("earnings", e.target.files[0]);
                    e.target.value = "";
                  }} data-testid="input-import-earnings" />
                </label>
                <Button size="sm" variant="outline" onClick={() => exportCSV("deductions")} data-testid="button-export-deductions">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Deductions
                </Button>
                <label>
                  <Button size="sm" variant="outline" asChild>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> Import Deductions</span>
                  </Button>
                  <input type="file" accept=".csv" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) importCSV("deductions", e.target.files[0]);
                    e.target.value = "";
                  }} data-testid="input-import-deductions" />
                </label>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-payroll-employees"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">Select All ({filteredEmployees.length})</span>
                </div>
                <Badge variant="secondary">{selectedIds.length} selected</Badge>
              </div>

              {filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No matching employees found.
                </div>
              )}
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {filteredEmployees.map(emp => {
                  const hasCTC = Number(emp.ctc) > 0;
                  const annualCTC = Number(emp.ctc) || 0;
                  return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedIds.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{emp.firstName} {emp.lastName || ''}</span>
                      <span className="text-xs text-muted-foreground ml-2">{emp.employeeCode || ''}</span>
                    </div>
                    <Select
                      value={emp.employmentStatus || 'probation'}
                      onValueChange={v => updateStatusMutation.mutate({ empId: emp.id, status: v })}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs" data-testid={`select-emp-status-${emp.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">{emp.designation || ''}</span>
                    {hasCTC ? (
                      <div className="text-right">
                        <span className="text-xs font-mono font-medium block">Rs. {formatCurrency(annualCTC)}/yr</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Rs. {formatCurrency(Math.round(annualCTC / 12))}/mo</span>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">No CTC</Badge>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "earnings" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Variable Pay and Birthday Allowance default to employee record values (shown as placeholder). Override as needed. Enter other additional earnings below.</p>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-[130px_80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-0 bg-muted px-3 py-2 text-xs font-medium border-b">
                  <span>Employee</span>
                  <span>CTC Override</span>
                  <span>Variable Pay</span>
                  <span>Birthday Allow.</span>
                  <span>High Alt. Allow.</span>
                  <span>Arrear</span>
                  <span>Bonus</span>
                  <span>Others</span>
                  <span>Remarks</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {selectedEmployees.map(emp => {
                    const empCTC = Number(emp.ctc) || 0;
                    const overrideCTC = empData[emp.id]?.ctcOverride;
                    return (
                    <div key={emp.id} className="grid grid-cols-[130px_80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-1 px-3 py-1.5 border-b last:border-0 items-center">
                      <div className="truncate">
                        <span className="text-xs font-medium">{emp.firstName} {(emp.lastName || '')[0] || ''}</span>
                        <span className="text-[10px] text-muted-foreground block">{emp.employeeCode}</span>
                      </div>
                      {empCTC > 0 ? (
                        <span className="text-[10px] font-mono text-muted-foreground">{formatCurrency(empCTC)}</span>
                      ) : (
                        <Input
                          type="number"
                          placeholder="CTC"
                          className="h-7 text-xs border-destructive"
                          value={overrideCTC || ""}
                          onChange={e => updateCtcOverride(emp.id, e.target.value)}
                        />
                      )}
                      <Input type="number" placeholder={String(Number(emp.variablePay) || 0)} className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.variablePay ?? ""}
                        onChange={e => updateField(emp.id, "earnings", "variablePay", e.target.value)}
                        data-testid={`vp-${emp.id}`}
                      />
                      <Input type="number" placeholder={String(Number(emp.birthdayAllowance) || 0)} className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.birthdayAllowance ?? ""}
                        onChange={e => updateField(emp.id, "earnings", "birthdayAllowance", e.target.value)}
                        data-testid={`ba-${emp.id}`}
                      />
                      <Input type="number" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.highAltitudeAllowance || ""}
                        onChange={e => updateField(emp.id, "earnings", "highAltitudeAllowance", e.target.value)}
                      />
                      <Input type="number" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.arrear || ""}
                        onChange={e => updateField(emp.id, "earnings", "arrear", e.target.value)}
                      />
                      <Input type="number" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.bonus || ""}
                        onChange={e => updateField(emp.id, "earnings", "bonus", e.target.value)}
                      />
                      <Input type="number" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.otherEarnings || ""}
                        onChange={e => updateField(emp.id, "earnings", "otherEarnings", e.target.value)}
                      />
                      <Input placeholder="" className="h-7 text-xs"
                        value={empData[emp.id]?.earnings?.remarks || ""}
                        onChange={e => updateField(emp.id, "earnings", "remarks", e.target.value)}
                      />
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === "deductions" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Insurance (age-based), Loan EMI, EPF (Rs. 3,600 fixed — employee + employer), and Income Tax (from tax declarations) are auto-calculated. LOP is auto-populated from attendance cycle (26th-25th) — override if needed.</p>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-0 bg-muted px-3 py-2 text-xs font-medium border-b">
                  <span>Employee</span>
                  <span>Other Ded.</span>
                  <span>LOP Days</span>
                  <span>Remarks</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {selectedEmployees.map(emp => (
                    <div key={emp.id} className="grid grid-cols-[140px_1fr_1fr_1fr] gap-1 px-3 py-1.5 border-b last:border-0 items-center">
                      <div className="truncate">
                        <span className="text-xs font-medium">{emp.firstName} {(emp.lastName || '')[0] || ''}</span>
                        <span className="text-[10px] text-muted-foreground block">{emp.employeeCode}</span>
                      </div>
                      <Input type="number" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.deductions?.otherDeduction || ""}
                        onChange={e => updateField(emp.id, "deductions", "otherDeduction", e.target.value)}
                      />
                      <Input type="number" step="0.01" placeholder="0" className="h-7 text-xs"
                        value={empData[emp.id]?.deductions?.lop || ""}
                        onChange={e => updateField(emp.id, "deductions", "lop", e.target.value)}
                      />
                      <Input placeholder="" className="h-7 text-xs"
                        value={empData[emp.id]?.deductions?.remarks || ""}
                        onChange={e => updateField(emp.id, "deductions", "remarks", e.target.value)}
                        data-testid={`input-ded-remarks-${emp.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Employees</p>
                    <p className="text-xl font-bold">{selectedIds.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Period</p>
                    <p className="text-xl font-bold">{getMonthName(selectedMonth)} {selectedYear}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground">Est. Total Payout</p>
                    <p className="text-xl font-bold text-green-600">
                      Rs. {formatCurrency(Math.round(calculateNetPayout()))}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                <div className="grid grid-cols-[1fr_100px_100px_100px] px-3 py-2 bg-muted text-xs font-medium border-b">
                  <span>Employee</span>
                  <span className="text-right">CTC (Monthly)</span>
                  <span className="text-right">Deductions</span>
                  <span className="text-right">Net Pay</span>
                </div>
                {selectedEmployees.map(emp => {
                  const ctcOverride = Number(empData[emp.id]?.ctcOverride) || 0;
                  const ctc = Number(emp.ctc) || ctcOverride;
                  const monthlyCTC = ctc / 12;
                  const daysInMonth = new Date(selectedYear, parseInt(selectedMonth), 0).getDate();
                  const structure = salaryStructures?.find(s => s.id === emp.salaryStructureId);

                  let basic = 0, hra = 0, conveyance = 0, da = 0, communication = 0, medical = 0;
                  if (structure) {
                    basic = Math.round((Number(structure.basicPercent) / 100) * monthlyCTC);
                    hra = Math.round((Number(structure.hraPercent) / 100) * monthlyCTC);
                    conveyance = Math.round((Number(structure.conveyancePercent) / 100) * monthlyCTC);
                    da = Math.round((Number(structure.daPercent) / 100) * monthlyCTC);
                    communication = Math.round((Number(structure.communicationPercent) / 100) * monthlyCTC);
                    medical = Math.round((Number(structure.medicalPercent) / 100) * monthlyCTC);
                  } else {
                    basic = Math.round(0.35 * monthlyCTC);
                    hra = Math.round(0.19 * monthlyCTC);
                    conveyance = Math.round(0.04 * monthlyCTC);
                    da = Math.round(0.33 * monthlyCTC);
                    communication = Math.round(0.03 * monthlyCTC);
                    medical = Math.round(0.06 * monthlyCTC);
                  }

                  const earningsData = empData[emp.id]?.earnings || {};
                  const dedsData = empData[emp.id]?.deductions || {};
                  const variablePay = Number(emp.variablePay) || 0;
                  const highAltitudeAllowance = Number(earningsData.highAltitudeAllowance) || 0;
                  const arrear = Number(earningsData.arrear) || 0;
                  const bonus = Number(earningsData.bonus) || 0;
                  const otherEarn = Number(earningsData.otherEarnings) || 0;
                  const birthdayAmt = Number(emp.birthdayAllowance) || 0;
                  const grossMonthly = basic + hra + conveyance + da + communication + medical + variablePay + highAltitudeAllowance + arrear + bonus + otherEarn + birthdayAmt;

                  let insPremium = 0;
                  const previewAgeSlabs = [
                    { minAge: 0, maxAge: 18, share: 162 },
                    { minAge: 19, maxAge: 35, share: 192 },
                    { minAge: 36, maxAge: 45, share: 210 },
                    { minAge: 46, maxAge: 55, share: 320 },
                    { minAge: 56, maxAge: 60, share: 493 },
                    { minAge: 61, maxAge: 65, share: 668 },
                    { minAge: 66, maxAge: 70, share: 785 },
                    { minAge: 71, maxAge: 75, share: 925 },
                    { minAge: 76, maxAge: 90, share: 1065 },
                  ];
                  if (emp.dateOfBirth || emp.actualDateOfBirth) {
                    const dob = new Date((emp.actualDateOfBirth || emp.dateOfBirth)!);
                    const today = new Date();
                    let empAge = today.getFullYear() - dob.getFullYear();
                    const md = today.getMonth() - dob.getMonth();
                    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) empAge--;
                    const slab = previewAgeSlabs.find(s => empAge >= s.minAge && empAge <= s.maxAge);
                    if (slab) insPremium = slab.share;
                  }
                  const epf = 3600;
                  const loanEMI = getEmployeeLoanEMI(emp.id);
                  const otherDed = Number(dedsData.otherDeduction) || 0;
                  const lop = parseFloat(String(dedsData.lop || 0)) || 0;
                  const totalDeds = insPremium + loanEMI + otherDed + epf;
                  const lopDed = parseFloat(((grossMonthly / daysInMonth) * lop).toFixed(2));
                  const netPay = Math.round(grossMonthly - totalDeds - lopDed);

                  return (
                    <div key={emp.id} className="grid grid-cols-[1fr_100px_100px_100px] px-3 py-2 border-b last:border-0 text-sm items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{emp.firstName} {emp.lastName || ''}</span>
                        <Select
                          value={emp.employmentStatus || 'probation'}
                          onValueChange={v => updateStatusMutation.mutate({ empId: emp.id, status: v })}
                        >
                          <SelectTrigger className="w-[120px] h-6 text-[10px]" data-testid={`select-preview-status-${emp.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="font-mono text-right text-xs">Rs. {formatCurrency(Math.round(monthlyCTC))}</span>
                      <span className="font-mono text-right text-xs text-red-600">Rs. {formatCurrency(Math.round(totalDeds + lopDed))}</span>
                      <span className="font-mono text-right text-xs text-green-600">Rs. {formatCurrency(netPay)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Salary components will be auto-calculated based on each employee's CTC and assigned salary structure. EPF will be deducted automatically. LOP deduction is calculated proportionally based on absent days.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="outline" onClick={() => {
            if (step === "select") onClose();
            else if (step === "earnings") setStep("select");
            else if (step === "deductions") setStep("earnings");
            else setStep("deductions");
          }}>
            {step === "select" ? "Cancel" : "Back"}
          </Button>
          <div className="flex gap-2">
            {step === "preview" && (
              <Button
                variant="outline"
                onClick={() => runPayrollMutation.mutate(true)}
                disabled={runPayrollMutation.isPending}
                data-testid="button-save-draft-payroll"
              >
                {runPayrollMutation.isPending ? "Saving..." : "Save as Draft"}
              </Button>
            )}
            <Button
              onClick={() => {
                if (step === "select") {
                  if (selectedIds.length === 0) {
                    toast({ title: "Select at least one employee", variant: "destructive" });
                    return;
                  }
                  setStep("earnings");
                } else if (step === "earnings") {
                  fetchCycleLop();
                  const missingEarningsRemarks = selectedEmployees.filter(e => {
                    const otherEarn = Number(empData[e.id]?.earnings?.otherEarnings) || 0;
                    const remarks = (empData[e.id]?.earnings?.remarks || "").trim();
                    return otherEarn > 0 && !remarks;
                  });
                  if (missingEarningsRemarks.length > 0) {
                    toast({
                      title: "Remarks required for Other Earnings",
                      description: `Please enter remarks for: ${missingEarningsRemarks.slice(0, 3).map(e => e.firstName).join(', ')}${missingEarningsRemarks.length > 3 ? '...' : ''}`,
                      variant: "destructive"
                    });
                    return;
                  }
                  setStep("deductions");
                } else if (step === "deductions") {
                  const missingRemarks = selectedEmployees.filter(e => {
                    const otherDed = Number(empData[e.id]?.deductions?.otherDeduction) || 0;
                    const remarks = (empData[e.id]?.deductions?.remarks || "").trim();
                    return otherDed > 0 && !remarks;
                  });
                  if (missingRemarks.length > 0) {
                    toast({
                      title: "Remarks required for Other Deductions",
                      description: `Please enter remarks for: ${missingRemarks.slice(0, 3).map(e => e.firstName).join(', ')}${missingRemarks.length > 3 ? '...' : ''}`,
                      variant: "destructive"
                    });
                    return;
                  }
                  const missingCTC = selectedEmployees.filter(e => {
                    const empCTC = Number(e.ctc) || 0;
                    const override = Number(empData[e.id]?.ctcOverride) || 0;
                    return empCTC === 0 && override === 0;
                  });
                  if (missingCTC.length > 0) {
                    toast({
                      title: `${missingCTC.length} employee(s) have no CTC`,
                      description: `Please enter CTC for: ${missingCTC.slice(0, 3).map(e => e.firstName).join(', ')}${missingCTC.length > 3 ? '...' : ''}. They will be skipped if CTC is not provided.`,
                      variant: "destructive"
                    });
                  }
                  setStep("preview");
                } else {
                  runPayrollMutation.mutate(false);
                }
              }}
              disabled={runPayrollMutation.isPending}
              data-testid="button-confirm-payroll"
            >
              {step === "preview" ? (runPayrollMutation.isPending ? "Processing..." : "Confirm & Process") : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDraftDialog({ record, employee, onClose }: { record: Payroll; employee: Employee | undefined; onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    variablePay: record.variablePay || "0",
    highAltitudeAllowance: record.highAltitudeAllowance || "0",
    birthdayAllowance: record.birthdayAllowance || "0",
    arrear: record.arrear || "0",
    bonus: record.bonus || "0",
    otherEarnings: record.otherEarnings || "0",
    earningsRemarks: record.earningsRemarks || "",
    insurancePremium: record.insurancePremium || "0",
    advance: record.advance || "0",
    otherDeductions: record.otherDeductions || "0",
    lop: String(record.lop || "0"),
    deductionsRemarks: record.deductionsRemarks || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PATCH", `/api/payroll/${record.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Draft payroll updated" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const daysInMonth = record.totalDays || 30;
    const basic = Number(record.basicSalary);
    const hra = Number(record.hra);
    const conveyance = Number(record.conveyance);
    const da = Number(record.da);
    const communication = Number(record.communicationAllowance);
    const medical = Number(record.medicalAllowance);
    const variablePay = Number(formData.variablePay) || 0;
    const highAlt = Number(formData.highAltitudeAllowance) || 0;
    const birthdayAllow = Number(formData.birthdayAllowance) || 0;
    const arrear = Number(formData.arrear) || 0;
    const bonus = Number(formData.bonus) || 0;
    const otherEarnings = Number(formData.otherEarnings) || 0;
    const lop = parseFloat(formData.lop) || 0;

    const grossMonthly = basic + hra + conveyance + da + communication + medical + variablePay + highAlt + arrear + bonus + otherEarnings + birthdayAllow;
    const epf = 3600;
    const insurancePremium = Number(formData.insurancePremium) || 0;
    const advance = Number(formData.advance) || 0;
    const otherDeductions = Number(formData.otherDeductions) || 0;
    const totalDeductions = insurancePremium + advance + otherDeductions + epf;

    const perDaySalary = grossMonthly / daysInMonth;
    const lopDeduction = parseFloat((perDaySalary * lop).toFixed(2));
    const workingDays = parseFloat((daysInMonth - lop).toFixed(2));
    const netSalary = parseFloat((grossMonthly - totalDeductions - lopDeduction).toFixed(2));

    updateMutation.mutate({
      variablePay: formData.variablePay,
      highAltitudeAllowance: formData.highAltitudeAllowance,
      birthdayAllowance: formData.birthdayAllowance,
      arrear: formData.arrear,
      bonus: formData.bonus,
      otherEarnings: formData.otherEarnings,
      earningsRemarks: formData.earningsRemarks,
      tds: "0",
      insurancePremium: formData.insurancePremium,
      advance: formData.advance,
      otherDeductions: formData.otherDeductions,
      deductionsRemarks: formData.deductionsRemarks,
      lop: lop.toString(),
      workingDays: workingDays.toString(),
      lopDeduction: lopDeduction.toString(),
      epf: epf.toString(),
      deductions: totalDeductions.toString(),
      grossSalary: grossMonthly.toString(),
      allowances: grossMonthly.toString(),
      netSalary: netSalary.toString(),
    });
  };

  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Edit Draft - {employee?.firstName} {employee?.lastName || ''} - {getMonthName(record.month)} {record.year}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-4 pb-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Base Salary (Auto-calculated, read-only)</h3>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>Basic: Rs. {formatCurrency(record.basicSalary)}</div>
                <div>HRA: Rs. {formatCurrency(record.hra)}</div>
                <div>DA: Rs. {formatCurrency(record.da)}</div>
                <div>Conveyance: Rs. {formatCurrency(record.conveyance)}</div>
                <div>Communication: Rs. {formatCurrency(record.communicationAllowance)}</div>
                <div>Medical: Rs. {formatCurrency(record.medicalAllowance)}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Earnings</h3>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
                <div>Variable Pay: Rs. {formatCurrency(formData.variablePay)} <span className="text-[10px]">(from employee record)</span></div>
                <div>Birthday Allow.: Rs. {formatCurrency(formData.birthdayAllowance)} <span className="text-[10px]">(from employee record)</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">High Altitude Allowance</label>
                  <Input type="number" value={formData.highAltitudeAllowance} onChange={e => update("highAltitudeAllowance", e.target.value)} data-testid="input-edit-high-alt" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Arrear</label>
                  <Input type="number" value={formData.arrear} onChange={e => update("arrear", e.target.value)} data-testid="input-edit-arrear" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Bonus</label>
                  <Input type="number" value={formData.bonus} onChange={e => update("bonus", e.target.value)} data-testid="input-edit-bonus" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Other Earnings</label>
                  <Input type="number" value={formData.otherEarnings} onChange={e => update("otherEarnings", e.target.value)} data-testid="input-edit-other-earnings" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <label className="text-xs text-muted-foreground">Earnings Remarks</label>
                <Input value={formData.earningsRemarks} onChange={e => update("earningsRemarks", e.target.value)} data-testid="input-edit-earnings-remarks" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Deductions</h3>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
                <div>Insurance: Rs. {formatCurrency(formData.insurancePremium)} <span className="text-[10px]">(auto from age)</span></div>
                <div>Loan EMI: Rs. {formatCurrency(formData.advance)} <span className="text-[10px]">(auto from loans)</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Other Deduction</label>
                  <Input type="number" value={formData.otherDeductions} onChange={e => update("otherDeductions", e.target.value)} data-testid="input-edit-other-ded" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">LOP Days</label>
                  <Input type="number" step="0.01" value={formData.lop} onChange={e => update("lop", e.target.value)} data-testid="input-edit-lop" />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <label className="text-xs text-muted-foreground">Deductions Remarks</label>
                <Input value={formData.deductionsRemarks} onChange={e => update("deductionsRemarks", e.target.value)} data-testid="input-edit-ded-remarks" />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-draft-edit">
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollPage() {
  const [showRunPayroll, setShowRunPayroll] = useState(false);
  const [viewPayslip, setViewPayslip] = useState<Payroll | null>(null);
  const [editDraft, setEditDraft] = useState<Payroll | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [payrollSearch, setPayrollSearch] = useState("");
  const { entityFilterParam, selectedEntityIds } = useEntity();

  const { data: allEntities } = useQuery<import("@shared/schema").Entity[]>({
    queryKey: ["/api/entities"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const getEntityForEmployee = (emp: Employee | undefined) => {
    if (!emp?.entityId || !allEntities) return null;
    return allEntities.find(e => e.id === emp.entityId);
  };

  const payrollQueryParams = new URLSearchParams();
  if (filterMonth && filterMonth !== "all") payrollQueryParams.set("month", filterMonth);
  if (filterYear && filterYear !== "all") payrollQueryParams.set("year", filterYear);
  const payrollQueryStr = payrollQueryParams.toString();

  const { data: payroll } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll", filterMonth, filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/payroll${payrollQueryStr ? `?${payrollQueryStr}` : ''}`);
      if (!res.ok) throw new Error("Failed to fetch payroll");
      return res.json();
    },
  });

  const totalPayroll = payroll?.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0) || 0;
  const processedCount = payroll?.filter(p => p.status === 'processed' || p.status === 'paid').length || 0;
  const draftCount = payroll?.filter(p => p.status === 'draft').length || 0;

  const entityEmployeeIds = selectedEntityIds.length > 0 && employees ? new Set(employees.map(e => e.id)) : null;
  
  const filteredPayroll = payroll?.filter(p => {
    if (entityEmployeeIds && !entityEmployeeIds.has(p.employeeId)) return false;
    if (payrollSearch) {
      const emp = employees?.find(e => e.id === p.employeeId);
      if (!emp) return false;
      const searchStr = `${emp.firstName} ${emp.lastName || ''} ${emp.employeeCode || ''} ${emp.email || ''}`.toLowerCase();
      if (!searchStr.includes(payrollSearch.toLowerCase())) return false;
    }
    return true;
  });

  const uniqueMonths = Array.from(new Set(payroll?.map(p => `${getMonthName(p.month)} ${p.year}`) || []));

  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/payroll/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    },
  });

  const journalMutation = useMutation({
    mutationFn: async ({ month, year }: { month: string; year: number }) => {
      const res = await apiRequest("POST", "/api/journal-entries/generate", { month, year });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Journal entries generated", description: `${data.count} entries created` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerateJournal = () => {
    const month = filterMonth && filterMonth !== "all" ? filterMonth : String(new Date().getMonth() + 1).padStart(2, '0');
    const year = filterYear && filterYear !== "all" ? Number(filterYear) : new Date().getFullYear();
    const monthLabel = getMonthName(month);
    if (confirm(`Generate salary journal entries for ${monthLabel} ${year}? This will replace any existing entries for this period.`)) {
      journalMutation.mutate({ month, year });
    }
  };

  const handleExportJournal = async () => {
    const month = filterMonth && filterMonth !== "all" ? filterMonth : "";
    const year = filterYear && filterYear !== "all" ? filterYear : "";
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    try {
      const res = await fetch(`/api/journal-entries?${params.toString()}`);
      const entries = await res.json();
      if (!entries || entries.length === 0) {
        toast({ title: "No journal entries found", description: "Generate journal entries first", variant: "destructive" });
        return;
      }
      const headers = ["Journal Template Name","Journal Batch Name","Line No.","Account Type","Account No.","Posting Date","Document Type","Document No.","Description","Bal. Account No.","Amount","Debit Amount","Credit Amount","Bal. Account Type","Location Code","Payee Name"];
      const rows = entries.map((e: any) => [
        e.journal_template_name, e.journal_batch_name, e.line_no, e.account_type,
        e.account_no, e.posting_date, e.document_type || '', e.document_no || '',
        e.description, e.bal_account_no, e.amount, e.debit_amount, e.credit_amount,
        e.bal_account_type, e.location_code, e.payee_name
      ].join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary_journal_entries_${month || 'all'}_${year || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleExportBankTemplate = () => {
    if (!filteredPayroll || filteredPayroll.length === 0) {
      toast({ title: "No payroll records to export", variant: "destructive" });
      return;
    }

    const processedRecords = filteredPayroll.filter((p: any) => p.status === 'processed' || p.status === 'paid');
    if (processedRecords.length === 0) {
      toast({ title: "No processed payroll records found", variant: "destructive" });
      return;
    }

    const month = filterMonth && filterMonth !== "all" ? filterMonth : "";
    const year = filterYear && filterYear !== "all" ? filterYear : "";
    const monthLabel = month ? getMonthName(month) : "All";
    const lastDay = month && year ? new Date(Number(year), parseInt(month), 0) : new Date();
    const txnDate = `${lastDay.getDate().toString().padStart(2,'0')}/${lastDay.getMonth() < 9 ? '0' : ''}${lastDay.getMonth()+1}/${lastDay.getFullYear()}`;

    const headers = [
      "Transaction Type (N-NEFT R-RTGS I-Internal HDFC)",
      "Beneficiary Code",
      "Beneficiary Account Number",
      "Amount",
      "Beneficiary Name",
      "Drawee Location",
      "Print Location",
      "Bene Address 1",
      "Bene Address 2",
      "Bene Address 3",
      "Bene Address 4",
      "Bene Address 5",
      "Instruction Reference Number",
      "Customer Reference Number",
      "Payment details 1",
      "Payment details 2",
      "Payment details 3",
      "Payment details 4",
      "Payment details 5",
      "Payment details 6",
      "Payment details 7",
      "Cheque Number",
      "Transaction Date (DD/MM/YYYY)",
      "MICR Number",
      "IFSC Code",
      "Beneficiary Bank Name",
      "Beneficiary Bank Branch Name",
      "Beneficiary email id"
    ];

    const rows = processedRecords.map((record: any) => {
      const emp = employees?.find(e => e.id === record.employeeId);
      if (!emp) return null;

      const netPay = Number(record.netSalary) || 0;
      const beneficiaryName = `${emp.firstName} ${emp.lastName || ''}`.trim().substring(0, 40);
      const bankName = emp.bankName || '';
      const isHDFC = bankName.toLowerCase().includes('hdfc');
      const txnType = isHDFC ? 'I' : 'N';

      return [
        txnType,                                          // 1. Transaction Type
        isHDFC ? (emp.bankAccountNumber || '') : '',      // 2. Beneficiary Code
        emp.bankAccountNumber || '',                      // 3. Beneficiary Account Number
        netPay.toFixed(2),                                // 4. Amount
        beneficiaryName,                                  // 5. Beneficiary Name
        '',                                               // 6. Drawee Location
        '',                                               // 7. Print Location
        '',                                               // 8. Bene Address 1
        '',                                               // 9. Bene Address 2
        '',                                               // 10. Bene Address 3
        '',                                               // 11. Bene Address 4
        '',                                               // 12. Bene Address 5
        '',                                               // 13. Instruction Reference Number
        `SAL-${monthLabel}-${year || lastDay.getFullYear()}`, // 14. Customer Reference Number
        `Salary ${monthLabel} ${year || lastDay.getFullYear()}`, // 15. Payment details 1
        '',                                               // 16. Payment details 2
        '',                                               // 17. Payment details 3
        '',                                               // 18. Payment details 4
        '',                                               // 19. Payment details 5
        '',                                               // 20. Payment details 6
        '',                                               // 21. Payment details 7
        '',                                               // 22. Cheque Number
        txnDate,                                          // 23. Transaction Date
        '',                                               // 24. MICR Number
        emp.ifscCode || '',                               // 25. IFSC Code
        bankName,                                         // 26. Beneficiary Bank Name
        emp.branchName || '',                             // 27. Beneficiary Bank Branch Name
        emp.email || ''                                   // 28. Beneficiary email id
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }).filter(Boolean);

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HDFC_Bank_Salary_${monthLabel}_${year || new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `HDFC bank template exported for ${processedRecords.length} employee(s)` });
  };

  const handleExportYesBankTemplate = () => {
    if (!filteredPayroll || filteredPayroll.length === 0) {
      toast({ title: "No payroll records to export", variant: "destructive" });
      return;
    }

    const processedRecords = filteredPayroll.filter((p: any) => p.status === 'processed' || p.status === 'paid');
    if (processedRecords.length === 0) {
      toast({ title: "No processed payroll records found", variant: "destructive" });
      return;
    }

    const month = filterMonth && filterMonth !== "all" ? filterMonth : "";
    const year = filterYear && filterYear !== "all" ? filterYear : "";
    const monthLabel = month ? getMonthName(month) : "All";
    const lastDay = month && year ? new Date(Number(year), parseInt(month), 0) : new Date();
    const txnDate = `${lastDay.getDate()}/${lastDay.getMonth() + 1}/${lastDay.getFullYear()}`;
    const selEntity = allEntities?.find(e => selectedEntityIds.length > 0 ? selectedEntityIds.includes(e.id) : true);
    const companyAccount = selEntity?.bankAccountNumber || "026384600000452";
    const companyName = selEntity?.legalName || selEntity?.name || "FC TECNRGY PRIVATE LIMITED";

    const headers = [
      "Unique Reference No",
      "Date",
      "Amount",
      "Narration",
      "Beneficiary Account Number",
      "IFSC Code",
      "Beneficiary Name",
      "Debit Account Number",
      "Company Name"
    ];

    let totalAmount = 0;
    const rows = processedRecords.map((record: any, idx: number) => {
      const emp = employees?.find(e => e.id === record.employeeId);
      if (!emp) return null;

      const netPay = Number(record.netSalary) || 0;
      totalAmount += netPay;
      const beneficiaryName = `${emp.firstName} ${emp.lastName || ''}`.trim().substring(0, 40);
      const uniqueRef = `A2A${beneficiaryName.replace(/\s+/g, '').toUpperCase().substring(0, 8)}${String(idx + 1).padStart(2, '0')}${month}${year}`;
      const narration = `SAL ${beneficiaryName} ${monthLabel} ${year || lastDay.getFullYear()}`;

      return [
        uniqueRef,
        txnDate,
        netPay.toFixed(2),
        narration,
        emp.bankAccountNumber || '',
        emp.ifscCode || '',
        beneficiaryName,
        companyAccount,
        companyName
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    }).filter(Boolean);

    const summaryRow = ['', '', '', '', '', '', '', '', ''].map(() => '""').join(',');
    const summaryInfo = [
      `"no of transactions","${processedRecords.length}"`,
      `"total amount","${totalAmount.toFixed(2)}"`
    ];

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows, summaryRow, ...summaryInfo].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YesBank_A2A_Salary_${monthLabel}_${year || new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Yes Bank template exported for ${processedRecords.length} employee(s)` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-payroll-title">Payroll Management</h1>
          <p className="text-muted-foreground text-sm">Process payroll and generate payslips</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={v => {
            if (v === 'hdfc') handleExportBankTemplate();
            if (v === 'yesbank') handleExportYesBankTemplate();
          }}>
            <SelectTrigger className="w-[160px]" data-testid="select-bank-template">
              <FileText className="w-4 h-4 mr-2" />
              <span>Bank Template</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hdfc">HDFC Bank (RBI Adapter)</SelectItem>
              <SelectItem value="yesbank">Yes Bank (A2A DFT)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleGenerateJournal} disabled={journalMutation.isPending} data-testid="button-generate-journal">
            {journalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
            Generate Journal
          </Button>
          <Button variant="outline" onClick={handleExportJournal} data-testid="button-export-journal">
            <Download className="w-4 h-4 mr-2" />
            Export Journal
          </Button>
          <Button onClick={() => setShowRunPayroll(true)} data-testid="button-run-payroll">
            <Calculator className="w-4 h-4 mr-2" />
            Run Payroll
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-xl font-bold">Rs. {formatCurrency(totalPayroll)}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Records</p>
                <p className="text-xl font-bold">{payroll?.length || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-xl font-bold text-green-600">{processedCount}</p>
              </div>
              <FileCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-xl font-bold text-yellow-600">{draftCount}</p>
              </div>
              <Pencil className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Payroll Records & Payslips
            </CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, email..."
                  value={payrollSearch}
                  onChange={e => setPayrollSearch(e.target.value)}
                  className="pl-8 h-9 w-56 text-sm"
                  data-testid="input-search-payroll-records"
                />
              </div>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-36" data-testid="select-filter-month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-28" data-testid="select-filter-year">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              {filteredPayroll && filteredPayroll.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => {
                  const headers = ["Employee ID", "Employee Code", "Employee Name", "Month", "Year", "Basic", "HRA", "DA", "Conveyance", "Communication", "Medical", "Variable Pay", "High Alt. Allowance", "Birthday Allowance", "Arrear", "Bonus", "Other Earnings", "Gross Salary", "EPF", "TDS", "Insurance", "Advance", "Other Deductions", "LOP Days", "LOP Deduction", "Total Deductions", "Net Salary", "Status"];
                  const rows = filteredPayroll.map(record => {
                    const emp = employees?.find(e => e.id === record.employeeId);
                    return [
                      record.employeeId,
                      emp?.employeeCode || "",
                      emp ? `${emp.firstName} ${emp.lastName || ""}` : "Unknown",
                      getMonthName(record.month),
                      record.year,
                      record.basicSalary,
                      record.hra,
                      record.da,
                      record.conveyance,
                      record.communicationAllowance,
                      record.medicalAllowance,
                      record.variablePay,
                      record.highAltitudeAllowance,
                      record.birthdayAllowance,
                      record.arrear,
                      record.bonus,
                      record.otherEarnings,
                      record.grossSalary,
                      record.epf,
                      record.tds,
                      record.insurancePremium,
                      record.advance,
                      record.otherDeductions,
                      record.lop,
                      record.lopDeduction,
                      record.deductions,
                      record.netSalary,
                      record.status
                    ].join(",");
                  });
                  const csv = [headers.join(","), ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `payroll_report_${filterMonth || "all"}_${filterYear || "all"}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} data-testid="button-export-payroll-report">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!filteredPayroll || filteredPayroll.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No payroll records yet</p>
              <p className="text-sm mt-1">Click "Run Payroll" to process payroll for employees</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium text-right">Gross</th>
                    <th className="pb-3 font-medium text-right">Deductions</th>
                    <th className="pb-3 font-medium text-right">Net Salary</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map(record => {
                    const emp = employees?.find(e => e.id === record.employeeId);
                    return (
                      <tr key={record.id} className="border-b last:border-0" data-testid={`row-payroll-${record.id}`}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                            </div>
                            <div>
                              <span className="text-sm font-medium">{emp ? `${emp.firstName} ${emp.lastName || ''}` : 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground block">{emp?.employeeCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-sm">{getMonthName(record.month)} {record.year}</td>
                        <td className="py-3 text-right font-mono text-sm">Rs. {formatCurrency(record.grossSalary)}</td>
                        <td className="py-3 text-right font-mono text-sm text-red-600">-{formatCurrency(record.deductions)}</td>
                        <td className="py-3 text-right font-mono text-sm font-bold">Rs. {formatCurrency(record.netSalary)}</td>
                        <td className="py-3">
                          <Badge className={
                            record.status === 'paid' ? "bg-green-100 text-green-700" :
                            record.status === 'processed' ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setViewPayslip(record)}
                              data-testid={`button-view-payslip-${record.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {record.status === 'draft' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditDraft(record)}
                                  data-testid={`button-edit-draft-${record.id}`}
                                >
                                  <Pencil className="w-4 h-4 text-yellow-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => statusMutation.mutate({ id: record.id, status: 'processed' })}
                                  data-testid={`button-finalize-${record.id}`}
                                >
                                  <FileCheck className="w-4 h-4 text-blue-600" />
                                </Button>
                              </>
                            )}
                            {record.status === 'processed' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => statusMutation.mutate({ id: record.id, status: 'paid' })}
                                data-testid={`button-mark-paid-${record.id}`}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                          </div>
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

      {showRunPayroll && (
        <RunPayrollDialog
          open={showRunPayroll}
          onClose={() => setShowRunPayroll(false)}
          employees={employees || []}
        />
      )}

      {viewPayslip && (() => {
        const payslipEmp = employees?.find(e => e.id === viewPayslip.employeeId);
        const payslipEntity = getEntityForEmployee(payslipEmp);
        return (
          <PayslipView
            record={viewPayslip}
            employee={payslipEmp}
            onClose={() => setViewPayslip(null)}
            entityName={payslipEntity ? (payslipEntity.payslipHeader || payslipEntity.legalName || "") : undefined}
            entityAddress={payslipEntity ? `${payslipEntity.address || ''}${payslipEntity.city ? `, ${payslipEntity.city}` : ''}${payslipEntity.state ? ` - ${payslipEntity.pincode || ''} ${payslipEntity.state}` : ''}` : undefined}
            entityDetails={payslipEntity ? `${payslipEntity.phone ? `Tel: ${payslipEntity.phone}` : ''}${payslipEntity.email ? `, Email: ${payslipEntity.email}` : ''}${payslipEntity.website ? ` | ${payslipEntity.website}` : ''}` : undefined}
          />
        );
      })()}

      {editDraft && (
        <EditDraftDialog
          record={editDraft}
          employee={employees?.find(e => e.id === editDraft.employeeId)}
          onClose={() => setEditDraft(null)}
        />
      )}
    </div>
  );
}
