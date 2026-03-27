import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Payroll, Employee } from "@shared/schema";

export function ESSPayslipView({ record, employee, onClose, getMonthName, formatCurrency, entityName, entityAddress, entityDetails }: {
  record: Payroll;
  employee: Employee | undefined;
  onClose: () => void;
  getMonthName: (val: string) => string;
  formatCurrency: (val: number | string | null | undefined) => string;
  entityName?: string;
  entityAddress?: string;
  entityDetails?: string;
}) {
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
  const actualTotal = parseFloat((actualBasic + actualHra + actualConveyance + actualDa + actualComm + actualMedical + actualVariable + actualHighAlt + arrear + bonus + otherEarn + birthdayAllow).toFixed(2));

  const allEarningsRows = [
    { label: "Basic", gross: grossBasic, actual: actualBasic },
    { label: "HRA", gross: grossHra, actual: actualHra },
    { label: "DA", gross: grossDa, actual: actualDa },
    { label: "Variable Pay", gross: 0, actual: actualVariable, actualOnly: true },
    { label: "Travelling Allowance", gross: grossConveyance, actual: actualConveyance },
    { label: "Communication Allowance", gross: grossComm, actual: actualComm },
    { label: "Medical Allowance", gross: grossMedical, actual: actualMedical },
    { label: "High Altitude Allowance", gross: highAlt, actual: actualHighAlt },
    { label: "Birthday Allowance", gross: birthdayAllow, actual: birthdayAllow },
    { label: "Arrear", gross: arrear, actual: arrear },
    { label: "Bonus", gross: bonus, actual: bonus },
    { label: "Other Earnings", gross: otherEarn, actual: otherEarn },
  ];
  const earningsRows = allEarningsRows.filter(row => row.gross > 0 || row.actual > 0);

  const totalDeductions = Number(record.insurancePremium) + Number(record.incomeTax) + Number(record.advance) +
    Number(record.otherDeductions) + Number(record.epf);
  const lopDeduction = Number(record.lopDeduction) || 0;
  const netPay = Number(record.netSalary);

  const ptAmount = Number(record.professionalTax) || 0;
  const lwfAmount = Number(record.lwf) || 0;
  const allDeductionRows = [
    { label: "EPF", amount: Number(record.epf) },
    { label: "Income Tax", amount: Number(record.incomeTax) },
    { label: "Insurance Premium", amount: Number(record.insurancePremium) },
    { label: "Professional Tax", amount: ptAmount },
    { label: "LWF", amount: lwfAmount },
    { label: "Advance / Loan", amount: Number(record.advance) },
    { label: "Other Deduction", amount: Number(record.otherDeductions) },
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
              <Download className="w-4 h-4 mr-1" />
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
