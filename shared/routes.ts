import { z } from 'zod';
import { 
  insertEmployeeSchema, 
  insertDepartmentSchema,
  insertLeaveRequestSchema,
  insertAttendanceSchema,
  insertPayrollSchema,
  insertExpenseSchema,
  insertAssetSchema,
  insertAnnouncementSchema,
  insertExitRecordSchema,
  insertHolidaySchema,
  insertDocumentSchema,
  insertProjectSchema,
  employees,
  departments,
  leaveRequests,
  attendance,
  payroll,
  onboardingTasks,
  expenses,
  assets,
  announcements,
  exitRecords,
  holidays,
  documents,
  leaveTypes,
  leaveBalances,
  projects
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // Dashboard
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalEmployees: z.number(),
          activeEmployees: z.number(),
          onLeaveToday: z.number(),
          pendingLeaveRequests: z.number(),
          pendingExpenses: z.number(),
          presentToday: z.number(),
          newJoinees: z.number(),
          upcomingBirthdays: z.array(z.any()),
          recentAnnouncements: z.array(z.any()),
        }),
      },
    },
  },

  // Employees
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees',
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:id',
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees',
      input: insertEmployeeSchema,
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/employees/:id',
      input: insertEmployeeSchema.partial(),
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/employees/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // Departments
  departments: {
    list: {
      method: 'GET' as const,
      path: '/api/departments',
      responses: {
        200: z.array(z.custom<typeof departments.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/departments/:id',
      responses: {
        200: z.custom<typeof departments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/departments',
      input: insertDepartmentSchema,
      responses: {
        201: z.custom<typeof departments.$inferSelect>(),
      },
    },
  },

  // Documents
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents',
      input: z.object({ employeeId: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/documents',
      input: insertDocumentSchema,
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
      },
    },
  },

  // Attendance
  attendance: {
    list: {
      method: 'GET' as const,
      path: '/api/attendance',
      input: z.object({ employeeId: z.coerce.number().optional(), date: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
      },
    },
    checkIn: {
      method: 'POST' as const,
      path: '/api/attendance/check-in',
      input: z.object({ employeeId: z.number(), location: z.string().optional(), latitude: z.string().optional(), longitude: z.string().optional() }),
      responses: {
        201: z.custom<typeof attendance.$inferSelect>(),
      },
    },
    checkOut: {
      method: 'POST' as const,
      path: '/api/attendance/check-out',
      input: z.object({ employeeId: z.number(), location: z.string().optional(), latitude: z.string().optional(), longitude: z.string().optional() }),
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
      },
    },
    regularize: {
      method: 'POST' as const,
      path: '/api/attendance/:id/regularize',
      input: z.object({ reason: z.string() }),
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
      },
    },
  },

  // Leave Types
  leaveTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/leave-types',
      responses: {
        200: z.array(z.custom<typeof leaveTypes.$inferSelect>()),
      },
    },
  },

  // Leave Balances
  leaveBalances: {
    list: {
      method: 'GET' as const,
      path: '/api/leave-balances',
      input: z.object({ employeeId: z.coerce.number() }),
      responses: {
        200: z.array(z.custom<typeof leaveBalances.$inferSelect>()),
      },
    },
  },

  // Leave Requests
  leave: {
    list: {
      method: 'GET' as const,
      path: '/api/leaves',
      input: z.object({ employeeId: z.coerce.number().optional(), status: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof leaveRequests.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/leaves',
      input: insertLeaveRequestSchema,
      responses: {
        201: z.custom<typeof leaveRequests.$inferSelect>(),
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/leaves/:id/status',
      input: z.object({ status: z.enum(['approved', 'rejected', 'cancelled']), remarks: z.string().optional() }),
      responses: {
        200: z.custom<typeof leaveRequests.$inferSelect>(),
      },
    },
  },

  // Holidays
  holidays: {
    list: {
      method: 'GET' as const,
      path: '/api/holidays',
      input: z.object({ year: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof holidays.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/holidays',
      input: insertHolidaySchema,
      responses: {
        201: z.custom<typeof holidays.$inferSelect>(),
      },
    },
  },

  // Payroll
  payroll: {
    list: {
      method: 'GET' as const,
      path: '/api/payroll',
      input: z.object({ employeeId: z.coerce.number().optional(), month: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof payroll.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/payroll',
      input: insertPayrollSchema,
      responses: {
        201: z.custom<typeof payroll.$inferSelect>(),
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/payroll/:id/status',
      input: z.object({ status: z.enum(['processed', 'approved', 'paid']) }),
      responses: {
        200: z.custom<typeof payroll.$inferSelect>(),
      },
    },
  },

  // Expenses
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses',
      input: z.object({ employeeId: z.coerce.number().optional(), status: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/expenses/:id/status',
      input: z.object({ status: z.enum(['approved', 'rejected', 'reimbursed']), remarks: z.string().optional() }),
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
      },
    },
  },

  // Assets
  assets: {
    list: {
      method: 'GET' as const,
      path: '/api/assets',
      input: z.object({ employeeId: z.coerce.number().optional(), status: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof assets.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/assets/:id',
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/assets',
      input: insertAssetSchema,
      responses: {
        201: z.custom<typeof assets.$inferSelect>(),
      },
    },
    assign: {
      method: 'POST' as const,
      path: '/api/assets/:id/assign',
      input: z.object({ employeeId: z.number(), assignedDate: z.string() }),
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
      },
    },
    return: {
      method: 'POST' as const,
      path: '/api/assets/:id/return',
      input: z.object({ returnedDate: z.string(), condition: z.string().optional() }),
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
      },
    },
  },

  // Exit Management
  exit: {
    list: {
      method: 'GET' as const,
      path: '/api/exit-records',
      input: z.object({ status: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof exitRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/exit-records',
      input: insertExitRecordSchema,
      responses: {
        201: z.custom<typeof exitRecords.$inferSelect>(),
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/exit-records/:id/status',
      input: z.object({ clearanceStatus: z.string().optional(), fnfStatus: z.string().optional() }),
      responses: {
        200: z.custom<typeof exitRecords.$inferSelect>(),
      },
    },
  },

  // Announcements
  announcements: {
    list: {
      method: 'GET' as const,
      path: '/api/announcements',
      responses: {
        200: z.array(z.custom<typeof announcements.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/announcements',
      input: insertAnnouncementSchema,
      responses: {
        201: z.custom<typeof announcements.$inferSelect>(),
      },
    },
  },

  // Onboarding
  onboarding: {
    list: {
      method: 'GET' as const,
      path: '/api/onboarding',
      input: z.object({ employeeId: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof onboardingTasks.$inferSelect>()),
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/onboarding/:id/status',
      input: z.object({ status: z.enum(['pending', 'completed']) }),
      responses: {
        200: z.custom<typeof onboardingTasks.$inferSelect>(),
      },
    },
  },

  // Projects
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    analytics: {
      method: 'GET' as const,
      path: '/api/projects/analytics',
      responses: {
        200: z.array(z.object({
          projectId: z.number(),
          projectCode: z.string(),
          projectName: z.string(),
          budget: z.number(),
          revenue: z.number(),
          employeeCount: z.number(),
          totalSalary: z.number(),
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
