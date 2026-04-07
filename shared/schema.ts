import { pgTable, text, serial, integer, boolean, timestamp, date, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models FIRST (required for Replit Auth)
export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  legalName: text("legal_name"),
  logoUrl: text("logo_url"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  gstin: text("gstin"),
  pan: text("pan"),
  tan: text("tan"),
  cin: text("cin"),
  payslipHeader: text("payslip_header"),
  payslipFooter: text("payslip_footer"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entities.$inferSelect;

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  basicPercent: decimal("basic_percent").notNull(),
  hraPercent: decimal("hra_percent").notNull(),
  conveyancePercent: decimal("conveyance_percent").notNull(),
  daPercent: decimal("da_percent").notNull(),
  communicationPercent: decimal("communication_percent").notNull(),
  medicalPercent: decimal("medical_percent").notNull(),
  entityId: integer("entity_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  managerId: integer("manager_id"),
  parentDepartmentId: integer("parent_department_id"),
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id"),
  employeeCode: text("employee_code").unique(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  alternateContactNumber: text("alternate_contact_number"),
  personalEmail: text("personal_email"),
  dateOfBirth: date("date_of_birth"),
  actualDateOfBirth: date("actual_date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  maritalStatus: text("marital_status"),
  spouseName: text("spouse_name"),
  dateOfMarriage: date("date_of_marriage"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  address: text("address"),
  permanentAddress: text("permanent_address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  location: text("location"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContact1Name: text("emergency_contact1_name"),
  emergencyContact1Phone: text("emergency_contact1_phone"),
  emergencyContact1Relation: text("emergency_contact1_relation"),
  emergencyContact2Name: text("emergency_contact2_name"),
  emergencyContact2Phone: text("emergency_contact2_phone"),
  emergencyContact2Relation: text("emergency_contact2_relation"),
  departmentId: integer("department_id").references(() => departments.id),
  designation: text("designation"),
  hodId: text("hod_id"),
  reportingManagerId: text("reporting_manager_id"),
  employmentType: text("employment_type").default("permanent"),
  positionType: text("position_type"),
  replacedEmployeeName: text("replaced_employee_name"),
  employmentStatus: text("employment_status").default("probation"),
  joinDate: date("join_date").notNull(),
  actualJoinDate: date("actual_join_date"),
  confirmationDate: date("confirmation_date"),
  probationEndDate: date("probation_end_date"),
  status: text("status").default("active"),
  bgvStatus: text("bgv_status"),
  highestQualification: text("highest_qualification"),
  specialization: text("specialization"),
  instituteName: text("institute_name"),
  qualificationScore: text("qualification_score"),
  secondHighestQualification: text("second_highest_qualification"),
  secondSpecialization: text("second_specialization"),
  secondInstituteName: text("second_institute_name"),
  secondQualificationScore: text("second_qualification_score"),
  vicePresidentId: integer("vice_president_id"),
  entity: text("entity"),
  entityId: integer("entity_id"),
  bankName: text("bank_name"),
  branchName: text("branch_name"),
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  panNumber: text("pan_number"),
  aadharNumber: text("aadhar_number"),
  pfStatus: text("pf_status"),
  pfNumber: text("pf_number"),
  esiNumber: text("esi_number"),
  uanNumber: text("uan_number"),
  taxRegime: text("tax_regime"),
  sourcingChannel: text("sourcing_channel"),
  sourcingName: text("sourcing_name"),
  projectId: integer("project_id"),
  ctc: decimal("ctc"),
  retentionBonus: decimal("retention_bonus"),
  retentionBonusDuration: text("retention_bonus_duration"),
  retentionBonusStartDate: date("retention_bonus_start_date"),
  noticeBuyout: decimal("notice_buyout"),
  noticeBuyoutDuration: text("notice_buyout_duration"),
  noticeBuyoutPayments: integer("notice_buyout_payments"),
  birthdayAllowance: decimal("birthday_allowance"),
  variablePay: decimal("variable_pay"),
  salaryStructureId: integer("salary_structure_id"),
  profileImageUrl: text("profile_image_url"),
  // Insurance Premium Calculation
  insuranceAnnualPremium: decimal("insurance_annual_premium"),
  insuranceEmployeeSharePercent: decimal("insurance_employee_share_percent").default("40"),
  insuranceEmployerSharePercent: decimal("insurance_employer_share_percent").default("60"),
  insuranceCycleStartDate: date("insurance_cycle_start_date"),
  insuranceCycleEndDate: date("insurance_cycle_end_date"),
  // Insurance Details
  healthInsuranceProvider: text("health_insurance_provider"),
  healthInsurancePolicyNumber: text("health_insurance_policy_number"),
  healthInsuranceSumInsured: text("health_insurance_sum_insured"),
  healthInsuranceStartDate: date("health_insurance_start_date"),
  healthInsuranceEndDate: date("health_insurance_end_date"),
  lifeInsuranceProvider: text("life_insurance_provider"),
  lifeInsurancePolicyNumber: text("life_insurance_policy_number"),
  lifeInsuranceSumInsured: text("life_insurance_sum_insured"),
  lifeInsuranceNomineeName: text("life_insurance_nominee_name"),
  lifeInsuranceNomineeRelation: text("life_insurance_nominee_relation"),
  personalAccidentProvider: text("personal_accident_provider"),
  personalAccidentPolicyNumber: text("personal_accident_policy_number"),
  personalAccidentSumInsured: text("personal_accident_sum_insured"),
  shiftId: integer("shift_id"),
  pendingShiftId: integer("pending_shift_id"),
  shiftEffectiveDate: text("shift_effective_date"),
  locationPermission: text("location_permission").default("office"), // office, remote, hybrid
  remoteLoginAuthorized: boolean("remote_login_authorized").default(false),
  biometricDeviceId: text("biometric_device_id"),
  attendanceExempt: boolean("attendance_exempt").default(false),
  locationCode: text("location_code"),
  accessRole: text("access_role").default("employee"), // employee, hr_manager, leadership, manager, asset_team, payroll_team, project_team, onboarding_team, pms_team, lms_team, admin
  onboardingStatus: text("onboarding_status").default("pending"), // pending, invited, in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  documentType: text("document_type").notNull(), // resume, id_proof, address_proof, education, experience, offer_letter, nda
  documentName: text("document_name").notNull(),
  fileUrl: text("file_url"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  fileData: text("file_data"), // Base64 encoded file content
  mimeType: text("mime_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  status: text("status").default("pending"), // pending, verified, rejected
  rejectionComments: text("rejection_comments"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  workHours: decimal("work_hours"),
  overtime: decimal("overtime").default("0"),
  status: text("status").default("present"), // present, absent, leave, half_day, weekend, holiday
  location: text("location"),
  checkInLocation: text("check_in_location"),
  checkOutLocation: text("check_out_location"),
  checkInLatitude: text("check_in_latitude"),
  checkInLongitude: text("check_in_longitude"),
  checkOutLatitude: text("check_out_latitude"),
  checkOutLongitude: text("check_out_longitude"),
  regularizationStatus: text("regularization_status"), // pending, approved, rejected
  regularizationReason: text("regularization_reason"),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  graceMinutes: integer("grace_minutes").default(15),
  workingHours: decimal("working_hours").default("8"),
  isDefault: boolean("is_default").default(false),
});

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  annualAllowance: integer("annual_allowance").default(12),
  carryForward: boolean("carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
  isPaid: boolean("is_paid").default(true),
  description: text("description"),
});

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id).notNull(),
  year: integer("year").notNull(),
  opening: decimal("opening").default("0"),
  accrued: decimal("accrued").default("0"),
  used: decimal("used").default("0"),
  balance: decimal("balance").default("0"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  leaveType: text("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: decimal("days").default("1"),
  halfDayPeriod: text("half_day_period"),
  reason: text("reason"),
  medicalCertificateUrl: text("medical_certificate_url"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  type: text("type").default("public"), // public, optional, restricted
  description: text("description"),
  year: integer("year").notNull(),
});

export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  month: text("month").notNull(),
  year: integer("year"),
  basicSalary: decimal("basic_salary").notNull(),
  hra: decimal("hra").default("0"),
  conveyance: decimal("conveyance").default("0"),
  da: decimal("da").default("0"),
  communicationAllowance: decimal("communication_allowance").default("0"),
  medicalAllowance: decimal("medical_allowance").default("0"),
  variablePay: decimal("variable_pay").default("0"),
  highAltitudeAllowance: decimal("high_altitude_allowance").default("0"),
  arrear: decimal("arrear").default("0"),
  bonus: decimal("bonus").default("0"),
  otherEarnings: decimal("other_earnings").default("0"),
  birthdayAllowance: decimal("birthday_allowance").default("0"),
  specialAllowance: decimal("special_allowance").default("0"),
  otherAllowances: decimal("other_allowances").default("0"),
  allowances: decimal("allowances").default("0"),
  earningsRemarks: text("earnings_remarks"),
  insurancePremium: decimal("insurance_premium").default("0"),
  tds: decimal("tds").default("0"),
  advance: decimal("advance").default("0"),
  epf: decimal("epf").default("0"),
  pf: decimal("pf").default("0"),
  esi: decimal("esi").default("0"),
  professionalTax: decimal("professional_tax").default("0"),
  lwf: decimal("lwf").default("0"),
  incomeTax: decimal("income_tax").default("0"),
  otherDeductions: decimal("other_deductions").default("0"),
  deductions: decimal("deductions").default("0"),
  deductionsRemarks: text("deductions_remarks"),
  lopDeduction: decimal("lop_deduction").default("0"),
  overtimePay: decimal("overtime_pay").default("0"),
  grossSalary: decimal("gross_salary").default("0"),
  netSalary: decimal("net_salary").notNull(),
  ctc: decimal("ctc").default("0"),
  totalDays: integer("total_days"),
  lop: decimal("lop").default("0"),
  workingDays: decimal("working_days"),
  salaryStructureId: integer("salary_structure_id"),
  modeOfPayment: text("mode_of_payment").default("Account Transfer"),
  status: text("status").default("draft"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  category: text("category").notNull(), // travel, food, accommodation, transport, other
  amount: decimal("amount").notNull(),
  currency: text("currency").default("INR"),
  expenseDate: date("expense_date").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  status: text("status").default("pending"), // pending, approved, rejected, reimbursed
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  reimbursedAt: timestamp("reimbursed_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  assetCode: text("asset_code").unique().notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // laptop, phone, monitor, keyboard, headphones, id_card, access_card
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: date("purchase_date"),
  purchasePrice: decimal("purchase_price"),
  warrantyEndDate: date("warranty_end_date"),
  employeeId: integer("employee_id").references(() => employees.id),
  assignedDate: date("assigned_date"),
  returnedDate: date("returned_date"),
  status: text("status").default("available"), // available, assigned, maintenance, retired
  condition: text("condition").default("good"), // new, good, fair, poor
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exitRecords = pgTable("exit_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  exitType: text("exit_type").notNull(), // resignation, termination, retirement, absconding
  resignationDate: date("resignation_date"),
  lastWorkingDate: date("last_working_date"),
  noticePeriodDays: integer("notice_period_days").default(30),
  reason: text("reason"),
  exitInterviewDone: boolean("exit_interview_done").default(false),
  exitInterviewNotes: text("exit_interview_notes"),
  clearanceStatus: text("clearance_status").default("pending"), // pending, in_progress, completed
  fnfStatus: text("fnf_status").default("pending"), // pending, calculated, approved, paid
  fnfAmount: decimal("fnf_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clearanceTasks = pgTable("clearance_tasks", {
  id: serial("id").primaryKey(),
  exitRecordId: integer("exit_record_id").references(() => exitRecords.id).notNull(),
  department: text("department").notNull(), // IT, HR, Finance, Admin, Reporting Manager
  taskName: text("task_name").notNull(),
  status: text("status").default("pending"), // pending, completed, not_applicable
  completedBy: integer("completed_by"),
  completedAt: timestamp("completed_at"),
  remarks: text("remarks"),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default("general"), // general, policy, event, birthday, work_anniversary, new_joiner
  priority: text("priority").default("normal"), // low, normal, high, urgent
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  taskName: text("task_name").notNull(),
  category: text("category").default("general"), // documents, training, it_setup, hr_formalities
  status: text("status").default("pending"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  assignedTo: text("assigned_to"),
});

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: text("status").default("pending"), // pending, used, expired
  createdAt: timestamp("created_at").defaultNow(),
});

export const offerLetters = pgTable("offer_letters", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  designation: text("designation").notNull(),
  department: text("department"),
  salary: decimal("salary"),
  joiningDate: date("joining_date").notNull(),
  reportingManager: text("reporting_manager"),
  workLocation: text("work_location"),
  content: text("content"),
  status: text("status").default("draft"), // draft, sent, accepted, rejected
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectCode: text("project_code").unique().notNull(),
  name: text("name").notNull(),
  dimensionValueType: text("dimension_value_type"),
  totaling: text("totaling"),
  blocked: boolean("blocked").default(false),
  description: text("description"),
  clientName: text("client_name"),
  budget: decimal("budget").default("0"),
  revenue: decimal("revenue").default("0"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").default("active"),
  managerId: integer("manager_id"),
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const letterTemplates = pgTable("letter_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // offer, appointment, nda, confirmation, experience, relieving, promotion, transfer
  subject: text("subject"),
  content: text("content").notNull(), // Template content with placeholders like {{employee_name}}, {{designation}}, etc.
  placeholders: text("placeholders"), // JSON array of available placeholders
  status: text("status").default("active"), // active, inactive, draft
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedLetters = pgTable("generated_letters", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  templateId: integer("template_id").references(() => letterTemplates.id),
  letterType: text("letter_type").notNull(),
  content: text("content").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: integer("generated_by"),
  status: text("status").default("draft"), // draft, sent, signed, approved, rejected
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  responseToken: text("response_token"),
  sentAt: timestamp("sent_at"),
  signedAt: timestamp("signed_at"),
});

export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  documentType: text("document_type").notNull(), // aadhar, pan, passport, education_certificate, experience_letter, photo, etc.
  documentName: text("document_name").notNull(),
  fileName: text("file_name"),
  fileData: text("file_data"), // Base64 encoded file data
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  status: text("status").default("pending"), // pending, verified, rejected
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  remarks: text("remarks"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const taxDeclarationsTable = pgTable("tax_declarations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  financialYear: text("financial_year").notNull(),
  section: text("section").notNull(),
  investmentType: text("investment_type").notNull(),
  otherDetails: text("other_details"),
  amount: decimal("amount").notNull(),
  fileName: text("file_name"),
  fileData: text("file_data"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  status: text("status").default("pending"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewRemarks: text("review_remarks"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  type: text("type").notNull(),
  amount: decimal("amount").notNull(),
  eligibleAmount: decimal("eligible_amount"),
  eligibilityMonths: integer("eligibility_months"),
  repaymentMonths: integer("repayment_months").notNull(),
  emiAmount: decimal("emi_amount"),
  totalRepaid: decimal("total_repaid").default("0"),
  remainingBalance: decimal("remaining_balance"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  reason: text("reason"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  foreclosureDate: text("foreclosure_date"),
  foreclosureRemarks: text("foreclosure_remarks"),
  level1Status: text("level1_status").default("pending"),
  level1ApprovedBy: text("level1_approved_by"),
  level1ApprovedAt: timestamp("level1_approved_at"),
  level1Remarks: text("level1_remarks"),
  level2Status: text("level2_status").default("pending"),
  level2ApprovedBy: text("level2_approved_by"),
  level2ApprovedAt: timestamp("level2_approved_at"),
  level2Remarks: text("level2_remarks"),
  level3Status: text("level3_status").default("pending"),
  level3ApprovedBy: text("level3_approved_by"),
  level3ApprovedAt: timestamp("level3_approved_at"),
  level3Remarks: text("level3_remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loanRepayments = pgTable("loan_repayments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => loans.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  amount: decimal("amount").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  payrollId: integer("payroll_id"),
  status: text("status").default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orgPositions = pgTable("org_positions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  level: integer("level").notNull(),
  parentId: integer("parent_id"),
  employeeId: integer("employee_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ptRules = pgTable("pt_rules", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  slabFrom: decimal("slab_from").notNull(),
  slabTo: decimal("slab_to").notNull(),
  ptAmount: decimal("pt_amount").notNull(),
  frequency: text("frequency").default("monthly"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lwfRules = pgTable("lwf_rules", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  employeeContribution: decimal("employee_contribution").notNull(),
  employerContribution: decimal("employer_contribution").notNull(),
  frequency: text("frequency").default("half-yearly"),
  applicableMonths: text("applicable_months"),
  grossSalaryThreshold: decimal("gross_salary_threshold"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const birthdayWishes = pgTable("birthday_wishes", {
  id: serial("id").primaryKey(),
  fromEmployeeId: integer("from_employee_id").references(() => employees.id).notNull(),
  toEmployeeId: integer("to_employee_id").references(() => employees.id).notNull(),
  message: text("message").notNull(),
  bannerType: text("banner_type").default("confetti"),
  type: text("type").default("birthday"),
  taggedEmployeeIds: text("tagged_employee_ids"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  documents: many(documents),
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
  leaveBalances: many(leaveBalances),
  payroll: many(payroll),
  expenses: many(expenses),
  assets: many(assets),
  onboardingTasks: many(onboardingTasks),
  exitRecords: many(exitRecords),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  employees: many(employees),
  parentDepartment: one(departments, { fields: [departments.parentDepartmentId], references: [departments.id] }),
}));

// === INSERT SCHEMAS ===
export const insertSalaryStructureSchema = createInsertSchema(salaryStructures).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true });
export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true });
export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({ id: true });
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true, createdAt: true });
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export const insertPayrollSchema = createInsertSchema(payroll).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true });
export const insertExitRecordSchema = createInsertSchema(exitRecords).omit({ id: true, createdAt: true });
export const insertClearanceTaskSchema = createInsertSchema(clearanceTasks).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks).omit({ id: true });
export const insertOnboardingTokenSchema = createInsertSchema(onboardingTokens).omit({ id: true, createdAt: true });
export const insertOfferLetterSchema = createInsertSchema(offerLetters).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLetterTemplateSchema = createInsertSchema(letterTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeneratedLetterSchema = createInsertSchema(generatedLetters).omit({ id: true, generatedAt: true });
export const insertOnboardingDocumentSchema = createInsertSchema(onboardingDocuments).omit({ id: true, uploadedAt: true });
export const insertTaxDeclarationSchema = createInsertSchema(taxDeclarationsTable).omit({ id: true, submittedAt: true });
export const insertLoanSchema = createInsertSchema(loans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLoanRepaymentSchema = createInsertSchema(loanRepayments).omit({ id: true, createdAt: true });
export const insertOrgPositionSchema = createInsertSchema(orgPositions).omit({ id: true, createdAt: true });

export const insertPtRuleSchema = createInsertSchema(ptRules).omit({ id: true, createdAt: true });
export const insertLwfRuleSchema = createInsertSchema(lwfRules).omit({ id: true, createdAt: true });
export const insertBirthdayWishSchema = createInsertSchema(birthdayWishes).omit({ id: true, createdAt: true });

export const companyPolicies = pgTable("company_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  fileName: text("file_name"),
  fileData: text("file_data"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  version: text("version").default("1.0"),
  isActive: boolean("is_active").default(true),
  uploadedBy: integer("uploaded_by"),
  downloadAllowedEmployees: text("download_allowed_employees").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").references(() => companyPolicies.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  viewedAt: timestamp("viewed_at"),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
});

export const insertCompanyPolicySchema = createInsertSchema(companyPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPolicyAcknowledgmentSchema = createInsertSchema(policyAcknowledgments).omit({ id: true, acknowledgedAt: true });

export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  overtimeHours: decimal("overtime_hours").notNull(),
  reason: text("reason"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({ id: true, createdAt: true });

export const compOffRequests = pgTable("comp_off_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  workDate: date("work_date").notNull(),
  reason: text("reason"),
  workType: text("work_type").default("holiday"),
  hours: decimal("hours").default("8"),
  daysEarned: decimal("days_earned").default("1"),
  status: text("status").default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  expiryDate: date("expiry_date"),
  availedDate: date("availed_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompOffRequestSchema = createInsertSchema(compOffRequests).omit({ id: true, createdAt: true });

export const onDutyRequests = pgTable("on_duty_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  fromTime: text("from_time"),
  toTime: text("to_time"),
  reason: text("reason").notNull(),
  location: text("location"),
  odType: text("od_type").default("full_day"),
  level1Status: text("level1_status").default("pending"),
  level1ApprovedBy: text("level1_approved_by"),
  level1ApprovedAt: timestamp("level1_approved_at"),
  level1Remarks: text("level1_remarks"),
  level2Status: text("level2_status").default("pending"),
  level2ApprovedBy: text("level2_approved_by"),
  level2ApprovedAt: timestamp("level2_approved_at"),
  level2Remarks: text("level2_remarks"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOnDutyRequestSchema = createInsertSchema(onDutyRequests).omit({ id: true, createdAt: true });

export const profileChangeRequests = pgTable("profile_change_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  status: text("status").default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfileChangeRequestSchema = createInsertSchema(profileChangeRequests).omit({ id: true, createdAt: true, reviewedAt: true });

export const attendanceLogs = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  attendanceId: integer("attendance_id").references(() => attendance.id),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttendanceLogSchema = createInsertSchema(attendanceLogs).omit({ id: true, createdAt: true });

// === EXPLICIT TYPES ===
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalaryStructure = z.infer<typeof insertSalaryStructureSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type ExitRecord = typeof exitRecords.$inferSelect;
export type InsertExitRecord = z.infer<typeof insertExitRecordSchema>;

export type ClearanceTask = typeof clearanceTasks.$inferSelect;
export type InsertClearanceTask = z.infer<typeof insertClearanceTaskSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;

export type OnboardingToken = typeof onboardingTokens.$inferSelect;
export type InsertOnboardingToken = z.infer<typeof insertOnboardingTokenSchema>;

export type OfferLetter = typeof offerLetters.$inferSelect;
export type InsertOfferLetter = z.infer<typeof insertOfferLetterSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type LetterTemplate = typeof letterTemplates.$inferSelect;
export type InsertLetterTemplate = z.infer<typeof insertLetterTemplateSchema>;

export type GeneratedLetter = typeof generatedLetters.$inferSelect;
export type InsertGeneratedLetter = z.infer<typeof insertGeneratedLetterSchema>;

export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;
export type InsertOnboardingDocument = z.infer<typeof insertOnboardingDocumentSchema>;

export type TaxDeclaration = typeof taxDeclarationsTable.$inferSelect;
export type InsertTaxDeclaration = z.infer<typeof insertTaxDeclarationSchema>;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type LoanRepayment = typeof loanRepayments.$inferSelect;
export type InsertLoanRepayment = z.infer<typeof insertLoanRepaymentSchema>;

export type OrgPosition = typeof orgPositions.$inferSelect;
export type InsertOrgPosition = z.infer<typeof insertOrgPositionSchema>;

export type PtRule = typeof ptRules.$inferSelect;
export type InsertPtRule = z.infer<typeof insertPtRuleSchema>;

export type LwfRule = typeof lwfRules.$inferSelect;
export type InsertLwfRule = z.infer<typeof insertLwfRuleSchema>;

export type BirthdayWish = typeof birthdayWishes.$inferSelect;
export type InsertBirthdayWish = z.infer<typeof insertBirthdayWishSchema>;

export type CompanyPolicy = typeof companyPolicies.$inferSelect;
export type InsertCompanyPolicy = z.infer<typeof insertCompanyPolicySchema>;
export type PolicyAcknowledgment = typeof policyAcknowledgments.$inferSelect;
export type InsertPolicyAcknowledgment = z.infer<typeof insertPolicyAcknowledgmentSchema>;

export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;

export type CompOffRequest = typeof compOffRequests.$inferSelect;
export type InsertCompOffRequest = z.infer<typeof insertCompOffRequestSchema>;

export type OnDutyRequest = typeof onDutyRequests.$inferSelect;
export type InsertOnDutyRequest = z.infer<typeof insertOnDutyRequestSchema>;

export type ProfileChangeRequest = typeof profileChangeRequests.$inferSelect;
export type InsertProfileChangeRequest = z.infer<typeof insertProfileChangeRequestSchema>;

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;

// API Request/Response Types
export type CreateEmployeeRequest = InsertEmployee;
export type UpdateEmployeeRequest = Partial<InsertEmployee>;
export type EmployeeResponse = Employee & { department?: Department };

export type CreateLeaveRequest = InsertLeaveRequest;
export type UpdateLeaveStatusRequest = { status: string; remarks?: string };

export type CreateExpenseRequest = InsertExpense;
export type UpdateExpenseStatusRequest = { status: string; remarks?: string };

export type CreateAssetRequest = InsertAsset;
export type AssignAssetRequest = { employeeId: number; assignedDate: string };

export type CheckInRequest = { employeeId: number; location?: string };
export type CheckOutRequest = { employeeId: number; location?: string };

export const glAccountMappings = pgTable("gl_account_mappings", {
  id: serial("id").primaryKey(),
  component: text("component").notNull().unique(),
  accountNo: text("account_no").notNull(),
  balAccountNo: text("bal_account_no").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("earning"),
  lineNoBase: integer("line_no_base").default(10000),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGlAccountMappingSchema = createInsertSchema(glAccountMappings).omit({ id: true, createdAt: true });
export type InsertGlAccountMapping = z.infer<typeof insertGlAccountMappingSchema>;
export type GlAccountMapping = typeof glAccountMappings.$inferSelect;

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  payrollId: integer("payroll_id").references(() => payroll.id),
  employeeId: integer("employee_id").references(() => employees.id),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  journalTemplateName: text("journal_template_name").default("JOURNALV"),
  journalBatchName: text("journal_batch_name").default("SALARY"),
  lineNo: integer("line_no").notNull(),
  accountType: text("account_type").default("G/L Account"),
  accountNo: text("account_no").notNull(),
  postingDate: text("posting_date").notNull(),
  documentType: text("document_type"),
  documentNo: text("document_no"),
  description: text("description").notNull(),
  balAccountNo: text("bal_account_no"),
  amount: decimal("amount").default("0"),
  debitAmount: decimal("debit_amount").default("0"),
  creditAmount: decimal("credit_amount").default("0"),
  balAccountType: text("bal_account_type").default("G/L Account"),
  locationCode: text("location_code"),
  payeeName: text("payee_name"),
  status: text("status").default("generated"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export const biometricDevices = pgTable("biometric_devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location"),
  ip: text("ip"),
  macAddress: text("mac_address"),
  subnetMask: text("subnet_mask"),
  gateway: text("gateway"),
  dns: text("dns"),
  make: text("make"),
  status: text("status").default("offline"),
  lastSync: timestamp("last_sync"),
  employees: integer("employees").default(0),
  autoSyncEnabled: boolean("auto_sync_enabled").default(false),
  syncIntervalMinutes: integer("sync_interval_minutes").default(5),
  apiPort: integer("api_port").default(80),
  apiProtocol: text("api_protocol").default("http"),
  lastSyncStatus: text("last_sync_status"),
  lastSyncRecords: integer("last_sync_records").default(0),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBiometricDeviceSchema = createInsertSchema(biometricDevices).omit({ id: true, createdAt: true });
export type InsertBiometricDevice = z.infer<typeof insertBiometricDeviceSchema>;
export type BiometricDevice = typeof biometricDevices.$inferSelect;

export const biometricPunchLogs = pgTable("biometric_punch_logs", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id"),
  deviceIp: text("device_ip"),
  employeeCode: text("employee_code"),
  employeeId: integer("employee_id"),
  punchTime: timestamp("punch_time").notNull(),
  punchType: text("punch_type"),
  rawPayload: text("raw_payload"),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const erpIntegrations = pgTable("erp_integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").default("available"),
  lastSync: timestamp("last_sync"),
  features: text("features").array().default([]),
  connectionUrl: text("connection_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertErpIntegrationSchema = createInsertSchema(erpIntegrations).omit({ id: true, createdAt: true });
export type InsertErpIntegration = z.infer<typeof insertErpIntegrationSchema>;
export type ErpIntegration = typeof erpIntegrations.$inferSelect;

export const salaryAdjustments = pgTable("salary_adjustments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  adjustmentType: text("adjustment_type").notNull(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  amount: decimal("amount").notNull(),
  lopDaysReversed: decimal("lop_days_reversed").default("0"),
  leaveTypeUsed: text("leave_type_used"),
  leaveDaysDeducted: decimal("leave_days_deducted").default("0"),
  reason: text("reason").notNull(),
  supportingInfo: text("supporting_info"),
  status: text("status").default("pending"),
  requestedBy: integer("requested_by").notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalRemarks: text("approval_remarks"),
  processedInMonth: text("processed_in_month"),
  processedInYear: integer("processed_in_year"),
  payrollId: integer("payroll_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalaryAdjustmentSchema = createInsertSchema(salaryAdjustments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalaryAdjustment = z.infer<typeof insertSalaryAdjustmentSchema>;
export type SalaryAdjustment = typeof salaryAdjustments.$inferSelect;

export const hrActionLog = pgTable("hr_action_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  employeeId: integer("employee_id"),
  performedBy: integer("performed_by").notNull(),
  performedByName: text("performed_by_name"),
  details: text("details"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHrActionLogSchema = createInsertSchema(hrActionLog).omit({ id: true, createdAt: true });
export type InsertHrActionLog = z.infer<typeof insertHrActionLogSchema>;
export type HrActionLog = typeof hrActionLog.$inferSelect;

export type DashboardStats = {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingExpenses: number;
  birthdaysThisMonth: number;
  anniversariesThisMonth: number;
  newJoinees: number;
  attritionRate: number;
};
