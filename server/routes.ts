import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth/storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import crypto from "crypto";
import { sendOnboardingEmail, sendPasswordResetEmail, sendNotificationEmail, sendPayslipEmail, verifySmtpConnection, sendLeaveRequestEmail, sendLeaveStatusEmail, sendLoanRequestEmail, sendLoanStatusEmail, sendAnnouncementEmail, sendAttendanceAlertEmail, sendExitNotificationEmail, sendLetterEmail, sendBirthdayEmail, sendAnniversaryEmail, sendNewEmployeeWelcomeEmail, sendDocumentRejectionEmail, sendDocumentPendingReminderEmail } from "./email";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper function to sanitize employee data - convert empty strings to null for date fields
function sanitizeEmployeeData(data: Record<string, any>): Record<string, any> {
  const dateFields = ['dateOfBirth', 'actualDateOfBirth', 'joinDate', 'confirmationDate', 'probationEndDate'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    // Convert empty strings to null for all nullable fields
    if (sanitized[key] === '') {
      sanitized[key] = null;
    }
  }
  
  // Ensure date fields specifically are null if empty
  for (const field of dateFields) {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      if (field !== 'joinDate') { // joinDate is required
        sanitized[field] = null;
      }
    }
  }
  
  return sanitized;
}

function letterResponsePage(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): string {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    success: { bg: '#dcfce7', icon: '✅', border: '#22c55e' },
    error: { bg: '#fee2e2', icon: '❌', border: '#ef4444' },
    warning: { bg: '#fef3c7', icon: '⚠️', border: '#f59e0b' },
    info: { bg: '#dbeafe', icon: 'ℹ️', border: '#3b82f6' },
  };
  const c = colors[type];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - FCT Energy</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="background:white;border-radius:12px;padding:40px;max-width:500px;width:90%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-top:4px solid ${c.border}">
