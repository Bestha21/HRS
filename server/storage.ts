import { db } from "./db";
import {
  entities,
  employees, departments, attendance, leaveRequests, payroll, onboardingTasks,
  expenses, assets, announcements, exitRecords, holidays, documents, leaveTypes, leaveBalances, clearanceTasks,
  onboardingTokens, offerLetters, projects, letterTemplates, generatedLetters, onboardingDocuments, salaryStructures,
  taxDeclarationsTable, loans, loanRepayments, orgPositions, ptRules, lwfRules, birthdayWishes,
  companyPolicies, policyAcknowledgments, overtimeRequests, compOffRequests, onDutyRequests,
  type Entity, type InsertEntity,
  type Employee, type InsertEmployee, type UpdateEmployeeRequest,
  type Department, type InsertDepartment,
  type Document, type InsertDocument,
  type Attendance, type InsertAttendance,
  type LeaveType, type InsertLeaveType,
  type LeaveBalance, type InsertLeaveBalance,
  type LeaveRequest, type InsertLeaveRequest,
  type Holiday, type InsertHoliday,
  type Payroll, type InsertPayroll,
  type Expense, type InsertExpense,
  type Asset, type InsertAsset,
  type ExitRecord, type InsertExitRecord,
  type ClearanceTask, type InsertClearanceTask,
  type Announcement, type InsertAnnouncement,
  type OnboardingTask, type InsertOnboardingTask,
  type OnboardingToken, type InsertOnboardingToken,
  type OfferLetter, type InsertOfferLetter,
  type Project, type InsertProject,
  type LetterTemplate, type InsertLetterTemplate,
  type GeneratedLetter, type InsertGeneratedLetter,
  type OnboardingDocument, type InsertOnboardingDocument,
  type SalaryStructure, type InsertSalaryStructure,
  type TaxDeclaration, type InsertTaxDeclaration,
  type Loan, type InsertLoan,
  type LoanRepayment, type InsertLoanRepayment,
  type OrgPosition, type InsertOrgPosition,
  type PtRule, type InsertPtRule,
  type LwfRule, type InsertLwfRule,
  type BirthdayWish, type InsertBirthdayWish,
  type CompanyPolicy, type InsertCompanyPolicy,
  type PolicyAcknowledgment, type InsertPolicyAcknowledgment,
  type OvertimeRequest, type InsertOvertimeRequest,
  type CompOffRequest, type InsertCompOffRequest,
  type OnDutyRequest, type InsertOnDutyRequest,
  shifts, type Shift, type InsertShift,
  profileChangeRequests, type ProfileChangeRequest, type InsertProfileChangeRequest,
  attendanceLogs, type AttendanceLog, type InsertAttendanceLog
} from "@shared/schema";
import { eq, desc, and, sql, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // Entities
  getEntities(): Promise<Entity[]>;
  getEntity(id: number): Promise<Entity | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, updates: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, updates: UpdateEmployeeRequest): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  getEmployeeCount(): Promise<number>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;

  // Documents
  getDocuments(employeeId?: number): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocumentStatus(id: number, status: string, verifiedAt: Date | null, rejectionComments?: string | null): Promise<Document>;
  bulkUpdateDocumentStatus(ids: number[], status: string, verifiedAt: Date | null, rejectionComments?: string | null): Promise<Document[]>;

  // Attendance
  getAttendance(employeeId?: number, date?: string): Promise<Attendance[]>;
  getAttendanceByDateRange(startDate: string, endDate: string, employeeId?: number): Promise<Attendance[]>;
  getAttendanceById(id: number): Promise<Attendance | undefined>;
  getAttendanceByStatus(regularizationStatus: string): Promise<Attendance[]>;
  createAttendance(att: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance>;
  getAttendanceByDate(employeeId: number, date: string): Promise<Attendance | undefined>;
  getPresentCount(date: string): Promise<number>;

  // Leave Types
  getLeaveTypes(): Promise<LeaveType[]>;
  createLeaveType(type: InsertLeaveType): Promise<LeaveType>;

  // Leave Balances
  getLeaveBalances(employeeId: number): Promise<LeaveBalance[]>;
  getAllLeaveBalances(): Promise<LeaveBalance[]>;
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  updateLeaveBalanceUsed(id: number, used: string, balance: string): Promise<void>;
  updateLeaveBalanceFields(id: number, fields: { accrued?: string; used?: string; balance?: string }): Promise<void>;

  // Leaves
  getLeaveRequests(employeeId?: number, status?: string): Promise<LeaveRequest[]>;
  getLeaveRequestById(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(req: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveStatus(id: number, status: string, remarks?: string): Promise<LeaveRequest>;
  getPendingLeaveCount(): Promise<number>;
  getOnLeaveToday(): Promise<number>;

  // Holidays
  getHolidays(year?: number): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;

  // Payroll
  getPayroll(employeeId?: number, month?: string, year?: number): Promise<Payroll[]>;
  createPayroll(record: InsertPayroll): Promise<Payroll>;
  createPayrollBatch(records: InsertPayroll[]): Promise<Payroll[]>;
  deletePayrollByMonthForEmployees(month: string, year: number, employeeIds: number[]): Promise<void>;
  updatePayrollStatus(id: number, status: string): Promise<Payroll>;
  updatePayrollRecord(id: number, updates: Partial<InsertPayroll>): Promise<Payroll>;
  getPayrollById(id: number): Promise<Payroll | undefined>;

  // Expenses
  getExpenses(employeeId?: number, status?: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpenseStatus(id: number, status: string, remarks?: string): Promise<Expense>;
  getPendingExpenseCount(): Promise<number>;

  // Assets
  getAssets(employeeId?: number, status?: string): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset>;

  // Exit Records
  getExitRecords(status?: string): Promise<ExitRecord[]>;
  createExitRecord(record: InsertExitRecord): Promise<ExitRecord>;
  updateExitRecord(id: number, updates: Partial<InsertExitRecord>): Promise<ExitRecord>;

  // Clearance Tasks
  getClearanceTasks(exitRecordId: number): Promise<ClearanceTask[]>;
  createClearanceTask(task: InsertClearanceTask): Promise<ClearanceTask>;
  updateClearanceTask(id: number, updates: Partial<InsertClearanceTask>): Promise<ClearanceTask>;
  deleteClearanceTask(id: number): Promise<void>;

  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;

  // Onboarding
  getOnboardingTasks(employeeId?: number): Promise<OnboardingTask[]>;
  createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask>;
  updateOnboardingTaskStatus(id: number, status: string): Promise<OnboardingTask>;
  deleteOnboardingTask(id: number): Promise<void>;

  // Onboarding Tokens
  getOnboardingToken(token: string): Promise<OnboardingToken | undefined>;
  createOnboardingToken(data: InsertOnboardingToken): Promise<OnboardingToken>;
  markTokenUsed(token: string): Promise<OnboardingToken>;

  // Offer Letters
  getOfferLetters(employeeId?: number): Promise<OfferLetter[]>;
  createOfferLetter(data: InsertOfferLetter): Promise<OfferLetter>;
  updateOfferLetterStatus(id: number, status: string): Promise<OfferLetter>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Letter Templates
  getLetterTemplates(): Promise<LetterTemplate[]>;
  getLetterTemplate(id: number): Promise<LetterTemplate | undefined>;
  createLetterTemplate(template: InsertLetterTemplate): Promise<LetterTemplate>;
  updateLetterTemplate(id: number, updates: Partial<InsertLetterTemplate>): Promise<LetterTemplate>;
  deleteLetterTemplate(id: number): Promise<void>;

  // Generated Letters
  getGeneratedLetters(employeeId?: number): Promise<GeneratedLetter[]>;
  createGeneratedLetter(letter: InsertGeneratedLetter): Promise<GeneratedLetter>;
  updateGeneratedLetterStatus(id: number, status: string): Promise<GeneratedLetter>;

  // Onboarding Documents
  getOnboardingDocuments(employeeId?: number): Promise<OnboardingDocument[]>;
  createOnboardingDocument(doc: InsertOnboardingDocument): Promise<OnboardingDocument>;
  updateOnboardingDocumentStatus(id: number, status: string, verifiedBy?: number, remarks?: string): Promise<OnboardingDocument>;
  deleteOnboardingDocument(id: number): Promise<void>;

  // Salary Structures
  getSalaryStructures(): Promise<SalaryStructure[]>;
  getSalaryStructure(id: number): Promise<SalaryStructure | undefined>;
  createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure>;
  updateSalaryStructure(id: number, updates: Partial<InsertSalaryStructure>): Promise<SalaryStructure>;
  deleteSalaryStructure(id: number): Promise<void>;

  // Tax Declarations
  getTaxDeclarations(employeeId?: number, financialYear?: string): Promise<TaxDeclaration[]>;
  createTaxDeclaration(dec: InsertTaxDeclaration): Promise<TaxDeclaration>;
  updateTaxDeclarationStatus(id: number, status: string, reviewedBy?: number, reviewRemarks?: string): Promise<TaxDeclaration>;
  updateTaxDeclaration(id: number, data: Partial<{ investmentType: string; amount: string; otherDetails: string | null; section: string }>): Promise<TaxDeclaration>;
  submitDeclarationsToFinance(employeeId: number, financialYear: string): Promise<void>;
  deleteTaxDeclaration(id: number): Promise<void>;

  // Loans & Advances
  getLoans(employeeId?: number, status?: string): Promise<Loan[]>;
  getLoan(id: number): Promise<Loan | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, updates: Partial<InsertLoan>): Promise<Loan>;
  getLoanRepayments(loanId?: number, employeeId?: number): Promise<LoanRepayment[]>;
  createLoanRepayment(repayment: InsertLoanRepayment): Promise<LoanRepayment>;
  updateLoanRepayment(id: number, updates: Partial<InsertLoanRepayment>): Promise<LoanRepayment>;

  // Org Positions
  getOrgPositions(): Promise<OrgPosition[]>;
  createOrgPosition(position: InsertOrgPosition): Promise<OrgPosition>;
  updateOrgPosition(id: number, updates: Partial<InsertOrgPosition>): Promise<OrgPosition>;
  deleteOrgPosition(id: number): Promise<void>;

  // PT Rules
  getPtRules(state?: string): Promise<PtRule[]>;
  createPtRule(rule: InsertPtRule): Promise<PtRule>;
  updatePtRule(id: number, updates: Partial<InsertPtRule>): Promise<PtRule>;
  deletePtRule(id: number): Promise<void>;

  // LWF Rules
  getLwfRules(state?: string): Promise<LwfRule[]>;
  createLwfRule(rule: InsertLwfRule): Promise<LwfRule>;
  updateLwfRule(id: number, updates: Partial<InsertLwfRule>): Promise<LwfRule>;
  deleteLwfRule(id: number): Promise<void>;

  getBirthdayWishes(toEmployeeId?: number): Promise<BirthdayWish[]>;
  createBirthdayWish(wish: InsertBirthdayWish): Promise<BirthdayWish>;
  deleteBirthdayWish(id: number): Promise<void>;

  getCompanyPolicies(): Promise<CompanyPolicy[]>;
  getCompanyPolicy(id: number): Promise<CompanyPolicy | undefined>;
  createCompanyPolicy(policy: InsertCompanyPolicy): Promise<CompanyPolicy>;
  updateCompanyPolicy(id: number, updates: Partial<InsertCompanyPolicy>): Promise<CompanyPolicy>;
  deleteCompanyPolicy(id: number): Promise<void>;
  getPolicyAcknowledgments(policyId?: number): Promise<PolicyAcknowledgment[]>;
  createPolicyAcknowledgment(ack: InsertPolicyAcknowledgment): Promise<PolicyAcknowledgment>;
  updatePolicyAcknowledgment(id: number, updates: Partial<PolicyAcknowledgment>): Promise<PolicyAcknowledgment>;

  getOvertimeRequests(filters?: { employeeId?: number; status?: string }): Promise<OvertimeRequest[]>;
  createOvertimeRequest(req: InsertOvertimeRequest): Promise<OvertimeRequest>;
  updateOvertimeRequest(id: number, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest>;

  getCompOffRequests(filters?: { employeeId?: number; status?: string }): Promise<CompOffRequest[]>;
  createCompOffRequest(req: InsertCompOffRequest): Promise<CompOffRequest>;
  updateCompOffRequest(id: number, updates: Partial<CompOffRequest>): Promise<CompOffRequest>;

  getShifts(): Promise<Shift[]>;
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private employeeCache: { data: Employee[] | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly EMPLOYEE_CACHE_TTL = 30000;

  private invalidateEmployeeCache() {
    this.employeeCache = { data: null, timestamp: 0 };
  }

  // Entities
  async getEntities(): Promise<Entity[]> {
    return db.select().from(entities).orderBy(entities.name);
  }
  async getEntity(id: number): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity;
  }
  async createEntity(entity: InsertEntity): Promise<Entity> {
    const [created] = await db.insert(entities).values(entity).returning();
    return created;
  }
  async updateEntity(id: number, updates: Partial<InsertEntity>): Promise<Entity> {
    const [updated] = await db.update(entities).set({ ...updates, updatedAt: new Date() }).where(eq(entities.id, id)).returning();
    return updated;
  }
  async deleteEntity(id: number): Promise<void> {
    await db.delete(entities).where(eq(entities.id, id));
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const now = Date.now();
    if (this.employeeCache.data && (now - this.employeeCache.timestamp) < this.EMPLOYEE_CACHE_TTL) {
      return this.employeeCache.data;
    }
    const result = await db.select().from(employees).orderBy(desc(employees.createdAt));
    this.employeeCache = { data: result, timestamp: now };
    return result;
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const cached = this.employeeCache.data;
    if (cached && (Date.now() - this.employeeCache.timestamp) < this.EMPLOYEE_CACHE_TTL) {
      return cached.find(e => e.id === id);
    }
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const cached = this.employeeCache.data;
    if (cached && (Date.now() - this.employeeCache.timestamp) < this.EMPLOYEE_CACHE_TTL) {
      return cached.find(e => e.email?.toLowerCase() === email.toLowerCase());
    }
    const [emp] = await db.select().from(employees).where(sql`LOWER(${employees.email}) = LOWER(${email})`);
    return emp;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [emp] = await db.insert(employees).values(insertEmployee).returning();
    this.invalidateEmployeeCache();
    return emp;
  }

  async updateEmployee(id: number, updates: UpdateEmployeeRequest): Promise<Employee> {
    const [emp] = await db.update(employees).set({ ...updates, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
    this.invalidateEmployeeCache();
    return emp;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
    this.invalidateEmployeeCache();
  }

  async getEmployeeCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(employees);
    return Number(result[0]?.count || 0);
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    return dept;
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [d] = await db.insert(departments).values(dept).returning();
    return d;
  }

  // Documents
  async getDocuments(employeeId?: number): Promise<Document[]> {
    if (employeeId) {
      return await db.select().from(documents).where(eq(documents.employeeId, employeeId));
    }
    return await db.select().from(documents);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [d] = await db.insert(documents).values(doc).returning();
    return d;
  }

  async updateDocumentStatus(id: number, status: string, verifiedAt: Date | null, rejectionComments?: string | null): Promise<Document> {
    const updates: any = { status, verifiedAt };
    if (rejectionComments !== undefined) updates.rejectionComments = rejectionComments;
    const [d] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    return d;
  }

  async bulkUpdateDocumentStatus(ids: number[], status: string, verifiedAt: Date | null, rejectionComments?: string | null): Promise<Document[]> {
    const updates: any = { status, verifiedAt };
    if (rejectionComments !== undefined) updates.rejectionComments = rejectionComments;
    const result = await db.update(documents).set(updates).where(inArray(documents.id, ids)).returning();
    return result;
  }

  // Attendance
  async getAttendance(employeeId?: number, date?: string): Promise<Attendance[]> {
    if (employeeId && date) {
      return await db.select().from(attendance).where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, date)));
    }
    if (employeeId) {
      return await db.select().from(attendance).where(eq(attendance.employeeId, employeeId)).orderBy(desc(attendance.date));
    }
    return await db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getAttendanceByDateRange(startDate: string, endDate: string, employeeId?: number): Promise<Attendance[]> {
    const conditions = [
      gte(attendance.date, startDate),
      lte(attendance.date, endDate),
    ];
    if (employeeId) {
      conditions.push(eq(attendance.employeeId, employeeId));
    }
    return await db.select().from(attendance).where(and(...conditions)).orderBy(attendance.date);
  }

  async createAttendance(att: InsertAttendance): Promise<Attendance> {
    const [res] = await db.insert(attendance).values(att).returning();
    return res;
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance> {
    const [res] = await db.update(attendance).set(updates).where(eq(attendance.id, id)).returning();
    return res;
  }

  async getAttendanceByDate(employeeId: number, date: string): Promise<Attendance | undefined> {
    const [res] = await db.select().from(attendance).where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, date)));
    return res;
  }

  async getAttendanceById(id: number): Promise<Attendance | undefined> {
    const [res] = await db.select().from(attendance).where(eq(attendance.id, id));
    return res;
  }

  async getAttendanceByStatus(regularizationStatus: string): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.regularizationStatus, regularizationStatus)).orderBy(desc(attendance.date));
  }

  async getPresentCount(date: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, date), eq(attendance.status, 'present')));
    return Number(result[0]?.count || 0);
  }

  // Leave Types
  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db.select().from(leaveTypes);
  }

  async createLeaveType(type: InsertLeaveType): Promise<LeaveType> {
    const [t] = await db.insert(leaveTypes).values(type).returning();
    return t;
  }

  // Leave Balances
  async getLeaveBalances(employeeId: number): Promise<LeaveBalance[]> {
    return await db.select().from(leaveBalances).where(eq(leaveBalances.employeeId, employeeId));
  }

  async getAllLeaveBalances(): Promise<LeaveBalance[]> {
    return await db.select().from(leaveBalances);
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const [b] = await db.insert(leaveBalances).values(balance).returning();
    return b;
  }

  async updateLeaveBalanceUsed(id: number, used: string, balance: string): Promise<void> {
    await db.update(leaveBalances).set({ used, balance }).where(eq(leaveBalances.id, id));
  }

  async updateLeaveBalanceFields(id: number, fields: { accrued?: string; used?: string; balance?: string }): Promise<void> {
    await db.update(leaveBalances).set(fields).where(eq(leaveBalances.id, id));
  }

  // Leaves
  async getLeaveRequests(employeeId?: number, status?: string): Promise<LeaveRequest[]> {
    if (employeeId && status) {
      return await db.select().from(leaveRequests).where(and(eq(leaveRequests.employeeId, employeeId), eq(leaveRequests.status, status)));
    }
    if (employeeId) {
      return await db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
    }
    if (status) {
      return await db.select().from(leaveRequests).where(eq(leaveRequests.status, status));
    }
    return await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequestById(id: number): Promise<LeaveRequest | undefined> {
    const [res] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return res;
  }

  async createLeaveRequest(req: InsertLeaveRequest): Promise<LeaveRequest> {
    const [res] = await db.insert(leaveRequests).values(req).returning();
    return res;
  }

  async updateLeaveStatus(id: number, status: string, remarks?: string): Promise<LeaveRequest> {
    const updates: any = { status, approvedAt: new Date() };
    if (remarks) updates.remarks = remarks;
    const [res] = await db.update(leaveRequests).set(updates).where(eq(leaveRequests.id, id)).returning();
    return res;
  }

  async getPendingLeaveCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
    return Number(result[0]?.count || 0);
  }

  async getOnLeaveToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests)
      .where(and(
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, today),
        gte(leaveRequests.endDate, today)
      ));
    return Number(result[0]?.count || 0);
  }

  // Holidays
  async getHolidays(year?: number): Promise<Holiday[]> {
    if (year) {
      return await db.select().from(holidays).where(eq(holidays.year, year));
    }
    return await db.select().from(holidays).orderBy(holidays.date);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [h] = await db.insert(holidays).values(holiday).returning();
    return h;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // Payroll
  async getPayroll(employeeId?: number, month?: string, year?: number): Promise<Payroll[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(payroll.employeeId, employeeId));
    if (month) conditions.push(eq(payroll.month, month));
    if (year) conditions.push(eq(payroll.year, year));
    if (conditions.length > 0) {
      return await db.select().from(payroll).where(and(...conditions)).orderBy(desc(payroll.month));
    }
    return await db.select().from(payroll).orderBy(desc(payroll.month));
  }

  async createPayroll(record: InsertPayroll): Promise<Payroll> {
    const [res] = await db.insert(payroll).values(record).returning();
    return res;
  }

  async createPayrollBatch(records: InsertPayroll[]): Promise<Payroll[]> {
    if (records.length === 0) return [];
    const results = await db.insert(payroll).values(records).returning();
    return results;
  }

  async deletePayrollByMonthForEmployees(month: string, year: number, employeeIds: number[]): Promise<void> {
    if (employeeIds.length === 0) return;
    await db.delete(payroll).where(and(eq(payroll.month, month), eq(payroll.year, year), inArray(payroll.employeeId, employeeIds)));
  }

  async updatePayrollStatus(id: number, status: string): Promise<Payroll> {
    const updates: any = { status };
    if (status === 'paid') updates.paidAt = new Date();
    const [res] = await db.update(payroll).set(updates).where(eq(payroll.id, id)).returning();
    return res;
  }

  async updatePayrollRecord(id: number, updates: Partial<InsertPayroll>): Promise<Payroll> {
    const [res] = await db.update(payroll).set(updates).where(eq(payroll.id, id)).returning();
    return res;
  }

  async getPayrollById(id: number): Promise<Payroll | undefined> {
    const [res] = await db.select().from(payroll).where(eq(payroll.id, id));
    return res;
  }

  // Expenses
  async getExpenses(employeeId?: number, status?: string): Promise<Expense[]> {
    if (employeeId && status) {
      return await db.select().from(expenses).where(and(eq(expenses.employeeId, employeeId), eq(expenses.status, status)));
    }
    if (employeeId) {
      return await db.select().from(expenses).where(eq(expenses.employeeId, employeeId));
    }
    if (status) {
      return await db.select().from(expenses).where(eq(expenses.status, status));
    }
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [res] = await db.insert(expenses).values(expense).returning();
    return res;
  }

  async updateExpenseStatus(id: number, status: string, remarks?: string): Promise<Expense> {
    const updates: any = { status };
    if (status === 'approved') updates.approvedAt = new Date();
    if (status === 'reimbursed') updates.reimbursedAt = new Date();
    if (remarks) updates.remarks = remarks;
    const [res] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    return res;
  }

  async getPendingExpenseCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(eq(expenses.status, 'pending'));
    return Number(result[0]?.count || 0);
  }

  // Assets
  async getAssets(employeeId?: number, status?: string): Promise<Asset[]> {
    if (employeeId) {
      return await db.select().from(assets).where(eq(assets.employeeId, employeeId));
    }
    if (status) {
      return await db.select().from(assets).where(eq(assets.status, status));
    }
    return await db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [res] = await db.select().from(assets).where(eq(assets.id, id));
    return res;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [res] = await db.insert(assets).values(asset).returning();
    return res;
  }

  async updateAsset(id: number, updates: Partial<InsertAsset>): Promise<Asset> {
    const [res] = await db.update(assets).set(updates).where(eq(assets.id, id)).returning();
    return res;
  }

  // Exit Records
  async getExitRecords(status?: string): Promise<ExitRecord[]> {
    if (status) {
      return await db.select().from(exitRecords).where(eq(exitRecords.clearanceStatus, status));
    }
    return await db.select().from(exitRecords).orderBy(desc(exitRecords.createdAt));
  }

  async createExitRecord(record: InsertExitRecord): Promise<ExitRecord> {
    const [res] = await db.insert(exitRecords).values(record).returning();
    return res;
  }

  async updateExitRecord(id: number, updates: Partial<InsertExitRecord>): Promise<ExitRecord> {
    const [res] = await db.update(exitRecords).set(updates).where(eq(exitRecords.id, id)).returning();
    return res;
  }

  async getClearanceTasks(exitRecordId: number): Promise<ClearanceTask[]> {
    return await db.select().from(clearanceTasks).where(eq(clearanceTasks.exitRecordId, exitRecordId));
  }

  async createClearanceTask(task: InsertClearanceTask): Promise<ClearanceTask> {
    const [res] = await db.insert(clearanceTasks).values(task).returning();
    return res;
  }

  async updateClearanceTask(id: number, updates: Partial<InsertClearanceTask>): Promise<ClearanceTask> {
    const [res] = await db.update(clearanceTasks).set(updates).where(eq(clearanceTasks.id, id)).returning();
    return res;
  }

  async deleteClearanceTask(id: number): Promise<void> {
    await db.delete(clearanceTasks).where(eq(clearanceTasks.id, id));
  }

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements).where(eq(announcements.isActive, true)).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [res] = await db.insert(announcements).values(announcement).returning();
    return res;
  }

  // Onboarding
  async getOnboardingTasks(employeeId?: number): Promise<OnboardingTask[]> {
    if (employeeId) {
      return await db.select().from(onboardingTasks).where(eq(onboardingTasks.employeeId, employeeId));
    }
    return await db.select().from(onboardingTasks);
  }

  async createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask> {
    const [res] = await db.insert(onboardingTasks).values(task).returning();
    return res;
  }

  async updateOnboardingTaskStatus(id: number, status: string): Promise<OnboardingTask> {
    const updates: any = { status };
    if (status === 'completed') updates.completedAt = new Date();
    else updates.completedAt = null;
    const [res] = await db.update(onboardingTasks).set(updates).where(eq(onboardingTasks.id, id)).returning();
    return res;
  }

  async deleteOnboardingTask(id: number): Promise<void> {
    await db.delete(onboardingTasks).where(eq(onboardingTasks.id, id));
  }

  // Onboarding Tokens
  async getOnboardingToken(token: string): Promise<OnboardingToken | undefined> {
    const [res] = await db.select().from(onboardingTokens).where(eq(onboardingTokens.token, token));
    return res;
  }

  async createOnboardingToken(data: InsertOnboardingToken): Promise<OnboardingToken> {
    const [res] = await db.insert(onboardingTokens).values(data).returning();
    return res;
  }

  async markTokenUsed(token: string): Promise<OnboardingToken> {
    const [res] = await db.update(onboardingTokens)
      .set({ status: 'used', usedAt: new Date() })
      .where(eq(onboardingTokens.token, token))
      .returning();
    return res;
  }

  // Offer Letters
  async getOfferLetters(employeeId?: number): Promise<OfferLetter[]> {
    if (employeeId) {
      return await db.select().from(offerLetters).where(eq(offerLetters.employeeId, employeeId));
    }
    return await db.select().from(offerLetters).orderBy(desc(offerLetters.createdAt));
  }

  async createOfferLetter(data: InsertOfferLetter): Promise<OfferLetter> {
    const [res] = await db.insert(offerLetters).values(data).returning();
    return res;
  }

  async updateOfferLetterStatus(id: number, status: string): Promise<OfferLetter> {
    const updates: any = { status };
    if (status === 'sent') updates.sentAt = new Date();
    if (status === 'accepted') updates.acceptedAt = new Date();
    const [res] = await db.update(offerLetters).set(updates).where(eq(offerLetters.id, id)).returning();
    return res;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [res] = await db.select().from(projects).where(eq(projects.id, id));
    return res;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [res] = await db.insert(projects).values(project).returning();
    return res;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [res] = await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return res;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Letter Templates
  async getLetterTemplates(): Promise<LetterTemplate[]> {
    return await db.select().from(letterTemplates).orderBy(desc(letterTemplates.createdAt));
  }

  async getLetterTemplate(id: number): Promise<LetterTemplate | undefined> {
    const [res] = await db.select().from(letterTemplates).where(eq(letterTemplates.id, id));
    return res;
  }

  async createLetterTemplate(template: InsertLetterTemplate): Promise<LetterTemplate> {
    const [res] = await db.insert(letterTemplates).values(template).returning();
    return res;
  }

  async updateLetterTemplate(id: number, updates: Partial<InsertLetterTemplate>): Promise<LetterTemplate> {
    const [res] = await db.update(letterTemplates).set({ ...updates, updatedAt: new Date() }).where(eq(letterTemplates.id, id)).returning();
    return res;
  }

  async deleteLetterTemplate(id: number): Promise<void> {
    await db.delete(letterTemplates).where(eq(letterTemplates.id, id));
  }

  // Generated Letters
  async getGeneratedLetters(employeeId?: number): Promise<GeneratedLetter[]> {
    if (employeeId) {
      return await db.select().from(generatedLetters).where(eq(generatedLetters.employeeId, employeeId)).orderBy(desc(generatedLetters.generatedAt));
    }
    return await db.select().from(generatedLetters).orderBy(desc(generatedLetters.generatedAt));
  }

  async createGeneratedLetter(letter: InsertGeneratedLetter): Promise<GeneratedLetter> {
    const [res] = await db.insert(generatedLetters).values(letter).returning();
    return res;
  }

  async updateGeneratedLetterStatus(id: number, status: string): Promise<GeneratedLetter> {
    const updates: any = { status };
    if (status === 'sent') updates.sentAt = new Date();
    if (status === 'signed') updates.signedAt = new Date();
    const [res] = await db.update(generatedLetters).set(updates).where(eq(generatedLetters.id, id)).returning();
    return res;
  }

  // Onboarding Documents
  async getOnboardingDocuments(employeeId?: number): Promise<OnboardingDocument[]> {
    if (employeeId) {
      return await db.select().from(onboardingDocuments).where(eq(onboardingDocuments.employeeId, employeeId)).orderBy(desc(onboardingDocuments.uploadedAt));
    }
    return await db.select().from(onboardingDocuments).orderBy(desc(onboardingDocuments.uploadedAt));
  }

  async createOnboardingDocument(doc: InsertOnboardingDocument): Promise<OnboardingDocument> {
    const [res] = await db.insert(onboardingDocuments).values(doc).returning();
    return res;
  }

  async updateOnboardingDocumentStatus(id: number, status: string, verifiedBy?: number, remarks?: string): Promise<OnboardingDocument> {
    const updates: any = { status };
    if (status === 'verified' || status === 'rejected') {
      updates.verifiedAt = new Date();
      if (verifiedBy) updates.verifiedBy = verifiedBy;
    }
    if (remarks) updates.remarks = remarks;
    const [res] = await db.update(onboardingDocuments).set(updates).where(eq(onboardingDocuments.id, id)).returning();
    return res;
  }

  async deleteOnboardingDocument(id: number): Promise<void> {
    await db.delete(onboardingDocuments).where(eq(onboardingDocuments.id, id));
  }

  // Salary Structures
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    return await db.select().from(salaryStructures).orderBy(salaryStructures.name);
  }

  async getSalaryStructure(id: number): Promise<SalaryStructure | undefined> {
    const [structure] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, id));
    return structure;
  }

  async createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure> {
    const [res] = await db.insert(salaryStructures).values(structure).returning();
    return res;
  }

  async updateSalaryStructure(id: number, updates: Partial<InsertSalaryStructure>): Promise<SalaryStructure> {
    const [res] = await db.update(salaryStructures).set(updates).where(eq(salaryStructures.id, id)).returning();
    return res;
  }

  async deleteSalaryStructure(id: number): Promise<void> {
    await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
  }

  // Tax Declarations
  async getTaxDeclarations(employeeId?: number, financialYear?: string): Promise<TaxDeclaration[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(taxDeclarationsTable.employeeId, employeeId));
    if (financialYear) conditions.push(eq(taxDeclarationsTable.financialYear, financialYear));
    if (conditions.length > 0) {
      return await db.select().from(taxDeclarationsTable).where(and(...conditions)).orderBy(desc(taxDeclarationsTable.submittedAt));
    }
    return await db.select().from(taxDeclarationsTable).orderBy(desc(taxDeclarationsTable.submittedAt));
  }

  async createTaxDeclaration(dec: InsertTaxDeclaration): Promise<TaxDeclaration> {
    const [res] = await db.insert(taxDeclarationsTable).values(dec).returning();
    return res;
  }

  async updateTaxDeclarationStatus(id: number, status: string, reviewedBy?: number, reviewRemarks?: string): Promise<TaxDeclaration> {
    const updates: any = { status, reviewedAt: new Date() };
    if (reviewedBy) updates.reviewedBy = reviewedBy;
    if (reviewRemarks !== undefined) updates.reviewRemarks = reviewRemarks;
    const [res] = await db.update(taxDeclarationsTable).set(updates).where(eq(taxDeclarationsTable.id, id)).returning();
    return res;
  }

  async updateTaxDeclaration(id: number, data: Partial<{ investmentType: string; amount: string; otherDetails: string | null; section: string }>): Promise<TaxDeclaration> {
    const [res] = await db.update(taxDeclarationsTable).set(data).where(eq(taxDeclarationsTable.id, id)).returning();
    return res;
  }

  async submitDeclarationsToFinance(employeeId: number, financialYear: string): Promise<void> {
    await db.update(taxDeclarationsTable)
      .set({ status: "submitted" })
      .where(
        and(
          eq(taxDeclarationsTable.employeeId, employeeId),
          eq(taxDeclarationsTable.financialYear, financialYear),
          eq(taxDeclarationsTable.status, "pending")
        )
      );
  }

  async deleteTaxDeclaration(id: number): Promise<void> {
    await db.delete(taxDeclarationsTable).where(eq(taxDeclarationsTable.id, id));
  }

  // Org Positions
  // Loans & Advances
  async getLoans(employeeId?: number, status?: string): Promise<Loan[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(loans.employeeId, employeeId));
    if (status) conditions.push(eq(loans.status, status));
    if (conditions.length > 0) {
      return await db.select().from(loans).where(and(...conditions)).orderBy(desc(loans.createdAt));
    }
    return await db.select().from(loans).orderBy(desc(loans.createdAt));
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    const [res] = await db.select().from(loans).where(eq(loans.id, id));
    return res;
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [res] = await db.insert(loans).values(loan).returning();
    return res;
  }

  async updateLoan(id: number, updates: Partial<InsertLoan>): Promise<Loan> {
    const [res] = await db.update(loans).set({ ...updates, updatedAt: new Date() }).where(eq(loans.id, id)).returning();
    return res;
  }

  async getLoanRepayments(loanId?: number, employeeId?: number): Promise<LoanRepayment[]> {
    const conditions = [];
    if (loanId) conditions.push(eq(loanRepayments.loanId, loanId));
    if (employeeId) conditions.push(eq(loanRepayments.employeeId, employeeId));
    if (conditions.length > 0) {
      return await db.select().from(loanRepayments).where(and(...conditions)).orderBy(desc(loanRepayments.createdAt));
    }
    return await db.select().from(loanRepayments).orderBy(desc(loanRepayments.createdAt));
  }

  async createLoanRepayment(repayment: InsertLoanRepayment): Promise<LoanRepayment> {
    const [res] = await db.insert(loanRepayments).values(repayment).returning();
    return res;
  }

  async updateLoanRepayment(id: number, updates: Partial<InsertLoanRepayment>): Promise<LoanRepayment> {
    const [res] = await db.update(loanRepayments).set(updates).where(eq(loanRepayments.id, id)).returning();
    return res;
  }

  async getOrgPositions(): Promise<OrgPosition[]> {
    return await db.select().from(orgPositions).orderBy(orgPositions.level, orgPositions.sortOrder);
  }

  async createOrgPosition(position: InsertOrgPosition): Promise<OrgPosition> {
    const [res] = await db.insert(orgPositions).values(position).returning();
    return res;
  }

  async updateOrgPosition(id: number, updates: Partial<InsertOrgPosition>): Promise<OrgPosition> {
    const [res] = await db.update(orgPositions).set(updates).where(eq(orgPositions.id, id)).returning();
    return res;
  }

  async deleteOrgPosition(id: number): Promise<void> {
    await db.update(orgPositions).set({ parentId: null }).where(eq(orgPositions.parentId, id));
    await db.delete(orgPositions).where(eq(orgPositions.id, id));
  }

  async getPtRules(state?: string): Promise<PtRule[]> {
    if (state) {
      return await db.select().from(ptRules).where(eq(ptRules.state, state)).orderBy(ptRules.slabFrom);
    }
    return await db.select().from(ptRules).orderBy(ptRules.state, ptRules.slabFrom);
  }

  async createPtRule(rule: InsertPtRule): Promise<PtRule> {
    const [res] = await db.insert(ptRules).values(rule).returning();
    return res;
  }

  async updatePtRule(id: number, updates: Partial<InsertPtRule>): Promise<PtRule> {
    const [res] = await db.update(ptRules).set(updates).where(eq(ptRules.id, id)).returning();
    return res;
  }

  async deletePtRule(id: number): Promise<void> {
    await db.delete(ptRules).where(eq(ptRules.id, id));
  }

  async getLwfRules(state?: string): Promise<LwfRule[]> {
    if (state) {
      return await db.select().from(lwfRules).where(eq(lwfRules.state, state));
    }
    return await db.select().from(lwfRules).orderBy(lwfRules.state);
  }

  async createLwfRule(rule: InsertLwfRule): Promise<LwfRule> {
    const [res] = await db.insert(lwfRules).values(rule).returning();
    return res;
  }

  async updateLwfRule(id: number, updates: Partial<InsertLwfRule>): Promise<LwfRule> {
    const [res] = await db.update(lwfRules).set(updates).where(eq(lwfRules.id, id)).returning();
    return res;
  }

  async deleteLwfRule(id: number): Promise<void> {
    await db.delete(lwfRules).where(eq(lwfRules.id, id));
  }

  async getBirthdayWishes(toEmployeeId?: number): Promise<BirthdayWish[]> {
    if (toEmployeeId) {
      return await db.select().from(birthdayWishes).where(eq(birthdayWishes.toEmployeeId, toEmployeeId)).orderBy(desc(birthdayWishes.createdAt));
    }
    return await db.select().from(birthdayWishes).orderBy(desc(birthdayWishes.createdAt));
  }

  async createBirthdayWish(wish: InsertBirthdayWish): Promise<BirthdayWish> {
    const [created] = await db.insert(birthdayWishes).values(wish).returning();
    return created;
  }

  async deleteBirthdayWish(id: number): Promise<void> {
    await db.delete(birthdayWishes).where(eq(birthdayWishes.id, id));
  }

  async getCompanyPolicies(): Promise<CompanyPolicy[]> {
    return await db.select().from(companyPolicies).orderBy(desc(companyPolicies.createdAt));
  }

  async getCompanyPolicy(id: number): Promise<CompanyPolicy | undefined> {
    const [policy] = await db.select().from(companyPolicies).where(eq(companyPolicies.id, id));
    return policy;
  }

  async createCompanyPolicy(policy: InsertCompanyPolicy): Promise<CompanyPolicy> {
    const [created] = await db.insert(companyPolicies).values(policy).returning();
    return created;
  }

  async updateCompanyPolicy(id: number, updates: Partial<InsertCompanyPolicy>): Promise<CompanyPolicy> {
    const [updated] = await db.update(companyPolicies).set({ ...updates, updatedAt: new Date() }).where(eq(companyPolicies.id, id)).returning();
    return updated;
  }

  async deleteCompanyPolicy(id: number): Promise<void> {
    await db.delete(policyAcknowledgments).where(eq(policyAcknowledgments.policyId, id));
    await db.delete(companyPolicies).where(eq(companyPolicies.id, id));
  }

  async getPolicyAcknowledgments(policyId?: number): Promise<PolicyAcknowledgment[]> {
    if (policyId) {
      return await db.select().from(policyAcknowledgments).where(eq(policyAcknowledgments.policyId, policyId));
    }
    return await db.select().from(policyAcknowledgments);
  }

  async createPolicyAcknowledgment(ack: InsertPolicyAcknowledgment): Promise<PolicyAcknowledgment> {
    const [created] = await db.insert(policyAcknowledgments).values(ack).returning();
    return created;
  }

  async updatePolicyAcknowledgment(id: number, updates: Partial<PolicyAcknowledgment>): Promise<PolicyAcknowledgment> {
    const [updated] = await db.update(policyAcknowledgments).set(updates).where(eq(policyAcknowledgments.id, id)).returning();
    return updated;
  }

  async getOvertimeRequests(filters?: { employeeId?: number; status?: string }): Promise<OvertimeRequest[]> {
    const conditions = [];
    if (filters?.employeeId) conditions.push(eq(overtimeRequests.employeeId, filters.employeeId));
    if (filters?.status) conditions.push(eq(overtimeRequests.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(overtimeRequests).where(and(...conditions)).orderBy(desc(overtimeRequests.createdAt));
    }
    return await db.select().from(overtimeRequests).orderBy(desc(overtimeRequests.createdAt));
  }

  async createOvertimeRequest(req: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [created] = await db.insert(overtimeRequests).values(req).returning();
    return created;
  }

  async updateOvertimeRequest(id: number, updates: Partial<OvertimeRequest>): Promise<OvertimeRequest> {
    const [updated] = await db.update(overtimeRequests).set(updates).where(eq(overtimeRequests.id, id)).returning();
    return updated;
  }

  async getCompOffRequests(filters?: { employeeId?: number; status?: string }): Promise<CompOffRequest[]> {
    const conditions = [];
    if (filters?.employeeId) conditions.push(eq(compOffRequests.employeeId, filters.employeeId));
    if (filters?.status) conditions.push(eq(compOffRequests.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(compOffRequests).where(and(...conditions)).orderBy(desc(compOffRequests.createdAt));
    }
    return await db.select().from(compOffRequests).orderBy(desc(compOffRequests.createdAt));
  }

  async createCompOffRequest(req: InsertCompOffRequest): Promise<CompOffRequest> {
    const [created] = await db.insert(compOffRequests).values(req).returning();
    return created;
  }

  async updateCompOffRequest(id: number, updates: Partial<CompOffRequest>): Promise<CompOffRequest> {
    const [updated] = await db.update(compOffRequests).set(updates).where(eq(compOffRequests.id, id)).returning();
    return updated;
  }

  async getOnDutyRequests(filters?: { employeeId?: number; status?: string }): Promise<OnDutyRequest[]> {
    const conditions = [];
    if (filters?.employeeId) conditions.push(eq(onDutyRequests.employeeId, filters.employeeId));
    if (filters?.status) conditions.push(eq(onDutyRequests.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(onDutyRequests).where(and(...conditions)).orderBy(desc(onDutyRequests.createdAt));
    }
    return await db.select().from(onDutyRequests).orderBy(desc(onDutyRequests.createdAt));
  }

  async createOnDutyRequest(req: InsertOnDutyRequest): Promise<OnDutyRequest> {
    const [created] = await db.insert(onDutyRequests).values(req).returning();
    return created;
  }

  async updateOnDutyRequest(id: number, updates: Partial<OnDutyRequest>): Promise<OnDutyRequest> {
    const [updated] = await db.update(onDutyRequests).set(updates).where(eq(onDutyRequests.id, id)).returning();
    return updated;
  }

  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts);
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [s] = await db.select().from(shifts).where(eq(shifts.id, id));
    return s;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(shift).returning();
    return created;
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await db.update(shifts).set(updates).where(eq(shifts.id, id)).returning();
    return updated;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getProfileChangeRequests(filters?: { employeeId?: number; status?: string }): Promise<ProfileChangeRequest[]> {
    let conditions = [];
    if (filters?.employeeId) conditions.push(eq(profileChangeRequests.employeeId, filters.employeeId));
    if (filters?.status) conditions.push(eq(profileChangeRequests.status, filters.status));
    if (conditions.length > 0) {
      return await db.select().from(profileChangeRequests).where(and(...conditions)).orderBy(desc(profileChangeRequests.createdAt));
    }
    return await db.select().from(profileChangeRequests).orderBy(desc(profileChangeRequests.createdAt));
  }

  async createProfileChangeRequest(req: InsertProfileChangeRequest): Promise<ProfileChangeRequest> {
    const [created] = await db.insert(profileChangeRequests).values(req).returning();
    return created;
  }

  async updateProfileChangeRequest(id: number, updates: Partial<ProfileChangeRequest>): Promise<ProfileChangeRequest> {
    const [updated] = await db.update(profileChangeRequests).set(updates).where(eq(profileChangeRequests.id, id)).returning();
    return updated;
  }

  async getAttendanceLogs(filters?: { employeeId?: number; attendanceId?: number; date?: string }): Promise<AttendanceLog[]> {
    let conditions = [];
    if (filters?.employeeId) conditions.push(eq(attendanceLogs.employeeId, filters.employeeId));
    if (filters?.attendanceId) conditions.push(eq(attendanceLogs.attendanceId, filters.attendanceId));
    if (conditions.length > 0) {
      return await db.select().from(attendanceLogs).where(and(...conditions)).orderBy(attendanceLogs.timestamp);
    }
    return await db.select().from(attendanceLogs).orderBy(attendanceLogs.timestamp);
  }

  async createAttendanceLog(log: InsertAttendanceLog): Promise<AttendanceLog> {
    const [created] = await db.insert(attendanceLogs).values(log).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