<div style="font-size:48px;margin-bottom:16px">${c.icon}</div>
<h1 style="color:#1f2937;margin:0 0 12px;font-size:24px">${title}</h1>
<p style="color:#6b7280;font-size:16px;line-height:1.6;margin:0">${message}</p>
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">
<p style="color:#9ca3af;font-size:12px;margin:0">FCT TECNRGY PVT LTD - HRMS</p>
</div></div></body></html>`;
}

function letterDenyPage(token: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deny Letter - FCT Energy</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="background:white;border-radius:12px;padding:40px;max-width:500px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-top:4px solid #ef4444">
<div style="font-size:48px;text-align:center;margin-bottom:16px">📝</div>
<h1 style="color:#1f2937;margin:0 0 8px;font-size:24px;text-align:center">Deny Letter</h1>
<p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 20px">Please provide a reason for denying this letter.</p>
<form method="POST" action="/api/letter-response/${token}/deny">
<textarea name="reason" placeholder="Enter your reason here..." required style="width:100%;min-height:100px;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;resize:vertical;box-sizing:border-box;margin-bottom:16px"></textarea>
<div style="display:flex;gap:12px;justify-content:center">
<a href="javascript:history.back()" style="padding:10px 24px;border:1px solid #d1d5db;border-radius:8px;color:#374151;text-decoration:none;font-size:14px">Cancel</a>
<button type="submit" style="padding:10px 24px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">Submit Denial</button>
</div></form>
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">FCT TECNRGY PVT LTD - HRMS</p>
</div></div></body></html>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Dashboard Stats
  app.get(api.dashboard.stats.path, async (req, res) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const entityId = req.query.entityId ? Number(req.query.entityId) : null;
    const [
      totalEmployees,
      pendingLeaveRequests,
      pendingExpenses,
      presentToday,
      onLeaveToday,
      announcements
    ] = await Promise.all([
      storage.getEmployeeCount(),
      storage.getPendingLeaveCount(),
      storage.getPendingExpenseCount(),
      storage.getPresentCount(today),
      storage.getOnLeaveToday(),
      storage.getAnnouncements()
    ]);

    const employees = await storage.getEmployees();
    const filteredEmployees = entityId ? employees.filter(e => e.entityId === entityId) : employees;
    const thisMonth = new Date().getMonth() + 1;
    const upcomingBirthdays = filteredEmployees.filter(emp => {
      if (!emp.dateOfBirth) return false;
      const dob = new Date(emp.dateOfBirth);
      return dob.getMonth() + 1 === thisMonth;
    }).slice(0, 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newJoinees = filteredEmployees.filter(emp => {
      const joinDate = new Date(emp.joinDate);
      return joinDate >= thirtyDaysAgo;
    }).length;

    const entityEmployeeIds = entityId ? new Set(filteredEmployees.map(e => e.id)) : null;

    res.json({
      totalEmployees: entityId ? filteredEmployees.length : totalEmployees,
      activeEmployees: filteredEmployees.filter(e => e.status === 'active').length,
      onLeaveToday: entityId ? 0 : onLeaveToday,
      pendingLeaveRequests: entityId ? 0 : pendingLeaveRequests,
      pendingExpenses: entityId ? 0 : pendingExpenses,
      presentToday: entityId ? 0 : presentToday,
      newJoinees,
      upcomingBirthdays,
      recentAnnouncements: announcements.slice(0, 3),
    });
  });

  // Current user's employee info and access role
  app.get("/api/me", async (req, res) => {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    if (!userEmail) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const currentEmployee = await storage.getEmployeeByEmail(userEmail);
    if (!currentEmployee) {
      return res.json({ 
        email: userEmail, 
        accessRole: "employee",
        employeeFound: false 
      });
    }
    return res.json({
      email: userEmail,
      accessRole: currentEmployee.accessRole || "employee",
      employeeId: currentEmployee.id,
      employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
      employeeFound: true
    });
  });

  // Role-based authorization helper
  async function checkUserRole(req: any, allowedRoles: string[]): Promise<{ authorized: boolean; role: string | null }> {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    if (!userEmail) {
      return { authorized: false, role: null };
    }
    const currentEmployee = await storage.getEmployeeByEmail(userEmail);
    if (!currentEmployee) {
      return { authorized: false, role: null };
    }
    const userRole = currentEmployee.accessRole || "employee";
    const userRoles = userRole.split(",").map((r: string) => r.trim().toLowerCase());
    const hasAccess = userRoles.includes("admin") || userRoles.some((r: string) => allowedRoles.includes(r)) || (allowedRoles.some((r: string) => ["hr", "admin"].includes(r)) && userRoles.includes("hr_manager"));
    return { authorized: hasAccess, role: userRole };
  }

  // Team Dashboard Protected Endpoints
  app.get("/api/team/assets", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["asset_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view asset data." });
    }
    const assets = await storage.getAssets();
    res.json(assets);
  });

  app.get("/api/team/payroll", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["payroll_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view payroll data." });
    }
    const payroll = await storage.getPayroll();
    res.json(payroll);
  });

  app.get("/api/team/projects", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["project_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view project data." });
    }
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/team/onboarding", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["onboarding_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view onboarding data." });
    }
    const tasks = await storage.getOnboardingTasks();
    res.json(tasks);
  });

  app.get("/api/team/leaves", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["lms_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view leave data." });
    }
    const leaves = await storage.getLeaveRequests();
    res.json(leaves);
  });

  app.get("/api/team/performance", async (req, res) => {
    const { authorized } = await checkUserRole(req, ["pms_team"]);
    if (!authorized) {
      return res.status(403).json({ message: "Access denied. You don't have permission to view performance data." });
    }
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  // Employees
  app.get(api.employees.list.path, async (req, res) => {
    const employees = await storage.getEmployees();
    const entityIdParam = req.query.entityId ? String(req.query.entityId) : null;
    if (entityIdParam) {
      const entityIds = entityIdParam.split(',').map(Number).filter(n => !isNaN(n));
      if (entityIds.length > 0) {
        res.json(employees.filter(e => e.entityId && entityIds.includes(e.entityId)));
      } else {
        res.json(employees);
      }
    } else {
      res.json(employees);
    }
  });

  app.get(api.employees.get.path, async (req, res) => {
    const emp = await storage.getEmployee(Number(req.params.id));
    if (!emp) return res.status(404).json({ message: "Not found" });
    res.json(emp);
  });

  app.post(api.employees.create.path, async (req, res) => {
    try {
      const sanitizedBody = sanitizeEmployeeData(req.body);
      const input = api.employees.create.input.parse(sanitizedBody);
      const emp = await storage.createEmployee(input);
      res.status(201).json(emp);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/employees/bulk-update", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr", "hr_manager"]);
      if (!authorized) return res.status(403).json({ message: "Access denied" });

      const { rows, fields, matchField } = req.body;
      if (!rows || !Array.isArray(rows) || !fields || !Array.isArray(fields) || !matchField) {
        return res.status(400).json({ message: "rows, fields, and matchField are required" });
      }

      if (rows.length > 1000) {
        return res.status(400).json({ message: "Maximum 1000 rows allowed per batch" });
      }

      const ALLOWED_MATCH_FIELDS = ["employeeCode", "email"];
      if (!ALLOWED_MATCH_FIELDS.includes(matchField)) {
        return res.status(400).json({ message: "matchField must be 'employeeCode' or 'email'" });
      }

      const ALLOWED_TEXT_FIELDS = new Set([
        "firstName", "middleName", "lastName", "phone", "gender", "dateOfBirth", "bloodGroup",
        "maritalStatus", "designation", "location", "employmentType", "employmentStatus", "status",
        "joinDate", "actualJoinDate", "confirmationDate", "probationEndDate",
        "reportingManagerId", "hodId", "entity",
        "bankName", "branchName", "bankAccountNumber", "ifscCode",
        "panNumber", "aadharNumber", "pfStatus", "pfNumber", "esiNumber", "uanNumber", "taxRegime",
        "ctc", "variablePay", "birthdayAllowance", "retentionBonus", "retentionBonusDuration",
        "locationPermission", "locationCode", "bgvStatus", "biometricDeviceId",
        "highestQualification", "specialization", "instituteName",
        "secondHighestQualification", "secondSpecialization", "secondInstituteName",
        "currentAddress", "permanentAddress", "city", "state", "pincode",
        "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
        "emergencyContact1Name", "emergencyContact1Phone", "emergencyContact1Relation",
        "emergencyContact2Name", "emergencyContact2Phone", "emergencyContact2Relation",
        "sourcingChannel", "sourcingName", "positionType", "positionType", "replacedEmployeeName",
        "insuranceAnnualPremium", "insuranceEmployeeSharePercent", "insuranceEmployerSharePercent",
        "insuranceCycleStartDate", "insuranceCycleEndDate",
        "healthInsuranceProvider", "healthInsurancePolicyNumber", "healthInsuranceSumInsured",
        "healthInsuranceStartDate", "healthInsuranceEndDate",
        "lifeInsuranceProvider", "lifeInsurancePolicyNumber", "lifeInsuranceSumInsured",
        "lifeInsuranceNomineeName", "lifeInsuranceNomineeRelation",
        "personalAccidentProvider", "personalAccidentPolicyNumber", "personalAccidentSumInsured",
        "qualificationScore", "secondQualificationScore", "noticeBuyoutDuration",
      ]);
      const ALLOWED_INT_FIELDS = new Set([
        "departmentId", "entityId", "salaryStructureId", "shiftId", "projectId", "vicePresidentId", "noticeBuyoutPayments",
      ]);
      const ALLOWED_BOOL_FIELDS = new Set(["attendanceExempt"]);
      const BLOCKED_FIELDS = new Set(["id", "accessRole", "email", "employeeCode", "password", "profileImageUrl", "createdAt", "updatedAt", "onboardingStatus"]);

      const invalidFields = fields.filter((f: string) => !ALLOWED_TEXT_FIELDS.has(f) && !ALLOWED_INT_FIELDS.has(f) && !ALLOWED_BOOL_FIELDS.has(f) && f !== matchField);
      if (invalidFields.length > 0) {
        return res.status(400).json({ message: `Invalid or disallowed fields: ${invalidFields.join(", ")}` });
      }

      const allEmployees = await storage.getEmployees();
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const matchValue = row[matchField]?.toString()?.trim();
        if (!matchValue) { skipped++; continue; }

        let employee;
        if (matchField === "employeeCode") {
          employee = allEmployees.find((e: any) => e.employeeCode?.toLowerCase() === matchValue.toLowerCase());
        } else if (matchField === "email") {
          employee = allEmployees.find((e: any) => e.email?.toLowerCase() === matchValue.toLowerCase());
        }

        if (!employee) {
          errors.push(`Employee not found: ${matchValue}`);
          skipped++;
          continue;
        }

        const updateData: any = {};
        for (const field of fields) {
          if (field === matchField || BLOCKED_FIELDS.has(field)) continue;
          const val = row[field];
          if (val === undefined || val === null || val === "") continue;

          if (ALLOWED_INT_FIELDS.has(field)) {
            const parsed = parseInt(val);
            if (isNaN(parsed)) {
              errors.push(`${matchValue}: Invalid number for ${field}: "${val}"`);
              continue;
            }
            updateData[field] = parsed;
          } else if (ALLOWED_BOOL_FIELDS.has(field)) {
            updateData[field] = val === "true" || val === "1" || val === true;
          } else if (ALLOWED_TEXT_FIELDS.has(field)) {
            updateData[field] = String(val).trim();
          }
        }

        if (Object.keys(updateData).length > 0) {
          try {
            await storage.updateEmployee(employee.id, updateData);
            updated++;
          } catch (e: any) {
            errors.push(`Failed to update ${matchValue}: ${e.message}`);
            skipped++;
          }
        } else {
          skipped++;
        }
      }

      res.json({ updated, skipped, errors, total: rows.length });
    } catch (err: any) {
      console.error("Bulk update error:", err);
      res.status(500).json({ message: err.message || "Bulk update failed" });
    }
  });

  app.patch(api.employees.update.path, async (req, res) => {
    try {
      const sanitizedBody = sanitizeEmployeeData(req.body);
      const input = api.employees.update.input.parse(sanitizedBody);
      const empId = Number(req.params.id);

      if (input.pendingShiftId && input.shiftEffectiveDate) {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const todayStr = istNow.toISOString().split('T')[0];

        if (input.shiftEffectiveDate <= todayStr) {
          input.shiftId = input.pendingShiftId;
          input.pendingShiftId = null as any;
          input.shiftEffectiveDate = null as any;
          console.log(`[Shift] Employee ${empId}: effective date is today or past, applying shift immediately`);
        } else {
          const currentEmp = await storage.getEmployee(empId);
          if (currentEmp) {
            input.shiftId = currentEmp.shiftId;
          }
          console.log(`[Shift] Employee ${empId}: shift ${input.pendingShiftId} scheduled for ${input.shiftEffectiveDate}`);
        }
      } else if (input.shiftId !== undefined && !input.pendingShiftId) {
        const currentEmp = await storage.getEmployee(empId);
        if (currentEmp && currentEmp.shiftId && input.shiftId !== currentEmp.shiftId) {
          try {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istNow = new Date(now.getTime() + istOffset);
            const todayStr = istNow.toISOString().split('T')[0];

            const todayAttendance = await pool.query(
              `SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2 AND check_in IS NOT NULL`,
              [empId, todayStr]
            );

            if (todayAttendance.rows.length > 0) {
              const tomorrow = new Date(istNow);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const effectiveDate = tomorrow.toISOString().split('T')[0];
              input.pendingShiftId = input.shiftId;
              input.shiftEffectiveDate = effectiveDate;
              input.shiftId = currentEmp.shiftId;
              console.log(`[Shift] Employee ${empId}: already checked in today. New shift ${input.pendingShiftId} effective from ${effectiveDate}`);
            } else {
              input.pendingShiftId = null as any;
              input.shiftEffectiveDate = null as any;
              console.log(`[Shift] Employee ${empId}: no check-in today. Applying new shift ${input.shiftId} immediately`);
            }
          } catch (e: any) {
            console.error(`[Shift] Error checking shift timing:`, e?.message);
          }
        }
      }

      const emp = await storage.updateEmployee(empId, input);
      res.json(emp);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.employees.delete.path, async (req, res) => {
    await storage.deleteEmployee(Number(req.params.id));
    res.status(204).send();
  });

  // Entities
  app.get("/api/entities", async (req, res) => {
    const allEntities = await storage.getEntities();
    res.json(allEntities);
  });

  app.get("/api/entities/:id", async (req, res) => {
    const entity = await storage.getEntity(Number(req.params.id));
    if (!entity) return res.status(404).json({ message: "Entity not found" });
    res.json(entity);
  });

  app.post("/api/entities", async (req, res) => {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    if (userEmail) {
      const emp = await storage.getEmployeeByEmail(userEmail);
      const roles = (emp?.accessRole || "employee").split(",").map((r: string) => r.trim());
      if (!roles.includes("admin")) return res.status(403).json({ message: "Admin access required" });
    }
    const entity = await storage.createEntity(req.body);
    res.status(201).json(entity);
  });

  app.patch("/api/entities/:id", async (req, res) => {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    if (userEmail) {
      const emp = await storage.getEmployeeByEmail(userEmail);
      const roles = (emp?.accessRole || "employee").split(",").map((r: string) => r.trim());
      if (!roles.includes("admin")) return res.status(403).json({ message: "Admin access required" });
    }
    const entity = await storage.updateEntity(Number(req.params.id), req.body);
    res.json(entity);
  });

  app.delete("/api/entities/:id", async (req, res) => {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    if (userEmail) {
      const emp = await storage.getEmployeeByEmail(userEmail);
      const roles = (emp?.accessRole || "employee").split(",").map((r: string) => r.trim());
      if (!roles.includes("admin")) return res.status(403).json({ message: "Admin access required" });
    }
    await storage.deleteEntity(Number(req.params.id));
    res.status(204).send();
  });

  // Departments
  app.get(api.departments.list.path, async (req, res) => {
    const depts = await storage.getDepartments();
    const entityIdParam = req.query.entityId ? String(req.query.entityId) : null;
    if (entityIdParam) {
      const entityIds = entityIdParam.split(',').map(Number).filter(n => !isNaN(n));
      if (entityIds.length > 0) {
        res.json(depts.filter(d => d.entityId && entityIds.includes(d.entityId)));
      } else {
        res.json(depts);
      }
    } else {
      res.json(depts);
    }
  });

  app.get(api.departments.get.path, async (req, res) => {
    const dept = await storage.getDepartment(Number(req.params.id));
    if (!dept) return res.status(404).json({ message: "Not found" });
    res.json(dept);
  });

  app.post(api.departments.create.path, async (req, res) => {
    const input = api.departments.create.input.parse(req.body);
    const dept = await storage.createDepartment(input);
    res.status(201).json(dept);
  });

  // Salary Structures
  app.get("/api/salary-structures", async (req, res) => {
    const structures = await storage.getSalaryStructures();
    res.json(structures);
  });

  app.get("/api/salary-structures/:id", async (req, res) => {
    const structure = await storage.getSalaryStructure(Number(req.params.id));
    if (!structure) return res.status(404).json({ message: "Not found" });
    res.json(structure);
  });

  app.post("/api/salary-structures", async (req, res) => {
    const structure = await storage.createSalaryStructure(req.body);
    res.status(201).json(structure);
  });

  app.patch("/api/salary-structures/:id", async (req, res) => {
    const structure = await storage.updateSalaryStructure(Number(req.params.id), req.body);
    res.json(structure);
  });

  app.delete("/api/salary-structures/:id", async (req, res) => {
    await storage.deleteSalaryStructure(Number(req.params.id));
    res.status(204).send();
  });

  // Seed default salary structures if none exist
  app.post("/api/salary-structures/seed", async (req, res) => {
    const existing = await storage.getSalaryStructures();
    if (existing.length > 0) {
      return res.json({ message: "Salary structures already exist", structures: existing });
    }
    
    const defaultStructures = [
      {
        name: "Structure 1 - Common",
        description: "Common salary structure with balanced components",
        basicPercent: "35",
        hraPercent: "19",
        conveyancePercent: "4",
        daPercent: "33",
        communicationPercent: "3",
        medicalPercent: "6",
        isActive: true
      },
      {
        name: "Structure 2 - Specific",
        description: "Specific salary structure with higher medical allowance",
        basicPercent: "20",
        hraPercent: "19",
        conveyancePercent: "19",
        daPercent: "10",
        communicationPercent: "3",
        medicalPercent: "29",
        isActive: true
      },
      {
        name: "Structure 3 - ESI & PF",
        description: "For ESI & PF concerned employees with higher basic",
        basicPercent: "55",
        hraPercent: "15",
        conveyancePercent: "0",
        daPercent: "30",
        communicationPercent: "0",
        medicalPercent: "0",
        isActive: true
      }
    ];
    
    const created = [];
    for (const structure of defaultStructures) {
      const s = await storage.createSalaryStructure(structure);
      created.push(s);
    }
    
    res.status(201).json({ message: "Default salary structures created", structures: created });
  });

  // Shifts
  app.get("/api/shifts", async (req, res) => {
    const allShifts = await storage.getShifts();
    res.json(allShifts);
  });

  app.get("/api/shifts/:id", async (req, res) => {
    const shift = await storage.getShift(Number(req.params.id));
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    res.json(shift);
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const shift = await storage.createShift(req.body);
      res.status(201).json(shift);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/shifts/:id", async (req, res) => {
    try {
      const shift = await storage.updateShift(Number(req.params.id), req.body);
      res.json(shift);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    await storage.deleteShift(Number(req.params.id));
    res.json({ message: "Shift deleted" });
  });

  // Documents
  app.get(api.documents.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const docs = await storage.getDocuments(employeeId);
    res.json(docs);
  });

  app.post(api.documents.create.path, async (req, res) => {
    const input = api.documents.create.input.parse(req.body);
    const doc = await storage.createDocument(input);
    res.status(201).json(doc);
  });

  // Document upload with file content
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    console.log('Document upload request received');
    console.log('File:', req.file ? req.file.originalname : 'No file');
    console.log('Body:', req.body);
    
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { employeeId, documentType, documentName } = req.body;
      
      if (!employeeId || !documentType || !documentName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const fileData = file.buffer.toString('base64');
      
      const doc = await storage.createDocument({
        employeeId: parseInt(employeeId),
        documentType,
        documentName,
        filePath: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileData,
        status: 'pending',
      });
      
      res.status(201).json(doc);
    } catch (error: any) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: error.message || "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id/file", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });
      const docs = await storage.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      if (!(doc as any).fileData) return res.status(404).json({ message: "No file data available" });
      const mimeType = (doc as any).mimeType || "application/octet-stream";
      const buffer = Buffer.from((doc as any).fileData, "base64");
      const disposition = req.query.download === "true" ? "attachment" : "inline";
      const filename = (doc as any).filePath || doc.documentName || "document";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length.toString());
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/documents/bulk-status", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) {
        return res.status(403).json({ message: "Only admin/HR can update document status" });
      }
      const { ids, status, rejectionComments } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No document IDs provided" });
      }
      if (!["pending", "verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const verifiedAt = status === "verified" ? new Date() : null;
      const comments = status === "rejected" ? (rejectionComments || null) : null;
      const docs = await storage.bulkUpdateDocumentStatus(ids, status, verifiedAt, comments);
      
      if (status === "rejected" && comments) {
        const employees = await storage.getEmployees();
        for (const doc of docs) {
          const emp = employees.find(e => e.id === doc.employeeId);
          if (emp?.email) {
            const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
            sendDocumentRejectionEmail(emp.email, empName, doc.documentName, comments).catch(() => {});
          }
        }
      }
      
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/documents/:id/status", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) {
        return res.status(403).json({ message: "Only admin/HR can update document status" });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });
      const { status, rejectionComments } = req.body;
      if (!["pending", "verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const verifiedAt = status === "verified" ? new Date() : null;
      const comments = status === "rejected" ? (rejectionComments || null) : null;
      const doc = await storage.updateDocumentStatus(id, status, verifiedAt, comments);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      
      if (status === "rejected" && comments) {
        const emp = await storage.getEmployee(doc.employeeId);
        if (emp?.email) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          sendDocumentRejectionEmail(emp.email, empName, doc.documentName, comments).catch(() => {});
        }
      }
      
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const requiredDocTypes = [
    { docType: "10th_marksheet", name: "10th Marksheet" },
    { docType: "12th_marksheet", name: "12th Marksheet" },
    { docType: "graduation_degree", name: "Graduation Degree" },
    { docType: "prev_offer_letter", name: "Previous Company Offer Letter" },
    { docType: "relieving_letter", name: "Previous Company Relieving Letter" },
    { docType: "experience", name: "Previous Company Experience Letter" },
    { docType: "salary_slips", name: "Last 3 Months Salary Slips" },
    { docType: "aadhar", name: "Aadhar Card" },
    { docType: "pan_card", name: "PAN Card" },
    { docType: "id_proof", name: "ID Proof (Passport/Driving License)" },
    { docType: "address_proof", name: "Address Proof" },
    { docType: "photo", name: "Passport Size Photo" },
    { docType: "bank_proof", name: "Bank Account Proof" },
  ];

  app.post("/api/documents/send-employee-reminder", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) {
        return res.status(403).json({ message: "Only admin/HR can send reminders" });
      }
      const { employeeId } = req.body;
      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID required" });
      }
      const emp = await storage.getEmployee(employeeId);
      if (!emp || !emp.email) {
        return res.status(404).json({ message: "Employee not found or has no email" });
      }
      const empDocs = await storage.getDocuments(employeeId);
      const submittedTypes = new Set(empDocs.map(d => d.documentType));
      const missingDocs = requiredDocTypes.filter(rt => !submittedTypes.has(rt.docType)).map(rt => rt.name);
      const pendingDocs = empDocs.filter(d => d.status === "pending" || !d.status).map(d => d.documentName);
      const allPending = [...missingDocs, ...pendingDocs];
      if (allPending.length === 0) {
        return res.status(400).json({ message: "All documents have been submitted and verified" });
      }
      const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
      const sent = await sendDocumentPendingReminderEmail(emp.email, empName, allPending);
      if (sent) {
        res.json({ message: `Reminder sent to ${empName}`, sentCount: 1 });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/send-pending-reminder", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) {
        return res.status(403).json({ message: "Only admin/HR can send reminders" });
      }
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No document IDs provided" });
      }
      const allDocs = await storage.getDocuments();
      const pendingDocs = allDocs.filter(d => ids.includes(d.id) && (d.status === "pending" || !d.status));
      if (pendingDocs.length === 0) {
        return res.status(400).json({ message: "No pending documents found in the selection" });
      }
      const employees = await storage.getEmployees();
      const byEmployee: Record<number, { name: string; email: string; docs: string[] }> = {};
      for (const doc of pendingDocs) {
        const emp = employees.find(e => e.id === doc.employeeId);
        if (emp?.email) {
          if (!byEmployee[doc.employeeId]) {
            byEmployee[doc.employeeId] = {
              name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
              email: emp.email,
              docs: [],
            };
          }
          byEmployee[doc.employeeId].docs.push(doc.documentName);
        }
      }
      let sentCount = 0;
      for (const entry of Object.values(byEmployee)) {
        const sent = await sendDocumentPendingReminderEmail(entry.email, entry.name, entry.docs);
        if (sent) sentCount++;
      }
      res.json({ message: `Reminders sent to ${sentCount} employee(s)`, sentCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Attendance
  app.get(api.attendance.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const date = req.query.date as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    if (startDate && endDate) {
      const list = await storage.getAttendanceByDateRange(startDate, endDate, employeeId);
      return res.json(list);
    }
    const list = await storage.getAttendance(employeeId, date);
    res.json(list);
  });

  app.post(api.attendance.checkIn.path, async (req, res) => {
    const { employeeId, location, latitude, longitude } = api.attendance.checkIn.input.parse(req.body);
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    
    const existing = await storage.getAttendanceByDate(employeeId, today);
    
    if (existing) {
      try {
        await storage.createAttendanceLog({
          employeeId,
          attendanceId: existing.id,
          type: 'check_in',
          timestamp: now,
          latitude,
          longitude,
          location,
        });
      } catch (e) { console.error("Attendance log error:", e); }

      if (existing.checkOut) {
        const att = await storage.updateAttendance(existing.id, {
          checkIn: now,
          checkInLocation: location || existing.checkInLocation,
          checkInLatitude: latitude || existing.checkInLatitude,
          checkInLongitude: longitude || existing.checkInLongitude,
          checkOut: null as any,
          checkOutLocation: null as any,
          checkOutLatitude: null as any,
          checkOutLongitude: null as any,
        });
        return res.json(att);
      }
      if (!existing.checkInLatitude && latitude) {
        const att = await storage.updateAttendance(existing.id, {
          checkInLocation: location,
          checkInLatitude: latitude,
          checkInLongitude: longitude,
        });
        return res.json(att);
      }
      return res.json(existing);
    }

    const checkInHour = now.getHours();
    const checkInMin = now.getMinutes();
    const totalMinutes = checkInHour * 60 + checkInMin;
    const shiftStart = 9 * 60 + 30; // 09:30
    const lateThreshold = 10 * 60; // 10:00

    let status = 'present';
    if (totalMinutes > lateThreshold) {
      status = 'half_day';
    } else if (totalMinutes > shiftStart) {
      let cycleStart: Date, cycleEnd: Date;
      if (now.getDate() >= 26) {
        cycleStart = new Date(now.getFullYear(), now.getMonth(), 26);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 25);
      } else {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 26);
        cycleEnd = new Date(now.getFullYear(), now.getMonth(), 25);
      }
      const startStr = format(cycleStart, 'yyyy-MM-dd');
      const endStr = format(cycleEnd, 'yyyy-MM-dd');
      const cycleLogs = await storage.getAttendanceByDateRange(startStr, endStr, employeeId);
      const cycleLateCount = cycleLogs.filter(l => 
        l.status === 'late' || l.status === 'late_deducted'
      ).length;

      status = cycleLateCount >= 3 ? 'late_deducted' : 'late';
    }

    const att = await storage.createAttendance({
      employeeId,
      date: today,
      checkIn: now,
      checkInLocation: location,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      status
    });

    try {
      await storage.createAttendanceLog({
        employeeId,
        attendanceId: att.id,
        type: 'check_in',
        timestamp: now,
        latitude,
        longitude,
        location,
      });
    } catch (e) { console.error("Attendance log error:", e); }

    res.status(201).json(att);

    // Fire-and-forget: notify employee if late
    if (status === 'late' || status === 'late_deducted' || status === 'half_day') {
      try {
        const emp = await storage.getEmployee(employeeId);
        if (emp?.email) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          const timeStr = format(now, 'hh:mm a');
          const detail = status === 'half_day'
            ? `Your check-in at <strong>${timeStr}</strong> on ${today} was recorded as a half day (after 10:00 AM).`
            : status === 'late_deducted'
              ? `Your check-in at <strong>${timeStr}</strong> on ${today} was marked as Late (with deduction). You have exceeded the grace period for this cycle.`
              : `Your check-in at <strong>${timeStr}</strong> on ${today} was recorded as Late. Please try to arrive before 09:30 AM.`;
          sendAttendanceAlertEmail(emp.email, empName, 'late', detail).catch(() => {});
        }
      } catch (e) { console.error("Late check-in notification error:", e); }
    }
  });

  app.post(api.attendance.checkOut.path, async (req, res) => {
    const { employeeId, location, latitude, longitude } = api.attendance.checkOut.input.parse(req.body);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const existing = await storage.getAttendanceByDate(employeeId, today);
    if (!existing) {
      return res.status(400).json({ message: "No check-in record found for today" });
    }

    const checkInTime = existing.checkIn ? new Date(existing.checkIn) : new Date();
    const checkOutTime = new Date();
    const workHours = ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

    const checkOutHour = checkOutTime.getHours();
    const checkOutMin = checkOutTime.getMinutes();
    const totalMinutes = checkOutHour * 60 + checkOutMin;
    const shiftEnd = 18 * 60 + 30; // 18:30
    const earlyThreshold = 18 * 60; // 18:00

    let status = existing.status || 'present';
    if (totalMinutes < earlyThreshold && !['half_day', 'late_deducted'].includes(status)) {
      status = 'half_day';
    } else if (totalMinutes < shiftEnd && totalMinutes >= earlyThreshold && (status === 'present' || status === 'late')) {
      let cycleStart: Date, cycleEnd: Date;
      if (checkOutTime.getDate() >= 26) {
        cycleStart = new Date(checkOutTime.getFullYear(), checkOutTime.getMonth(), 26);
        cycleEnd = new Date(checkOutTime.getFullYear(), checkOutTime.getMonth() + 1, 25);
      } else {
        cycleStart = new Date(checkOutTime.getFullYear(), checkOutTime.getMonth() - 1, 26);
        cycleEnd = new Date(checkOutTime.getFullYear(), checkOutTime.getMonth(), 25);
      }
      const startStr = format(cycleStart, 'yyyy-MM-dd');
      const endStr = format(cycleEnd, 'yyyy-MM-dd');
      const cycleLogs = await storage.getAttendanceByDateRange(startStr, endStr, employeeId);
      const cycleEarlyCount = cycleLogs.filter(l =>
        l.date !== today &&
        (l.status === 'early_departure' || l.status === 'early_deducted')
      ).length;
      const cycleLateCount = cycleLogs.filter(l =>
        l.status === 'late' || l.status === 'late_deducted'
      ).length;
      const totalGraceUsed = cycleLateCount + cycleEarlyCount;
      status = totalGraceUsed >= 3 ? 'early_deducted' : 'early_departure';
    }

    if (parseFloat(workHours) < 4.5) {
      status = 'full_day_deduction';
    } else if (parseFloat(workHours) < 9 && parseFloat(workHours) >= 4.5 && status === 'present') {
      status = 'half_day';
    }

    const att = await storage.updateAttendance(existing.id, {
      checkOut: checkOutTime,
      checkOutLocation: location,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      workHours: workHours,
      overtime: parseFloat(workHours) > 9 ? (parseFloat(workHours) - 9).toFixed(2) : "0",
      status
    });

    try {
      await storage.createAttendanceLog({
        employeeId,
        attendanceId: existing.id,
        type: 'check_out',
        timestamp: checkOutTime,
        latitude,
        longitude,
        location,
      });
    } catch (e) { console.error("Attendance log error:", e); }

    if (parseFloat(workHours) > 9) {
      const overtimeHrs = (parseFloat(workHours) - 9).toFixed(2);
      try {
        await storage.createOvertimeRequest({
          employeeId,
          date: today,
          overtimeHours: overtimeHrs,
          reason: "Auto-detected: worked beyond standard shift hours",
          status: "pending",
        });
      } catch (e) {}
    }

    res.json(att);

    // Fire-and-forget: notify employee if overtime detected
    if (parseFloat(workHours) > 9) {
      try {
        const emp = await storage.getEmployee(employeeId);
        if (emp?.email) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          const otHrs = (parseFloat(workHours) - 9).toFixed(2);
          const detail = `You worked <strong>${workHours} hours</strong> on ${today}, which includes <strong>${otHrs} hours</strong> of overtime. An overtime request has been auto-created for approval.`;
          sendAttendanceAlertEmail(emp.email, empName, 'overtime', detail).catch(() => {});
        }
      } catch (e) { console.error("Overtime notification error:", e); }
    }
  });

  app.get("/api/attendance/cycle-stats", async (req, res) => {
    try {
      const now = new Date();
      let cycleStart: Date, cycleEnd: Date;
      if (now.getDate() >= 26) {
        cycleStart = new Date(now.getFullYear(), now.getMonth(), 26);
        cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 25);
      } else {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 26);
        cycleEnd = new Date(now.getFullYear(), now.getMonth(), 25);
      }

      const startStr = format(cycleStart, 'yyyy-MM-dd');
      const endStr = format(cycleEnd, 'yyyy-MM-dd');
      const todayStr = format(now, 'yyyy-MM-dd');
      const cycleLogs = await storage.getAttendanceByDateRange(startStr, endStr);
      const todayLogs = cycleLogs.filter(l => l.date === todayStr);

      const employees = await storage.getEmployees();
      const activeEmployees = employees.filter(e => e.status === 'active');

      const presentToday = todayLogs.filter(l => ['present', 'late', 'late_deducted', 'early_departure', 'early_deducted'].includes(l.status || '')).length;
      const lateToday = todayLogs.filter(l => ['late', 'late_deducted', 'half_day'].includes(l.status || '')).length;

      const employeeCycleStats: Record<number, { lateCount: number; earlyCount: number; lateDeducted: number; earlyDeducted: number; name: string; code: string; department: string }> = {};
      for (const emp of activeEmployees) {
        const empLogs = cycleLogs.filter(l => l.employeeId === emp.id);
        const lateCount = empLogs.filter(l => l.status === 'late' || l.status === 'late_deducted').length;
        const earlyCount = empLogs.filter(l => l.status === 'early_departure' || l.status === 'early_deducted').length;
        const lateDeducted = empLogs.filter(l => l.status === 'late_deducted').length;
        const earlyDeducted = empLogs.filter(l => l.status === 'early_deducted').length;
        employeeCycleStats[emp.id] = {
          lateCount,
          earlyCount,
          lateDeducted,
          earlyDeducted,
          name: `${emp.firstName} ${emp.lastName}`,
          code: emp.employeeCode || '',
          department: emp.department || ''
        };
      }

      const holidays = await storage.getHolidays();
      const cycleHolidays = holidays.filter(h => h.date >= startStr && h.date <= endStr);

      const isWeeklyOff = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        if (day === 0) return true; // Sunday
        if (day === 6) {
          const weekOfMonth = Math.ceil(d.getDate() / 7);
          return weekOfMonth === 2 || weekOfMonth === 4; // 2nd & 4th Saturday
        }
        return false;
      };

      let workingDaysInCycle = 0;
      const cursor = new Date(cycleStart);
      const endDate = new Date(Math.min(cycleEnd.getTime(), now.getTime()));
      while (cursor <= endDate) {
        const dStr = format(cursor, 'yyyy-MM-dd');
        const isHoliday = cycleHolidays.some(h => h.date === dStr);
        if (!isWeeklyOff(dStr) && !isHoliday) {
          workingDaysInCycle++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const todayEmployeeIds = [...new Set(todayLogs.map(l => l.employeeId))];
      let todayDetailedLogs: any[] = [];
      for (const empId of todayEmployeeIds) {
        const empLogs = await storage.getAttendanceLogs({ employeeId: empId });
        const todayEmpLogs = empLogs.filter((al: any) => {
          const logDate = al.timestamp ? format(new Date(al.timestamp), 'yyyy-MM-dd') : '';
          return logDate === todayStr;
        });
        todayDetailedLogs.push(...todayEmpLogs);
      }
      todayDetailedLogs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      res.json({
        cycleStart: startStr,
        cycleEnd: endStr,
        presentToday,
        lateToday,
        totalEmployees: activeEmployees.length,
        workingDaysInCycle,
        todayLogs: todayLogs.map(l => {
          const emp = activeEmployees.find(e => e.id === l.employeeId);
          return {
            ...l,
            employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
            employeeCode: emp?.employeeCode || '',
            department: emp?.department || ''
          };
        }),
        todayDetailedLogs: todayDetailedLogs.map((al: any) => {
          const emp = activeEmployees.find(e => e.id === al.employeeId);
          return {
            ...al,
            employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
            employeeCode: emp?.employeeCode || '',
            department: emp?.department || ''
          };
        }),
        employeeCycleStats,
        cycleHolidays,
        policyConfig: {
          shiftStart: "09:30 AM",
          shiftEnd: "06:30 PM",
          workingHours: 9,
          halfDayHours: 4.5,
          graceInstances: 3,
          lateGraceWindow: "09:30 AM - 10:00 AM",
          earlyGraceWindow: "06:00 PM - 06:30 PM",
          lateDeduction: "1/3rd day salary after 3rd instance",
          afterTenDeduction: "Half-day salary deduction",
          beforeSixDeduction: "Half-day salary deduction",
          weeklyOff: "All Sundays + 2nd & 4th Saturdays",
          attendanceCycle: "26th to 25th"
        }
      });
    } catch (err: any) {
      console.error("Attendance cycle stats error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance/sheet", async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const m = parseInt(month as string);
      const y = parseInt(year as string);

      let cycleStart: Date, cycleEnd: Date;
      if (m === 1) {
        cycleStart = new Date(y - 1, 11, 26);
      } else {
        cycleStart = new Date(y, m - 2, 26);
      }
      cycleEnd = new Date(y, m - 1, 25);

      const startStr = format(cycleStart, 'yyyy-MM-dd');
      const endStr = format(cycleEnd, 'yyyy-MM-dd');

      const cycleAttendance = await storage.getAttendanceByDateRange(startStr, endStr);

      const holidays = await storage.getHolidays();
      const cycleHolidays = holidays.filter(h => h.date >= startStr && h.date <= endStr);
      const holidayDates = new Set(cycleHolidays.map(h => h.date));

      const approvedLeaves = await storage.getLeaveRequests(undefined, 'approved');

      const leaveTypesList = await storage.getLeaveTypes();
      const leaveTypeMap: Record<number, string> = {};
      for (const lt of leaveTypesList) {
        leaveTypeMap[lt.id] = lt.code;
      }

      const isWeeklyOff = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        if (day === 0) return true;
        if (day === 6) {
          const weekOfMonth = Math.ceil(d.getDate() / 7);
          return weekOfMonth === 2 || weekOfMonth === 4;
        }
        return false;
      };

      const dates: string[] = [];
      const cursor = new Date(cycleStart);
      while (cursor <= cycleEnd) {
        dates.push(format(cursor, 'yyyy-MM-dd'));
        cursor.setDate(cursor.getDate() + 1);
      }

      const employees = await storage.getEmployees();
      const activeEmployees = employees.filter(e => e.status === 'active');

      const sheet: Array<{
        employeeId: number;
        employeeCode: string;
        employeeName: string;
        department: string;
        dailyCodes: Record<string, string>;
        summary: { present: number; absent: number; halfDay: number; leaves: number; holidays: number; weeklyOff: number; lop: number };
      }> = [];

      const allOdRequests = await storage.getOnDutyRequests({ status: 'approved' });

      for (const emp of activeEmployees) {
        const empAttendance = cycleAttendance.filter(a => a.employeeId === emp.id);
        const attMap: Record<string, typeof empAttendance[0]> = {};
        for (const a of empAttendance) { attMap[a.date] = a; }

        const empOdDates = new Set(allOdRequests.filter(o => o.employeeId === emp.id).map(o => o.date));

        const empLeaves = approvedLeaves.filter(l => l.employeeId === emp.id);
        const leaveDateMap: Record<string, string> = {};
        for (const leave of empLeaves) {
          const ls = new Date(leave.startDate + 'T00:00:00');
          const le = new Date(leave.endDate + 'T00:00:00');
          const lCursor = new Date(ls);
          const leaveCode = leave.leaveTypeId ? (leaveTypeMap[leave.leaveTypeId] || leave.leaveType) : leave.leaveType;
          const days = parseFloat(String(leave.days || '1'));
          const isHalfDay = days === 0.5;
          while (lCursor <= le) {
            const ld = format(lCursor, 'yyyy-MM-dd');
            if (ld >= startStr && ld <= endStr) {
              leaveDateMap[ld] = isHalfDay ? `½${leaveCode}` : leaveCode;
            }
            lCursor.setDate(lCursor.getDate() + 1);
          }
        }

        const dailyCodes: Record<string, string> = {};
        const summary = { present: 0, absent: 0, halfDay: 0, leaves: 0, holidays: 0, weeklyOff: 0, lop: 0 };

        for (const d of dates) {
          const isHol = holidayDates.has(d);
          const isWO = isWeeklyOff(d);
          const att = attMap[d];
          const leaveCode = leaveDateMap[d];

          if (isHol && att && att.checkIn) {
            dailyCodes[d] = 'WH';
            summary.present++;
          } else if (isHol) {
            dailyCodes[d] = 'H';
            summary.holidays++;
          } else if (isWO && att && att.checkIn) {
            dailyCodes[d] = 'WOW';
            summary.present++;
          } else if (isWO) {
            dailyCodes[d] = 'WO';
            summary.weeklyOff++;
          } else if (leaveCode) {
            if (leaveCode.startsWith('½')) {
              if (att && att.checkIn) {
                dailyCodes[d] = leaveCode;
                summary.halfDay++;
              } else {
                dailyCodes[d] = leaveCode;
                summary.halfDay++;
              }
            } else if (leaveCode === 'LOP' || leaveCode === 'LWP') {
              dailyCodes[d] = 'LWP';
              summary.lop++;
            } else {
              dailyCodes[d] = leaveCode;
              summary.leaves++;
            }
          } else if (att) {
            if (att.status === 'full_day_deduction') {
              dailyCodes[d] = 'LWP';
              summary.lop++;
            } else if (att.checkIn && !att.checkOut && att.regularizationStatus !== 'approved') {
              dailyCodes[d] = 'PMS';
              summary.present++;
            } else if (att.status === 'half_day') {
              dailyCodes[d] = '½P';
              summary.halfDay++;
            } else if (att.status === 'late' || att.status === 'late_deducted') {
              dailyCodes[d] = 'P';
              summary.present++;
            } else if (att.status === 'early_departure' || att.status === 'early_deducted') {
              dailyCodes[d] = 'P';
              summary.present++;
            } else {
              dailyCodes[d] = 'P';
              summary.present++;
            }
          } else if (empOdDates.has(d)) {
            dailyCodes[d] = 'OD';
            summary.present++;
          } else {
            dailyCodes[d] = 'A';
            summary.absent++;
          }
        }

        sheet.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode || '',
          employeeName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
          department: emp.department || '',
          dailyCodes,
          summary,
        });
      }

      res.json({ cycleStart: startStr, cycleEnd: endStr, dates, sheet });
    } catch (err: any) {
      console.error("Attendance sheet error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/attendance/regularize", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);

      const { attendanceId, reason } = req.body;
      if (!attendanceId || !reason) return res.status(400).json({ message: "attendanceId and reason required" });

      const record = await storage.getAttendanceById(attendanceId);
      if (!record) return res.status(404).json({ message: "Attendance record not found" });

      const userRole = currentEmployee?.accessRole || "employee";
      const isAdmin = userRole.split(",").map((r: string) => r.trim()).some((r: string) => ["admin", "hr", "hr_manager"].includes(r));
      if (!isAdmin && currentEmployee && record.employeeId !== currentEmployee.id) {
        return res.status(403).json({ message: "You can only regularize your own attendance" });
      }

      const updated = await storage.updateAttendance(attendanceId, {
        regularizationStatus: 'pending',
        regularizationReason: reason,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/attendance/regularize/:id", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const { id } = req.params;
      const { status: regStatus, checkIn, checkOut } = req.body;
      if (!regStatus) return res.status(400).json({ message: "status required" });

      const targetRecord = await storage.getAttendanceById(parseInt(id));
      if (!targetRecord) return res.status(404).json({ message: "Attendance record not found" });

      const targetEmployee = await storage.getEmployee(targetRecord.employeeId);
      const currentRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");
      const isReportingManager = targetEmployee && targetEmployee.reportingManagerId === currentEmployee.employeeCode;

      if (!isAdminOrHR && !isReportingManager) {
        return res.status(403).json({ message: "Only reporting manager or admin/HR can approve/reject regularizations" });
      }

      const updates: any = { regularizationStatus: regStatus };
      if (regStatus === 'approved') {
        if (checkIn) updates.checkIn = new Date(checkIn);
        if (checkOut) updates.checkOut = new Date(checkOut);
        if (targetRecord && targetRecord.checkIn && checkOut) {
          const ci = new Date(targetRecord.checkIn);
          const co = new Date(checkOut);
          const workHrs = ((co.getTime() - ci.getTime()) / (1000 * 60 * 60)).toFixed(2);
          updates.workHours = workHrs;
          if (parseFloat(workHrs) >= 9) {
            updates.status = 'present';
          } else if (parseFloat(workHrs) >= 4.5) {
            updates.status = 'half_day';
          }
        } else {
          updates.status = 'present';
        }
      }

      const updated = await storage.updateAttendance(parseInt(id), updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance/pending-regularizations", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const currentRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");

      const pending = await storage.getAttendanceByStatus('pending');
      const employees = await storage.getEmployees();

      const result = pending.map(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        return {
          ...a,
          employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unknown',
          employeeCode: emp?.employeeCode || '',
          reportingManagerId: emp?.reportingManagerId || '',
        };
      });

      if (isAdminOrHR) {
        res.json(result);
      } else {
        const teamRequests = result.filter(r => r.reportingManagerId === currentEmployee.employeeCode);
        res.json(teamRequests);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/payroll/cycle-lop", async (req, res) => {
    try {
      const { month, year, employeeIds } = req.query;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const payrollMonth = parseInt(month as string);
      const payrollYear = parseInt(year as string);

      let cycleStartDate: Date, cycleEndDate: Date;
      if (payrollMonth === 1) {
        cycleStartDate = new Date(payrollYear - 1, 11, 26);
      } else {
        cycleStartDate = new Date(payrollYear, payrollMonth - 2, 26);
      }
      cycleEndDate = new Date(payrollYear, payrollMonth - 1, 25);

      const startStr = format(cycleStartDate, 'yyyy-MM-dd');
      const endStr = format(cycleEndDate, 'yyyy-MM-dd');

      const cycleAttendance = await storage.getAttendanceByDateRange(startStr, endStr);
      const holidays = await storage.getHolidays();
      const cycleHolidays = holidays.filter(h => h.date >= startStr && h.date <= endStr);
      const approvedLeaves = await storage.getLeaveRequests(undefined, 'approved');
      const approvedOdRequests = await storage.getOnDutyRequests({ status: 'approved' });

      const isWeeklyOff = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        if (day === 0) return true;
        if (day === 6) {
          const weekOfMonth = Math.ceil(d.getDate() / 7);
          return weekOfMonth === 2 || weekOfMonth === 4;
        }
        return false;
      };

      const workingDates: string[] = [];
      const cursor = new Date(cycleStartDate);
      while (cursor <= cycleEndDate) {
        const dStr = format(cursor, 'yyyy-MM-dd');
        const isHoliday = cycleHolidays.some(h => h.date === dStr);
        if (!isWeeklyOff(dStr) && !isHoliday) {
          workingDates.push(dStr);
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const empIds = employeeIds ? (employeeIds as string).split(',').map(Number) : [];
      const result: Record<number, { lop: number; workingDays: number; cycleStart: string; cycleEnd: string }> = {};

      const employees = await storage.getEmployees();
      const targetEmps = empIds.length > 0 ? employees.filter(e => empIds.includes(e.id)) : employees.filter(e => e.status === 'active');

      for (const emp of targetEmps) {
        const empAttendance = cycleAttendance.filter(a => a.employeeId === emp.id);
        const attendedDates = new Set(empAttendance.map(a => a.date));

        const empLeaves = approvedLeaves.filter(l => l.employeeId === emp.id);
        const leaveDates = new Set<string>();
        for (const leave of empLeaves) {
          const ls = new Date(leave.startDate + 'T00:00:00');
          const le = new Date(leave.endDate + 'T00:00:00');
          const lCursor = new Date(ls);
          while (lCursor <= le) {
            const ld = format(lCursor, 'yyyy-MM-dd');
            if (ld >= startStr && ld <= endStr) leaveDates.add(ld);
            lCursor.setDate(lCursor.getDate() + 1);
          }
        }

        const empOdDates = new Set(approvedOdRequests.filter(o => o.employeeId === emp.id).map(o => o.date));

        let lopDays = 0;
        let halfDayCount = 0;
        for (const wd of workingDates) {
          if (leaveDates.has(wd)) continue;
          if (empOdDates.has(wd)) continue;
          if (!attendedDates.has(wd)) {
            lopDays += 1;
          } else {
            const attRecord = empAttendance.find(a => a.date === wd);
            if (attRecord && attRecord.status === 'full_day_deduction') {
              lopDays += 1;
            } else if (attRecord && attRecord.status === 'half_day') {
              halfDayCount += 1;
            } else if (attRecord && attRecord.status === 'late_deducted') {
              lopDays += 1/3;
            } else if (attRecord && attRecord.status === 'early_deducted') {
              lopDays += 0.5;
            }
          }
        }
        lopDays += halfDayCount * 0.5;
        lopDays = parseFloat(lopDays.toFixed(2));

        result[emp.id] = { lop: lopDays, workingDays: workingDates.length, cycleStart: startStr, cycleEnd: endStr };
      }

      res.json(result);
    } catch (err: any) {
      console.error("Cycle LOP calculation error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // Leave Types
  app.get(api.leaveTypes.list.path, async (req, res) => {
    const types = await storage.getLeaveTypes();
    res.json(types);
  });

  // Leave Balances
  app.get(api.leaveBalances.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    if (employeeId && !isNaN(employeeId)) {
      const balances = await storage.getLeaveBalances(employeeId);
      res.json(balances);
    } else {
      const balances = await storage.getAllLeaveBalances();
      res.json(balances);
    }
  });

  // Leaves
  app.get(api.leave.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const status = req.query.status as string | undefined;
    const leaves = await storage.getLeaveRequests(employeeId, status);
    res.json(leaves);
  });

  app.post(api.leave.create.path, async (req, res) => {
    try {
      const input = api.leave.create.input.parse(req.body);
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      let days = input.days ? parseFloat(input.days) : Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // --- Duplicate leave date validation ---
      const existingLeaves = await storage.getLeaveRequests(input.employeeId);
      const activeLeaves = existingLeaves.filter(l => l.status === 'pending' || l.status === 'approved');
      for (const existing of activeLeaves) {
        const exStart = new Date(existing.startDate);
        const exEnd = new Date(existing.endDate);
        if (startDate <= exEnd && endDate >= exStart) {
          return res.status(400).json({ 
            message: `You already have a ${existing.status} leave request (${existing.leaveType}) from ${existing.startDate} to ${existing.endDate} that overlaps with these dates.` 
          });
        }
      }

      // --- Probation & eligibility validation ---
      const leaveEmployee = await storage.getEmployee(input.employeeId);
      if (leaveEmployee) {
        const isProbation = (leaveEmployee.employmentStatus || '').toLowerCase() === 'probation';
        const joinDate = leaveEmployee.joinDate ? new Date(leaveEmployee.joinDate) : null;
        const today = new Date();
        const daysSinceJoining = joinDate ? Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;

        const paidLeaveTypes = ['earned', 'paternity', 'maternity', 'bereavement'];
        if (isProbation && paidLeaveTypes.includes(input.leaveType)) {
          return res.status(400).json({ 
            message: `Employees on probation cannot avail ${input.leaveType} leave. Only Casual Leave (CL), Sick Leave (SL), Comp Off (CO), and Loss of Pay (LOP) are available during probation.` 
          });
        }

        const daysSinceJoiningAtStart = joinDate ? Math.floor((startDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        if (input.leaveType === 'earned' && daysSinceJoiningAtStart < 180) {
          const eligibilityDate = joinDate ? new Date(joinDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 'N/A';
          return res.status(400).json({ 
            message: `Earned Leave (EL) is only available after completing 180 days of service (as per the Factories Act). You will be eligible from ${eligibilityDate}.` 
          });
        }
      }

      const leaveTypeMap: Record<string, string> = {
        earned: "EL", casual: "CL", sick: "SL",
        bereavement: "BL", paternity: "PL", comp_off: "CO", lop: "LOP"
      };
      const code = leaveTypeMap[input.leaveType] || input.leaveType.toUpperCase();
      const allTypes = await storage.getLeaveTypes();
      const matchedType = allTypes.find(t => t.code === code);

      const leave = await storage.createLeaveRequest({
        ...input,
        days: days.toString(),
        leaveTypeId: matchedType?.id || null,
      });
      res.status(201).json(leave);

      try {
        const leaveEmp = await storage.getEmployee(input.employeeId);
        if (!leaveEmp) {
          console.log("[Leave Email] Employee not found for ID:", input.employeeId);
        } else {
          const empName = `${leaveEmp.firstName} ${leaveEmp.lastName || ''}`.trim();
          const allEmps = await storage.getEmployees();
          console.log(`[Leave Email] Processing leave notification for ${empName} (ID: ${input.employeeId}), reportingManagerId: "${leaveEmp.reportingManagerId}"`);

          if (leaveEmp.reportingManagerId) {
            const rm = allEmps.find((e: any) => e.employeeCode === leaveEmp.reportingManagerId || String(e.id) === String(leaveEmp.reportingManagerId));
            if (rm?.email) {
              const rmName = `${rm.firstName} ${rm.lastName || ''}`.trim();
              console.log(`[Leave Email] Sending to RM: ${rmName} (${rm.email}) for ${empName}`);
              try {
                const result = await sendLeaveRequestEmail(rm.email, rmName, empName, input.leaveType, input.startDate, input.endDate, input.reason || '');
                console.log(`[Leave Email] RM send result: ${result}`);
              } catch (err: any) {
                console.error(`[Leave Email] RM send error:`, err?.message || err);
              }
            } else {
              console.log(`[Leave Email] RM not found. Searched employeeCode/id matching "${leaveEmp.reportingManagerId}" among ${allEmps.length} employees`);
            }
          } else {
            console.log("[Leave Email] No reportingManagerId set for this employee");
          }

          const adminEmps = allEmps.filter((e: any) => {
            const roles = (e.accessRole || '').split(',').map((r: string) => r.trim());
            return (roles.includes('admin') || roles.includes('hr')) && e.email && e.id !== input.employeeId;
          });
          console.log(`[Leave Email] Notifying ${adminEmps.length} admin/HR user(s)`);
          for (const admin of adminEmps) {
            const adminName = `${admin.firstName} ${admin.lastName || ''}`.trim();
            try {
              await sendLeaveRequestEmail(admin.email, adminName, empName, input.leaveType, input.startDate, input.endDate, input.reason || '');
              console.log(`[Leave Email] Sent to admin ${admin.email}`);
            } catch (err: any) {
              console.error(`[Leave Email] Failed to send to admin ${admin.email}:`, err?.message || err);
            }
          }
        }
      } catch (e) { console.error("[Leave Email] Notification error:", e); }
    } catch (err: any) {
      console.error("Leave creation error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.patch(api.leave.updateStatus.path, async (req, res) => {
    try {
      const { status, remarks } = api.leave.updateStatus.input.parse(req.body);
      const leaveId = Number(req.params.id);

      const currentUser = req.user as any;
      const currentUserEmail = currentUser?.email || currentUser?.claims?.email;
      const currentEmp = currentUserEmail ? await storage.getEmployeeByEmail(currentUserEmail) : null;

      const existingLeave = await storage.getLeaveRequestById(leaveId);
      if (!existingLeave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      if (currentEmp && existingLeave.employeeId === currentEmp.id) {
        return res.status(403).json({ error: "You cannot approve or reject your own leave request" });
      }

      const leaveEmployee = existingLeave.employeeId ? await storage.getEmployee(existingLeave.employeeId) : null;
      if (currentEmp && leaveEmployee) {
        const currentRoles = (currentEmp.accessRole || "employee").split(",").map((r: string) => r.trim());
        const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");
        const isReportingManager = leaveEmployee.reportingManagerId === currentEmp.employeeCode;
        if (!isAdminOrHR && !isReportingManager) {
          return res.status(403).json({ error: "Only the reporting manager or admin can approve/reject leave requests" });
        }
      }

      const leave = await storage.updateLeaveStatus(leaveId, status, remarks);

      if (status === 'approved' && leave.leaveTypeId && leave.employeeId) {
        const year = new Date().getFullYear();
        const days = parseFloat(leave.days || "1");
        const balances = await storage.getLeaveBalances(leave.employeeId);
        const existingBal = balances.find(b => b.leaveTypeId === leave.leaveTypeId && b.year === year);

        if (existingBal) {
          const newUsed = parseFloat(existingBal.used || "0") + days;
          const leaveType = (await storage.getLeaveTypes()).find(t => t.id === leave.leaveTypeId);
          const total = leaveType?.annualAllowance || 0;
          const newBalance = Math.max(total - newUsed, 0);
          await storage.updateLeaveBalanceUsed(existingBal.id, newUsed.toString(), newBalance.toString());
        } else {
          const leaveType = (await storage.getLeaveTypes()).find(t => t.id === leave.leaveTypeId);
          const total = leaveType?.annualAllowance || 0;
          await storage.createLeaveBalance({
            employeeId: leave.employeeId,
            leaveTypeId: leave.leaveTypeId,
            year,
            opening: "0",
            accrued: total.toString(),
            used: days.toString(),
            balance: Math.max(total - days, 0).toString(),
          });
        }
      }

      res.json(leave);

      // Fire-and-forget: notify employee of approval/rejection
      try {
        if (leaveEmployee?.email) {
          const empName = `${leaveEmployee.firstName} ${leaveEmployee.lastName || ''}`.trim();
          sendLeaveStatusEmail(leaveEmployee.email, empName, status, existingLeave.leaveType || '', existingLeave.startDate || '', existingLeave.endDate || '', remarks).catch(() => {});
        }
      } catch (e) { console.error("Leave status notification error:", e); }
    } catch (err: any) {
      console.error("Leave status update error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // On Duty (OD) Requests - Two-level approval
  app.get("/api/on-duty-requests", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const currentRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");

      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const status = req.query.status as string | undefined;

      if (isAdminOrHR) {
        const requests = await storage.getOnDutyRequests({ employeeId, status });
        const employees = await storage.getEmployees();
        const enriched = requests.map(r => {
          const emp = employees.find(e => e.id === r.employeeId);
          return { ...r, employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unknown', employeeCode: emp?.employeeCode || '' };
        });
        return res.json(enriched);
      }

      const employees = await storage.getEmployees();
      const directReports = employees.filter(e => e.reportingManagerId === currentEmployee.employeeCode);
      const directReportIds = new Set(directReports.map(e => e.id));

      const level2ReportIds = new Set<number>();
      for (const dr of directReports) {
        const subReports = employees.filter(e => e.reportingManagerId === dr.employeeCode);
        subReports.forEach(sr => level2ReportIds.add(sr.id));
      }
      const hodReportIds = new Set(employees.filter(e => e.hodId === currentEmployee.employeeCode).map(e => e.id));

      const allRequests = await storage.getOnDutyRequests({ employeeId, status });
      const filtered = allRequests.filter(r =>
        r.employeeId === currentEmployee.id ||
        directReportIds.has(r.employeeId) ||
        (level2ReportIds.has(r.employeeId) && r.level1Status === 'approved') ||
        (hodReportIds.has(r.employeeId) && r.level1Status === 'approved')
      );
      const enriched = filtered.map(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        return { ...r, employeeName: emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unknown', employeeCode: emp?.employeeCode || '' };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/on-duty-requests", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const { date, reason, location, odType, fromTime, toTime } = req.body;
      if (!date || !reason) return res.status(400).json({ message: "Date and reason are required" });

      const created = await storage.createOnDutyRequest({
        employeeId: currentEmployee.id,
        date,
        reason,
        location: location || null,
        odType: odType || 'full_day',
        fromTime: fromTime || null,
        toTime: toTime || null,
        level1Status: 'pending',
        level2Status: 'pending',
        status: 'pending',
      });
      res.json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/on-duty-requests/:id/level1", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const { id } = req.params;
      const { status: approvalStatus, remarks } = req.body;
      if (!approvalStatus) return res.status(400).json({ message: "status required" });

      const allRequests = await storage.getOnDutyRequests();
      const odRequest = allRequests.find(r => r.id === parseInt(id));
      if (!odRequest) return res.status(404).json({ message: "OD request not found" });

      const requestingEmp = await storage.getEmployee(odRequest.employeeId);
      const currentRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");
      const isReportingManager = requestingEmp && requestingEmp.reportingManagerId === currentEmployee.employeeCode;

      if (!isAdminOrHR && !isReportingManager) {
        return res.status(403).json({ message: "Only reporting manager or admin/HR can approve Level 1" });
      }

      const updates: any = {
        level1Status: approvalStatus,
        level1ApprovedBy: currentEmployee.employeeCode,
        level1ApprovedAt: new Date(),
        level1Remarks: remarks || null,
      };

      if (approvalStatus === 'rejected') {
        updates.status = 'rejected';
      }

      const updated = await storage.updateOnDutyRequest(parseInt(id), updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/on-duty-requests/:id/level2", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ message: "Employee not found" });

      const { id } = req.params;
      const { status: approvalStatus, remarks } = req.body;
      if (!approvalStatus) return res.status(400).json({ message: "status required" });

      const allRequests = await storage.getOnDutyRequests();
      const odRequest = allRequests.find(r => r.id === parseInt(id));
      if (!odRequest) return res.status(404).json({ message: "OD request not found" });

      if (odRequest.level1Status !== 'approved') {
        return res.status(400).json({ message: "Level 1 approval is required before Level 2" });
      }

      const requestingEmp = await storage.getEmployee(odRequest.employeeId);
      const currentRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdminOrHR = currentRoles.includes("admin") || currentRoles.includes("hr") || currentRoles.includes("hr_manager");

      let isManagersManager = false;
      if (requestingEmp && requestingEmp.reportingManagerId) {
        const employees = await storage.getEmployees();
        const level1Manager = employees.find(e => e.employeeCode === requestingEmp.reportingManagerId);
        if (level1Manager && level1Manager.reportingManagerId === currentEmployee.employeeCode) {
          isManagersManager = true;
        }
      }
      const isHOD = requestingEmp && requestingEmp.hodId === currentEmployee.employeeCode;

      if (!isAdminOrHR && !isManagersManager && !isHOD) {
        return res.status(403).json({ message: "Only VP/manager's manager, HOD, or admin/HR can approve Level 2" });
      }

      const updates: any = {
        level2Status: approvalStatus,
        level2ApprovedBy: currentEmployee.employeeCode,
        level2ApprovedAt: new Date(),
        level2Remarks: remarks || null,
      };

      if (approvalStatus === 'approved') {
        updates.status = 'approved';
      } else if (approvalStatus === 'rejected') {
        updates.status = 'rejected';
      }

      const updated = await storage.updateOnDutyRequest(parseInt(id), updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Profile Change Requests
  app.get("/api/profile-change-requests", async (req, res) => {
    try {
      const { employeeId, status } = req.query;
      const filters: any = {};
      if (employeeId) filters.employeeId = parseInt(employeeId as string);
      if (status) filters.status = status as string;
      const requests = await storage.getProfileChangeRequests(filters);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/profile-change-requests", async (req, res) => {
    try {
      const { employeeId, changes } = req.body;
      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      const created = [];
      for (const change of changes) {
        const pcr = await storage.createProfileChangeRequest({
          employeeId,
          fieldName: change.fieldName,
          oldValue: change.oldValue || null,
          newValue: change.newValue,
          status: 'pending',
        });
        created.push(pcr);
      }

      // Send notification email to HR admins
      try {
        const allEmployees = await storage.getEmployees();
        const hrAdmins = allEmployees.filter(e => e.accessRole === 'admin' && e.email && e.status === 'active');
        const empName = `${employee.firstName} ${employee.lastName || ''}`.trim();
        const fieldList = changes.map((c: any) => `<li><strong>${c.fieldName}</strong>: ${c.oldValue || '(empty)'} → ${c.newValue}</li>`).join('');
        for (const admin of hrAdmins) {
          sendNotificationEmail(
            admin.email!,
            `Profile Update Request from ${empName}`,
            'Profile Change Request',
            `<p>${empName} (${employee.employeeCode || ''}) has requested the following profile changes:</p><ul>${fieldList}</ul><p>Please review and approve/reject from the HR dashboard.</p>`
          ).catch(() => {});
        }
      } catch (e) { console.error("Profile change notification error:", e); }

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/profile-change-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, remarks, reviewedBy } = req.body;
      
      const updates: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
        remarks: remarks || null,
      };

      const updated = await storage.updateProfileChangeRequest(parseInt(id), updates);

      // If approved, update the employee field
      if (action === 'approve') {
        const fieldMap: Record<string, string> = {
          'Phone': 'phone',
          'Personal Email': 'personalEmail',
          'Contact Name': 'emergencyContactName',
          'Contact Phone': 'emergencyContactPhone',
          'Emergency Relation': 'emergencyContactRelation',
          'Current Address': 'address',
          'Permanent Address': 'permanentAddress',
          'Blood Group': 'bloodGroup',
          'Marital Status': 'maritalStatus',
          'Bank Name': 'bankName',
          'Bank Account Number': 'bankAccountNumber',
          'IFSC Code': 'ifscCode',
          'PAN Number': 'panNumber',
          'Aadhar Number': 'aadharNumber',
          'UAN Number': 'uanNumber',
        };
        const dbField = fieldMap[updated.fieldName];
        if (dbField && updated.newValue) {
          await storage.updateEmployee(updated.employeeId, { [dbField]: updated.newValue } as any);
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Attendance Logs (multi-punch)
  app.get("/api/attendance-logs", async (req, res) => {
    try {
      const { employeeId, attendanceId } = req.query;
      const filters: any = {};
      if (employeeId) filters.employeeId = parseInt(employeeId as string);
      if (attendanceId) filters.attendanceId = parseInt(attendanceId as string);
      const logs = await storage.getAttendanceLogs(filters);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Comp-Off Requests
  app.get("/api/comp-off-requests", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const status = req.query.status as string | undefined;
      const requests = await storage.getCompOffRequests({ employeeId, status });
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/my-comp-off-requests", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(404).json({ error: "Employee record not found" });
      const requests = await storage.getCompOffRequests({ employeeId: currentEmployee.id });
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/my-comp-off-balance", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(404).json({ error: "Employee record not found" });

      const approved = await storage.getCompOffRequests({ employeeId: currentEmployee.id, status: "approved" });
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      let available = 0;
      let expired = 0;
      let availed = 0;
      const details: any[] = [];

      for (const req of approved) {
        if (req.availedDate) {
          availed += parseFloat(req.daysEarned || "1");
          details.push({ ...req, currentStatus: 'availed' });
        } else if (req.expiryDate && req.expiryDate < todayStr) {
          expired += parseFloat(req.daysEarned || "1");
          details.push({ ...req, currentStatus: 'expired' });
        } else {
          available += parseFloat(req.daysEarned || "1");
          details.push({ ...req, currentStatus: 'available' });
        }
      }

      res.json({ available, expired, availed, total: available + expired + availed, details });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comp-off-requests", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(404).json({ error: "Employee record not found" });

      const { workDate, reason, workType, hours } = req.body;
      if (!workDate) return res.status(400).json({ error: "Work date is required" });

      const workDateObj = new Date(workDate + "T00:00:00");
      const dayOfWeek = workDateObj.getDay();
      const allHolidays = await storage.getHolidays();
      const isHoliday = allHolidays.some(h => h.date === workDate);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isHoliday && !isWeekend) {
        return res.status(400).json({ error: "Comp-Off can only be requested for work done on weekends or holidays" });
      }

      const existing = await storage.getCompOffRequests({ employeeId: currentEmployee.id });
      const alreadyExists = existing.find(r => r.workDate === workDate && r.status !== 'rejected');
      if (alreadyExists) {
        return res.status(400).json({ error: "A comp-off request already exists for this date" });
      }

      const expiryDate = new Date(workDateObj);
      expiryDate.setDate(expiryDate.getDate() + 60);

      const hoursWorked = parseFloat(hours || "8");
      const daysEarned = hoursWorked >= 6 ? "1" : (hoursWorked >= 4.5 ? "0.5" : "0");
      if (daysEarned === "0") {
        return res.status(400).json({ error: "Minimum 4.5 hours of work required to earn comp-off" });
      }

      const detectedType = isHoliday ? "holiday" : "weekend";

      const created = await storage.createCompOffRequest({
        employeeId: currentEmployee.id,
        workDate,
        reason: reason || `Worked on ${detectedType}`,
        workType: workType || detectedType,
        hours: hoursWorked.toString(),
        daysEarned,
        status: "pending",
        expiryDate: format(expiryDate, 'yyyy-MM-dd'),
      });
      res.status(201).json(created);

      // Fire-and-forget: notify reporting manager
      try {
        if (currentEmployee.reportingManagerId) {
          const allEmps = await storage.getEmployees();
          const rm = allEmps.find((e: any) => e.employeeCode === currentEmployee.reportingManagerId || String(e.id) === String(currentEmployee.reportingManagerId));
          if (rm?.email) {
            const empName = `${currentEmployee.firstName} ${currentEmployee.lastName || ''}`.trim();
            const rmName = `${rm.firstName} ${rm.lastName || ''}`.trim();
            sendNotificationEmail(rm.email, `Comp-Off Request from ${empName}`, "Comp-Off Request",
              `<p>Dear ${rmName},</p><p><strong>${empName}</strong> has submitted a comp-off request for working on <strong>${workDate}</strong> (${detectedType}).</p><p><strong>Hours Worked:</strong> ${hoursWorked}</p><p><strong>Days Earned:</strong> ${daysEarned}</p><p><strong>Reason:</strong> ${reason || 'Not specified'}</p><p>Please log in to the HRMS portal to approve or reject.</p>`
            ).catch(() => {});
          }
        }
      } catch (e) { console.error("Comp-off notification error:", e); }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comp-off-requests/:id/approve", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const approver = await storage.getEmployeeByEmail(userEmail);
      if (!approver) return res.status(403).json({ error: "Employee not found" });

      const id = parseInt(req.params.id);
      const compOff = await storage.getCompOffRequests();
      const request = compOff.find(r => r.id === id);
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== 'pending') return res.status(400).json({ error: "Request is not pending" });

      const approverRoles = (approver.accessRole || 'employee').split(',').map((r: string) => r.trim());
      const isAdminOrHR = approverRoles.includes('admin') || approverRoles.includes('hr') || approverRoles.includes('hr_manager') || approverRoles.includes('payroll_team');
      if (!isAdminOrHR) {
        const requestEmp = await storage.getEmployee(request.employeeId);
        if (!requestEmp || requestEmp.reportingManagerId !== approver.employeeCode) {
          return res.status(403).json({ error: "Only the reporting manager or admin can approve comp-off requests" });
        }
      }

      const updated = await storage.updateCompOffRequest(id, {
        status: "approved",
        approvedBy: approver.id,
        approvedAt: new Date(),
        remarks: req.body.remarks,
      });

      // Credit comp-off to leave balance
      try {
        const allTypes = await storage.getLeaveTypes();
        const coType = allTypes.find(t => t.code === 'CO');
        if (coType && request.employeeId) {
          const year = new Date().getFullYear();
          const daysEarned = parseFloat(request.daysEarned || "1");
          const balances = await storage.getLeaveBalances(request.employeeId);
          const existingBal = balances.find(b => b.leaveTypeId === coType.id && b.year === year);
          if (existingBal) {
            const newAccrued = parseFloat(existingBal.accrued || "0") + daysEarned;
            const newBalance = parseFloat(existingBal.balance || "0") + daysEarned;
            await storage.updateLeaveBalanceFields(existingBal.id, { accrued: newAccrued.toString(), balance: newBalance.toString() });
          } else {
            await storage.createLeaveBalance({
              employeeId: request.employeeId,
              leaveTypeId: coType.id,
              year,
              opening: "0",
              accrued: daysEarned.toString(),
              used: "0",
              balance: daysEarned.toString(),
            });
          }
        }
      } catch (e) { console.error("Error crediting comp-off balance:", e); }

      res.json(updated);

      // Fire-and-forget: notify employee
      try {
        const emp = await storage.getEmployee(request.employeeId);
        if (emp?.email) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          sendNotificationEmail(emp.email, "Comp-Off Approved - FCT Energy", "Comp-Off Approved",
            `<p>Dear ${empName},</p><p>Your comp-off request for <strong>${request.workDate}</strong> has been <span style="color:#16a34a;font-weight:bold;">Approved</span>.</p><p><strong>Days Earned:</strong> ${request.daysEarned}</p><p><strong>Expiry Date:</strong> ${request.expiryDate} (60 days from work date)</p><p>Please avail the comp-off before the expiry date.</p>`
          ).catch(() => {});
        }
      } catch (e) { console.error("Comp-off approval notification error:", e); }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comp-off-requests/:id/reject", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const approver = await storage.getEmployeeByEmail(userEmail);
      if (!approver) return res.status(403).json({ error: "Employee not found" });

      const id = parseInt(req.params.id);
      const compOff = await storage.getCompOffRequests();
      const request = compOff.find(r => r.id === id);
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== 'pending') return res.status(400).json({ error: "Request is not pending" });

      const approverRoles = (approver.accessRole || 'employee').split(',').map((r: string) => r.trim());
      const isAdminOrHR = approverRoles.includes('admin') || approverRoles.includes('hr') || approverRoles.includes('hr_manager') || approverRoles.includes('payroll_team');
      if (!isAdminOrHR) {
        const requestEmp = await storage.getEmployee(request.employeeId);
        if (!requestEmp || requestEmp.reportingManagerId !== approver.employeeCode) {
          return res.status(403).json({ error: "Only the reporting manager or admin can reject comp-off requests" });
        }
      }

      const updated = await storage.updateCompOffRequest(id, {
        status: "rejected",
        approvedBy: approver.id,
        remarks: req.body.remarks,
      });
      res.json(updated);

      // Fire-and-forget: notify employee
      try {
        const emp = await storage.getEmployee(request.employeeId);
        if (emp?.email) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          sendNotificationEmail(emp.email, "Comp-Off Rejected - FCT Energy", "Comp-Off Rejected",
            `<p>Dear ${empName},</p><p>Your comp-off request for <strong>${request.workDate}</strong> has been <span style="color:#dc2626;font-weight:bold;">Rejected</span>.</p>${req.body.remarks ? `<p><strong>Remarks:</strong> ${req.body.remarks}</p>` : ''}`
          ).catch(() => {});
        }
      } catch (e) { console.error("Comp-off rejection notification error:", e); }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Holidays
  app.get(api.holidays.list.path, async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const list = await storage.getHolidays(year);
    res.json(list);
  });

  app.post(api.holidays.create.path, async (req, res) => {
    const input = api.holidays.create.input.parse(req.body);
    const holiday = await storage.createHoliday(input);
    res.status(201).json(holiday);
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    await storage.deleteHoliday(Number(req.params.id));
    res.json({ success: true });
  });

  // Payroll
  app.get(api.payroll.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const month = req.query.month as string | undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const list = await storage.getPayroll(employeeId, month, year);
    res.json(list);
  });

  app.post(api.payroll.create.path, async (req, res) => {
    const input = api.payroll.create.input.parse(req.body);
    const record = await storage.createPayroll(input);
    res.status(201).json(record);
  });

  app.patch(api.payroll.updateStatus.path, async (req, res) => {
    const { status } = api.payroll.updateStatus.input.parse(req.body);
    const record = await storage.updatePayrollStatus(Number(req.params.id), status);
    res.json(record);
  });

  async function calculateMonthlyTDS(
    emp: any,
    annualGross: number,
    annualEPF: number,
    annualPT: number,
    storage: any,
    payrollMonth?: number,
    payrollYear?: number
  ): Promise<number> {
    const regime = (emp.taxRegime || "new").toLowerCase();

    let fyMonth = payrollMonth || (new Date().getMonth() + 1);
    let fyYear = payrollYear || new Date().getFullYear();
    const fy = fyMonth >= 4
      ? `${fyYear}-${(fyYear + 1).toString().slice(2)}`
      : `${fyYear - 1}-${fyYear.toString().slice(2)}`;

    const declarations = await storage.getTaxDeclarations(emp.id, fy);
    const approved = declarations.filter((d: any) => d.status === "approved" || d.status === "submitted");

    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const sectionTotals: Record<string, number> = {};
    for (const dec of approved) {
      const key = normalize(dec.section || "");
      if (!sectionTotals[key]) sectionTotals[key] = 0;
      sectionTotals[key] += Number(dec.amount) || 0;
    }

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const val = sectionTotals[normalize(k)];
        if (val) return val;
      }
      return 0;
    };

    if (regime === "old") {
      const standardDeduction = 50000;
      const sec80C = Math.min(get("80C") + annualEPF, 150000);
      const sec80D = Math.min(get("80D"), 75000);
      const sec80CCD1B = Math.min(get("80CCD1B"), 50000);
      const sec80CCD2 = get("80CCD2");
      const sec24b = Math.min(get("24b", "24"), 200000);
      const sec80E = get("80E");
      const sec80G = get("80G");
      const sec80EE = Math.min(get("80EE"), 150000);
      const sec80TTA = Math.min(get("80TTA"), 10000);
      const sec80U = Math.min(get("80U"), 125000);
      const sec80DD = Math.min(get("80DD"), 125000);
      const sec80DDB = Math.min(get("80DDB"), 100000);
      const hra = Math.min(get("HRA"), 240000);

      const totalExemptions = standardDeduction + sec80C + sec80D + sec80CCD1B + sec80CCD2 +
        sec24b + sec80E + sec80G + sec80EE + sec80TTA + sec80U + sec80DD + sec80DDB + hra + annualPT;

      const taxableIncome = Math.max(0, annualGross - totalExemptions);

      let tax = 0;
      if (taxableIncome <= 250000) {
        tax = 0;
      } else if (taxableIncome <= 500000) {
        tax = (taxableIncome - 250000) * 0.05;
      } else if (taxableIncome <= 1000000) {
        tax = 12500 + (taxableIncome - 500000) * 0.20;
      } else {
        tax = 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
      }

      if (taxableIncome <= 500000) tax = 0;

      tax = tax + (tax * 0.04);
      return Math.round(tax / 12);

    } else {
      const standardDeduction = 75000;
      const sec80CCD2 = get("80CCD2");

      const totalExemptions = standardDeduction + sec80CCD2;
      const taxableIncome = Math.max(0, annualGross - totalExemptions);

      let tax = 0;
      if (taxableIncome <= 400000) {
        tax = 0;
      } else if (taxableIncome <= 800000) {
        tax = (taxableIncome - 400000) * 0.05;
      } else if (taxableIncome <= 1200000) {
        tax = 20000 + (taxableIncome - 800000) * 0.10;
      } else if (taxableIncome <= 1600000) {
        tax = 60000 + (taxableIncome - 1200000) * 0.15;
      } else if (taxableIncome <= 2000000) {
        tax = 120000 + (taxableIncome - 1600000) * 0.20;
      } else if (taxableIncome <= 2400000) {
        tax = 200000 + (taxableIncome - 2000000) * 0.25;
      } else {
        tax = 300000 + (taxableIncome - 2400000) * 0.30;
      }

      if (taxableIncome <= 1200000) tax = 0;

      tax = tax + (tax * 0.04);
      return Math.round(tax / 12);
    }
  }

  app.post("/api/payroll/run", async (req, res) => {
    try {
      const { month, year, employeeIds, deductions, saveAsDraft } = req.body;
      if (!month || !year || !employeeIds || !Array.isArray(employeeIds)) {
        return res.status(400).json({ message: "month, year, and employeeIds are required" });
      }

      await storage.deletePayrollByMonthForEmployees(month, year, employeeIds);

      const allEmployees = await storage.getEmployees();
      const salaryStructuresList = await storage.getSalaryStructures();
      const selectedEmployees = allEmployees.filter(e => employeeIds.includes(e.id));

      const daysInMonth = new Date(year, parseInt(month), 0).getDate();
      const records: any[] = [];

      for (const emp of selectedEmployees) {
        const empData = deductions?.[emp.id] || {};
        const earnings = empData.earnings || {};
        const deds = empData.deductions || {};
        const ctcOverride = Number(empData.ctcOverride) || 0;
        const ctc = Number(emp.ctc) || ctcOverride;
        if (ctc === 0) continue;

        const monthlyCTC = ctc / 12;
        const structure = salaryStructuresList.find(s => s.id === emp.salaryStructureId);

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

        const variablePay = earnings.variablePay !== undefined && earnings.variablePay !== "" ? Number(earnings.variablePay) : (Number(emp.variablePay) || 0);
        const highAltitudeAllowance = Number(earnings.highAltitudeAllowance) || 0;
        const arrear = Number(earnings.arrear) || 0;
        const bonus = Number(earnings.bonus) || 0;
        const otherEarnings = Number(earnings.otherEarnings) || 0;
        const birthdayAllowanceAmount = earnings.birthdayAllowance !== undefined && earnings.birthdayAllowance !== "" ? Number(earnings.birthdayAllowance) : (Number(emp.birthdayAllowance) || 0);
        const earningsRemarks = earnings.remarks || "";

        let insurancePremium = 0;
        const ageBasedSlabs = [
          { minAge: 0, maxAge: 18, employerShare: 243, employeeShare: 162 },
          { minAge: 19, maxAge: 35, employerShare: 288, employeeShare: 192 },
          { minAge: 36, maxAge: 45, employerShare: 315, employeeShare: 210 },
          { minAge: 46, maxAge: 55, employerShare: 481, employeeShare: 320 },
          { minAge: 56, maxAge: 60, employerShare: 740, employeeShare: 493 },
          { minAge: 61, maxAge: 65, employerShare: 1002, employeeShare: 668 },
          { minAge: 66, maxAge: 70, employerShare: 1178, employeeShare: 785 },
          { minAge: 71, maxAge: 75, employerShare: 1388, employeeShare: 925 },
          { minAge: 76, maxAge: 90, employerShare: 1597, employeeShare: 1065 },
        ];
        if (emp.dateOfBirth || emp.actualDateOfBirth) {
          const dob = new Date(emp.actualDateOfBirth || emp.dateOfBirth!);
          const today = new Date();
          let empAge = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) empAge--;
          const slab = ageBasedSlabs.find(s => empAge >= s.minAge && empAge <= s.maxAge);
          if (slab) {
            insurancePremium = slab.employeeShare;
          }
        }

        let advanceAmt = 0;
        try {
          const empLoans = await storage.getLoans(emp.id, 'approved');
          const activeLoans = empLoans.filter((l: any) => Number(l.remainingBalance) > 0);
          for (const loan of activeLoans) {
            advanceAmt += Number(loan.emiAmount) || 0;
          }
        } catch (e) {}

        const otherDeduction = Number(deds.otherDeduction) || 0;
        const deductionsRemarks = deds.remarks || "";
        const lop = parseFloat(String(deds.lop || 0)) || 0;

        const epf = 3600;

        const grossMonthly = basic + hra + conveyance + da + communication + medical + variablePay + highAltitudeAllowance + arrear + bonus + otherEarnings + birthdayAllowanceAmount;

        let ptAmount = Number(deds.professionalTax) || 0;
        if (ptAmount === 0 && emp.state) {
          try {
            const ptStateRules = await storage.getPtRules(emp.state);
            const activeRules = ptStateRules.filter(r => r.isActive);
            for (const rule of activeRules) {
              if (grossMonthly >= Number(rule.slabFrom) && grossMonthly <= Number(rule.slabTo)) {
                ptAmount = Number(rule.ptAmount);
                break;
              }
            }
          } catch (e: any) {
            console.error(`[Payroll] PT rules lookup error for ${emp.employeeCode}:`, e?.message);
          }
        }

        let lwfAmount = Number(deds.lwf) || 0;
        if (lwfAmount === 0 && emp.state) {
          try {
            const lwfStateRules = await storage.getLwfRules(emp.state);
            const activeRule = lwfStateRules.find(r => r.isActive);
            if (activeRule) {
              const months = (activeRule.applicableMonths || "").split(",").map(m => m.trim());
              const currentMonth = parseInt(month);
              if (months.includes(String(currentMonth)) || activeRule.frequency === "monthly") {
                const threshold = Number(activeRule.grossSalaryThreshold) || 0;
                if (threshold === 0 || grossMonthly <= threshold) {
                  lwfAmount = Number(activeRule.employeeContribution);
                }
              }
            }
          } catch (e: any) {
            console.error(`[Payroll] LWF rules lookup error for ${emp.employeeCode}:`, e?.message);
          }
        }

        let incomeTax = 0;
        try {
          const annualGross = grossMonthly * 12;
          const annualEPF = epf * 12;
          const annualPT = ptAmount * 12;
          incomeTax = await calculateMonthlyTDS(emp, annualGross, annualEPF, annualPT, storage, parseInt(month), year);
        } catch (e) {
          incomeTax = 0;
        }

        const totalDeductions = insurancePremium + incomeTax + advanceAmt + otherDeduction + epf + ptAmount + lwfAmount;

        let overtimePay = 0;
        try {
          const otRequests = await storage.getOvertimeRequests({ employeeId: emp.id, status: 'approved' });
          const monthOT = otRequests.filter((r: any) => {
            const d = new Date(r.date);
            return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === year;
          });
          const totalOTHours = monthOT.reduce((sum: number, r: any) => sum + parseFloat(r.overtimeHours || '0'), 0);
          if (totalOTHours > 0) {
            const hourlyRate = grossMonthly / 26 / 9;
            overtimePay = Math.round(totalOTHours * hourlyRate * 1.5);
          }
        } catch (e) {}

        const perDaySalary = grossMonthly / daysInMonth;
        const lopDeduction = parseFloat((perDaySalary * lop).toFixed(2));
        const workingDays = parseFloat((daysInMonth - lop).toFixed(2));
        const grossWithOT = grossMonthly + overtimePay;
        const netSalary = parseFloat((grossWithOT - totalDeductions - lopDeduction).toFixed(2));

        records.push({
          employeeId: emp.id,
          month,
          year,
          basicSalary: basic.toString(),
          hra: hra.toString(),
          conveyance: conveyance.toString(),
          da: da.toString(),
          communicationAllowance: communication.toString(),
          medicalAllowance: medical.toString(),
          variablePay: variablePay.toString(),
          highAltitudeAllowance: highAltitudeAllowance.toString(),
          arrear: arrear.toString(),
          bonus: bonus.toString(),
          otherEarnings: otherEarnings.toString(),
          birthdayAllowance: birthdayAllowanceAmount.toString(),
          earningsRemarks,
          insurancePremium: insurancePremium.toString(),
          tds: "0",
          incomeTax: incomeTax.toString(),
          advance: advanceAmt.toString(),
          epf: epf.toString(),
          professionalTax: ptAmount.toString(),
          lwf: lwfAmount.toString(),
          otherDeductions: otherDeduction.toString(),
          deductionsRemarks,
          lopDeduction: lopDeduction.toString(),
          overtimePay: overtimePay.toString(),
          allowances: grossWithOT.toString(),
          deductions: totalDeductions.toString(),
          grossSalary: grossWithOT.toString(),
          netSalary: netSalary.toString(),
          ctc: ctc.toString(),
          totalDays: daysInMonth,
          lop: lop.toString(),
          workingDays: workingDays.toString(),
          salaryStructureId: emp.salaryStructureId,
          modeOfPayment: "Account Transfer",
          status: saveAsDraft ? "draft" : "processed",
        });
      }

      const created = await storage.createPayrollBatch(records);
      res.status(201).json({ message: `Payroll ${saveAsDraft ? 'saved as draft' : 'processed'} for ${created.length} employees`, records: created });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/:id", async (req, res) => {
    const record = await storage.getPayrollById(Number(req.params.id));
    if (!record) return res.status(404).json({ message: "Payroll record not found" });
    res.json(record);
  });

  app.patch("/api/payroll/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const record = await storage.getPayrollById(id);
      if (!record) return res.status(404).json({ message: "Payroll record not found" });
      if (record.status !== 'draft') {
        return res.status(400).json({ message: "Only draft payroll records can be edited" });
      }
      const updates = req.body;
      const updated = await storage.updatePayrollRecord(id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Expenses
  app.get(api.expenses.list.path, async (req, res) => {
    const user = req.user as any;
    const userEmail = user?.email || user?.claims?.email;
    let employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const status = req.query.status as string | undefined;

    if (userEmail) {
      const currentEmp = await storage.getEmployeeByEmail(userEmail);
      if (currentEmp) {
        const roles = (currentEmp.accessRole || 'employee').split(',').map((r: string) => r.trim());
        const isAdminOrHR = roles.includes('admin') || roles.includes('hr') || roles.includes('hr_manager') || roles.includes('payroll_team');
        if (!isAdminOrHR) {
          employeeId = currentEmp.id;
        }
      }
    }

    const list = await storage.getExpenses(employeeId, status);
    res.json(list);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    const input = api.expenses.create.input.parse(req.body);
    const expense = await storage.createExpense(input);
    res.status(201).json(expense);
  });

  app.patch(api.expenses.updateStatus.path, async (req, res) => {
    const { status, remarks } = api.expenses.updateStatus.input.parse(req.body);
    const expense = await storage.updateExpenseStatus(Number(req.params.id), status, remarks);
    res.json(expense);
  });

  // Assets
  app.get(api.assets.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const status = req.query.status as string | undefined;
    const list = await storage.getAssets(employeeId, status);
    res.json(list);
  });

  app.get(api.assets.get.path, async (req, res) => {
    const asset = await storage.getAsset(Number(req.params.id));
    if (!asset) return res.status(404).json({ message: "Not found" });
    res.json(asset);
  });

  app.post(api.assets.create.path, async (req, res) => {
    const input = api.assets.create.input.parse(req.body);
    const asset = await storage.createAsset(input);
    res.status(201).json(asset);
  });

  app.post(api.assets.assign.path, async (req, res) => {
    const { employeeId, assignedDate } = api.assets.assign.input.parse(req.body);
    const asset = await storage.updateAsset(Number(req.params.id), {
      employeeId,
      assignedDate,
      status: 'assigned'
    });
    res.json(asset);
  });

  app.post(api.assets.return.path, async (req, res) => {
    const { returnedDate, condition } = api.assets.return.input.parse(req.body);
    const asset = await storage.updateAsset(Number(req.params.id), {
      returnedDate,
      condition: condition || 'good',
      status: 'available',
      employeeId: null
    });
    res.json(asset);
  });

  // Exit Records
  app.get(api.exit.list.path, async (req, res) => {
    const status = req.query.status as string | undefined;
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    let list = await storage.getExitRecords(status);
    if (employeeId) {
      list = list.filter(r => r.employeeId === employeeId);
    }
    res.json(list);
  });

  app.post(api.exit.create.path, async (req, res) => {
    const input = api.exit.create.input.parse(req.body);
    const record = await storage.createExitRecord(input);

    const defaultClearanceTasks = [
      { department: "IT", taskName: "Laptop & Accessories Return" },
      { department: "IT", taskName: "Email & System Access Revocation" },
      { department: "Admin", taskName: "ID Card & Access Cards Return" },
      { department: "Finance", taskName: "Pending Expense Claims Settlement" },
      { department: "Finance", taskName: "Loan Recovery" },
      { department: "HR", taskName: "Knowledge Transfer" },
      { department: "HR", taskName: "Exit Interview" },
      { department: "Security", taskName: "NDA & Confidentiality Acknowledgement" },
    ];
    for (const task of defaultClearanceTasks) {
      await storage.createClearanceTask({
        exitRecordId: record.id,
        department: task.department,
        taskName: task.taskName,
        status: "pending",
      });
    }

    res.status(201).json(record);

    // Fire-and-forget: notify employee, HR, and reporting manager about exit/resignation
    try {
      const exitEmp = await storage.getEmployee(input.employeeId);
      if (exitEmp?.email) {
        const empName = `${exitEmp.firstName} ${exitEmp.lastName || ''}`.trim();
        sendExitNotificationEmail(exitEmp.email, empName, input.lastWorkingDate || 'To be determined', input.reason || '').catch(() => {});

        // Notify HR admins
        const allEmployees = await storage.getEmployees();
        const hrAdmins = allEmployees.filter(e => e.accessRole?.toLowerCase().includes('admin') || e.accessRole?.toLowerCase().includes('hr'));
        for (const hr of hrAdmins) {
          if (hr.email) {
            sendNotificationEmail(hr.email, `Resignation Notification - ${empName}`,
              `Employee Resignation`,
              `<p>Dear ${hr.firstName},</p><p><strong>${empName}</strong> (${exitEmp.employeeCode || ''}) has submitted their resignation.</p><p><strong>Reason:</strong> ${input.reason || 'Not specified'}</p><p><strong>Last Working Day:</strong> ${input.lastWorkingDate || 'To be determined'}</p><p>Please initiate the exit process.</p>`
            ).catch(() => {});
          }
        }

        // Notify reporting manager
        if (exitEmp.reportingManagerId) {
          const rm = allEmployees.find(e => e.employeeCode === exitEmp.reportingManagerId || String(e.id) === String(exitEmp.reportingManagerId));
          if (rm?.email) {
            sendNotificationEmail(rm.email, `Resignation Notification - ${empName}`,
              `Team Member Resignation`,
              `<p>Dear ${rm.firstName},</p><p>Your team member <strong>${empName}</strong> (${exitEmp.employeeCode || ''}) has submitted their resignation.</p><p><strong>Reason:</strong> ${input.reason || 'Not specified'}</p><p><strong>Last Working Day:</strong> ${input.lastWorkingDate || 'To be determined'}</p>`
            ).catch(() => {});
          }
        }
      }
    } catch (e) { console.error("Exit notification error:", e); }
  });

  app.patch(api.exit.updateStatus.path, async (req, res) => {
    const updates = api.exit.updateStatus.input.parse(req.body);
    const record = await storage.updateExitRecord(Number(req.params.id), updates);

    if (updates.clearanceStatus === "completed") {
      await storage.updateEmployee(record.employeeId, { status: "inactive" });
    }

    res.json(record);
  });

  app.get("/api/clearance-tasks/:exitRecordId", async (req, res) => {
    const tasks = await storage.getClearanceTasks(Number(req.params.exitRecordId));
    res.json(tasks);
  });

  app.post("/api/clearance-tasks", async (req, res) => {
    const { exitRecordId, department, taskName } = req.body;
    const task = await storage.createClearanceTask({ exitRecordId, department, taskName, status: "pending" });
    res.status(201).json(task);
  });

  app.patch("/api/clearance-tasks/:id", async (req, res) => {
    const { status, remarks } = req.body;
    const updates: any = { status };
    if (remarks !== undefined) updates.remarks = remarks;
    if (status === "completed") {
      updates.completedAt = new Date();
    } else {
      updates.completedAt = null;
    }
    const task = await storage.updateClearanceTask(Number(req.params.id), updates);
    res.json(task);
  });

  app.delete("/api/clearance-tasks/:id", async (req, res) => {
    await storage.deleteClearanceTask(Number(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/exit-records/:id/interview", async (req, res) => {
    const { exitInterviewDone, exitInterviewNotes } = req.body;
    const record = await storage.updateExitRecord(Number(req.params.id), {
      exitInterviewDone,
      exitInterviewNotes,
    });
    res.json(record);
  });

  app.patch("/api/exit-records/:id/fnf", async (req, res) => {
    const { fnfStatus, fnfAmount } = req.body;
    const updates: any = {};
    if (fnfStatus !== undefined) updates.fnfStatus = fnfStatus;
    if (fnfAmount !== undefined) updates.fnfAmount = fnfAmount;
    const record = await storage.updateExitRecord(Number(req.params.id), updates);
    res.json(record);
  });

  // Announcements
  app.get(api.announcements.list.path, async (req, res) => {
    const list = await storage.getAnnouncements();
    res.json(list);
  });

  app.post(api.announcements.create.path, async (req, res) => {
    const input = api.announcements.create.input.parse(req.body);
    const announcement = await storage.createAnnouncement({ ...input, publishedAt: new Date() });
    res.status(201).json(announcement);

    // Fire-and-forget: broadcast announcement to all active employees
    try {
      const allEmps = await storage.getEmployees();
      const activeEmps = allEmps.filter((e: any) => e.status === 'active' && e.email);
      for (const emp of activeEmps) {
        sendAnnouncementEmail(emp.email!, input.title, input.content || '', input.priority).catch(() => {});
      }
      console.log(`Announcement email sent to ${activeEmps.length} employees`);
    } catch (e) { console.error("Announcement broadcast error:", e); }
  });

  // Onboarding
  app.get(api.onboarding.list.path, async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const tasks = await storage.getOnboardingTasks(employeeId);
    res.json(tasks);
  });

  app.post("/api/onboarding", async (req, res) => {
    try {
      const { employeeId, taskName, category, status, dueDate, assignedTo } = req.body;
      if (!employeeId || !taskName) {
        return res.status(400).json({ message: "employeeId and taskName are required" });
      }
      const task = await storage.createOnboardingTask({
        employeeId,
        taskName,
        category: category || "general",
        status: status || "pending",
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
      });
      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/onboarding/:id", async (req, res) => {
    try {
      await storage.deleteOnboardingTask(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch(api.onboarding.updateStatus.path, async (req, res) => {
    const { status } = api.onboarding.updateStatus.input.parse(req.body);
    const task = await storage.updateOnboardingTaskStatus(Number(req.params.id), status);
    res.json(task);
  });

  // Onboarding Tokens - Generate signup link for new employee
  app.post("/api/onboarding/generate-token", async (req, res) => {
    const { employeeId, sendEmail } = req.body;
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    const onboardingToken = await storage.createOnboardingToken({
      employeeId,
      token,
      email: employee.email,
      expiresAt,
      status: "pending"
    });

    // Update employee onboarding status to invited
    await storage.updateEmployee(employeeId, { onboardingStatus: "invited" });

    const signupUrl = `${req.protocol}://${req.get('host')}/onboarding-signup/${token}`;
    
    let emailSent = false;
    if (sendEmail !== false) {
      emailSent = await sendOnboardingEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        signupUrl,
        employee.designation || "Team Member",
        format(new Date(employee.joinDate), "MMMM dd, yyyy")
      );
    }

    res.json({ 
      token: onboardingToken, 
      signupUrl,
      emailSent,
      message: emailSent ? "Email sent successfully" : "Link generated (email not configured)"
    });
  });

  // Public endpoint - Validate onboarding token (no auth required)
  app.get("/api/public/onboarding/:token", async (req, res) => {
    const { token } = req.params;
    const tokenData = await storage.getOnboardingToken(token);
    
    if (!tokenData) return res.status(404).json({ message: "Invalid token" });
    if (tokenData.status === 'used') return res.status(400).json({ message: "Token already used" });
    if (new Date() > new Date(tokenData.expiresAt)) {
      return res.status(400).json({ message: "Token expired" });
    }

    const employee = await storage.getEmployee(tokenData.employeeId);
    res.json({ 
      employee: {
        id: employee?.id,
        firstName: employee?.firstName,
        lastName: employee?.lastName,
        email: employee?.email,
        designation: employee?.designation,
        joinDate: employee?.joinDate,
        phone: employee?.phone,
        dateOfBirth: employee?.dateOfBirth,
        address: employee?.address,
        emergencyContactName: employee?.emergencyContactName,
        emergencyContactPhone: employee?.emergencyContactPhone,
        bankAccountNumber: employee?.bankAccountNumber,
        ifscCode: employee?.ifscCode,
        panNumber: employee?.panNumber,
        aadharNumber: employee?.aadharNumber,
      },
      tokenData 
    });
  });

  // Public endpoint - Complete onboarding signup (no auth required)
  app.post("/api/public/onboarding/:token/complete", async (req, res) => {
    try {
      const { token } = req.params;
      const tokenData = await storage.getOnboardingToken(token);
      
      if (!tokenData) return res.status(404).json({ message: "Invalid token" });
      if (tokenData.status === 'used') return res.status(400).json({ message: "Token already used" });
      if (new Date() > new Date(tokenData.expiresAt)) {
        return res.status(400).json({ message: "Token has expired. Please contact HR for a new onboarding link." });
      }
      
      const { password, phone, address, emergencyContactName, emergencyContactPhone, dateOfBirth, bankAccountNumber, ifscCode, panNumber, aadharNumber } = req.body;

      // Validate password
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Get employee to get email
      const employee = await storage.getEmployee(tokenData.employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      // Hash password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if user account already exists
      const existingUser = await authStorage.getUserByEmail(employee.email);
      let user;
      
      if (existingUser) {
        // If user exists but has no password, update with password
        if (!existingUser.password) {
          await authStorage.updateUserPassword(existingUser.id, hashedPassword);
        }
        // Use existing user (password already set or just updated)
        user = existingUser;
      } else {
        // Create new user account
        user = await authStorage.createUser({
          email: employee.email,
          password: hashedPassword,
        });
      }

      // Link user to employee and update onboarding status with all submitted data
      await storage.updateEmployee(tokenData.employeeId, {
        authUserId: user.id,
        phone,
        address,
        emergencyContactName,
        emergencyContactPhone,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        bankAccountNumber,
        ifscCode,
        panNumber,
        aadharNumber,
        onboardingStatus: "completed"
      });

      // Mark token as used
      await storage.markTokenUsed(token);

      // Sync onboarding documents to main documents table (with de-duplication)
      try {
        const onboardingDocs = await storage.getOnboardingDocuments(tokenData.employeeId);
        const existingDocs = await storage.getDocuments(tokenData.employeeId);
        for (const oDoc of onboardingDocs) {
          const alreadyExists = existingDocs.some(d =>
            d.employeeId === oDoc.employeeId &&
            d.documentType === oDoc.documentType &&
            d.documentName === (oDoc.documentName || oDoc.fileName)
          );
          if (!alreadyExists) {
            await storage.createDocument({
              employeeId: tokenData.employeeId,
              documentType: oDoc.documentType,
              documentName: oDoc.documentName || oDoc.fileName || oDoc.documentType,
              filePath: oDoc.fileName,
              fileData: oDoc.fileData,
              fileSize: oDoc.fileSize,
              mimeType: oDoc.mimeType,
              status: oDoc.status || "pending",
            });
          }
        }
      } catch (syncErr) {
        console.error("Error syncing onboarding docs to documents table:", syncErr);
      }

      res.json({ success: true, message: "Onboarding completed successfully. You can now login with your email and password." });

      // Fire-and-forget: send welcome email on successful onboarding completion
      try {
        const completedEmp = await storage.getEmployee(tokenData.employeeId);
        if (completedEmp?.email) {
          const empName = `${completedEmp.firstName} ${completedEmp.lastName || ''}`.trim();
          sendNewEmployeeWelcomeEmail(
            completedEmp.email, empName,
            completedEmp.designation || '', completedEmp.department || '',
            completedEmp.joinDate ? format(new Date(completedEmp.joinDate + "T00:00:00"), 'MMMM dd, yyyy') : ''
          ).catch(() => {});
        }
      } catch (e) { console.error("Welcome email error:", e); }
    } catch (error: any) {
      console.error("Onboarding complete error:", error);
      res.status(500).json({ message: error.message || "Failed to complete onboarding" });
    }
  });

  // Public endpoint - Upload document during onboarding (no auth required)
  app.post("/api/public/onboarding/:token/upload", upload.single('file'), async (req, res) => {
    console.log('Upload request received for token:', req.params.token);
    console.log('File received:', req.file ? req.file.originalname : 'No file');
    console.log('Document type:', req.body?.documentType);
    
    try {
      const { token } = req.params;
      const tokenData = await storage.getOnboardingToken(token);
      
      if (!tokenData) return res.status(404).json({ message: "Invalid token" });
      if (tokenData.status === 'used') return res.status(400).json({ message: "Token already used" });
      if (new Date() > new Date(tokenData.expiresAt)) {
        return res.status(400).json({ message: "Token expired" });
      }

      const documentType = req.body.documentType;
      const file = req.file;

      if (!documentType) {
        return res.status(400).json({ message: "Document type is required" });
      }

      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }

      const fileName = file.originalname;
      const fileData = file.buffer.toString('base64');

      // Store document record in database with file data
      await storage.createOnboardingDocument({
        employeeId: tokenData.employeeId,
        documentType: documentType,
        documentName: fileName,
        fileName: fileName,
        fileData: fileData,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'pending',
      });

      res.json({ 
        success: true, 
        message: "Document uploaded successfully",
        fileName: fileName
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to process upload" });
    }
  });

  // Offer Letters
  app.get("/api/offer-letters", async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const letters = await storage.getOfferLetters(employeeId);
    res.json(letters);
  });

  app.post("/api/offer-letters", async (req, res) => {
    const letter = await storage.createOfferLetter(req.body);
    res.status(201).json(letter);
  });

  app.post("/api/offer-letters/:id/send", async (req, res) => {
    const { employeeId } = req.body;
    
    // Generate onboarding token when sending offer letter
    const employee = await storage.getEmployee(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    await storage.createOnboardingToken({
      employeeId,
      token,
      email: employee.email,
      expiresAt,
      status: "pending"
    });

    const letter = await storage.updateOfferLetterStatus(Number(req.params.id), 'sent');
    const signupUrl = `${req.protocol}://${req.get('host')}/onboarding-signup/${token}`;
    
    res.json({ letter, signupUrl, message: `Offer letter sent. Onboarding URL: ${signupUrl}` });
  });

  // Projects
  app.get("/api/projects", async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/analytics", async (req, res) => {
    const projects = await storage.getProjects();
    const employees = await storage.getEmployees();
    
    const analytics = projects.map(project => {
      const projectEmployees = employees.filter(e => e.projectId === project.id);
      const totalSalary = projectEmployees.reduce((sum, e) => sum + (parseFloat(e.ctc || "0")), 0);
      
      return {
        projectId: project.id,
        projectCode: project.projectCode,
        projectName: project.name,
        budget: parseFloat(project.budget || "0"),
        revenue: parseFloat(project.revenue || "0"),
        employeeCount: projectEmployees.length,
        totalSalary
      };
    });
    
    res.json(analytics);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const existing = await storage.getProject(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Project not found" });
      
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(Number(req.params.id), validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const existing = await storage.getProject(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Project not found" });
    
    await storage.deleteProject(Number(req.params.id));
    res.status(204).send();
  });

  // Letter Templates Routes
  app.get("/api/letter-templates", async (req, res) => {
    const templates = await storage.getLetterTemplates();
    res.json(templates);
  });

  app.get("/api/letter-templates/:id", async (req, res) => {
    const template = await storage.getLetterTemplate(Number(req.params.id));
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  app.post("/api/letter-templates", async (req, res) => {
    try {
      const template = await storage.createLetterTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/letter-templates/:id", async (req, res) => {
    try {
      const existing = await storage.getLetterTemplate(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Template not found" });
      const template = await storage.updateLetterTemplate(Number(req.params.id), req.body);
      res.json(template);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/letter-templates/:id", async (req, res) => {
    const existing = await storage.getLetterTemplate(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Template not found" });
    await storage.deleteLetterTemplate(Number(req.params.id));
    res.status(204).send();
  });

  // Generated Letters Routes
  app.get("/api/generated-letters", async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const letters = await storage.getGeneratedLetters(employeeId);
    res.json(letters);
  });

  app.post("/api/generated-letters", async (req, res) => {
    try {
      const letter = await storage.createGeneratedLetter(req.body);
      res.status(201).json(letter);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create generated letter" });
    }
  });

  app.patch("/api/generated-letters/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const letter = await storage.updateGeneratedLetterStatus(Number(req.params.id), status);
      res.json(letter);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update letter status" });
    }
  });

  app.patch("/api/generated-letters/:id/approve", async (req, res) => {
    try {
      const letterId = Number(req.params.id);
      const { approvedBy } = req.body;
      const result = await pool.query(
        `UPDATE generated_letters SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), status = 'approved' WHERE id = $2 RETURNING *`,
        [approvedBy || null, letterId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Letter not found" });
      const letter = result.rows[0];

      try {
        const emp = await storage.getEmployee(letter.employee_id);
        if (emp) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          await storage.createNotification({
            employeeId: emp.id,
            title: `${letter.letter_type || 'Letter'} Approved`,
            message: `Your ${letter.letter_type || 'letter'} has been approved.`,
            type: 'letter_approval',
          });
          if (emp.email) {
            sendNotificationEmail(
              emp.email,
              `${letter.letter_type || 'Letter'} Approved - FCT Energy`,
              'Letter Approved',
              `<p>Dear ${empName},</p><p>Your <strong>${letter.letter_type || 'letter'}</strong> has been <span style="color:green;font-weight:bold;">approved</span>.</p><p>You can view it from the HRMS portal.</p>`
            ).catch(() => {});
          }
        }
      } catch (e) { console.error("Letter approval notification error:", e); }

      res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ message: "Failed to approve letter" });
    }
  });

  app.patch("/api/generated-letters/:id/reject", async (req, res) => {
    try {
      const letterId = Number(req.params.id);
      const { rejectedBy, rejectionReason } = req.body;
      const result = await pool.query(
        `UPDATE generated_letters SET approval_status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2, status = 'rejected' WHERE id = $3 RETURNING *`,
        [rejectedBy || null, rejectionReason || '', letterId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Letter not found" });
      const letter = result.rows[0];

      try {
        const emp = await storage.getEmployee(letter.employee_id);
        if (emp) {
          const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();
          await storage.createNotification({
            employeeId: emp.id,
            title: `${letter.letter_type || 'Letter'} Rejected`,
            message: `Your ${letter.letter_type || 'letter'} has been rejected. Reason: ${rejectionReason || 'Not specified'}`,
            type: 'letter_rejection',
          });
          if (emp.email) {
            sendNotificationEmail(
              emp.email,
              `${letter.letter_type || 'Letter'} Rejected - FCT Energy`,
              'Letter Rejected',
              `<p>Dear ${empName},</p><p>Your <strong>${letter.letter_type || 'letter'}</strong> has been <span style="color:red;font-weight:bold;">rejected</span>.</p><p><strong>Reason:</strong> ${rejectionReason || 'Not specified'}</p><p>Please contact HR for more details.</p>`
            ).catch(() => {});
          }
        }
      } catch (e) { console.error("Letter rejection notification error:", e); }

      res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ message: "Failed to reject letter" });
    }
  });

  app.get("/api/letter-response/:token/:action", async (req, res) => {
    try {
      const { token, action } = req.params;
      if (!token || !['accept', 'deny'].includes(action)) {
        return res.status(400).send(letterResponsePage('Invalid Request', 'The link you followed is invalid.', 'error'));
      }

      const result = await pool.query(`SELECT * FROM generated_letters WHERE response_token = $1`, [token]);
      if (result.rows.length === 0) {
        return res.send(letterResponsePage('Link Expired', 'This response link has already been used or is invalid.', 'error'));
      }

      const letter = result.rows[0];
      if (letter.approval_status !== 'pending') {
        const statusText = letter.approval_status === 'approved' ? 'accepted' : 'denied';
        return res.send(letterResponsePage('Already Responded', `This letter has already been ${statusText}.`, 'info'));
      }

      if (action === 'deny') {
        return res.send(letterDenyPage(token));
      }

      await pool.query(
        `UPDATE generated_letters SET approval_status = 'approved', approved_at = NOW(), response_token = NULL WHERE response_token = $1`,
        [token]
      );

      try {
        const emp = await storage.getEmployee(letter.employee_id);
        if (emp) {
          await storage.createNotification({
            employeeId: emp.id,
            title: `${letter.letter_type || 'Letter'} Accepted`,
            message: `You have accepted your ${letter.letter_type || 'letter'}.`,
            type: 'letter_approval',
          });
        }
      } catch (e) { console.error("Letter accept notification error:", e); }

      return res.send(letterResponsePage('Letter Accepted', 'You have successfully accepted the letter. Thank you!', 'success'));
    } catch (error) {
      console.error("Letter response error:", error);
      return res.status(500).send(letterResponsePage('Error', 'Something went wrong. Please try again later.', 'error'));
    }
  });

  app.post("/api/letter-response/:token/deny", async (req, res) => {
    try {
      const { token } = req.params;
      const reason = req.body.reason || '';

      const result = await pool.query(`SELECT * FROM generated_letters WHERE response_token = $1`, [token]);
      if (result.rows.length === 0) {
        return res.send(letterResponsePage('Link Expired', 'This response link has already been used or is invalid.', 'error'));
      }

      const letter = result.rows[0];
      if (letter.approval_status !== 'pending') {
        return res.send(letterResponsePage('Already Responded', 'This letter has already been responded to.', 'info'));
      }

      await pool.query(
        `UPDATE generated_letters SET approval_status = 'rejected', approved_at = NOW(), rejection_reason = $1, response_token = NULL WHERE response_token = $2`,
        [reason, token]
      );

      try {
        const emp = await storage.getEmployee(letter.employee_id);
        if (emp) {
          await storage.createNotification({
            employeeId: emp.id,
            title: `${letter.letter_type || 'Letter'} Denied`,
            message: `You have denied your ${letter.letter_type || 'letter'}. Reason: ${reason || 'No reason provided'}`,
            type: 'letter_approval',
          });
        }
      } catch (e) { console.error("Letter deny notification error:", e); }

      return res.send(letterResponsePage('Letter Denied', 'You have denied the letter. Your response has been recorded.', 'warning'));
    } catch (error) {
      console.error("Letter deny error:", error);
      return res.status(500).send(letterResponsePage('Error', 'Something went wrong. Please try again later.', 'error'));
    }
  });

  app.post("/api/letter-templates/seed-defaults", async (req, res) => {
    try {
      const existing = await storage.getLetterTemplates();
      const existingTypes = existing.map(t => t.type);

      const defaultTemplates = [
        {
          name: "Offer Letter",
          type: "offer",
          subject: "Employment Offer with {{entity}}",
          content: `{{entity}}/ Offer/{{employee_name}}/{{year}}                                                          {{current_date}}


To,

{{employee_name}}
{{address}}


EMPLOYMENT OFFER WITH {{entity}}

Dear {{employee_name}},

With reference to our interactions recently we are pleased to offer you employment with {{entity}} on the following terms and conditions:


Designation              :          {{designation}}

Date of Joining         :          {{join_date}}

Reporting To            :          {{reporting_manager}} {{reporting_manager_designation}}

Remuneration         :          As discussed below


You will be paid an annual fixed component of Rs {{fixed_salary_annual}} /- (Rs {{ctc_words}}),

Your overall CTC* shall be up to Rs {{ctc}} /- (Rs {{ctc_words}}).


*High Altitude Area Allowance will be paid additionally as per Company policy if deployed in such locations.


PF and necessary deductions as per statutory norms will be applicable. 60% of Health and Accidental insurance premium is paid by the company. The balance of 40% will be divided into monthly deductions from your salary. You will abide by all the rules and regulations of the organization.

A detailed Appointment Letter will be issued to you on the day of joining. Request you to bring all your original documents and submit a set of photocopies of all your credential certificates, experience & relieving letters, offer and detailed appointment letters, pay slip of last employer, address proof, copy of PAN card and six passport-size photographs.


Regards



Authorised Signatory`,
          status: "active",
          placeholders: JSON.stringify(["employee_name", "address", "designation", "join_date", "reporting_manager", "reporting_manager_designation", "fixed_salary_annual", "ctc", "ctc_words", "entity", "year", "current_date"])
        },
        {
          name: "Appointment Letter",
          type: "appointment",
          subject: "Letter of Appointment - {{entity}}",
          content: `Ref: {{entity}}/EMP/{{employee_code}}/{{join_year}}                                                          {{current_date}}


To,

{{employee_name}}
{{address}}


LETTER OF APPOINTMENT

Dear {{employee_name}},

With pleasure, we offer you a position as {{designation}} with {{entity}} (hereinafter referred to as "Company") at {{location}}.

This "offer" is conditional on the acceptance of your above-mentioned position with {{entity}} as well as the terms and conditions of your assignment as set forth below that are incorporated by reference "offer".


GENERAL TERMS AND CONDITIONS

Service Rules
You will be governed by the rules, regulations and other Company policies (together the "Company Policy") of {{entity}} as applicable, enforced, amended or altered from time to time during the course of your employment.

Commencement
Subject to your accepting this appointment letter and reporting on {{join_date}}, your appointment is effective from the date of joining. You are required to report to our office in {{location}}. As a member of an organization that practices flexibility and continuous improvement in work processes and practices, your roles and responsibilities may vary.

Employment Particulars
Your appointment will be subject to the verification of your credentials, testimonials and other particulars mentioned by you in your application at the time of your appointment. If the particulars given by you are in any way found to be inaccurate or misleading, your employment and your services can be terminated.

Work Hours
Presently, the normal working hours are between 9:30 am to 6:30 pm, Monday to Saturday with a 30-minute lunch break and two 15-minute breaks. All Sundays, the Second and Fourth Saturdays of the month shall be observed as a holiday.

Probation
You will be on probation for a period of six months and may be confirmed as a permanent employee upon successful completion of your probation from the date of employment in the company. The period of probation can be extended for a further period at the sole discretion of the company. Any absence during probation will push the confirmation date accordingly.

During the probationary period, or any extension thereof, your employment may be terminated without notice without assigning any reasons. No compensation shall be payable by the Company.

Reporting
You will be reporting to the {{reporting_manager}} {{reporting_manager_designation}} in {{entity}} at the time of joining. However, your services are transferable and can be seconded or deputed by the Company to any of the {{entity}} operations or operations of the Company or associate Companies in India or abroad. {{entity}} further reserves the right to transfer your employment to any other Company or legal entity, as part of any transfer of undertaking of {{entity}} or as part of any restructuring or amalgamation or such other plan implemented by {{entity}} or by which Company is bound. In view of this, your reporting channel is liable to change.

Service Obligation
Duties. During your employment with the Company, you will be required to devote your entire time and attention to your duties and not engage in any other trade, business, or occupation.

Transfer. You can be transferred to any of our units/departments or affiliate entities situated anywhere in India or abroad. On such transfer, compensation applicable to the specific location/unit/department or affiliate entity will be payable to you. You will be entitled to relocation benefits as per the management decision, in such case failure to relocate due to any personal reason can lead to termination of employment.

While in the employment of {{entity}}, you shall
(a) use your best endeavor to promote the business interests and welfare of the Company;
(b) devote your full time, attention and abilities during hours of work to the affairs of the Company; and
(c) not directly or indirectly engage or be interested in the engagement, practice of any business, profession or vocation, including any activity that competes with the activities of the Company or conflicts with your position in {{entity}}.

Training
During the course of your employment with Company, you may be required to undergo some training programs or engage in some process implementation or other skill enhancement activities in India or abroad. The Company will bear the costs and expenses in relation to such programs.

Dress Code
You are expected to dress in business attire, smart casual and/or uniform, based on the existing policy of the Company which may be revised from time to time.


REMUNERATION
Your overall CTC* (Cost to Company) will be Rs {{ctc}}/- (Rs {{ctc_words}}) as given at Appendix 'A' and will be subject to deduction of tax at source as per law. All monies due will be paid monthly in arrears, direct into your Bank account on the last working day of the month.

*NOTE: High Altitude Area allowance will be paid additionally as per Company policy if deployed in such locations.

The Company assumes no responsibility for your personal tax affairs, and your tax liability in respect of your remuneration is entirely your responsibility.

{{entity}} reserves the right to deduct from your remuneration from time to time during the continuance of your employment any sums due from you to the Company.


Benefits
Leave and Holidays: You will be eligible for leave and holidays as per leave policy.
Group Health Insurance: You will be entitled to the company-provided medical insurance based on the Company's current medical insurance scheme.
Personal Accident/Term Insurance: You will be entitled to company-provided personal accident insurance and other insurance based on the Company's current insurance scheme.
Provident Fund: You are eligible for Provident Fund and Gratuity upon your employment commencement.
Gratuity: You will be eligible to receive Gratuity in accordance with the Payment of Gratuity Act, 1972.
Maternity Benefits: You shall be entitled to the benefits available under the Maternity Amendment Act 2017, if applicable.
Paternity Benefits: You shall be entitled to 4 working days of leaves as per the Maternity and Paternity Policy of the organization, if applicable.


EMPLOYMENT TERMINATION TERMS
Notice Period: This employment may be terminated by either party at any time by giving a notice period as stated below.

Employee Initiated Separation/Resignation: The company reserves the right to curtail the notice period at its sole discretion.
Termination Without Cause (Probation): One month notice period.
Termination Without Cause (Confirmed): Three months notice period.
Termination With Cause: Immediate termination without any notice pay/period.

Retirement: You will retire from the services of the Company on completion of the age of 60 years.


MISCELLANEOUS ISSUES
All information concerning the business, practices or finances of the Company shall be considered as strictly confidential.

We take this opportunity to congratulate you on your selection and look forward to a long and mutually beneficial association.

Please indicate that you have understood and agree with our conditions by signing a copy of this letter.


Yours sincerely,



Authorised Signatory
{{entity}}


Statement of Acceptance

I, {{employee_name}}, fully understand and accept the terms and conditions as stated in this letter.


Signature:                                          Date:


─────────────────────────────────────────────────────────────────

APPENDIX 'A'
(Refers to {{entity}} appointment letter No {{entity}}/EMP/{{employee_code}}/{{join_year}} Dated {{join_date}})

Name                    : {{employee_name}}
Date of Joining         : {{join_date}}
Location                : {{location}}
Role                    : {{designation}}
Reporting               : {{reporting_manager}} {{reporting_manager_designation}}

Fixed Components:
────────────────────────────────────────────────
Component               Monthly            Per Annum
────────────────────────────────────────────────
Basic                   {{basic_monthly}}          {{basic_annual}}
HRA                     {{hra_monthly}}          {{hra_annual}}
Conveyance              {{conveyance_monthly}}          {{conveyance_annual}}
DA                      {{da_monthly}}          {{da_annual}}
Communication           {{communication_monthly}}          {{communication_annual}}
Medical                 {{medical_monthly}}          {{medical_annual}}
────────────────────────────────────────────────
Total Fixed Salary      {{fixed_salary_monthly}}          {{fixed_salary_annual}}
────────────────────────────────────────────────

Total Gross Salary CTC Per Annum: Rs {{ctc}}/-

60% of the Health and Accidental insurance premium is paid by the company. The balance of 40% will be divided into monthly deductions from your salary.
PF and other deductions will be applicable.
High Altitude Area allowance will be paid additionally as per Company policy if deployed in such locations.`,
          status: "active",
          placeholders: JSON.stringify(["employee_name", "employee_code", "address", "designation", "join_date", "join_year", "location", "reporting_manager", "reporting_manager_designation", "ctc", "ctc_words", "basic_monthly", "basic_annual", "hra_monthly", "hra_annual", "conveyance_monthly", "conveyance_annual", "da_monthly", "da_annual", "communication_monthly", "communication_annual", "medical_monthly", "medical_annual", "fixed_salary_monthly", "fixed_salary_annual", "entity", "current_date"])
        },
        {
          name: "Confirmation of Employment",
          type: "confirmation",
          subject: "Confirmation of Employment - {{entity}}",
          content: `{{entity}}/Confirmation/{{employee_name}}/{{year}}                                                          {{current_date}}


To,

{{employee_name}}
{{employee_code}}


CONFIRMATION OF EMPLOYMENT

Dear {{employee_name}},

With reference to a review of your performance of work during the probation period commencing from {{join_date}} to {{probation_end_date}}, it gives me pleasure to apprise you that you have successfully completed the period of probation. As per the Company policy, your appointment as {{designation}} has been confirmed effective from {{probation_end_date}}.

The other terms and conditions mentioned in the appointment letter remain unchanged.

Please sign this letter in duplicate as a token of acceptance of the confirmation of employment and return one copy to Manager-HR, {{entity}}.

We look forward to your valuable contributions and wish you a satisfying and a rewarding tenure at {{entity}}.


With Best Wishes,



Authorised Signatory
{{entity}}`,
          status: "active",
          placeholders: JSON.stringify(["employee_name", "employee_code", "designation", "join_date", "probation_end_date", "entity", "year", "current_date"])
        },
        {
          name: "Experience Letter",
          type: "experience",
          subject: "Experience Letter - {{entity}}",
          content: `                                                                                                          {{current_date}}


To,

{{employee_name}}
{{address}}


Dear {{employee_name}},

Subject: Experience Letter

This communication serves as formal confirmation of your resignation from your position at {{entity}}, as submitted on {{resignation_date}}. After careful consideration, we have agreed to release you from your current role as {{designation}} with your final working day being {{last_working_day}}.

We would like to take this opportunity to thank you for your contributions to {{entity}} during your tenure from {{join_date}} to {{last_working_day}}. Your efforts have been highly valued, and we wish you all the success in your future endeavours.


Sincerely,



Authorised Signatory
{{entity}}`,
          status: "active",
          placeholders: JSON.stringify(["employee_name", "address", "designation", "join_date", "resignation_date", "last_working_day", "entity", "current_date"])
        }
      ];

      const created = [];
      for (const tmpl of defaultTemplates) {
        if (!existingTypes.includes(tmpl.type)) {
          const t = await storage.createLetterTemplate(tmpl);
          created.push(t);
        }
      }

      res.json({ message: `${created.length} templates seeded`, created });
    } catch (error) {
      console.error('Seed templates error:', error);
      res.status(500).json({ message: "Failed to seed templates" });
    }
  });

  // Generate letter from template
  app.post("/api/generate-letter/:templateId/:employeeId", async (req, res) => {
    try {
      const template = await storage.getLetterTemplate(Number(req.params.templateId));
      if (!template) return res.status(404).json({ message: "Template not found" });
      
      const employee = await storage.getEmployee(Number(req.params.employeeId));
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      
      const department = employee.departmentId ? await storage.getDepartment(employee.departmentId) : null;

      let reportingManager: any = null;
      if (employee.reportingManagerId) {
        const allEmps = await storage.getEmployees();
        reportingManager = allEmps.find((e: any) => e.employeeCode === employee.reportingManagerId || String(e.id) === String(employee.reportingManagerId));
      }

      let salaryStructure: any = null;
      if (employee.salaryStructureId) {
        salaryStructure = await storage.getSalaryStructure(employee.salaryStructureId);
      }

      const exitRecords = await storage.getExitRecords();
      const exitRecord = exitRecords.find(r => r.employeeId === employee.id);

      const ctcNum = employee.ctc ? Number(employee.ctc) : 0;
      const monthlyCtc = Math.round(ctcNum / 12);

      let basicAnnual = 0, hraAnnual = 0, convAnnual = 0, daAnnual = 0, commAnnual = 0, medAnnual = 0;
      if (salaryStructure && ctcNum > 0) {
        basicAnnual = Math.round(ctcNum * Number(salaryStructure.basicPercent) / 100);
        hraAnnual = Math.round(ctcNum * Number(salaryStructure.hraPercent) / 100);
        convAnnual = Math.round(ctcNum * Number(salaryStructure.conveyancePercent) / 100);
        daAnnual = Math.round(ctcNum * Number(salaryStructure.daPercent) / 100);
        commAnnual = Math.round(ctcNum * Number(salaryStructure.communicationPercent) / 100);
        medAnnual = Math.round(ctcNum * Number(salaryStructure.medicalPercent) / 100);
      }
      const fixedAnnual = basicAnnual + hraAnnual + convAnnual + daAnnual + commAnnual + medAnnual;

      function numberToWords(num: number): string {
        if (num === 0) return "Zero";
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
          'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
        if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
        return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
      }

      const rmName = reportingManager ? `${reportingManager.firstName} ${reportingManager.lastName || ''}`.trim() : '';
      const rmDesignation = reportingManager?.designation || '';
      const currentYear = new Date().getFullYear().toString();
      const joinYear = employee.joinDate ? new Date(employee.joinDate).getFullYear().toString() : currentYear;

      const probationEndDate = employee.probationEndDate
        ? format(new Date(employee.probationEndDate + "T00:00:00"), 'MMMM dd, yyyy')
        : (employee.joinDate
          ? format(new Date(new Date(employee.joinDate + "T00:00:00").setMonth(new Date(employee.joinDate + "T00:00:00").getMonth() + 6)), 'MMMM dd, yyyy')
          : '');
      
      let content = template.content;
      const currentDate = format(new Date(), 'MMMM dd, yyyy');

      if (!employee.employeeCode) {
        content = content.replace(/\s*Employee\s*Code\s*[:：]\s*\{\{employee_code\}\}\s*/gi, ' ');
        content = content.replace(/\s*Emp\.?\s*Code\s*[:：]\s*\{\{employee_code\}\}\s*/gi, ' ');
        content = content.replace(/\{\{employee_code\}\}/g, '');
      }
      
      const replacements: Record<string, string> = {
        '{{employee_name}}': `${employee.firstName} ${employee.lastName || ''}`.trim(),
        '{{first_name}}': employee.firstName,
        '{{last_name}}': employee.lastName || '',
        '{{employee_code}}': employee.employeeCode || '',
        '{{designation}}': employee.designation || '',
        '{{department}}': department?.name || '',
        '{{email}}': employee.email,
        '{{phone}}': employee.phone || '',
        '{{join_date}}': employee.joinDate ? format(new Date(employee.joinDate + "T00:00:00"), 'MMMM dd, yyyy') : '',
        '{{address}}': employee.address || '',
        '{{city}}': employee.city || '',
        '{{state}}': employee.state || '',
        '{{country}}': employee.country || '',
        '{{location}}': employee.location || employee.city || '',
        '{{current_date}}': currentDate,
        '{{company_name}}': 'FC TECNRGY PVT LTD',
        '{{entity}}': 'FC TECNRGY PVT LTD',
        '{{year}}': currentYear,
        '{{join_year}}': joinYear,
        '{{reporting_manager}}': rmName,
        '{{reporting_manager_designation}}': rmDesignation,
        '{{probation_end_date}}': probationEndDate,
        '{{confirmation_date}}': employee.confirmationDate ? format(new Date(employee.confirmationDate + "T00:00:00"), 'MMMM dd, yyyy') : probationEndDate,
        '{{ctc}}': ctcNum.toLocaleString('en-IN'),
        '{{ctc_words}}': numberToWords(ctcNum) + ' Only',
        '{{monthly_ctc}}': monthlyCtc.toLocaleString('en-IN'),
        '{{fixed_salary_annual}}': fixedAnnual.toLocaleString('en-IN'),
        '{{fixed_salary_monthly}}': Math.round(fixedAnnual / 12).toLocaleString('en-IN'),
        '{{basic_annual}}': basicAnnual.toLocaleString('en-IN'),
        '{{basic_monthly}}': Math.round(basicAnnual / 12).toLocaleString('en-IN'),
        '{{hra_annual}}': hraAnnual.toLocaleString('en-IN'),
        '{{hra_monthly}}': Math.round(hraAnnual / 12).toLocaleString('en-IN'),
        '{{conveyance_annual}}': convAnnual.toLocaleString('en-IN'),
        '{{conveyance_monthly}}': Math.round(convAnnual / 12).toLocaleString('en-IN'),
        '{{da_annual}}': daAnnual.toLocaleString('en-IN'),
        '{{da_monthly}}': Math.round(daAnnual / 12).toLocaleString('en-IN'),
        '{{communication_annual}}': commAnnual.toLocaleString('en-IN'),
        '{{communication_monthly}}': Math.round(commAnnual / 12).toLocaleString('en-IN'),
        '{{medical_annual}}': medAnnual.toLocaleString('en-IN'),
        '{{medical_monthly}}': Math.round(medAnnual / 12).toLocaleString('en-IN'),
        '{{resignation_date}}': exitRecord?.resignationDate ? format(new Date(exitRecord.resignationDate + "T00:00:00"), 'MMMM dd, yyyy') : '',
        '{{last_working_day}}': exitRecord?.lastWorkingDate ? format(new Date(exitRecord.lastWorkingDate + "T00:00:00"), 'MMMM dd, yyyy') : '',
        '{{notice_period}}': exitRecord?.noticePeriodDays?.toString() || '30',
        '{{exit_reason}}': exitRecord?.reason || '',
      };
      
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
      
      const generatedLetter = await storage.createGeneratedLetter({
        employeeId: employee.id,
        templateId: template.id,
        letterType: template.type,
        content,
        generatedBy: req.body.generatedBy,
        status: 'draft'
      });
      
      res.status(201).json(generatedLetter);

      try {
        if (employee.email) {
          const empName = `${employee.firstName} ${employee.lastName || ''}`.trim();
          const letterType = template.type || template.name || 'HR Letter';
          let acceptUrl: string | undefined;
          let denyUrl: string | undefined;

          if (template.type?.toLowerCase() === 'offer') {
            const responseToken = crypto.randomBytes(32).toString('hex');
            await pool.query(`UPDATE generated_letters SET response_token = $1 WHERE id = $2`, [responseToken, generatedLetter.id]);
            const baseUrl = process.env.PRODUCTION_URL || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : '');
            acceptUrl = `${baseUrl}/api/letter-response/${responseToken}/accept`;
            denyUrl = `${baseUrl}/api/letter-response/${responseToken}/deny`;
          }

          sendLetterEmail(employee.email, empName, letterType, content, acceptUrl, denyUrl).catch(() => {});
        }
      } catch (e) { console.error("Letter email notification error:", e); }
    } catch (error) {
      console.error('Letter generation error:', error);
      return res.status(500).json({ message: "Failed to generate letter" });
    }
  });

  // Onboarding Documents Routes
  app.get("/api/onboarding-documents", async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const documents = await storage.getOnboardingDocuments(employeeId);
    res.json(documents);
  });

  app.post("/api/onboarding-documents", async (req, res) => {
    try {
      const document = await storage.createOnboardingDocument(req.body);
      res.status(201).json(document);
    } catch (error) {
      return res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.patch("/api/onboarding-documents/:id/status", async (req, res) => {
    try {
      const { status, verifiedBy, remarks } = req.body;
      const document = await storage.updateOnboardingDocumentStatus(
        Number(req.params.id), 
        status, 
        verifiedBy, 
        remarks
      );
      res.json(document);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update document status" });
    }
  });

  app.delete("/api/onboarding-documents/:id", async (req, res) => {
    await storage.deleteOnboardingDocument(Number(req.params.id));
    res.status(204).send();
  });

  app.post("/api/onboarding-documents/sync-to-documents", async (req, res) => {
    try {
      const { employeeId } = req.body;
      const onboardingDocs = await storage.getOnboardingDocuments(employeeId);
      if (!onboardingDocs.length) {
        return res.json({ synced: 0, message: "No onboarding documents found" });
      }

      const existingDocs = await storage.getDocuments(employeeId);
      let synced = 0;

      for (const oDoc of onboardingDocs) {
        const alreadyExists = existingDocs.some(d =>
          d.employeeId === oDoc.employeeId &&
          d.documentType === oDoc.documentType &&
          d.documentName === (oDoc.documentName || oDoc.fileName)
        );
        if (!alreadyExists) {
          await storage.createDocument({
            employeeId: oDoc.employeeId,
            documentType: oDoc.documentType,
            documentName: oDoc.documentName || oDoc.fileName || oDoc.documentType,
            filePath: oDoc.fileName,
            fileData: oDoc.fileData,
            fileSize: oDoc.fileSize,
            mimeType: oDoc.mimeType,
            status: oDoc.status || "pending",
          });
          synced++;
        }
      }

      res.json({ synced, message: `${synced} documents synced to documents management` });
    } catch (error: any) {
      console.error("Error syncing onboarding docs:", error);
      res.status(500).json({ message: "Failed to sync documents" });
    }
  });

  // Tax Declarations
  app.get("/api/tax-declarations", async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const financialYear = req.query.financialYear as string | undefined;
    const declarations = await storage.getTaxDeclarations(employeeId, financialYear);
    res.json(declarations);
  });

  app.post("/api/tax-declarations", async (req, res) => {
    try {
      const { employeeId, financialYear, section, investmentType, amount, status, otherDetails } = req.body;
      if (!employeeId || !financialYear || !section || !investmentType || !amount) {
        return res.status(400).json({ message: "Missing required fields: employeeId, financialYear, section, investmentType, amount" });
      }
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a valid positive number" });
      }
      const declaration = await storage.createTaxDeclaration({
        employeeId: Number(employeeId),
        financialYear,
        section,
        investmentType,
        amount: parsedAmount.toString(),
        status: status || "pending",
        otherDetails: otherDetails || null,
      });
      res.status(201).json(declaration);
    } catch (error) {
      return res.status(500).json({ message: "Failed to submit tax declaration" });
    }
  });

  app.patch("/api/tax-declarations/:id/review", async (req, res) => {
    try {
      const { status, reviewedBy, reviewRemarks } = req.body;
      const declaration = await storage.updateTaxDeclarationStatus(
        Number(req.params.id),
        status,
        reviewedBy,
        reviewRemarks
      );
      res.json(declaration);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update declaration status" });
    }
  });

  app.post("/api/tax-declarations/unlock-regime/:employeeId", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team", "finance_team"]);
      if (!authorized) {
        return res.status(403).json({ message: "Access denied. Only payroll/finance team can unlock tax regime." });
      }
      const employeeId = Number(req.params.employeeId);
      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      await storage.updateEmployee(employeeId, { taxRegime: null });
      const empDeclarations = await storage.getTaxDeclarations(employeeId);
      for (const dec of empDeclarations) {
        if (dec.status === "submitted" || dec.status === "approved") {
          await storage.updateTaxDeclarationStatus(dec.id, "pending", undefined, "Regime unlocked by payroll team");
        }
      }
      res.json({ message: "Tax regime unlocked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to unlock tax regime" });
    }
  });

  app.patch("/api/tax-declarations/:id", async (req, res) => {
    try {
      const { investmentType, amount, otherDetails, section } = req.body;
      const declaration = await storage.updateTaxDeclaration(Number(req.params.id), { investmentType, amount, otherDetails, section });
      res.json(declaration);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update declaration" });
    }
  });

  app.post("/api/tax-declarations/submit-to-finance", async (req, res) => {
    try {
      const { employeeId, financialYear } = req.body;
      await storage.submitDeclarationsToFinance(employeeId, financialYear);
      res.json({ message: "Declarations submitted to finance for review" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to submit declarations" });
    }
  });

  app.delete("/api/tax-declarations/:id", async (req, res) => {
    await storage.deleteTaxDeclaration(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/tax-declarations/payroll-deductions", async (req, res) => {
    try {
      const employeeId = Number(req.query.employeeId);
      const financialYear = (req.query.financialYear as string) || "2025-26";
      if (!employeeId) return res.status(400).json({ message: "employeeId is required" });

      const emp = await storage.getEmployee(employeeId);
      if (!emp) return res.status(404).json({ message: "Employee not found" });

      const [fyStartYear] = financialYear.split("-").map(Number);
      const fyMonths: { month: string; year: number }[] = [];
      for (let m = 4; m <= 12; m++) fyMonths.push({ month: String(m), year: fyStartYear });
      for (let m = 1; m <= 3; m++) fyMonths.push({ month: String(m), year: fyStartYear + 1 });

      const allPayroll = await storage.getPayroll(employeeId);
      const fyPayroll = allPayroll.filter(p => {
        const pMonth = parseInt(p.month);
        const pYear = p.year;
        const inFY = fyMonths.some(fm => parseInt(fm.month) === pMonth && fm.year === pYear);
        const validStatus = !p.status || p.status === "processed" || p.status === "approved" || p.status === "paid";
        return inFY && validStatus;
      });

      let totalEmployerNps = 0;

      let monthlyEpf = 0;
      let monthlyProfTax = 0;
      let monthlyEsi = 0;

      if (fyPayroll.length > 0) {
        const latestRecord = fyPayroll[fyPayroll.length - 1];
        monthlyEpf = 1800;
        monthlyProfTax = Number(latestRecord.professionalTax) || 0;
        monthlyEsi = Number(latestRecord.esi) || 0;
      } else {
        monthlyEpf = 1800;
      }

      const annualEpf = monthlyEpf * 12;
      const annualProfTax = monthlyProfTax * 12;
      const annualEsi = monthlyEsi * 12;

      const monthlyBreakdown: any[] = [];
      for (const record of fyPayroll) {
        monthlyBreakdown.push({
          month: record.month,
          year: record.year,
          epf: Number(record.epf) || 0,
          professionalTax: Number(record.professionalTax) || 0,
          esi: Number(record.esi) || 0,
        });
      }

      const deductions = [];

      if (annualEpf > 0) {
        deductions.push({
          id: `payroll-epf`,
          section: "80C",
          investmentType: "Employee PF Contribution (Annual Projection)",
          amount: annualEpf.toString(),
          status: "auto_captured",
          source: "salary_structure",
          monthlyAmount: monthlyEpf,
          monthsProcessed: 12,
        });
      }

      if (annualProfTax > 0) {
        deductions.push({
          id: `payroll-pt`,
          section: "16(iii)",
          investmentType: "Professional Tax (Annual Projection)",
          amount: annualProfTax.toString(),
          status: "auto_captured",
          source: "salary_structure",
          monthlyAmount: monthlyProfTax,
          monthsProcessed: 12,
        });
      }

      if (annualEsi > 0) {
        deductions.push({
          id: `payroll-esi`,
          section: "ESI",
          investmentType: "ESI Contribution (Annual Projection)",
          amount: annualEsi.toString(),
          status: "auto_captured",
          source: "salary_structure",
          monthlyAmount: monthlyEsi,
          monthsProcessed: 12,
          taxDeductible: false,
        });
      }

      res.json({
        employeeId,
        financialYear,
        deductions,
        monthlyBreakdown,
        totalEpf: annualEpf,
        totalProfTax: annualProfTax,
        totalEsi: annualEsi,
        totalEmployerNps,
        monthsProcessed: fyPayroll.length,
        projectionBasis: "annual",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch payroll deductions" });
    }
  });

  // SMTP / Email
  app.get("/api/smtp/verify", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const result = await verifySmtpConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/email/send-notification", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const { to, subject, heading, body } = req.body;
      if (!to || !subject || !heading || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, heading, body" });
      }
      const sent = await sendNotificationEmail(to, subject, heading, body);
      res.json({ success: sent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/email/send-payslip", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const { employeeId, month, year } = req.body;
      if (!employeeId || !month || !year) {
        return res.status(400).json({ error: "Missing required fields: employeeId, month, year" });
      }
      const employee = await storage.getEmployee(parseInt(employeeId));
      if (!employee || !employee.email) {
        return res.status(404).json({ error: "Employee not found or has no email" });
      }
      const payrollRecords = await storage.getPayroll(parseInt(employeeId), month);
      const record = payrollRecords.find(p => p.year === parseInt(year));
      if (!record) {
        return res.status(404).json({ error: "Payroll record not found" });
      }
      const earnings = record.earnings as any;
      const deductions = record.deductions as any;
      let payslipHtml = `<table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:14px;">`;
      payslipHtml += `<tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;border:1px solid #e5e7eb;">Earnings</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb;">Amount (₹)</th></tr>`;
      if (earnings && typeof earnings === "object") {
        for (const [key, val] of Object.entries(earnings)) {
          if (val && parseFloat(String(val)) > 0) {
            payslipHtml += `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${key}</td><td style="padding:6px 8px;text-align:right;border:1px solid #e5e7eb;">₹${parseFloat(String(val)).toLocaleString("en-IN")}</td></tr>`;
          }
        }
      }
      payslipHtml += `<tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;border:1px solid #e5e7eb;">Deductions</th><th style="padding:8px;text-align:right;border:1px solid #e5e7eb;">Amount (₹)</th></tr>`;
      if (deductions && typeof deductions === "object") {
        for (const [key, val] of Object.entries(deductions)) {
          if (val && parseFloat(String(val)) > 0) {
            payslipHtml += `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${key}</td><td style="padding:6px 8px;text-align:right;border:1px solid #e5e7eb;">₹${parseFloat(String(val)).toLocaleString("en-IN")}</td></tr>`;
          }
        }
      }
      payslipHtml += `<tr style="background:#16a34a;color:white;font-weight:bold;"><td style="padding:8px;border:1px solid #e5e7eb;">Net Pay</td><td style="padding:8px;text-align:right;border:1px solid #e5e7eb;">₹${parseFloat(record.netSalary || "0").toLocaleString("en-IN")}</td></tr>`;
      payslipHtml += `</table>`;

      const sent = await sendPayslipEmail(
        employee.email,
        `${employee.firstName} ${employee.lastName}`,
        month,
        parseInt(year),
        payslipHtml
      );
      res.json({ success: sent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Loans & Advances - Employee self-service endpoint (own loans only)
  app.get("/api/my-loans", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.json([]);
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.json([]);
      const loansData = await storage.getLoans(currentEmployee.id);
      res.json(loansData);
    } catch (err: any) {
      res.json([]);
    }
  });

  app.post("/api/my-loans", async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(404).json({ error: "Employee record not found for your email" });
      const data = req.body;
      const amount = parseFloat(data.amount);
      const repaymentMonths = parseInt(data.repaymentMonths);
      if (!amount || amount <= 0 || !repaymentMonths || repaymentMonths <= 0) {
        return res.status(400).json({ error: "Amount and repayment months must be positive numbers" });
      }
      if (repaymentMonths > 12) {
        return res.status(400).json({ error: "Maximum repayment term is 12 months" });
      }
      const existingLoans = await storage.getLoans(currentEmployee.id);
      const hasActiveLoan = existingLoans.some((l: any) => l.status === 'approved' || l.status === 'pending');
      if (hasActiveLoan) {
        return res.status(400).json({ error: "You already have an active or pending loan. Please wait until it is completed or closed before applying for a new one." });
      }
      const emiAmount = (amount / repaymentMonths).toFixed(2);
      const loan = await storage.createLoan({
        employeeId: currentEmployee.id,
        type: "loan",
        amount: String(amount),
        repaymentMonths,
        emiAmount: String(emiAmount),
        remainingBalance: String(amount),
        totalRepaid: "0",
        status: "pending",
        reason: data.reason || "",
      });
      res.json(loan);

      try {
        const empName = `${currentEmployee.firstName} ${currentEmployee.lastName || ''}`.trim();
        if (currentEmployee.reportingManagerId) {
          const allEmps = await storage.getEmployees();
          const rm = allEmps.find((e: any) => e.employeeCode === currentEmployee.reportingManagerId);
          if (rm?.email) {
            sendLoanRequestEmail(rm.email, empName, "loan", String(amount), repaymentMonths).catch(() => {});
          }
        }
      } catch (e) { console.error("Loan request notification error:", e); }
    } catch (err: any) {
      console.error("Error creating loan:", err.message, err.stack);
      res.status(500).json({ error: err.message || "Failed to create loan request" });
    }
  });

  // Loans & Advances - Admin/Payroll endpoints
  app.get("/api/loans", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const status = req.query.status as string | undefined;
      const loansData = await storage.getLoans(employeeId, status);
      res.json(loansData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/loans/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const loan = await storage.getLoan(parseInt(req.params.id));
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      res.json(loan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const data = req.body;
      const amount = parseFloat(data.amount);
      const repaymentMonths = parseInt(data.repaymentMonths);
      if (!amount || amount <= 0 || !repaymentMonths || repaymentMonths <= 0) {
        return res.status(400).json({ error: "Amount and repayment months must be positive numbers" });
      }
      if (repaymentMonths > 12) {
        return res.status(400).json({ error: "Maximum repayment term is 12 months" });
      }
      if (!data.employeeId) {
        return res.status(400).json({ error: "Employee is required" });
      }
      const existingLoans = await storage.getLoans(parseInt(data.employeeId));
      const hasActiveLoan = existingLoans.some((l: any) => l.status === 'approved' || l.status === 'pending');
      if (hasActiveLoan) {
        return res.status(400).json({ error: "Employee already has an active or pending loan. It must be completed or closed before a new one can be created." });
      }
      const emiAmount = (amount / repaymentMonths).toFixed(2);
      const loan = await storage.createLoan({
        employeeId: parseInt(data.employeeId),
        type: "loan",
        amount: String(amount),
        repaymentMonths,
        emiAmount,
        remainingBalance: String(amount),
        reason: data.reason || null,
        eligibilityMonths: data.eligibilityMonths ? parseInt(data.eligibilityMonths) : null,
        status: "pending",
      });
      res.json(loan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/loans/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const loan = await storage.updateLoan(parseInt(req.params.id), req.body);
      res.json(loan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/level1", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.status !== 'pending') return res.status(400).json({ error: "Loan is no longer pending" });
      if ((loan.level1Status || 'pending') !== 'pending') return res.status(400).json({ error: "Level 1 already actioned" });
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ error: "Employee record not found" });
      const loanEmployee = await storage.getEmployee(loan.employeeId);
      const isRM = loanEmployee?.reportingManagerId === currentEmployee.employeeCode;
      const isAdminOrHR = (currentEmployee.accessRole || '').split(',').map((r: string) => r.trim()).some((r: string) => ['admin', 'hr', 'hr_manager'].includes(r.toLowerCase()));
      if (!isRM && !isAdminOrHR) return res.status(403).json({ error: "Only the employee's Reporting Manager or Admin/HR can action Level 1" });
      const approverCode = currentEmployee.employeeCode || userEmail;
      const action = req.body.action;
      if (action === 'approve') {
        const updated = await storage.updateLoan(id, {
          level1Status: 'approved',
          level1ApprovedBy: approverCode,
          level1ApprovedAt: new Date(),
          level1Remarks: req.body.remarks || null,
        } as any);
        res.json(updated);
      } else if (action === 'reject') {
        const updated = await storage.updateLoan(id, {
          level1Status: 'rejected',
          level1ApprovedBy: approverCode,
          level1ApprovedAt: new Date(),
          level1Remarks: req.body.remarks || null,
          status: 'rejected',
          remarks: `Rejected by Reporting Manager: ${req.body.remarks || ''}`,
        } as any);
        res.json(updated);
        try {
          if (loanEmployee?.email) {
            const empName = `${loanEmployee.firstName} ${loanEmployee.lastName || ''}`.trim();
            sendLoanStatusEmail(loanEmployee.email, empName, 'rejected', 'loan', loan.amount).catch(() => {});
          }
        } catch (e) {}
      } else {
        return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/level2", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.status !== 'pending') return res.status(400).json({ error: "Loan is no longer pending" });
      if (loan.level1Status !== 'approved') return res.status(400).json({ error: "Level 1 (Reporting Manager) approval is required first" });
      if ((loan.level2Status || 'pending') !== 'pending') return res.status(400).json({ error: "Level 2 already actioned" });
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      if (!userEmail) return res.status(401).json({ error: "Not authenticated" });
      const currentEmployee = await storage.getEmployeeByEmail(userEmail);
      if (!currentEmployee) return res.status(403).json({ error: "Employee record not found" });
      const loanEmployee = await storage.getEmployee(loan.employeeId);
      const isHOD = loanEmployee?.hodId === currentEmployee.employeeCode;
      const isAdminOrHR = (currentEmployee.accessRole || '').split(',').map((r: string) => r.trim()).some((r: string) => ['admin', 'hr', 'hr_manager'].includes(r.toLowerCase()));
      if (!isHOD && !isAdminOrHR) return res.status(403).json({ error: "Only the VP/HOD or Admin/HR can action Level 2" });
      const approverCode = currentEmployee.employeeCode || userEmail;
      const action = req.body.action;
      if (action === 'approve') {
        const updated = await storage.updateLoan(id, {
          level2Status: 'approved',
          level2ApprovedBy: approverCode,
          level2ApprovedAt: new Date(),
          level2Remarks: req.body.remarks || null,
        } as any);
        res.json(updated);
      } else if (action === 'reject') {
        const updated = await storage.updateLoan(id, {
          level2Status: 'rejected',
          level2ApprovedBy: approverCode,
          level2ApprovedAt: new Date(),
          level2Remarks: req.body.remarks || null,
          status: 'rejected',
          remarks: `Rejected by VP: ${req.body.remarks || ''}`,
        } as any);
        res.json(updated);
        try {
          if (loanEmployee?.email) {
            const empName = `${loanEmployee.firstName} ${loanEmployee.lastName || ''}`.trim();
            sendLoanStatusEmail(loanEmployee.email, empName, 'rejected', 'loan', loan.amount).catch(() => {});
          }
        } catch (e) {}
      } else {
        return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/level3", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.status !== 'pending') return res.status(400).json({ error: "Loan is no longer pending" });
      if (loan.level1Status !== 'approved') return res.status(400).json({ error: "Level 1 (Reporting Manager) approval is required first" });
      if (loan.level2Status !== 'approved') return res.status(400).json({ error: "Level 2 (VP) approval is required first" });
      if ((loan.level3Status || 'pending') !== 'pending') return res.status(400).json({ error: "Level 3 already actioned" });
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Only Finance/Payroll team can action Level 3" });
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      const currentEmployee = userEmail ? await storage.getEmployeeByEmail(userEmail) : null;
      const approverCode = currentEmployee?.employeeCode || userEmail || 'unknown';
      const action = req.body.action;
      if (action === 'approve') {
        const amount = parseFloat(loan.amount);
        const repaymentMonths = loan.repaymentMonths;
        const emiAmount = (amount / repaymentMonths).toFixed(2);
        const startDate = new Date();
        const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 2).padStart(2, '0')}`;
        const updated = await storage.updateLoan(id, {
          level3Status: 'approved',
          level3ApprovedBy: approverCode,
          level3ApprovedAt: new Date(),
          level3Remarks: req.body.remarks || null,
          status: 'approved',
          approvedBy: currentEmployee?.id || null,
          approvedAt: new Date(),
          emiAmount,
          remainingBalance: loan.amount,
          startDate: startMonth,
          remarks: req.body.remarks || null,
        } as any);
        res.json(updated);
        try {
          const loanEmp = await storage.getEmployee(loan.employeeId);
          if (loanEmp?.email) {
            const empName = `${loanEmp.firstName} ${loanEmp.lastName || ''}`.trim();
            sendLoanStatusEmail(loanEmp.email, empName, 'approved', 'loan', loan.amount).catch(() => {});
          }
        } catch (e) {}
      } else if (action === 'reject') {
        const updated = await storage.updateLoan(id, {
          level3Status: 'rejected',
          level3ApprovedBy: approverCode,
          level3ApprovedAt: new Date(),
          level3Remarks: req.body.remarks || null,
          status: 'rejected',
          remarks: `Rejected by Finance: ${req.body.remarks || ''}`,
        } as any);
        res.json(updated);
        try {
          const loanEmp = await storage.getEmployee(loan.employeeId);
          if (loanEmp?.email) {
            const empName = `${loanEmp.firstName} ${loanEmp.lastName || ''}`.trim();
            sendLoanStatusEmail(loanEmp.email, empName, 'rejected', 'loan', loan.amount).catch(() => {});
          }
        } catch (e) {}
      } else {
        return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/approve", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      const amount = parseFloat(loan.amount);
      const repaymentMonths = loan.repaymentMonths;
      const emiAmount = (amount / repaymentMonths).toFixed(2);
      const startDate = new Date();
      const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 2).padStart(2, '0')}`;
      const updated = await storage.updateLoan(id, {
        status: "approved",
        approvedBy: req.body.approvedBy,
        approvedAt: new Date(),
        emiAmount,
        remainingBalance: loan.amount,
        startDate: startMonth,
        remarks: req.body.remarks,
        level1Status: 'approved',
        level2Status: 'approved',
        level3Status: 'approved',
      } as any);
      res.json(updated);
      try {
        const loanEmp = await storage.getEmployee(loan.employeeId);
        if (loanEmp?.email) {
          const empName = `${loanEmp.firstName} ${loanEmp.lastName || ''}`.trim();
          sendLoanStatusEmail(loanEmp.email, empName, 'approved', 'loan', loan.amount).catch(() => {});
        }
      } catch (e) {}
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/reject", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const loanId = parseInt(req.params.id);
      const loanData = await storage.getLoan(loanId);
      const updated = await storage.updateLoan(loanId, {
        status: "rejected",
        approvedBy: req.body.approvedBy,
        remarks: req.body.remarks,
      } as any);
      res.json(updated);
      try {
        if (loanData) {
          const loanEmp = await storage.getEmployee(loanData.employeeId);
          if (loanEmp?.email) {
            const empName = `${loanEmp.firstName} ${loanEmp.lastName || ''}`.trim();
            sendLoanStatusEmail(loanEmp.email, empName, 'rejected', 'loan', loanData.amount).catch(() => {});
          }
        }
      } catch (e) {}
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loans/:id/foreclose", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      const updated = await storage.updateLoan(id, {
        status: "foreclosed",
        foreclosureDate: new Date().toISOString().split('T')[0],
        foreclosureRemarks: req.body.remarks,
        remainingBalance: "0",
      } as any);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/loan-repayments", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const loanId = req.query.loanId ? parseInt(req.query.loanId as string) : undefined;
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const repayments = await storage.getLoanRepayments(loanId, employeeId);
      res.json(repayments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/loan-repayments", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const data = req.body;
      if (!data.loanId || !data.employeeId || !data.amount || !data.month || !data.year) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const repayment = await storage.createLoanRepayment(data);
      const loan = await storage.getLoan(repayment.loanId);
      if (loan) {
        const totalRepaid = parseFloat(loan.totalRepaid || "0") + parseFloat(repayment.amount);
        const remainingBalance = parseFloat(loan.amount) - totalRepaid;
        await storage.updateLoan(loan.id, {
          totalRepaid: totalRepaid.toFixed(2),
          remainingBalance: remainingBalance.toFixed(2),
          status: remainingBalance <= 0 ? "completed" : loan.status,
        } as any);
      }
      res.json(repayment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Org Positions
  app.get("/api/org-positions", async (req, res) => {
    try {
      const positions = await storage.getOrgPositions();
      res.json(positions);
    } catch (err: any) {
      if (err?.code === '42P01') {
        return res.json([]);
      }
      console.error("Error fetching org positions:", err);
      res.status(500).json({ message: "Failed to fetch org positions" });
    }
  });

  app.post("/api/org-positions", async (req, res) => {
    try {
      const position = await storage.createOrgPosition(req.body);
      res.json(position);
    } catch (err: any) {
      if (err?.code === '42P01') {
        return res.status(500).json({ message: "org_positions table not found. Please run database migrations first." });
      }
      console.error("Error creating org position:", err);
      res.status(500).json({ message: "Failed to create org position" });
    }
  });

  app.post("/api/org-positions/seed-default", async (req, res) => {
    try {
      const existing = await storage.getOrgPositions();
      if (existing.length > 0) {
        return res.status(400).json({ message: "Org structure already exists. Delete existing positions first." });
      }

      const md = await storage.createOrgPosition({ title: "MD & CEO", level: 0, parentId: null, sortOrder: 0 });
      const ea = await storage.createOrgPosition({ title: "EA", level: 1, parentId: md.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Assistant", level: 2, parentId: ea.id, sortOrder: 0 });
      const evp = await storage.createOrgPosition({ title: "Exe VP - DB", level: 1, parentId: md.id, sortOrder: 1 });
      await storage.createOrgPosition({ title: "Mgmt Trainee", level: 2, parentId: evp.id, sortOrder: 0 });

      const vp1 = await storage.createOrgPosition({ title: "VP1 - AK", level: 1, parentId: md.id, sortOrder: 2 });
      const avp1 = await storage.createOrgPosition({ title: "AVP", level: 2, parentId: vp1.id, sortOrder: 0 });
      const dgm1 = await storage.createOrgPosition({ title: "DGM", level: 3, parentId: avp1.id, sortOrder: 0 });
      const sm1a = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: dgm1.id, sortOrder: 0 });
      const mgr1a = await storage.createOrgPosition({ title: "Mgr", level: 5, parentId: sm1a.id, sortOrder: 0 });
      const am1 = await storage.createOrgPosition({ title: "AM", level: 6, parentId: mgr1a.id, sortOrder: 0 });
      const sre1 = await storage.createOrgPosition({ title: "Sr. Engr & Sr. Exe", level: 7, parentId: am1.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Engr", level: 8, parentId: sre1.id, sortOrder: 0 });
      const sm1b = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: dgm1.id, sortOrder: 1 });
      await storage.createOrgPosition({ title: "Associate", level: 5, parentId: sm1b.id, sortOrder: 0 });

      const vp2 = await storage.createOrgPosition({ title: "VP-2 VS", level: 1, parentId: md.id, sortOrder: 3 });
      const sm2 = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: vp2.id, sortOrder: 0 });
      const mgr2 = await storage.createOrgPosition({ title: "Mgr", level: 5, parentId: sm2.id, sortOrder: 0 });
      const exec2 = await storage.createOrgPosition({ title: "Executive", level: 6, parentId: mgr2.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Engineer", level: 7, parentId: exec2.id, sortOrder: 0 });

      const vp3 = await storage.createOrgPosition({ title: "VP3-BB", level: 1, parentId: md.id, sortOrder: 4 });
      const hod3 = await storage.createOrgPosition({ title: "HOD", level: 2, parentId: vp3.id, sortOrder: 0 });
      const sm3 = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: hod3.id, sortOrder: 0 });
      const mgr3 = await storage.createOrgPosition({ title: "Mgr", level: 5, parentId: sm3.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Associates", level: 6, parentId: mgr3.id, sortOrder: 0 });

      const vp4 = await storage.createOrgPosition({ title: "VP4-RV", level: 1, parentId: md.id, sortOrder: 5 });
      const avp4 = await storage.createOrgPosition({ title: "AVP", level: 2, parentId: vp4.id, sortOrder: 0 });
      const dgm4 = await storage.createOrgPosition({ title: "DGM", level: 3, parentId: avp4.id, sortOrder: 0 });
      const sm4 = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: dgm4.id, sortOrder: 0 });
      const mgr4 = await storage.createOrgPosition({ title: "Manager", level: 5, parentId: sm4.id, sortOrder: 0 });
      const amnw = await storage.createOrgPosition({ title: "AM /N/w Administrator", level: 6, parentId: mgr4.id, sortOrder: 0 });
      const pc4 = await storage.createOrgPosition({ title: "Project Co-ordinator", level: 7, parentId: amnw.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Engineer & Technicians", level: 8, parentId: pc4.id, sortOrder: 0 });

      const vp5 = await storage.createOrgPosition({ title: "VP5-SN", level: 1, parentId: md.id, sortOrder: 6 });
      const sm5 = await storage.createOrgPosition({ title: "Sr. Mgr", level: 4, parentId: vp5.id, sortOrder: 0 });
      const mgr5 = await storage.createOrgPosition({ title: "Mgr", level: 5, parentId: sm5.id, sortOrder: 0 });
      await storage.createOrgPosition({ title: "Engineer", level: 6, parentId: mgr5.id, sortOrder: 0 });

      const all = await storage.getOrgPositions();
      res.json(all);
    } catch (err: any) {
      if (err?.code === '42P01') {
        return res.status(500).json({ message: "org_positions table not found. Please run database migrations (drizzle-kit push) on your production database first." });
      }
      console.error("Error seeding org positions:", err);
      res.status(500).json({ message: "Failed to seed org structure" });
    }
  });

  app.patch("/api/org-positions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateOrgPosition(id, req.body);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating org position:", err);
      res.status(500).json({ message: "Failed to update org position" });
    }
  });

  app.delete("/api/org-positions/:id", async (req, res) => {
    try {
      await storage.deleteOrgPosition(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting org position:", err);
      res.status(500).json({ message: "Failed to delete org position" });
    }
  });

  // === PT Rules ===
  app.get("/api/pt-rules", async (req, res) => {
    try {
      const state = req.query.state as string | undefined;
      const rules = await storage.getPtRules(state);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch PT rules" });
    }
  });

  app.post("/api/pt-rules", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const rule = await storage.createPtRule(req.body);
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create PT rule" });
    }
  });

  app.post("/api/pt-rules/seed-defaults", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });

      const existing = await storage.getPtRules();
      if (existing.length > 0) {
        return res.json({ message: "PT rules already seeded", count: existing.length });
      }

      const ptData: { state: string; slabs: { from: number; to: number; amount: number }[] }[] = [
        {
          state: "Karnataka",
          slabs: [
            { from: 0, to: 15000, amount: 0 },
            { from: 15001, to: 25000, amount: 200 },
            { from: 25001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Maharashtra",
          slabs: [
            { from: 0, to: 7500, amount: 0 },
            { from: 7501, to: 10000, amount: 175 },
            { from: 10001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Tamil Nadu",
          slabs: [
            { from: 0, to: 21000, amount: 0 },
            { from: 21001, to: 30000, amount: 100 },
            { from: 30001, to: 45000, amount: 235 },
            { from: 45001, to: 60000, amount: 510 },
            { from: 60001, to: 75000, amount: 760 },
            { from: 75001, to: 99999999, amount: 1095 },
          ],
        },
        {
          state: "Telangana",
          slabs: [
            { from: 0, to: 15000, amount: 0 },
            { from: 15001, to: 20000, amount: 150 },
            { from: 20001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Andhra Pradesh",
          slabs: [
            { from: 0, to: 15000, amount: 0 },
            { from: 15001, to: 20000, amount: 150 },
            { from: 20001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "West Bengal",
          slabs: [
            { from: 0, to: 10000, amount: 0 },
            { from: 10001, to: 15000, amount: 110 },
            { from: 15001, to: 25000, amount: 130 },
            { from: 25001, to: 40000, amount: 150 },
            { from: 40001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Gujarat",
          slabs: [
            { from: 0, to: 5999, amount: 0 },
            { from: 6000, to: 8999, amount: 80 },
            { from: 9000, to: 11999, amount: 150 },
            { from: 12000, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Madhya Pradesh",
          slabs: [
            { from: 0, to: 18750, amount: 0 },
            { from: 18751, to: 25000, amount: 125 },
            { from: 25001, to: 33333, amount: 167 },
            { from: 33334, to: 99999999, amount: 208 },
          ],
        },
        {
          state: "Kerala",
          slabs: [
            { from: 0, to: 11999, amount: 0 },
            { from: 12000, to: 17999, amount: 120 },
            { from: 18000, to: 29999, amount: 180 },
            { from: 30000, to: 44999, amount: 200 },
            { from: 45000, to: 99999999, amount: 250 },
          ],
        },
        {
          state: "Odisha",
          slabs: [
            { from: 0, to: 16000, amount: 0 },
            { from: 16001, to: 25000, amount: 150 },
            { from: 25001, to: 99999999, amount: 200 },
          ],
        },
        {
          state: "Assam",
          slabs: [
            { from: 0, to: 10000, amount: 0 },
            { from: 10001, to: 15000, amount: 150 },
            { from: 15001, to: 25000, amount: 180 },
            { from: 25001, to: 99999999, amount: 208 },
          ],
        },
        {
          state: "Bihar",
          slabs: [
            { from: 0, to: 25000, amount: 0 },
            { from: 25001, to: 41666, amount: 100 },
            { from: 41667, to: 83333, amount: 167 },
            { from: 83334, to: 99999999, amount: 208 },
          ],
        },
        {
          state: "Delhi",
          slabs: [
            { from: 0, to: 99999999, amount: 0 },
          ],
        },
      ];

      let count = 0;
      for (const stateData of ptData) {
        for (const slab of stateData.slabs) {
          await storage.createPtRule({
            state: stateData.state,
            slabFrom: slab.from.toString(),
            slabTo: slab.to.toString(),
            ptAmount: slab.amount.toString(),
            frequency: "monthly",
            isActive: true,
          });
          count++;
        }
      }

      res.json({ message: `Seeded ${count} PT rules for ${ptData.length} states`, count });
    } catch (err: any) {
      console.error("Error seeding PT rules:", err);
      res.status(500).json({ message: "Failed to seed PT rules" });
    }
  });

  app.patch("/api/pt-rules/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const rule = await storage.updatePtRule(Number(req.params.id), req.body);
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update PT rule" });
    }
  });

  app.delete("/api/pt-rules/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      await storage.deletePtRule(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete PT rule" });
    }
  });

  // === LWF Rules ===
  app.get("/api/lwf-rules", async (req, res) => {
    try {
      const state = req.query.state as string | undefined;
      const rules = await storage.getLwfRules(state);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch LWF rules" });
    }
  });

  app.post("/api/lwf-rules", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const rule = await storage.createLwfRule(req.body);
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create LWF rule" });
    }
  });

  app.post("/api/lwf-rules/seed-defaults", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });

      const existing = await storage.getLwfRules();
      if (existing.length > 0) {
        return res.json({ message: "LWF rules already seeded", count: existing.length });
      }

      const lwfData = [
        { state: "Karnataka", employeeContribution: "20", employerContribution: "40", frequency: "yearly", applicableMonths: "12", grossSalaryThreshold: null },
        { state: "Maharashtra", employeeContribution: "25", employerContribution: "75", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: "3500" },
        { state: "Tamil Nadu", employeeContribution: "20", employerContribution: "40", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
        { state: "Telangana", employeeContribution: "2", employerContribution: "5", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: "15000" },
        { state: "Andhra Pradesh", employeeContribution: "15", employerContribution: "30", frequency: "yearly", applicableMonths: "12", grossSalaryThreshold: null },
        { state: "West Bengal", employeeContribution: "3", employerContribution: "5", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
        { state: "Gujarat", employeeContribution: "6", employerContribution: "12", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: "12000" },
        { state: "Delhi", employeeContribution: "1", employerContribution: "1", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
        { state: "Kerala", employeeContribution: "20", employerContribution: "40", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
        { state: "Madhya Pradesh", employeeContribution: "10", employerContribution: "30", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
        { state: "Odisha", employeeContribution: "20", employerContribution: "40", frequency: "half-yearly", applicableMonths: "6,12", grossSalaryThreshold: null },
      ];

      let count = 0;
      for (const rule of lwfData) {
        await storage.createLwfRule({
          state: rule.state,
          employeeContribution: rule.employeeContribution,
          employerContribution: rule.employerContribution,
          frequency: rule.frequency,
          applicableMonths: rule.applicableMonths,
          grossSalaryThreshold: rule.grossSalaryThreshold,
          isActive: true,
        });
        count++;
      }

      res.json({ message: `Seeded ${count} LWF rules`, count });
    } catch (err: any) {
      console.error("Error seeding LWF rules:", err);
      res.status(500).json({ message: "Failed to seed LWF rules" });
    }
  });

  app.patch("/api/lwf-rules/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const rule = await storage.updateLwfRule(Number(req.params.id), req.body);
      res.json(rule);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update LWF rule" });
    }
  });

  app.delete("/api/lwf-rules/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      await storage.deleteLwfRule(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete LWF rule" });
    }
  });

  // === Birthday Wishes ===
  app.get("/api/birthday-wishes", async (req, res) => {
    try {
      const toEmployeeId = req.query.toEmployeeId ? Number(req.query.toEmployeeId) : undefined;
      const wishes = await storage.getBirthdayWishes(toEmployeeId);
      const allEmployees = await storage.getEmployees();
      const enriched = wishes.map(w => {
        const from = allEmployees.find(e => e.id === w.fromEmployeeId);
        const to = allEmployees.find(e => e.id === w.toEmployeeId);
        const taggedNames: string[] = [];
        if (w.taggedEmployeeIds) {
          const ids = w.taggedEmployeeIds.split(",").map(Number).filter(Boolean);
          ids.forEach(id => {
            const emp = allEmployees.find(e => e.id === id);
            if (emp) taggedNames.push(`${emp.firstName} ${emp.lastName || ''}`.trim());
          });
        }
        return {
          ...w,
          fromName: from ? `${from.firstName} ${from.lastName || ''}`.trim() : "Unknown",
          fromDepartment: from?.department || "",
          toName: to ? `${to.firstName} ${to.lastName || ''}`.trim() : "Unknown",
          toDepartment: to?.department || "",
          taggedNames,
        };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch birthday wishes" });
    }
  });

  app.post("/api/birthday-wishes", async (req, res) => {
    try {
      const { fromEmployeeId, toEmployeeId, message, bannerType, type, taggedEmployeeIds } = req.body;
      if (!fromEmployeeId || !toEmployeeId || !message) {
        return res.status(400).json({ error: "fromEmployeeId, toEmployeeId, and message are required" });
      }
      const validBanners = ["confetti", "balloons", "cake", "stars", "hearts", "simple"];
      const safeBanner = validBanners.includes(bannerType) ? bannerType : "confetti";
      const validTypes = ["birthday", "anniversary"];
      const safeType = validTypes.includes(type) ? type : "birthday";
      const safeMessage = String(message).trim().slice(0, 500);
      if (!safeMessage) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }
      const fromEmp = await storage.getEmployee(Number(fromEmployeeId));
      const toEmp = await storage.getEmployee(Number(toEmployeeId));
      if (!fromEmp || !toEmp) {
        return res.status(400).json({ error: "Invalid employee ID" });
      }
      let safeTaggedIds: string | null = null;
      if (taggedEmployeeIds && Array.isArray(taggedEmployeeIds) && taggedEmployeeIds.length > 0) {
        safeTaggedIds = taggedEmployeeIds.map(Number).filter(Boolean).join(",");
      }
      const wish = await storage.createBirthdayWish({
        fromEmployeeId: Number(fromEmployeeId),
        toEmployeeId: Number(toEmployeeId),
        message: safeMessage,
        bannerType: safeBanner,
        type: safeType,
        taggedEmployeeIds: safeTaggedIds,
        isPublic: true,
      });
      res.json(wish);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to send chatter notification" });
    }
  });

  app.delete("/api/birthday-wishes/:id", async (req, res) => {
    try {
      await storage.deleteBirthdayWish(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete birthday wish" });
    }
  });

  // === Company Policies ===
  app.get("/api/company-policies", async (req, res) => {
    try {
      const policies = await storage.getCompanyPolicies();
      const policiesWithoutFileData = policies.map(p => ({ ...p, fileData: undefined }));
      res.json(policiesWithoutFileData);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch company policies" });
    }
  });

  app.get("/api/company-policies/:id", async (req, res) => {
    try {
      const policy = await storage.getCompanyPolicy(Number(req.params.id));
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      const { fileData, ...rest } = policy;
      res.json(rest);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch policy" });
    }
  });

  app.get("/api/company-policies/:id/view", async (req, res) => {
    try {
      const policyId = Number(req.params.id);
      console.log(`[Policy View] Requesting policy ID: ${policyId}`);
      const policy = await storage.getCompanyPolicy(policyId);
      if (!policy) {
        console.log(`[Policy View] Policy ID ${policyId} not found`);
        return res.status(404).json({ message: "Policy not found" });
      }
      if (!policy.fileData) {
        console.log(`[Policy View] Policy ID ${policyId} has no file data`);
        return res.status(404).json({ message: "Policy file not found" });
      }
      const buffer = Buffer.from(policy.fileData, "base64");
      console.log(`[Policy View] Serving policy "${policy.fileName}" (${buffer.length} bytes)`);
      res.setHeader("Content-Type", policy.mimeType || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${policy.fileName || 'policy'}"`);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "no-store");
      res.send(buffer);
    } catch (err: any) {
      console.error(`[Policy View] Error:`, err?.message || err);
      res.status(500).json({ message: "Failed to view policy" });
    }
  });

  app.get("/api/company-policies/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: "Not authenticated" });
      const allEmployees = await storage.getEmployees();
      const dlUserEmail = ((req.user as any).email || '').toLowerCase();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === dlUserEmail);
      const { authorized: isAdmin } = await checkUserRole(req, ["admin", "hr"]);
      const policy = await storage.getCompanyPolicy(Number(req.params.id));
      if (!policy || !policy.fileData) return res.status(404).json({ message: "Policy file not found" });
      const allowedIds = policy.downloadAllowedEmployees || [];
      if (!isAdmin && (!currentEmployee || !allowedIds.includes(String(currentEmployee.id)))) {
        return res.status(403).json({ message: "Download not permitted. View-only access." });
      }
      const buffer = Buffer.from(policy.fileData, "base64");
      res.setHeader("Content-Type", policy.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${policy.fileName || 'policy'}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to download policy" });
    }
  });

  app.post("/api/company-policies", upload.single('file'), async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const { name, description, category, version } = req.body;
      if (!name) return res.status(400).json({ error: "Policy name is required" });
      const policyData: any = { name, description: description || null, category: category || "general", version: version || "1.0" };
      if (req.file) {
        policyData.fileData = req.file.buffer.toString("base64");
        policyData.fileName = req.file.originalname;
        policyData.mimeType = req.file.mimetype;
        policyData.fileSize = req.file.size;
      }
      const policy = await storage.createCompanyPolicy(policyData);
      const { fileData, ...rest } = policy;

      res.json(rest);

      try {
        const allEmployees = await storage.getEmployees();
        const activeEmps = allEmployees.filter((e: any) => e.status === 'active' && e.email);
        console.log(`[Policy Email] Sending new policy notification to ${activeEmps.length} active employees for policy: ${name}`);
        let successCount = 0;
        let failCount = 0;
        for (const emp of activeEmps) {
          try {
            await sendNotificationEmail(
              emp.email,
              `New Company Policy: ${name} - FCT Energy`,
              "New Company Policy Published",
              `A new company policy "<strong>${name}</strong>" has been published in the ${category || 'general'} category.<br><br>${description ? `<strong>Description:</strong> ${description}<br><br>` : ''}Please log in to the HR portal to view the policy and acknowledge it.`
            );
            successCount++;
            console.log(`[Policy Email] Sent to ${emp.email}`);
          } catch (emailErr: any) {
            failCount++;
            console.error(`[Policy Email] Failed to send to ${emp.email}:`, emailErr?.message || emailErr);
          }
        }
        console.log(`[Policy Email] Complete: ${successCount} sent, ${failCount} failed out of ${activeEmps.length} employees`);
      } catch (emailErr: any) {
        console.error("[Policy Email] Error fetching employees for notification:", emailErr?.message || emailErr);
      }
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create company policy" });
    }
  });

  app.patch("/api/company-policies/:id", upload.single('file'), async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.category) updates.category = req.body.category;
      if (req.body.version) updates.version = req.body.version;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive === "true" || req.body.isActive === true;
      if (req.body.downloadAllowedEmployees !== undefined) {
        try {
          updates.downloadAllowedEmployees = typeof req.body.downloadAllowedEmployees === 'string'
            ? JSON.parse(req.body.downloadAllowedEmployees)
            : req.body.downloadAllowedEmployees;
        } catch { updates.downloadAllowedEmployees = []; }
      }
      if (req.file) {
        updates.fileData = req.file.buffer.toString("base64");
        updates.fileName = req.file.originalname;
        updates.mimeType = req.file.mimetype;
        updates.fileSize = req.file.size;
      }
      const policy = await storage.updateCompanyPolicy(Number(req.params.id), updates);
      const { fileData, ...rest } = policy;
      res.json(rest);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update company policy" });
    }
  });

  app.delete("/api/company-policies/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      await storage.deleteCompanyPolicy(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete company policy" });
    }
  });

  app.get("/api/policy-acknowledgments", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const policyId = req.query.policyId ? Number(req.query.policyId) : undefined;
      const acks = await storage.getPolicyAcknowledgments(policyId);
      res.json(acks);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch acknowledgments" });
    }
  });

  app.post("/api/policy-acknowledgments", async (req, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: "Not authenticated" });
      const { policyId } = req.body;
      if (!policyId) return res.status(400).json({ error: "policyId is required" });
      const allEmployees = await storage.getEmployees();
      const ackUserEmail = ((req.user as any).email || '').toLowerCase();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === ackUserEmail);
      if (!currentEmployee) return res.status(403).json({ error: "No employee record found for your account" });
      const employeeId = currentEmployee.id;
      const existing = await storage.getPolicyAcknowledgments(Number(policyId));
      const myExisting = existing.find(a => a.employeeId === employeeId);
      if (myExisting) {
        if (myExisting.acknowledgedAt) {
          return res.status(400).json({ error: "Already acknowledged" });
        }
        const updated = await storage.updatePolicyAcknowledgment(myExisting.id, { acknowledgedAt: new Date() });
        return res.json(updated);
      }
      const ack = await storage.createPolicyAcknowledgment({ policyId: Number(policyId), employeeId });
      res.json(ack);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to acknowledge policy" });
    }
  });

  app.post("/api/policy-acknowledgments/view", async (req, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: "Not authenticated" });
      const { policyId } = req.body;
      if (!policyId) return res.status(400).json({ error: "policyId is required" });
      const allEmployees = await storage.getEmployees();
      const userEmail = ((req.user as any).email || '').toLowerCase();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === userEmail);
      if (!currentEmployee) return res.status(403).json({ error: "No employee record found" });
      const existing = await storage.getPolicyAcknowledgments(Number(policyId));
      const myAck = existing.find(a => a.employeeId === currentEmployee.id);
      if (myAck) {
        if (!myAck.viewedAt) {
          const updated = await storage.updatePolicyAcknowledgment(myAck.id, { viewedAt: new Date() });
          return res.json(updated);
        }
        return res.json(myAck);
      }
      const ack = await storage.createPolicyAcknowledgment({ policyId: Number(policyId), employeeId: currentEmployee.id });
      const updated = await storage.updatePolicyAcknowledgment(ack.id, { viewedAt: new Date(), acknowledgedAt: null as any });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  app.post("/api/company-policies/:id/send-reminder", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["admin", "hr"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const policy = await storage.getCompanyPolicy(Number(req.params.id));
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      const allEmployees = await storage.getEmployees();
      const activeEmps = allEmployees.filter((e: any) => e.status === 'active' && e.email);
      const acks = await storage.getPolicyAcknowledgments(policy.id);
      const ackedIds = new Set(acks.filter(a => a.acknowledgedAt).map(a => a.employeeId));
      const unacknowledged = activeEmps.filter(e => !ackedIds.has(e.id));
      console.log(`[Policy Reminder] Sending reminder for "${policy.name}" to ${unacknowledged.length} unacknowledged employees`);
      let sentCount = 0;
      let failCount = 0;
      for (const emp of unacknowledged) {
        try {
          await sendNotificationEmail(
            emp.email,
            `Reminder: Please acknowledge "${policy.name}" - FCT Energy`,
            "Policy Acknowledgment Reminder",
            `This is a reminder to view and acknowledge the company policy "<strong>${policy.name}</strong>".<br><br>Please log in to the HR portal, view the policy, and confirm your acknowledgment.`
          );
          sentCount++;
          console.log(`[Policy Reminder] Sent to ${emp.email}`);
        } catch (emailErr: any) {
          failCount++;
          console.error(`[Policy Reminder] Failed to send to ${emp.email}:`, emailErr?.message || emailErr);
        }
      }
      console.log(`[Policy Reminder] Complete: ${sentCount} sent, ${failCount} failed`);
      res.json({ success: true, sentCount, totalUnacknowledged: unacknowledged.length });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // === Overtime Management ===
  app.get("/api/overtime", async (req, res) => {
    try {
      const { status } = req.query;
      const allEmployees = await storage.getEmployees();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === ((req.user as any)?.email || '').toLowerCase());
      if (!currentEmployee) return res.status(401).json({ error: "Not authenticated" });

      const userRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdmin = userRoles.includes("admin") || userRoles.includes("hr") || userRoles.includes("hr_manager");

      const filters: { employeeId?: number; status?: string } = {};
      if (!isAdmin) filters.employeeId = currentEmployee.id;
      if (status && status !== 'all') filters.status = String(status);
      const requests = await storage.getOvertimeRequests(filters);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch overtime requests" });
    }
  });

  app.get("/api/overtime/summary", async (req, res) => {
    try {
      const allEmployees = await storage.getEmployees();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === ((req.user as any)?.email || '').toLowerCase());
      if (!currentEmployee) return res.status(401).json({ error: "Not authenticated" });

      const userRoles = (currentEmployee.accessRole || "employee").split(",").map((r: string) => r.trim());
      const isAdmin = userRoles.includes("admin") || userRoles.includes("hr");

      const { month, year } = req.query;
      const allRequests = isAdmin
        ? await storage.getOvertimeRequests()
        : await storage.getOvertimeRequests({ employeeId: currentEmployee.id });

      let filtered = allRequests;
      if (month && year) {
        filtered = allRequests.filter((r: any) => {
          const d = new Date(r.date);
          return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
        });
      }
      const approvedRequests = filtered.filter((r: any) => r.status === 'approved');
      const pendingRequests = filtered.filter((r: any) => r.status === 'pending');
      const totalApprovedHours = approvedRequests.reduce((sum: number, r: any) => sum + parseFloat(r.overtimeHours || '0'), 0);
      const totalPendingHours = pendingRequests.reduce((sum: number, r: any) => sum + parseFloat(r.overtimeHours || '0'), 0);

      const targetEmployees = isAdmin ? allEmployees : [currentEmployee];
      const employeeSummary = targetEmployees.map((emp: any) => {
        const empApproved = approvedRequests.filter((r: any) => r.employeeId === emp.id);
        const empPending = pendingRequests.filter((r: any) => r.employeeId === emp.id);
        const approvedHours = empApproved.reduce((s: number, r: any) => s + parseFloat(r.overtimeHours || '0'), 0);
        const pendingHrs = empPending.reduce((s: number, r: any) => s + parseFloat(r.overtimeHours || '0'), 0);
        const dailyRate = emp.ctc ? parseFloat(emp.ctc) / 12 / 26 : 0;
        const hourlyRate = dailyRate / 9;
        const overtimePay = approvedHours * hourlyRate * 1.5;
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
          department: emp.department || '',
          approvedHours: Math.round(approvedHours * 100) / 100,
          pendingHours: Math.round(pendingHrs * 100) / 100,
          approvedCount: empApproved.length,
          pendingCount: empPending.length,
          estimatedPay: Math.round(overtimePay * 100) / 100,
        };
      }).filter((e: any) => e.approvedCount > 0 || e.pendingCount > 0);

      res.json({
        totalApprovedHours: Math.round(totalApprovedHours * 100) / 100,
        totalPendingHours: Math.round(totalPendingHours * 100) / 100,
        totalApprovedCount: approvedRequests.length,
        totalPendingCount: pendingRequests.length,
        employeeSummary,
      });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch overtime summary" });
    }
  });

  app.post("/api/overtime", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, []);
      if (!authorized) return res.status(403).json({ error: "Only admins can create overtime requests" });

      const { employeeId, date, overtimeHours, reason } = req.body;
      if (!employeeId || !date || !overtimeHours) {
        return res.status(400).json({ error: "employeeId, date, and overtimeHours are required" });
      }
      if (!['pending', 'approved', 'rejected'].includes(req.body.status || 'pending')) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      const request = await storage.createOvertimeRequest({
        employeeId: Number(employeeId),
        date,
        overtimeHours: String(overtimeHours),
        reason: reason || "Manual overtime request",
        status: "pending",
      });
      res.json(request);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create overtime request" });
    }
  });

  app.patch("/api/overtime/:id", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, []);
      if (!authorized) return res.status(403).json({ error: "Access denied" });
      const id = Number(req.params.id);
      const { status, remarks } = req.body;
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
      }

      const allEmployees = await storage.getEmployees();
      const currentEmployee = allEmployees.find((e: any) => (e.email || '').toLowerCase() === ((req.user as any)?.email || '').toLowerCase());

      const updated = await storage.updateOvertimeRequest(id, {
        status,
        remarks,
        approvedBy: currentEmployee?.id,
        approvedAt: new Date(),
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update overtime request" });
    }
  });

  // === Form 16 Generation ===
  app.get("/api/form16/:employeeId/:financialYear", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied" });

      const employeeId = Number(req.params.employeeId);
      const financialYear = req.params.financialYear;
      const emp = await storage.getEmployee(employeeId);
      if (!emp) return res.status(404).json({ message: "Employee not found" });

      const [fyStartYear] = financialYear.split("-").map(Number);
      const fyMonths: { month: string; year: number }[] = [];
      for (let m = 4; m <= 12; m++) fyMonths.push({ month: String(m), year: fyStartYear });
      for (let m = 1; m <= 3; m++) fyMonths.push({ month: String(m), year: fyStartYear + 1 });

      const allPayroll = await storage.getPayroll(employeeId);
      const fyPayroll = allPayroll.filter(p => {
        const pMonth = parseInt(p.month);
        const pYear = p.year;
        return fyMonths.some(fm => parseInt(fm.month) === pMonth && fm.year === pYear);
      });

      const declarations = await storage.getTaxDeclarations(employeeId, financialYear);
      const approvedDeclarations = declarations.filter(d => d.status === "approved" || d.status === "submitted");

      const totalBasic = fyPayroll.reduce((s, p) => s + Number(p.basicSalary || 0), 0);
      const totalHRA = fyPayroll.reduce((s, p) => s + Number(p.hra || 0), 0);
      const totalDA = fyPayroll.reduce((s, p) => s + Number(p.da || 0), 0);
      const totalConv = fyPayroll.reduce((s, p) => s + Number(p.conveyance || 0), 0);
      const totalComm = fyPayroll.reduce((s, p) => s + Number(p.communicationAllowance || 0), 0);
      const totalMed = fyPayroll.reduce((s, p) => s + Number(p.medicalAllowance || 0), 0);
      const totalVar = fyPayroll.reduce((s, p) => s + Number(p.variablePay || 0), 0);
      const totalOther = fyPayroll.reduce((s, p) => s + Number(p.otherEarnings || 0) + Number(p.arrear || 0) + Number(p.bonus || 0) + Number(p.highAltitudeAllowance || 0) + Number(p.birthdayAllowance || 0), 0);
      const totalGross = fyPayroll.reduce((s, p) => s + Number(p.grossSalary || 0), 0);
      const totalEPF = fyPayroll.reduce((s, p) => s + Number(p.epf || 0), 0);
      const totalTDS = fyPayroll.reduce((s, p) => s + Number(p.tds || 0), 0);
      const totalPT = fyPayroll.reduce((s, p) => s + Number(p.professionalTax || 0), 0);
      const totalInsurance = fyPayroll.reduce((s, p) => s + Number(p.insurancePremium || 0), 0);
      const totalLWF = fyPayroll.reduce((s, p) => s + Number(p.lwf || 0), 0);
      const totalDeductions = fyPayroll.reduce((s, p) => s + Number(p.deductions || 0), 0);
      const totalNet = fyPayroll.reduce((s, p) => s + Number(p.netSalary || 0), 0);
      const totalLopDeduction = fyPayroll.reduce((s, p) => s + Number(p.lopDeduction || 0), 0);

      const standardDeduction = (emp.taxRegime === "new") ? 75000 : 50000;
      const grossTotalIncome = Math.max(0, totalGross - standardDeduction - totalPT);
      const section80C = approvedDeclarations.filter(d => d.section === "80C").reduce((s, d) => s + Number(d.amount || 0), 0) + totalEPF;
      const section80CApplied = Math.min(section80C, 150000);
      const section80D = approvedDeclarations.filter(d => d.section === "80D").reduce((s, d) => s + Number(d.amount || 0), 0);
      const section80DApplied = Math.min(section80D, 75000);
      const section24 = approvedDeclarations.filter(d => d.section === "24(b)").reduce((s, d) => s + Number(d.amount || 0), 0);
      const section24Applied = Math.min(section24, 200000);
      const section80E = approvedDeclarations.filter(d => d.section === "80E").reduce((s, d) => s + Number(d.amount || 0), 0);
      const section80G = approvedDeclarations.filter(d => d.section === "80G").reduce((s, d) => s + Number(d.amount || 0), 0);
      const otherSections = approvedDeclarations.filter(d => !["80C", "80D", "24(b)", "80E", "80G"].includes(d.section || "")).reduce((s, d) => s + Number(d.amount || 0), 0);

      const totalDeductionsFromIncome = section80CApplied + section80DApplied + section24Applied + section80E + section80G + otherSections;
      const taxableIncome = Math.max(0, grossTotalIncome - totalDeductionsFromIncome);

      const oldRegimeStdDed = 50000;
      const newRegimeStdDed = 75000;
      const stdDedForRegime = (emp.taxRegime === "new") ? newRegimeStdDed : oldRegimeStdDed;

      let taxOldRegime = 0;
      if (taxableIncome > 1000000) taxOldRegime = 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
      else if (taxableIncome > 500000) taxOldRegime = 12500 + (taxableIncome - 500000) * 0.20;
      else if (taxableIncome > 250000) taxOldRegime = (taxableIncome - 250000) * 0.05;

      let taxNewRegime = 0;
      const newRegimeIncome = Math.max(0, totalGross - newRegimeStdDed);
      if (newRegimeIncome > 1500000) taxNewRegime = 20000 + 30000 + 45000 + 30000 + (newRegimeIncome - 1500000) * 0.30;
      else if (newRegimeIncome > 1200000) taxNewRegime = 20000 + 30000 + 45000 + (newRegimeIncome - 1200000) * 0.20;
      else if (newRegimeIncome > 1000000) taxNewRegime = 20000 + 30000 + (newRegimeIncome - 1000000) * 0.15;
      else if (newRegimeIncome > 700000) taxNewRegime = 20000 + (newRegimeIncome - 700000) * 0.10;
      else if (newRegimeIncome > 300000) taxNewRegime = (newRegimeIncome - 300000) * 0.05;

      const cess = (emp.taxRegime === "new" ? taxNewRegime : taxOldRegime) * 0.04;
      const totalTaxLiability = (emp.taxRegime === "new" ? taxNewRegime : taxOldRegime) + cess;

      const monthlyBreakdown = fyPayroll.map(p => ({
        month: p.month,
        year: p.year,
        gross: Number(p.grossSalary || 0),
        epf: Number(p.epf || 0),
        tds: Number(p.tds || 0),
        pt: Number(p.professionalTax || 0),
        net: Number(p.netSalary || 0),
      }));

      res.json({
        employee: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
          employeeCode: emp.employeeCode,
          panNumber: emp.panNumber,
          aadharNumber: emp.aadharNumber,
          designation: emp.designation,
          joinDate: emp.joinDate,
          email: emp.email,
          address: emp.address,
          state: emp.state,
          taxRegime: emp.taxRegime || "old",
        },
        employer: {
          name: "FC TECNRGY PVT LTD",
          tan: "BLRF00000E",
          pan: "AACCC0000A",
          address: "Bengaluru, Karnataka",
        },
        financialYear,
        assessmentYear: `${fyStartYear + 1}-${(fyStartYear + 2).toString().slice(2)}`,
        partA: {
          totalMonths: fyPayroll.length,
          monthlyBreakdown,
          totalTDSDeducted: totalTDS,
          totalTDSDeposited: totalTDS,
        },
        partB: {
          grossSalary: totalGross,
          earnings: {
            basic: totalBasic,
            hra: totalHRA,
            da: totalDA,
            conveyance: totalConv,
            communication: totalComm,
            medical: totalMed,
            variablePay: totalVar,
            other: totalOther,
          },
          standardDeduction,
          professionalTax: totalPT,
          incomeFromSalary: totalGross - standardDeduction - totalPT,
          deductions: {
            section80C: { declared: section80C, applied: section80CApplied },
            section80D: { declared: section80D, applied: section80DApplied },
            section24: { declared: section24, applied: section24Applied },
            section80E: { declared: section80E, applied: section80E },
            section80G: { declared: section80G, applied: section80G },
            otherSections: { declared: otherSections, applied: otherSections },
            total: totalDeductionsFromIncome,
          },
          grossTotalIncome: grossTotalIncome,
          taxableIncome,
          taxOldRegime: Math.round(taxOldRegime),
          taxNewRegime: Math.round(taxNewRegime),
          cess: Math.round(cess),
          totalTaxLiability: Math.round(totalTaxLiability),
          totalTDSDeducted: totalTDS,
          refundOrDue: Math.round(totalTDS - totalTaxLiability),
        },
        summary: {
          totalEarnings: totalGross,
          totalDeductions: totalDeductions + totalLopDeduction,
          totalNet,
          totalEPF,
          totalPT,
          totalLWF,
          totalInsurance,
          totalTDS,
        },
      });
    } catch (err: any) {
      console.error("Error generating Form 16:", err);
      res.status(500).json({ message: "Failed to generate Form 16 data" });
    }
  });

  // Birthday & Anniversary auto-email endpoint (admin/HR only)
  app.post("/api/email/birthday-anniversary-check", async (req, res) => {
    try {
      const { authorized } = await checkUserRole(req, ["payroll_team"]);
      if (!authorized) return res.status(403).json({ error: "Access denied. Admin/HR/Payroll role required." });
      const allEmps = await storage.getEmployees();
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDate = today.getDate();

      const birthdayResults: string[] = [];
      const anniversaryResults: string[] = [];

      for (const emp of allEmps) {
        if (emp.status !== 'active' || !emp.email) continue;
        const empName = `${emp.firstName} ${emp.lastName || ''}`.trim();

        // Birthday check
        if (emp.dateOfBirth) {
          const dob = new Date(emp.dateOfBirth + "T00:00:00");
          if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate) {
            sendBirthdayEmail(emp.email, empName).catch(() => {});
            birthdayResults.push(empName);
          }
        }

        // Work anniversary check
        if (emp.joinDate) {
          const jd = new Date(emp.joinDate + "T00:00:00");
          if (jd.getMonth() + 1 === todayMonth && jd.getDate() === todayDate) {
            const years = today.getFullYear() - jd.getFullYear();
            if (years > 0) {
              sendAnniversaryEmail(emp.email, empName, years).catch(() => {});
              anniversaryResults.push(`${empName} (${years} yr${years > 1 ? 's' : ''})`);
            }
          }
        }
      }

      res.json({
        success: true,
        date: format(today, 'yyyy-MM-dd'),
        birthdays: birthdayResults,
        anniversaries: anniversaryResults,
        totalBirthdayEmails: birthdayResults.length,
        totalAnniversaryEmails: anniversaryResults.length,
      });
    } catch (err: any) {
      console.error("Birthday/anniversary check error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===== GL Account Mappings CRUD =====
  app.get("/api/gl-account-mappings", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM gl_account_mappings ORDER BY line_no_base");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/gl-account-mappings", async (req, res) => {
    try {
      const { component, accountNo, balAccountNo, description, type, lineNoBase } = req.body;
      const result = await pool.query(
        `INSERT INTO gl_account_mappings (component, account_no, bal_account_no, description, type, line_no_base) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (component) DO UPDATE SET account_no=$2, bal_account_no=$3, description=$4, type=$5, line_no_base=$6 RETURNING *`,
        [component, accountNo, balAccountNo, description, type || 'earning', lineNoBase || 10000]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/gl-account-mappings/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM gl_account_mappings WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Journal Entries =====
  app.get("/api/journal-entries", async (req, res) => {
    try {
      const { month, year } = req.query;
      let query = "SELECT * FROM journal_entries";
      const params: any[] = [];
      const conditions: string[] = [];
      if (month) { conditions.push(`month=$${params.length + 1}`); params.push(month); }
      if (year) { conditions.push(`year=$${params.length + 1}`); params.push(Number(year)); }
      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += " ORDER BY payee_name, line_no";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/journal-entries/generate", async (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) return res.status(400).json({ error: "month and year are required" });

      // Get GL account mappings
      const mappingsResult = await pool.query("SELECT * FROM gl_account_mappings ORDER BY line_no_base");
      const mappings = mappingsResult.rows;
      if (mappings.length === 0) {
        return res.status(400).json({ error: "No GL account mappings configured. Please set up GL account mappings first." });
      }

      // Try both month name and month number formats
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const monthNum = monthNames.indexOf(month) >= 0 ? String(monthNames.indexOf(month) + 1).padStart(2, '0') : month;
      const monthName = monthNames[parseInt(month, 10) - 1] || month;

      // Get processed payroll for the month/year - try both formats
      let payrollResult = await pool.query(
        `SELECT p.*, e.first_name, e.last_name, e.location_code FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE (p.month=$1 OR p.month=$2) AND p.year=$3 AND (p.status='processed' OR p.status='paid')`,
        [month, monthNum, year]
      );

      if (payrollResult.rows.length === 0) {
        return res.status(400).json({ error: `No processed payroll found for ${monthName} ${year}` });
      }

      // Use the month name for journal entries storage
      const journalMonth = monthName;

      // Delete existing journal entries for this period (both formats)
      await pool.query("DELETE FROM journal_entries WHERE (month=$1 OR month=$2 OR month=$3) AND year=$4", [month, monthNum, monthName, year]);

      // Build the component to payroll field mapping
      const componentFieldMap: Record<string, string> = {
        basic_salary: 'basic_salary',
        da: 'da',
        hra: 'hra',
        conveyance: 'conveyance',
        communication_allowance: 'communication_allowance',
        medical_allowance: 'medical_allowance',
        insurance_premium: 'insurance_premium',
        tds: 'tds',
        epf: 'epf',
        other_allowances: 'other_allowances',
        advance: 'advance',
        high_altitude_allowance: 'high_altitude_allowance',
        other_deductions: 'other_deductions',
        variable_pay: 'variable_pay',
        birthday_allowance: 'birthday_allowance',
        special_allowance: 'special_allowance',
        arrear: 'arrear',
        bonus: 'bonus',
        other_earnings: 'other_earnings',
        professional_tax: 'professional_tax',
        lwf: 'lwf',
        esi: 'esi',
        lop_deduction: 'lop_deduction',
        overtime_pay: 'overtime_pay',
        pf: 'pf',
        income_tax: 'income_tax',
      };

      // Calculate posting date (last day of month)
      const monthIdx = monthNames.indexOf(monthName) >= 0 ? monthNames.indexOf(monthName) : parseInt(monthNum, 10) - 1;
      const lastDay = new Date(Number(year), monthIdx + 1, 0);
      const postingDate = `${lastDay.getDate().toString().padStart(2,'0')}/${(monthIdx + 1).toString().padStart(2,'0')}/${year}`;

      const allEntries: any[] = [];

      for (const payrollRow of payrollResult.rows) {
        const employeeName = `${payrollRow.first_name} ${payrollRow.last_name}`;
        const locationCode = payrollRow.location_code || '';
        let lineNo = 10000;

        for (const mapping of mappings) {
          const field = componentFieldMap[mapping.component];
          if (!field) continue;

          const amount = Number(payrollRow[field]) || 0;
          if (amount === 0) continue;

          const isDeduction = mapping.type === 'deduction';
          const debitAmount = isDeduction ? 0 : amount;
          const creditAmount = isDeduction ? amount : 0;
          const entryAmount = isDeduction ? -amount : amount;

          allEntries.push([
            payrollRow.id, payrollRow.employee_id, journalMonth, year,
            'JOURNALV', 'SALARY', lineNo,
            'G/L Account', mapping.account_no, postingDate,
            null, null, mapping.description,
            mapping.bal_account_no, entryAmount, debitAmount, creditAmount,
            'G/L Account', locationCode, employeeName, 'generated'
          ]);
          lineNo += 10000;
        }
      }

      // Bulk insert
      if (allEntries.length > 0) {
        const valueStrings = allEntries.map((_, idx) => {
          const base = idx * 21;
          return `(${Array.from({length: 21}, (_, i) => `$${base + i + 1}`).join(',')})`;
        });
        const flatValues = allEntries.flat();
        await pool.query(
          `INSERT INTO journal_entries (payroll_id, employee_id, month, year, journal_template_name, journal_batch_name, line_no, account_type, account_no, posting_date, document_type, document_no, description, bal_account_no, amount, debit_amount, credit_amount, bal_account_type, location_code, payee_name, status) VALUES ${valueStrings.join(',')}`,
          flatValues
        );
      }

      res.json({ message: `Generated ${allEntries.length} journal entries for ${journalMonth} ${year}`, count: allEntries.length });
    } catch (err: any) {
      console.error("Journal entry generation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/journal-entries", async (req, res) => {
    try {
      const { month, year } = req.query;
      if (month && year) {
        await pool.query("DELETE FROM journal_entries WHERE month=$1 AND year=$2", [month, Number(year)]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== Biometric Devices CRUD =====
  app.get("/api/biometric-devices", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM biometric_devices ORDER BY id");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/biometric-punch-logs", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const result = await pool.query(
        `SELECT bpl.*, e.first_name, e.last_name, e.biometric_device_id FROM biometric_punch_logs bpl LEFT JOIN employees e ON bpl.employee_id = e.id ORDER BY bpl.punch_time DESC LIMIT $1`,
        [limit]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/biometric-devices", async (req, res) => {
    try {
      const { name, type, location, ip, status, employees } = req.body;
      const result = await pool.query(
        `INSERT INTO biometric_devices (name, type, location, ip, status, employees) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, type, location || '', ip || '', status || 'offline', employees || 0]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/biometric-devices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, location, ip, status, employees, autoSyncEnabled, syncIntervalMinutes, apiPort, apiProtocol } = req.body;
      const result = await pool.query(
        `UPDATE biometric_devices SET name=COALESCE($1,name), type=COALESCE($2,type), location=COALESCE($3,location), ip=COALESCE($4,ip), status=COALESCE($5,status), employees=COALESCE($6,employees), auto_sync_enabled=COALESCE($7,auto_sync_enabled), sync_interval_minutes=COALESCE($8,sync_interval_minutes), api_port=COALESCE($9,api_port), api_protocol=COALESCE($10,api_protocol) WHERE id=$11 RETURNING *`,
        [name, type, location, ip, status, employees, autoSyncEnabled, syncIntervalMinutes, apiPort, apiProtocol, id]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/biometric-devices/:id/sync", async (req, res) => {
    try {
      const { id } = req.params;
      const deviceResult = await pool.query(`SELECT * FROM biometric_devices WHERE id=$1`, [id]);
      if (deviceResult.rows.length === 0) {
        return res.status(404).json({ error: "Device not found" });
      }
      const device = deviceResult.rows[0];

      if (!device.ip) {
        return res.status(400).json({ error: "Device has no IP configured" });
      }

      const baseUrl = `${device.api_protocol || 'http'}://${device.ip}:${device.api_port || 80}`;
      const lastSync = device.last_sync ? new Date(device.last_sync) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      const formatDT = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };

      const endpoints = [
        `${baseUrl}/iclock/api/transactions/?start_time=${formatDT(lastSync)}&end_time=${formatDT(now)}&page_size=1000`,
        `${baseUrl}/api/attendance/logs?start=${lastSync.toISOString()}&end=${now.toISOString()}`,
        `${baseUrl}/cgi-bin/attendance.cgi?from=${formatDT(lastSync)}&to=${formatDT(now)}`,
      ];

      let records: any[] = [];
      let fetched = false;

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) records = data;
            else if (data.data && Array.isArray(data.data)) records = data.data;
            else if (data.rows && Array.isArray(data.rows)) records = data.rows;
            else if (data.records && Array.isArray(data.records)) records = data.records;
            fetched = true;
            break;
          }
        } catch (e: any) { continue; }
      }

      if (!fetched) {
        await pool.query(
          `UPDATE biometric_devices SET last_sync=NOW(), last_sync_status='skipped', last_sync_error='Device on private network (${device.ip}) — use ADMS push mode instead of pull sync' WHERE id=$1`,
          [id]
        );
        return res.json({ success: false, message: `Cannot reach device at ${device.ip} from cloud server. This device uses ADMS push mode — attendance data is pushed automatically by the device.`, synced: 0, errors: 0 });
      }

      let processed = 0;
      let errors = 0;
      const port = process.env.PORT || 5000;

      for (const record of records) {
        try {
          const empCode = record.emp_code || record.emp_id || record.employee_id || record.PIN || record.UserId || record.user_id || '';
          const punchTimeRaw = record.punch_time || record.att_time || record.timestamp || record.AttTime || record.log_time || '';
          const punchTime = punchTimeRaw ? new Date(punchTimeRaw.includes('+') || punchTimeRaw.includes('Z') || punchTimeRaw.includes('T') ? punchTimeRaw : punchTimeRaw + '+05:30') : null;
          if (!empCode || !punchTime || isNaN(punchTime.getTime())) continue;

          const dup = await pool.query(
            `SELECT id FROM biometric_punch_logs WHERE employee_code=$1 AND punch_time=$2 AND device_id=$3`,
            [empCode, punchTime, device.name]
          );
          if (dup.rows.length > 0) continue;

          const internalRes = await fetch(`http://0.0.0.0:${port}/api/biometric/punch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.EXTERNAL_API_KEY || '', 'X-Forwarded-For': device.ip },
            body: JSON.stringify({ emp_id: empCode, timestamp: punchTime.toISOString(), device_id: device.name, punch_type: record.punch_state || record.Status || '0' }),
          });

          if (internalRes.ok) processed++;
          else errors++;
        } catch (e: any) { errors++; }
      }

      await pool.query(
        `UPDATE biometric_devices SET last_sync=NOW(), last_sync_status=$1, last_sync_records=$2, last_sync_error=$3 WHERE id=$4`,
        [errors > 0 ? 'partial' : 'success', processed, errors > 0 ? `${errors} record(s) failed` : null, id]
      );

      res.json({ success: true, message: `Synced ${processed} records from ${records.length} total`, synced: processed, total: records.length, errors });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/biometric-devices/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM biometric_devices WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== ADMS Protocol Endpoints (ZKTeco/IDENTIX K30 Cloud Server Mode) =====
  // GET /iclock/cdata — handshake: device sends SN, responds with commands
  app.get("/iclock/cdata", async (req, res) => {
    const sn = req.query.SN || req.query.sn || '';
    const table = req.query.table || '';
    console.log(`[ADMS] GET handshake from SN=${sn}, table=${table}, query=`, req.query);

    if (table === 'options') {
      res.set('Content-Type', 'text/plain');
      return res.send(
        `GET OPTION FROM: ${sn}\r\n` +
        `ATTLOGStamp=0\r\n` +
        `OPERLOGStamp=0\r\n` +
        `ATTPHOTOStamp=0\r\n` +
        `ErrorDelay=30\r\n` +
        `Delay=10\r\n` +
        `TransTimes=00:00;23:59\r\n` +
        `TransInterval=1\r\n` +
        `TransFlag=TransData AttLog\tOpLog\r\n` +
        `Realtime=1\r\n` +
        `TimeZone=5.5\r\n`
      );
    }

    res.set('Content-Type', 'text/plain');
    res.send('OK');
  });

  // POST /iclock/cdata — device pushes attendance records
  app.post("/iclock/cdata", async (req, res) => {
    const sn = req.query.SN || req.query.sn || '';
    const table = req.query.table || '';
    const deviceIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || '';

    console.log(`[ADMS] POST from SN=${sn}, table=${table}, IP=${deviceIp}`);

    try {
      let rawBody = '';
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf-8');
      } else if (req.rawBody && typeof req.rawBody === 'string') {
        rawBody = req.rawBody;
      } else if (req.body) {
        rawBody = JSON.stringify(req.body);
      }

      console.log(`[ADMS] Raw body (${rawBody.length} chars): ${rawBody.substring(0, 500)}`);

      if (table === 'ATTLOG' || !table) {
        const lines = rawBody.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parts = line.split('\t');
            if (parts.length < 2) continue;

            const empCode = parts[0]?.trim();
            const timestamp = parts[1]?.trim();
            const punchState = parts[2]?.trim() || '0';
            const verifyMode = parts[3]?.trim() || '';

            if (!empCode || !timestamp) continue;

            const punchTime = new Date(timestamp.includes('+') || timestamp.includes('Z') ? timestamp : timestamp + '+05:30');
            if (isNaN(punchTime.getTime())) {
              console.log(`[ADMS] Invalid timestamp: ${timestamp}`);
              continue;
            }

            const dup = await pool.query(
              `SELECT id FROM biometric_punch_logs WHERE employee_code=$1 AND punch_time=$2 AND device_id=$3`,
              [empCode, punchTime, String(sn)]
            );
            if (dup.rows.length > 0) continue;

            const allEmployees = await storage.getEmployees();
            const empCodeStr = String(empCode).trim();
            const employee = allEmployees.find((e: any) =>
              e.biometricDeviceId === empCodeStr ||
              e.employeeCode?.toLowerCase() === empCodeStr.toLowerCase() ||
              String(e.id) === empCodeStr ||
              (e.employeeCode && e.employeeCode.split('/').pop() === empCodeStr)
            );

            const logResult = await pool.query(
              `INSERT INTO biometric_punch_logs (device_id, device_ip, employee_code, employee_id, punch_time, punch_type, raw_payload) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
              [String(sn), deviceIp, employee?.employeeCode || empCodeStr, employee?.id || null, punchTime, punchState, line]
            );
            const logId = logResult.rows[0].id;

            if (!employee) {
              await pool.query("UPDATE biometric_punch_logs SET error = $1 WHERE id = $2", [`Employee not found: ${empCodeStr}`, logId]);
              console.log(`[ADMS] Employee not found: ${empCodeStr}`);
              continue;
            }

            const today = format(punchTime, 'yyyy-MM-dd');
            const existing = await storage.getAttendanceByDate(employee.id, today);

            let action: string;

            if (!existing) {
              const checkInHour = punchTime.getHours();
              const checkInMin = punchTime.getMinutes();
              const totalMinutes = checkInHour * 60 + checkInMin;
              const shiftStart = 9 * 60 + 30;
              const lateThreshold = 10 * 60;

              let status = 'present';
              if (totalMinutes > lateThreshold) {
                status = 'half_day';
              } else if (totalMinutes > shiftStart) {
                let cycleStart: Date, cycleEnd: Date;
                if (punchTime.getDate() >= 26) {
                  cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth(), 26);
                  cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth() + 1, 25);
                } else {
                  cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth() - 1, 26);
                  cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth(), 25);
                }
                const cycleLogs = await storage.getAttendanceByDateRange(format(cycleStart, 'yyyy-MM-dd'), format(cycleEnd, 'yyyy-MM-dd'), employee.id);
                const cycleLateCount = cycleLogs.filter((l: any) => l.status === 'late' || l.status === 'late_deducted').length;
                status = cycleLateCount >= 3 ? 'late_deducted' : 'late';
              }

              await storage.createAttendance({
                employeeId: employee.id,
                date: today,
                checkIn: punchTime,
                checkInLocation: `ADMS:${sn}`,
                status,
              });
              action = 'check_in';
            } else if (!existing.checkOut) {
              const checkInTime = existing.checkIn ? new Date(existing.checkIn) : punchTime;
              const workHours = ((punchTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

              let status = existing.status || 'present';
              if (parseFloat(workHours) < 4.5) {
                status = 'full_day_deduction';
              } else if (parseFloat(workHours) < 9 && parseFloat(workHours) >= 4.5 && status === 'present') {
                status = 'half_day';
              }

              await storage.updateAttendance(existing.id, {
                checkOut: punchTime,
                checkOutLocation: `ADMS:${sn}`,
                workHours,
                overtime: parseFloat(workHours) > 9 ? (parseFloat(workHours) - 9).toFixed(2) : "0",
                status,
              });
              action = 'check_out';
            } else {
              await storage.updateAttendance(existing.id, {
                checkIn: punchTime,
                checkInLocation: `ADMS:${sn}`,
                checkOut: null as any,
                checkOutLocation: null as any,
              });
              action = 'check_in';
            }

            await pool.query("UPDATE biometric_punch_logs SET processed = TRUE, processed_at = NOW() WHERE id = $1", [logId]);
            console.log(`[ADMS] ${action}: ${employee.employeeCode} (${employee.firstName}) at ${format(punchTime, 'HH:mm:ss')}`);

            try {
              await storage.createAttendanceLog({
                employeeId: employee.id,
                attendanceId: existing?.id || 0,
                type: action === 'check_in' ? 'check_in' : 'check_out',
                timestamp: punchTime,
                location: `ADMS:${sn}`,
              });
            } catch (e) {}

          } catch (lineErr: any) {
            console.error(`[ADMS] Error processing line: ${lineErr.message}`);
          }
        }
      }

      if (String(sn)) {
        await pool.query(
          "UPDATE biometric_devices SET last_sync = NOW() WHERE name LIKE $1 OR ip = $2",
          [`%${sn}%`, deviceIp]
        ).catch(() => {});
      }

      res.set('Content-Type', 'text/plain');
      res.send('OK');
    } catch (err: any) {
      console.error("[ADMS] Error:", err.message);
      res.set('Content-Type', 'text/plain');
      res.send('OK');
    }
  });

  // Also handle /iclock/getrequest — device polls for commands
  app.get("/iclock/getrequest", (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  });

  // ===== Biometric Punch Endpoint (for K30 Pro and similar devices) =====
  // This endpoint does NOT require session auth — it uses API key or device IP validation
  // The device pushes punch data here on every swipe
  app.post("/api/biometric/punch", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      const deviceIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || '';

      // Validate via API key OR registered device IP
      let authenticated = false;
      if (apiKey && apiKey === process.env.EXTERNAL_API_KEY) {
        authenticated = true;
      } else {
        const deviceCheck = await pool.query("SELECT id FROM biometric_devices WHERE ip = $1 AND status = 'online'", [deviceIp]);
        if (deviceCheck.rows.length > 0) {
          authenticated = true;
        }
      }

      if (!authenticated) {
        console.log(`[Biometric] Rejected punch from IP: ${deviceIp}`);
        return res.status(401).json({ success: false, error: "Unauthorized device" });
      }

      // Accept various payload formats (K30 Pro, ZKTeco, generic)
      const body = req.body;
      const empCode = body.emp_id || body.employee_id || body.employeeCode || body.user_id || body.PIN || body.UserId || '';
      const punchTimeRaw = body.timestamp || body.punch_time || body.AttTime || body.log_time || body.time || '';
      const deviceIdRaw = body.device_id || body.SN || body.DeviceId || body.terminal_id || '';
      const punchTypeRaw = body.punch_type || body.Status || body.type || body.InOutMode || '';

      const punchTime = punchTimeRaw ? new Date(punchTimeRaw.includes('+') || punchTimeRaw.includes('Z') || punchTimeRaw.includes('T') ? punchTimeRaw : punchTimeRaw + '+05:30') : new Date();
      if (isNaN(punchTime.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid timestamp" });
      }

      // Log raw punch
      const logResult = await pool.query(
        `INSERT INTO biometric_punch_logs (device_id, device_ip, employee_code, punch_time, punch_type, raw_payload) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [deviceIdRaw || null, deviceIp, empCode, punchTime, punchTypeRaw || null, JSON.stringify(body)]
      );
      const logId = logResult.rows[0].id;

      if (!empCode) {
        await pool.query("UPDATE biometric_punch_logs SET error = 'No employee code in payload' WHERE id = $1", [logId]);
        return res.status(400).json({ success: false, error: "No employee identifier in payload" });
      }

      const allEmployees = await storage.getEmployees();
      const empCodeStr = String(empCode).trim();
      const employee = allEmployees.find((e: any) =>
        e.biometricDeviceId === empCodeStr ||
        e.employeeCode?.toLowerCase() === empCodeStr.toLowerCase() ||
        String(e.id) === empCodeStr ||
        (e.employeeCode && e.employeeCode.split('/').pop() === empCodeStr)
      );

      if (!employee) {
        await pool.query("UPDATE biometric_punch_logs SET error = $1 WHERE id = $2", [`Employee not found: ${empCode}`, logId]);
        return res.status(404).json({ success: false, error: `Employee not found: ${empCode}` });
      }

      await pool.query("UPDATE biometric_punch_logs SET employee_id = $1 WHERE id = $2", [employee.id, logId]);

      // Determine check-in or check-out
      const today = format(punchTime, 'yyyy-MM-dd');
      const existing = await storage.getAttendanceByDate(employee.id, today);

      let result;
      let action: string;

      if (!existing) {
        // First punch of the day → check-in
        const checkInHour = punchTime.getHours();
        const checkInMin = punchTime.getMinutes();
        const totalMinutes = checkInHour * 60 + checkInMin;
        const shiftStart = 9 * 60 + 30;
        const lateThreshold = 10 * 60;

        let status = 'present';
        if (totalMinutes > lateThreshold) {
          status = 'half_day';
        } else if (totalMinutes > shiftStart) {
          let cycleStart: Date, cycleEnd: Date;
          if (punchTime.getDate() >= 26) {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth(), 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth() + 1, 25);
          } else {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth() - 1, 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth(), 25);
          }
          const cycleLogs = await storage.getAttendanceByDateRange(format(cycleStart, 'yyyy-MM-dd'), format(cycleEnd, 'yyyy-MM-dd'), employee.id);
          const cycleLateCount = cycleLogs.filter((l: any) => l.status === 'late' || l.status === 'late_deducted').length;
          status = cycleLateCount >= 3 ? 'late_deducted' : 'late';
        }

        result = await storage.createAttendance({
          employeeId: employee.id,
          date: today,
          checkIn: punchTime,
          checkInLocation: 'Biometric',
          status,
        });
        action = 'check_in';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: result.id,
            type: 'check_in',
            timestamp: punchTime,
            location: 'Biometric',
          });
        } catch (e) {}
      } else if (!existing.checkOut) {
        // Has check-in but no check-out → check-out
        const checkInTime = existing.checkIn ? new Date(existing.checkIn) : punchTime;
        const workHours = ((punchTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

        const checkOutHour = punchTime.getHours();
        const checkOutMin = punchTime.getMinutes();
        const totalMinutes = checkOutHour * 60 + checkOutMin;
        const shiftEnd = 18 * 60 + 30;
        const earlyThreshold = 18 * 60;

        let status = existing.status || 'present';
        if (totalMinutes < earlyThreshold && !['half_day', 'late_deducted'].includes(status)) {
          status = 'half_day';
        } else if (totalMinutes < shiftEnd && totalMinutes >= earlyThreshold && (status === 'present' || status === 'late')) {
          let cycleStart: Date, cycleEnd: Date;
          if (punchTime.getDate() >= 26) {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth(), 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth() + 1, 25);
          } else {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth() - 1, 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth(), 25);
          }
          const cycleLogs = await storage.getAttendanceByDateRange(format(cycleStart, 'yyyy-MM-dd'), format(cycleEnd, 'yyyy-MM-dd'), employee.id);
          const cycleEarlyCount = cycleLogs.filter((l: any) => l.date !== today && (l.status === 'early_departure' || l.status === 'early_deducted')).length;
          const cycleLateCount = cycleLogs.filter((l: any) => l.status === 'late' || l.status === 'late_deducted').length;
          status = (cycleLateCount + cycleEarlyCount) >= 3 ? 'early_deducted' : 'early_departure';
        }

        if (parseFloat(workHours) < 4.5) {
          status = 'full_day_deduction';
        } else if (parseFloat(workHours) < 9 && parseFloat(workHours) >= 4.5 && status === 'present') {
          status = 'half_day';
        }

        result = await storage.updateAttendance(existing.id, {
          checkOut: punchTime,
          checkOutLocation: 'Biometric',
          workHours,
          overtime: parseFloat(workHours) > 9 ? (parseFloat(workHours) - 9).toFixed(2) : "0",
          status,
        });
        action = 'check_out';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: existing.id,
            type: 'check_out',
            timestamp: punchTime,
            location: 'Biometric',
          });
        } catch (e) {}
      } else {
        // Already has check-in and check-out → treat as re-entry (new check-in)
        result = await storage.updateAttendance(existing.id, {
          checkIn: punchTime,
          checkInLocation: 'Biometric',
          checkOut: null as any,
          checkOutLocation: null as any,
          checkOutLatitude: null as any,
          checkOutLongitude: null as any,
        });
        action = 'check_in';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: existing.id,
            type: 'check_in',
            timestamp: punchTime,
            location: 'Biometric',
          });
        } catch (e) {}
      }

      // Update device last sync
      if (deviceIdRaw) {
        await pool.query("UPDATE biometric_devices SET last_sync = NOW() WHERE ip = $1 OR name = $2", [deviceIp, deviceIdRaw]).catch(() => {});
      }

      // Mark punch log as processed
      await pool.query("UPDATE biometric_punch_logs SET processed = TRUE, processed_at = NOW(), employee_id = $1 WHERE id = $2", [employee.id, logId]);

      console.log(`[Biometric] ${action}: Employee ${employee.employeeCode} (${employee.firstName}) at ${format(punchTime, 'HH:mm:ss')}`);

      res.status(200).json({
        success: true,
        action,
        employee: { id: employee.id, code: employee.employeeCode, name: `${employee.firstName} ${employee.lastName || ''}`.trim() },
        timestamp: punchTime.toISOString(),
      });
    } catch (err: any) {
      console.error("[Biometric] Punch error:", err);
      res.status(500).json({ success: false, error: err.message || "Internal error" });
    }
  });

  // Admin manual punch (bypasses device/API key auth, requires logged-in admin/HR)
  app.post("/api/admin/manual-punch", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const user = req.user as any;
    const roles = (user?.accessRole || '').split(',').map((r: string) => r.trim());
    if (!roles.some((r: string) => ['admin', 'hr_manager'].includes(r))) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    try {
      const body = req.body;
      const empCode = body.employeeCode || body.emp_id || '';
      const punchTimeRaw = body.timestamp || '';
      const deviceIdRaw = body.device_id || 'MANUAL';
      const punchTypeRaw = body.punch_type || '0';

      const punchTime = punchTimeRaw ? new Date(punchTimeRaw.includes('+') || punchTimeRaw.includes('Z') || punchTimeRaw.includes('T') ? punchTimeRaw : punchTimeRaw + '+05:30') : new Date();
      if (isNaN(punchTime.getTime())) {
        return res.status(400).json({ success: false, error: "Invalid timestamp" });
      }

      if (!empCode) {
        return res.status(400).json({ success: false, error: "Employee code is required" });
      }

      const allEmployees = await storage.getEmployees();
      const empCodeStr = String(empCode).trim();
      const employee = allEmployees.find((e: any) =>
        e.biometricDeviceId === empCodeStr ||
        e.employeeCode?.toLowerCase() === empCodeStr.toLowerCase() ||
        String(e.id) === empCodeStr ||
        (e.employeeCode && e.employeeCode.split('/').pop() === empCodeStr)
      );

      if (!employee) {
        return res.status(404).json({ success: false, error: `Employee not found: ${empCode}` });
      }

      const today = format(punchTime, 'yyyy-MM-dd');
      const existing = await storage.getAttendanceByDate(employee.id, today);

      let result;
      let action: string;

      if (!existing) {
        const checkInHour = punchTime.getHours();
        const checkInMin = punchTime.getMinutes();
        const totalMinutes = checkInHour * 60 + checkInMin;
        const shiftStart = 9 * 60 + 30;
        const lateThreshold = 10 * 60;

        let status = 'present';
        if (totalMinutes > lateThreshold) {
          status = 'half_day';
        } else if (totalMinutes > shiftStart) {
          let cycleStart: Date, cycleEnd: Date;
          if (punchTime.getDate() >= 26) {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth(), 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth() + 1, 25);
          } else {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth() - 1, 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth(), 25);
          }
          const cycleLogs = await storage.getAttendanceByDateRange(format(cycleStart, 'yyyy-MM-dd'), format(cycleEnd, 'yyyy-MM-dd'), employee.id);
          const cycleLateCount = cycleLogs.filter((l: any) => l.status === 'late' || l.status === 'late_deducted').length;
          status = cycleLateCount >= 3 ? 'late_deducted' : 'late';
        }

        result = await storage.createAttendance({
          employeeId: employee.id,
          date: today,
          checkIn: punchTime,
          checkInLocation: deviceIdRaw || 'Manual',
          status,
        });
        action = 'check_in';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: result.id,
            type: 'check_in',
            timestamp: punchTime,
            location: deviceIdRaw || 'Manual',
          });
        } catch (e) {}
      } else if (!existing.checkOut) {
        const checkInTime = existing.checkIn ? new Date(existing.checkIn) : punchTime;
        const workHours = ((punchTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);

        const checkOutHour = punchTime.getHours();
        const checkOutMin = punchTime.getMinutes();
        const totalMinutes = checkOutHour * 60 + checkOutMin;
        const shiftEnd = 18 * 60 + 30;
        const earlyThreshold = 18 * 60;

        let status = existing.status || 'present';
        if (totalMinutes < earlyThreshold && !['half_day', 'late_deducted'].includes(status)) {
          status = 'half_day';
        } else if (totalMinutes < shiftEnd && totalMinutes >= earlyThreshold && (status === 'present' || status === 'late')) {
          let cycleStart: Date, cycleEnd: Date;
          if (punchTime.getDate() >= 26) {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth(), 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth() + 1, 25);
          } else {
            cycleStart = new Date(punchTime.getFullYear(), punchTime.getMonth() - 1, 26);
            cycleEnd = new Date(punchTime.getFullYear(), punchTime.getMonth(), 25);
          }
          const cycleLogs = await storage.getAttendanceByDateRange(format(cycleStart, 'yyyy-MM-dd'), format(cycleEnd, 'yyyy-MM-dd'), employee.id);
          const cycleEarlyCount = cycleLogs.filter((l: any) => l.date !== today && (l.status === 'early_departure' || l.status === 'early_deducted')).length;
          const cycleLateCount = cycleLogs.filter((l: any) => l.status === 'late' || l.status === 'late_deducted').length;
          status = (cycleLateCount + cycleEarlyCount) >= 3 ? 'early_deducted' : 'early_departure';
        }

        if (parseFloat(workHours) < 4.5) {
          status = 'full_day_deduction';
        } else if (parseFloat(workHours) < 9 && parseFloat(workHours) >= 4.5 && status === 'present') {
          status = 'half_day';
        }

        result = await storage.updateAttendance(existing.id, {
          checkOut: punchTime,
          checkOutLocation: deviceIdRaw || 'Manual',
          workHours,
          overtime: parseFloat(workHours) > 9 ? (parseFloat(workHours) - 9).toFixed(2) : "0",
          status,
        });
        action = 'check_out';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: existing.id,
            type: 'check_out',
            timestamp: punchTime,
            location: deviceIdRaw || 'Manual',
          });
        } catch (e) {}
      } else {
        result = await storage.updateAttendance(existing.id, {
          checkIn: punchTime,
          checkInLocation: deviceIdRaw || 'Manual',
          checkOut: null as any,
          checkOutLocation: null as any,
          checkOutLatitude: null as any,
          checkOutLongitude: null as any,
        });
        action = 'check_in';

        try {
          await storage.createAttendanceLog({
            employeeId: employee.id,
            attendanceId: existing.id,
            type: 'check_in',
            timestamp: punchTime,
            location: deviceIdRaw || 'Manual',
          });
        } catch (e) {}
      }

      console.log(`[ManualPunch] ${action}: Employee ${employee.employeeCode} (${employee.firstName}) at ${format(punchTime, 'HH:mm:ss')} by admin ${user.email}`);

      res.status(200).json({
        success: true,
        action,
        employee: { id: employee.id, code: employee.employeeCode, name: `${employee.firstName} ${employee.lastName || ''}`.trim() },
        timestamp: punchTime.toISOString(),
      });
    } catch (err: any) {
      console.error("[ManualPunch] Error:", err);
      res.status(500).json({ success: false, error: err.message || "Internal error" });
    }
  });

  // Biometric punch logs viewer (admin only)
  app.get("/api/biometric/punch-logs", async (req, res) => {
    try {
      const { date, limit: lim } = req.query;
      const dateFilter = date ? String(date) : format(new Date(), 'yyyy-MM-dd');
      const rowLimit = Math.min(Number(lim) || 100, 500);
      const result = await pool.query(
        `SELECT bpl.*, e.first_name, e.last_name, e.employee_code as matched_code
         FROM biometric_punch_logs bpl
         LEFT JOIN employees e ON bpl.employee_id = e.id
         WHERE DATE(bpl.punch_time) = $1
         ORDER BY bpl.punch_time DESC
         LIMIT $2`,
        [dateFilter, rowLimit]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== ERP Integrations CRUD =====
  app.get("/api/erp-integrations", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM erp_integrations ORDER BY id");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/erp-integrations", async (req, res) => {
    try {
      const { name, category, status, features, connectionUrl } = req.body;
      const result = await pool.query(
        `INSERT INTO erp_integrations (name, category, status, features, connection_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, category, status || 'available', features || [], connectionUrl || '']
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/erp-integrations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, status, features, connectionUrl } = req.body;
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (name !== undefined) { sets.push(`name=$${i++}`); vals.push(name); }
      if (category !== undefined) { sets.push(`category=$${i++}`); vals.push(category); }
      if (status !== undefined) { sets.push(`status=$${i++}`); vals.push(status); if (status === 'connected') { sets.push(`last_sync=NOW()`); } }
      if (features !== undefined) { sets.push(`features=$${i++}`); vals.push(features); }
      if (connectionUrl !== undefined) { sets.push(`connection_url=$${i++}`); vals.push(connectionUrl); }
      vals.push(id);
      const result = await pool.query(
        `UPDATE erp_integrations SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`,
        vals
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/erp-integrations/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM erp_integrations WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== API Key Management (Admin only) =====
  app.get("/api/admin/api-key", async (req, res) => {
    try {
      const key = process.env.EXTERNAL_API_KEY || '';
      res.json({ apiKey: key });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch API key' });
    }
  });

  app.post("/api/admin/api-key/regenerate", async (req, res) => {
    try {
      const newKey = crypto.randomBytes(32).toString('hex');
      process.env.EXTERNAL_API_KEY = newKey;
      res.json({ apiKey: newKey, message: 'API key regenerated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to regenerate API key' });
    }
  });

  // ===== PUBLIC API ENDPOINTS (API Key Authentication) =====
  const validateApiKey = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    next();
  };

  // Projects
  app.get("/api/external/projects", validateApiKey, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
  });

  app.post("/api/external/projects", validateApiKey, async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to create project' });
    }
  });

  app.post("/api/external/projects/bulk", validateApiKey, async (req, res) => {
    try {
      const { projects: projectList } = req.body;
      if (!Array.isArray(projectList)) return res.status(400).json({ success: false, error: 'projects must be an array' });
      const results = [];
      for (const p of projectList) {
        try {
          const created = await storage.createProject(p);
          results.push({ success: true, data: created });
        } catch (e: any) {
          results.push({ success: false, projectCode: p.projectCode, error: e.message });
        }
      }
      res.status(201).json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create projects' });
    }
  });

  app.patch("/api/external/projects/:id", validateApiKey, async (req, res) => {
    try {
      const project = await storage.updateProject(Number(req.params.id), req.body);
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update project' });
    }
  });

  app.delete("/api/external/projects/:id", validateApiKey, async (req, res) => {
    try {
      await storage.deleteProject(Number(req.params.id));
      res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
  });

  // Payroll
  app.get("/api/external/payroll", validateApiKey, async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ success: false, error: 'month and year required' });
      const payroll = await storage.getPayrollByMonth(String(month), Number(year));
      res.json({ success: true, data: payroll });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch payroll' });
    }
  });

  app.get("/api/external/payroll/:id", validateApiKey, async (req, res) => {
    try {
      const record = await storage.getPayrollRecord(Number(req.params.id));
      if (!record) return res.status(404).json({ success: false, error: 'Payroll record not found' });
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch payroll record' });
    }
  });

  // Employees
  app.get("/api/external/employees", validateApiKey, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json({ success: true, data: employees });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch employees' });
    }
  });

  app.get("/api/external/employees/:id", validateApiKey, async (req, res) => {
    try {
      const employee = await storage.getEmployee(Number(req.params.id));
      if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
      res.json({ success: true, data: employee });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch employee' });
    }
  });

  // Salary Structures
  app.get("/api/external/salary-structures", validateApiKey, async (req, res) => {
    try {
      const structures = await storage.getSalaryStructures();
      res.json({ success: true, data: structures });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch salary structures' });
    }
  });

  // Attendance
  app.get("/api/external/attendance", validateApiKey, async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ success: false, error: 'date required (YYYY-MM-DD)' });
      const attendance = await storage.getAttendanceByDate(String(date));
      res.json({ success: true, data: attendance });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
  });

  // Departments
  app.get("/api/external/departments", validateApiKey, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json({ success: true, data: departments });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
  });

  // Loans
  app.get("/api/external/loans", validateApiKey, async (req, res) => {
    try {
      const loans = await storage.getLoans();
      res.json({ success: true, data: loans });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch loans' });
    }
  });

  // ===== External API: Journal Entries =====
  app.get("/api/external/journal-entries", validateApiKey, async (req: any, res: any) => {
    try {
      const { month, year } = req.query;
      let query = "SELECT * FROM journal_entries";
      const params: any[] = [];
      const conditions: string[] = [];
      if (month) { conditions.push(`month=$${params.length + 1}`); params.push(month); }
      if (year) { conditions.push(`year=$${params.length + 1}`); params.push(Number(year)); }
      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += " ORDER BY payee_name, line_no";
      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Seed default GL account mappings
  try {
    const existingMappings = await pool.query("SELECT COUNT(*) FROM gl_account_mappings");
    if (Number(existingMappings.rows[0].count) === 0) {
      const defaultMappings = [
        ['basic_salary', '43401', '24025', 'Basic', 'earning', 10000],
        ['da', '43404', '24025', 'Dearness Allowance', 'earning', 20000],
        ['hra', '43402', '24025', 'House rent allowance', 'earning', 30000],
        ['conveyance', '43403', '24025', 'Conveyance allowance(Salary)', 'earning', 40000],
        ['communication_allowance', '43405', '24025', 'Communication allowance', 'earning', 50000],
        ['medical_allowance', '43406', '24025', 'Medical Allowance', 'earning', 60000],
        ['insurance_premium', '25102', '24025', 'Health Insurance (Employee Share)', 'deduction', 70000],
        ['tds', '26011', '24025', 'Tds Payable on Salary - 192', 'deduction', 80000],
        ['epf', '25101', '24079', 'EPF Payable', 'deduction', 310000],
        ['other_allowances', '43419', '24044', 'Other Allowance', 'earning', 580000],
        ['advance', '13004', '24085', 'Employee Loan A/C', 'deduction', 1070000],
        ['high_altitude_allowance', '43416', '24104', 'High Altitude Allowance', 'earning', 1140000],
        ['other_deductions', '43411', '24078', 'Other Deductions', 'deduction', 1650000],
        ['variable_pay', '43424', '24119', 'Retention Bonus', 'earning', 4510000],
        ['professional_tax', '26012', '24025', 'Professional Tax', 'deduction', 90000],
        ['lwf', '26013', '24025', 'Labour Welfare Fund', 'deduction', 100000],
        ['special_allowance', '43418', '24025', 'Special Allowance', 'earning', 110000],
        ['arrear', '43407', '24025', 'Arrear', 'earning', 120000],
        ['bonus', '43408', '24025', 'Bonus', 'earning', 130000],
        ['overtime_pay', '43409', '24025', 'Overtime Pay', 'earning', 140000],
        ['birthday_allowance', '43410', '24025', 'Birthday Allowance', 'earning', 150000],
        ['lop_deduction', '43412', '24025', 'LOP Deduction', 'deduction', 160000],
      ];
      for (const m of defaultMappings) {
        await pool.query(
          `INSERT INTO gl_account_mappings (component, account_no, bal_account_no, description, type, line_no_base) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (component) DO NOTHING`,
          m
        );
      }
      console.log("Seeded default GL account mappings");
    }
  } catch (err) {
    console.log("GL mappings seed skipped:", err);
  }

  // Seed database with comprehensive data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const depts = await storage.getDepartments();
  if (depts.length > 0) return;

  // Create departments
  const hr = await storage.createDepartment({ name: "Human Resources", description: "People & Culture" });
  const tech = await storage.createDepartment({ name: "Engineering", description: "Product Development" });
  const sales = await storage.createDepartment({ name: "Sales", description: "Revenue Generation" });
  const finance = await storage.createDepartment({ name: "Finance", description: "Financial Operations" });
  const admin = await storage.createDepartment({ name: "Administration", description: "Office Management" });

  // Create leave types
  await storage.createLeaveType({ name: "Casual Leave", code: "CL", annualAllowance: 12, carryForward: false, isPaid: true });
  await storage.createLeaveType({ name: "Sick Leave", code: "SL", annualAllowance: 12, carryForward: true, maxCarryForward: 6, isPaid: true });
  await storage.createLeaveType({ name: "Earned Leave", code: "EL", annualAllowance: 15, carryForward: true, maxCarryForward: 30, isPaid: true });
  await storage.createLeaveType({ name: "Maternity Leave", code: "ML", annualAllowance: 180, carryForward: false, isPaid: true });
  await storage.createLeaveType({ name: "Paternity Leave", code: "PL", annualAllowance: 15, carryForward: false, isPaid: true });
  await storage.createLeaveType({ name: "Loss of Pay", code: "LOP", annualAllowance: 365, carryForward: false, isPaid: false });

  // Create employees
  const emp1 = await storage.createEmployee({
    employeeCode: "EMP001",
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "rajesh.kumar@company.com",
    phone: "+91 9876543210",
    dateOfBirth: "1990-05-15",
    gender: "male",
    departmentId: tech.id,
    designation: "Senior Software Engineer",
    employmentType: "full_time",
    joinDate: "2022-03-15",
    confirmationDate: "2022-09-15",
    status: "active",
    address: "123 Tech Park, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    pincode: "560001",
  });

  const emp2 = await storage.createEmployee({
    employeeCode: "EMP002",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@company.com",
    phone: "+91 9876543211",
    dateOfBirth: "1992-08-22",
    gender: "female",
    departmentId: hr.id,
    designation: "HR Manager",
    employmentType: "full_time",
    joinDate: "2021-06-01",
    confirmationDate: "2021-12-01",
    status: "active",
  });

  const emp3 = await storage.createEmployee({
    employeeCode: "EMP003",
    firstName: "Amit",
    lastName: "Patel",
    email: "amit.patel@company.com",
    phone: "+91 9876543212",
    dateOfBirth: "1988-12-10",
    gender: "male",
    departmentId: sales.id,
    designation: "Sales Manager",
    employmentType: "full_time",
    joinDate: "2020-01-10",
    status: "active",
  });

  const emp4 = await storage.createEmployee({
    employeeCode: "EMP004",
    firstName: "Sneha",
    lastName: "Reddy",
    email: "sneha.reddy@company.com",
    phone: "+91 9876543213",
    dateOfBirth: "1995-03-28",
    gender: "female",
    departmentId: finance.id,
    designation: "Financial Analyst",
    employmentType: "full_time",
    joinDate: "2023-09-01",
    status: "active",
  });

  const emp5 = await storage.createEmployee({
    employeeCode: "EMP005",
    firstName: "Vikram",
    lastName: "Singh",
    email: "vikram.singh@company.com",
    phone: "+91 9876543214",
    dateOfBirth: "1991-07-05",
    gender: "male",
    departmentId: tech.id,
    designation: "DevOps Engineer",
    employmentType: "full_time",
    joinDate: "2023-11-15",
    status: "active",
  });

  // Create attendance
  const today = format(new Date(), 'yyyy-MM-dd');
  await storage.createAttendance({ employeeId: emp1.id, date: today, checkIn: new Date(), status: "present" });
  await storage.createAttendance({ employeeId: emp2.id, date: today, checkIn: new Date(), status: "present" });
  await storage.createAttendance({ employeeId: emp3.id, date: today, checkIn: new Date(), status: "present" });

  // Create leave requests
  await storage.createLeaveRequest({
    employeeId: emp1.id,
    leaveType: "casual",
    startDate: "2024-12-23",
    endDate: "2024-12-25",
    days: "3",
    reason: "Family function",
    status: "pending"
  });

  await storage.createLeaveRequest({
    employeeId: emp4.id,
    leaveType: "sick",
    startDate: "2024-12-20",
    endDate: "2024-12-21",
    days: "2",
    reason: "Not feeling well",
    status: "approved"
  });

  // Create holidays
  const currentYear = new Date().getFullYear();
  await storage.createHoliday({ name: "Republic Day", date: `${currentYear}-01-26`, type: "public", year: currentYear });
  await storage.createHoliday({ name: "Holi", date: `${currentYear}-03-25`, type: "public", year: currentYear });
  await storage.createHoliday({ name: "Good Friday", date: `${currentYear}-03-29`, type: "public", year: currentYear });
  await storage.createHoliday({ name: "Independence Day", date: `${currentYear}-08-15`, type: "public", year: currentYear });
  await storage.createHoliday({ name: "Diwali", date: `${currentYear}-11-01`, type: "public", year: currentYear });
  await storage.createHoliday({ name: "Christmas", date: `${currentYear}-12-25`, type: "public", year: currentYear });

  // Create payroll records
  await storage.createPayroll({
    employeeId: emp1.id,
    month: "2024-11",
    year: 2024,
    basicSalary: "50000",
    hra: "20000",
    conveyance: "3000",
    specialAllowance: "15000",
    allowances: "38000",
    pf: "6000",
    professionalTax: "200",
    incomeTax: "5000",
    deductions: "11200",
    grossSalary: "88000",
    netSalary: "76800",
    workingDays: "22",
    status: "paid"
  });

  await storage.createPayroll({
    employeeId: emp2.id,
    month: "2024-11",
    year: 2024,
    basicSalary: "60000",
    hra: "24000",
    specialAllowance: "20000",
    allowances: "44000",
    pf: "7200",
    professionalTax: "200",
    incomeTax: "8000",
    deductions: "15400",
    grossSalary: "104000",
    netSalary: "88600",
    workingDays: "22",
    status: "paid"
  });

  // Create expenses
  await storage.createExpense({
    employeeId: emp3.id,
    category: "travel",
    amount: "15000",
    expenseDate: "2024-12-10",
    description: "Client visit to Mumbai",
    status: "pending"
  });

  await storage.createExpense({
    employeeId: emp1.id,
    category: "food",
    amount: "2500",
    expenseDate: "2024-12-15",
    description: "Team lunch",
    status: "approved"
  });

  // Create assets
  await storage.createAsset({
    assetCode: "LAPTOP-001",
    name: "MacBook Pro 16",
    category: "laptop",
    brand: "Apple",
    model: "MacBook Pro 16-inch 2023",
    serialNumber: "C02YX1ZVMD6N",
    purchaseDate: "2023-01-15",
    purchasePrice: "250000",
    warrantyEndDate: "2026-01-15",
    employeeId: emp1.id,
    assignedDate: "2023-03-15",
    status: "assigned",
    condition: "good"
  });

  await storage.createAsset({
    assetCode: "LAPTOP-002",
    name: "Dell XPS 15",
    category: "laptop",
    brand: "Dell",
    model: "XPS 15 9530",
    serialNumber: "DELL123456",
    purchaseDate: "2023-06-01",
    purchasePrice: "180000",
    warrantyEndDate: "2025-06-01",
    employeeId: emp2.id,
    assignedDate: "2023-06-15",
    status: "assigned",
    condition: "good"
  });

  await storage.createAsset({
    assetCode: "MONITOR-001",
    name: "Dell UltraSharp 27",
    category: "monitor",
    brand: "Dell",
    model: "U2722D",
    serialNumber: "DELLMON001",
    purchaseDate: "2023-01-15",
    purchasePrice: "45000",
    status: "available",
    condition: "good"
  });

  // Create announcements
  await storage.createAnnouncement({
    title: "Year-End Party",
    content: "We are excited to announce our annual year-end celebration on December 28th! Join us for an evening of fun, food, and festivities.",
    type: "event",
    priority: "high",
    publishedAt: new Date(),
    isActive: true
  });

  await storage.createAnnouncement({
    title: "New Leave Policy Update",
    content: "Please note that starting January 2025, we are introducing a new work-from-home policy. Employees can now work from home up to 3 days per week.",
    type: "policy",
    priority: "normal",
    publishedAt: new Date(),
    isActive: true
  });

  // Create onboarding tasks for new employee
  await storage.createOnboardingTask({
    employeeId: emp5.id,
    taskName: "Complete Personal Information Form",
    category: "hr_formalities",
    status: "completed",
    dueDate: "2023-11-17"
  });

  await storage.createOnboardingTask({
    employeeId: emp5.id,
    taskName: "Submit ID Proof & Address Proof",
    category: "documents",
    status: "completed",
    dueDate: "2023-11-20"
  });

  await storage.createOnboardingTask({
    employeeId: emp5.id,
    taskName: "IT Equipment Setup",
    category: "it_setup",
    status: "completed",
    dueDate: "2023-11-16"
  });

  await storage.createOnboardingTask({
    employeeId: emp5.id,
    taskName: "Complete Security Training",
    category: "training",
    status: "pending",
    dueDate: "2023-11-30"
  });
}
