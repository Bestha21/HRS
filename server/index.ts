import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { pool } from "./db";


process.on('SIGHUP', () => {});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error('[FATAL] Stack:', err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled Rejection:', reason?.message || reason);
  console.error('[FATAL] Stack:', reason?.stack);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use('/iclock', express.text({ type: '*/*', limit: '5mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    // Phase 1: Core tables with no foreign key dependencies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        password VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        reset_token VARCHAR,
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);
      CREATE TABLE IF NOT EXISTS salary_structures (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        basic_percent NUMERIC NOT NULL,
        hra_percent NUMERIC NOT NULL,
        conveyance_percent NUMERIC NOT NULL,
        da_percent NUMERIC NOT NULL,
        communication_percent NUMERIC NOT NULL,
        medical_percent NUMERIC NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        manager_id INTEGER,
        parent_department_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        grace_minutes INTEGER DEFAULT 15,
        working_hours NUMERIC DEFAULT 8,
        is_default BOOLEAN DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        annual_allowance INTEGER DEFAULT 12,
        carry_forward BOOLEAN DEFAULT false,
        max_carry_forward INTEGER DEFAULT 0,
        is_paid BOOLEAN DEFAULT true,
        description TEXT
      );
      INSERT INTO leave_types (name, code, annual_allowance, carry_forward, max_carry_forward, is_paid, description)
      VALUES
        ('Earned Leave', 'EL', 18, true, 30, true, 'Earned Leave - credited end of quarter, carry forward max 30 days'),
        ('Casual Leave', 'CL', 7, false, 0, true, 'Casual Leave - bi-annually credited'),
        ('Sick Leave', 'SL', 7, false, 0, true, 'Sick Leave - bi-annually credited, medical certificate required'),
        ('Bereavement Leave', 'BL', 2, false, 0, true, 'Bereavement Leave - applicable to spouse, children, parents and blood relation'),
        ('Paternity Leave', 'PL', 4, false, 0, true, 'Paternity Leave - yearly'),
        ('Comp Off', 'CO', 0, true, 0, true, 'Compensatory Off - as per applicability')
      ON CONFLICT (code) DO NOTHING;
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        type TEXT DEFAULT 'public',
        description TEXT,
        year INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        priority TEXT DEFAULT 'normal',
        published_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS letter_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        placeholders TEXT,
        status TEXT DEFAULT 'active',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS org_positions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        level INTEGER NOT NULL,
        parent_id INTEGER,
        employee_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pt_rules (
        id SERIAL PRIMARY KEY,
        state TEXT NOT NULL,
        slab_from NUMERIC,
        slab_to NUMERIC,
        pt_amount NUMERIC NOT NULL DEFAULT 0,
        frequency TEXT DEFAULT 'monthly',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pt_rules' AND column_name='pt_amount') THEN
          ALTER TABLE pt_rules ADD COLUMN pt_amount NUMERIC NOT NULL DEFAULT 0;
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS lwf_rules (
        id SERIAL PRIMARY KEY,
        state TEXT NOT NULL,
        employee_contribution NUMERIC NOT NULL,
        employer_contribution NUMERIC NOT NULL,
        frequency TEXT DEFAULT 'half-yearly',
        applicable_months TEXT,
        gross_salary_threshold NUMERIC,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS company_policies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        file_name TEXT,
        file_data TEXT,
        mime_type TEXT,
        file_size INTEGER,
        version TEXT DEFAULT '1.0',
        is_active BOOLEAN DEFAULT true,
        uploaded_by INTEGER,
        download_allowed_employees TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        client_name TEXT,
        budget NUMERIC DEFAULT 0,
        revenue NUMERIC DEFAULT 0,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'active',
        manager_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gl_account_mappings (
        id SERIAL PRIMARY KEY,
        component TEXT NOT NULL UNIQUE,
        account_no TEXT NOT NULL,
        bal_account_no TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'earning',
        line_no_base INTEGER DEFAULT 10000,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS biometric_devices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        ip TEXT,
        status TEXT DEFAULT 'offline',
        last_sync TIMESTAMP,
        employees INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS erp_integrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        last_sync TIMESTAMP,
        features TEXT[] DEFAULT '{}',
        connection_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS salary_adjustments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        adjustment_type TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        lop_days_reversed NUMERIC DEFAULT 0,
        leave_type_used TEXT,
        leave_days_deducted NUMERIC DEFAULT 0,
        reason TEXT NOT NULL,
        supporting_info TEXT,
        status TEXT DEFAULT 'pending',
        requested_by INTEGER NOT NULL,
        approved_by INTEGER,
        approved_at TIMESTAMP,
        approval_remarks TEXT,
        processed_in_month TEXT,
        processed_in_year INTEGER,
        payroll_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hr_action_log (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        reference_id INTEGER,
        reference_type TEXT,
        employee_id INTEGER,
        performed_by INTEGER NOT NULL,
        performed_by_name TEXT,
        details TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Phase 2: Tables that depend on departments, leave_types, etc.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        auth_user_id TEXT,
        employee_code TEXT UNIQUE,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        alternate_contact_number TEXT,
        personal_email TEXT,
        date_of_birth DATE,
        actual_date_of_birth DATE,
        gender TEXT,
        blood_group TEXT,
        marital_status TEXT,
        spouse_name TEXT,
        date_of_marriage DATE,
        father_name TEXT,
        mother_name TEXT,
        address TEXT,
        permanent_address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        pincode TEXT,
        location TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        emergency_contact_relation TEXT,
        emergency_contact1_name TEXT,
        emergency_contact1_phone TEXT,
        emergency_contact1_relation TEXT,
        emergency_contact2_name TEXT,
        emergency_contact2_phone TEXT,
        emergency_contact2_relation TEXT,
        department_id INTEGER REFERENCES departments(id),
        designation TEXT,
        hod_id TEXT,
        reporting_manager_id TEXT,
        employment_type TEXT DEFAULT 'permanent',
        position_type TEXT,
        replaced_employee_name TEXT,
        employment_status TEXT DEFAULT 'probation',
        join_date DATE NOT NULL,
        confirmation_date DATE,
        probation_end_date DATE,
        status TEXT DEFAULT 'active',
        bgv_status TEXT,
        highest_qualification TEXT,
        specialization TEXT,
        institute_name TEXT,
        qualification_score TEXT,
        second_highest_qualification TEXT,
        second_specialization TEXT,
        second_institute_name TEXT,
        second_qualification_score TEXT,
        vice_president_id INTEGER,
        entity TEXT,
        bank_name TEXT,
        branch_name TEXT,
        bank_account_number TEXT,
        ifsc_code TEXT,
        pan_number TEXT,
        aadhar_number TEXT,
        pf_status TEXT,
        pf_number TEXT,
        esi_number TEXT,
        uan_number TEXT,
        tax_regime TEXT,
        sourcing_channel TEXT,
        sourcing_name TEXT,
        project_id INTEGER,
        ctc NUMERIC,
        retention_bonus NUMERIC,
        retention_bonus_duration TEXT,
        retention_bonus_start_date DATE,
        notice_buyout NUMERIC,
        notice_buyout_duration TEXT,
        notice_buyout_payments INTEGER,
        birthday_allowance NUMERIC,
        salary_structure_id INTEGER,
        profile_image_url TEXT,
        insurance_annual_premium NUMERIC,
        insurance_employee_share_percent NUMERIC DEFAULT 40,
        insurance_employer_share_percent NUMERIC DEFAULT 60,
        insurance_cycle_start_date DATE,
        insurance_cycle_end_date DATE,
        health_insurance_provider TEXT,
        health_insurance_policy_number TEXT,
        health_insurance_sum_insured TEXT,
        health_insurance_start_date DATE,
        health_insurance_end_date DATE,
        life_insurance_provider TEXT,
        life_insurance_policy_number TEXT,
        life_insurance_sum_insured TEXT,
        life_insurance_nominee_name TEXT,
        life_insurance_nominee_relation TEXT,
        personal_accident_provider TEXT,
        personal_accident_policy_number TEXT,
        personal_accident_sum_insured TEXT,
        access_role TEXT DEFAULT 'employee',
        onboarding_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Phase 3: Tables that depend on employees
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        document_type TEXT NOT NULL,
        document_name TEXT NOT NULL,
        file_url TEXT,
        file_path TEXT,
        file_size INTEGER,
        file_data TEXT,
        mime_type TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        verified_at TIMESTAMP,
        status TEXT DEFAULT 'pending'
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        date DATE NOT NULL,
        check_in TIMESTAMP,
        check_out TIMESTAMP,
        work_hours NUMERIC,
        overtime NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'present',
        location TEXT,
        check_in_location TEXT,
        check_out_location TEXT,
        regularization_status TEXT,
        regularization_reason TEXT
      );
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
        year INTEGER NOT NULL,
        opening NUMERIC DEFAULT 0,
        accrued NUMERIC DEFAULT 0,
        used NUMERIC DEFAULT 0,
        balance NUMERIC DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        leave_type_id INTEGER REFERENCES leave_types(id),
        leave_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days NUMERIC DEFAULT 1,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at TIMESTAMP,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        month TEXT NOT NULL,
        year INTEGER,
        basic_salary NUMERIC NOT NULL,
        hra NUMERIC DEFAULT 0,
        conveyance NUMERIC DEFAULT 0,
        da NUMERIC DEFAULT 0,
        communication_allowance NUMERIC DEFAULT 0,
        medical_allowance NUMERIC DEFAULT 0,
        variable_pay NUMERIC DEFAULT 0,
        high_altitude_allowance NUMERIC DEFAULT 0,
        arrear NUMERIC DEFAULT 0,
        bonus NUMERIC DEFAULT 0,
        other_earnings NUMERIC DEFAULT 0,
        birthday_allowance NUMERIC DEFAULT 0,
        special_allowance NUMERIC DEFAULT 0,
        other_allowances NUMERIC DEFAULT 0,
        allowances NUMERIC DEFAULT 0,
        earnings_remarks TEXT,
        insurance_premium NUMERIC DEFAULT 0,
        tds NUMERIC DEFAULT 0,
        advance NUMERIC DEFAULT 0,
        epf NUMERIC DEFAULT 0,
        pf NUMERIC DEFAULT 0,
        esi NUMERIC DEFAULT 0,
        professional_tax NUMERIC DEFAULT 0,
        lwf NUMERIC DEFAULT 0,
        income_tax NUMERIC DEFAULT 0,
        other_deductions NUMERIC DEFAULT 0,
        deductions NUMERIC DEFAULT 0,
        deductions_remarks TEXT,
        lop_deduction NUMERIC DEFAULT 0,
        gross_salary NUMERIC DEFAULT 0,
        net_salary NUMERIC NOT NULL,
        ctc NUMERIC DEFAULT 0,
        total_days INTEGER,
        lop NUMERIC DEFAULT 0,
        working_days NUMERIC,
        salary_structure_id INTEGER,
        mode_of_payment TEXT DEFAULT 'Account Transfer',
        status TEXT DEFAULT 'draft',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'INR',
        expense_date DATE NOT NULL,
        description TEXT,
        receipt_url TEXT,
        status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at TIMESTAMP,
        reimbursed_at TIMESTAMP,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        asset_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        purchase_date DATE,
        purchase_price NUMERIC,
        warranty_end_date DATE,
        employee_id INTEGER REFERENCES employees(id),
        assigned_date DATE,
        returned_date DATE,
        status TEXT DEFAULT 'available',
        condition TEXT DEFAULT 'good',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS exit_records (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        exit_type TEXT NOT NULL,
        resignation_date DATE,
        last_working_date DATE,
        notice_period_days INTEGER DEFAULT 30,
        reason TEXT,
        exit_interview_done BOOLEAN DEFAULT false,
        exit_interview_notes TEXT,
        clearance_status TEXT DEFAULT 'pending',
        fnf_status TEXT DEFAULT 'pending',
        fnf_amount NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS clearance_tasks (
        id SERIAL PRIMARY KEY,
        exit_record_id INTEGER NOT NULL REFERENCES exit_records(id),
        department TEXT NOT NULL,
        task_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        completed_by INTEGER,
        completed_at TIMESTAMP,
        remarks TEXT
      );
      CREATE TABLE IF NOT EXISTS onboarding_tasks (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        task_name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'pending',
        due_date DATE,
        completed_at TIMESTAMP,
        assigned_to TEXT
      );
      CREATE TABLE IF NOT EXISTS onboarding_tokens (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS offer_letters (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        designation TEXT NOT NULL,
        department TEXT,
        salary NUMERIC,
        joining_date DATE NOT NULL,
        reporting_manager TEXT,
        work_location TEXT,
        content TEXT,
        status TEXT DEFAULT 'draft',
        sent_at TIMESTAMP,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS generated_letters (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        template_id INTEGER REFERENCES letter_templates(id),
        letter_type TEXT NOT NULL,
        content TEXT NOT NULL,
        generated_at TIMESTAMP DEFAULT NOW(),
        generated_by INTEGER,
        status TEXT DEFAULT 'draft',
        sent_at TIMESTAMP,
        signed_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS onboarding_documents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        document_type TEXT NOT NULL,
        document_name TEXT NOT NULL,
        file_name TEXT,
        file_data TEXT,
        file_size INTEGER,
        mime_type TEXT,
        status TEXT DEFAULT 'pending',
        verified_by INTEGER,
        verified_at TIMESTAMP,
        remarks TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tax_declarations (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        financial_year TEXT NOT NULL,
        section TEXT NOT NULL,
        investment_type TEXT NOT NULL,
        other_details TEXT,
        amount NUMERIC NOT NULL,
        file_name TEXT,
        file_data TEXT,
        file_size INTEGER,
        mime_type TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        review_remarks TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS birthday_wishes (
        id SERIAL PRIMARY KEY,
        from_employee_id INTEGER NOT NULL REFERENCES employees(id),
        to_employee_id INTEGER NOT NULL REFERENCES employees(id),
        message TEXT NOT NULL,
        banner_type TEXT DEFAULT 'confetti',
        type TEXT DEFAULT 'birthday',
        tagged_employee_ids TEXT,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        eligible_amount NUMERIC,
        eligibility_months INTEGER,
        repayment_months INTEGER NOT NULL,
        emi_amount NUMERIC,
        total_repaid NUMERIC DEFAULT 0,
        remaining_balance NUMERIC,
        start_date TEXT,
        end_date TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at TIMESTAMP,
        remarks TEXT,
        foreclosure_date TEXT,
        foreclosure_remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS policy_acknowledgments (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER NOT NULL REFERENCES company_policies(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        viewed_at TIMESTAMP,
        acknowledged_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Phase 3.5: Tables that depend on payroll
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        payroll_id INTEGER REFERENCES payroll(id),
        employee_id INTEGER REFERENCES employees(id),
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        journal_template_name TEXT DEFAULT 'JOURNALV',
        journal_batch_name TEXT DEFAULT 'SALARY',
        line_no INTEGER NOT NULL,
        account_type TEXT DEFAULT 'G/L Account',
        account_no TEXT NOT NULL,
        posting_date TEXT NOT NULL,
        document_type TEXT,
        document_no TEXT,
        description TEXT NOT NULL,
        bal_account_no TEXT,
        amount NUMERIC DEFAULT 0,
        debit_amount NUMERIC DEFAULT 0,
        credit_amount NUMERIC DEFAULT 0,
        bal_account_type TEXT DEFAULT 'G/L Account',
        location_code TEXT,
        payee_name TEXT,
        status TEXT DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Phase 4: Tables that depend on loans
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loan_repayments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        amount NUMERIC NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        payroll_id INTEGER,
        status TEXT DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Phase 5: ALTER TABLE for backward compatibility with existing databases
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE birthday_wishes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'birthday';
        ALTER TABLE birthday_wishes ADD COLUMN IF NOT EXISTS tagged_employee_ids TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS eligible_amount NUMERIC;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS eligibility_months INTEGER;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS start_date TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS end_date TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS remarks TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS foreclosure_date TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS foreclosure_remarks TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level1_status TEXT DEFAULT 'pending';
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level1_approved_by TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level1_approved_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level1_remarks TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level2_status TEXT DEFAULT 'pending';
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level2_approved_by TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level2_approved_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level2_remarks TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level3_status TEXT DEFAULT 'pending';
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level3_approved_by TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level3_approved_at TIMESTAMP;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS level3_remarks TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS employee_id INTEGER;
        ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS payroll_id INTEGER;
        ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE payroll ADD COLUMN IF NOT EXISTS lwf NUMERIC;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE payroll ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC DEFAULT 0;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS variable_pay NUMERIC;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_id INTEGER;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS pending_shift_id INTEGER;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_effective_date TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_comments TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE company_policies ADD COLUMN IF NOT EXISTS download_allowed_employees TEXT[] DEFAULT '{}';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE policy_acknowledgments ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS medical_certificate_url TEXT;
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT;
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
        ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS cancelled_by INTEGER;
        ALTER TABLE salary_adjustments ADD COLUMN IF NOT EXISTS leave_type_used TEXT;
        ALTER TABLE salary_adjustments ADD COLUMN IF NOT EXISTS leave_days_deducted NUMERIC DEFAULT 0;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        grace_minutes INTEGER DEFAULT 15,
        working_hours NUMERIC DEFAULT 8,
        is_default BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS comp_off_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        work_date DATE NOT NULL,
        reason TEXT,
        work_type TEXT DEFAULT 'holiday',
        hours NUMERIC DEFAULT 8,
        days_earned NUMERIC DEFAULT 1,
        status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at TIMESTAMP,
        expiry_date DATE,
        availed_date DATE,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      DO $$ BEGIN
        ALTER TABLE employees ALTER COLUMN reporting_manager_id TYPE TEXT USING reporting_manager_id::TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ALTER COLUMN hod_id TYPE TEXT USING hod_id::TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        date DATE NOT NULL,
        overtime_hours NUMERIC NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        approved_by INTEGER,
        approved_at TIMESTAMP,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
      CREATE INDEX IF NOT EXISTS idx_attendance_regularization_status ON attendance(regularization_status);
      CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
      CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
      CREATE INDEX IF NOT EXISTS idx_payroll_year ON payroll(year);
      CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll(month, year);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
      CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
      CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
      CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
      CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
      CREATE INDEX IF NOT EXISTS idx_tax_declarations_employee_id ON tax_declarations(employee_id);
      CREATE INDEX IF NOT EXISTS idx_loans_employee_id ON loans(employee_id);
      CREATE INDEX IF NOT EXISTS idx_overtime_requests_employee_id ON overtime_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_comp_off_requests_employee_id ON comp_off_requests(employee_id);
      CREATE TABLE IF NOT EXISTS on_duty_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        date DATE NOT NULL,
        from_time TEXT,
        to_time TEXT,
        reason TEXT NOT NULL,
        location TEXT,
        od_type TEXT DEFAULT 'full_day',
        level1_status TEXT DEFAULT 'pending',
        level1_approved_by TEXT,
        level1_approved_at TIMESTAMP,
        level1_remarks TEXT,
        level2_status TEXT DEFAULT 'pending',
        level2_approved_by TEXT,
        level2_approved_at TIMESTAMP,
        level2_remarks TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_on_duty_requests_employee_id ON on_duty_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_on_duty_requests_status ON on_duty_requests(status);
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS location_permission TEXT DEFAULT 'office';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_latitude TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_longitude TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_latitude TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_longitude TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_exempt BOOLEAN DEFAULT false;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_device_id TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS remote_login_authorized BOOLEAN DEFAULT false;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS location_code TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS approved_by INTEGER;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS response_token TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS dimension_value_type TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS totaling TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
      CREATE TABLE IF NOT EXISTS profile_change_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at TIMESTAMP,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) NOT NULL,
        attendance_id INTEGER REFERENCES attendance(id),
        type TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        latitude TEXT,
        longitude TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        legal_name TEXT,
        logo_url TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        pincode TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        gstin TEXT,
        pan TEXT,
        tan TEXT,
        cin TEXT,
        payslip_header TEXT,
        payslip_footer TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS entity_id INTEGER;`);
    await pool.query(`ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS entity_id INTEGER;`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS entity_id INTEGER;`);
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS entity_id INTEGER;`);

    await pool.query(`
      INSERT INTO entities (name, code, legal_name, address, phone, email, is_active)
      VALUES ('FCTEnergy', 'FCTE', 'FCT TECNRGY PVT LTD', '123 Energy Park, Bangalore', '+91-80-12345678', 'info@fctenergy.com', true)
      ON CONFLICT (code) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO entities (name, code, is_active)
      VALUES ('NonFCTEnergy', 'NFCTE', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    await pool.query(`
      UPDATE employees SET entity_id = (SELECT id FROM entities WHERE code = 'FCTE')
      WHERE entity_id IS NULL AND (entity = 'FCTEnergy' OR entity IS NULL OR entity = '');
    `);
    await pool.query(`
      UPDATE employees SET entity_id = (SELECT id FROM entities WHERE code = 'NFCTE')
      WHERE entity_id IS NULL AND entity = 'NonFCTEnergy';
    `);

    await pool.query(`
      UPDATE departments SET entity_id = (SELECT id FROM entities WHERE code = 'FCTE')
      WHERE entity_id IS NULL;
    `);
    await pool.query(`
      UPDATE salary_structures SET entity_id = (SELECT id FROM entities WHERE code = 'FCTE')
      WHERE entity_id IS NULL;
    `);

    await pool.query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT`);

    await pool.query(`ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS mac_address TEXT`);
    await pool.query(`ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS subnet_mask TEXT`);
    await pool.query(`ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS gateway TEXT`);
    await pool.query(`ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS dns TEXT`);
    await pool.query(`ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS make TEXT`);

    const deviceCount = await pool.query(`SELECT COUNT(*) FROM biometric_devices`);
    if (parseInt(deviceCount.rows[0].count) === 0) {
      const empCountResult = await pool.query(`SELECT COUNT(*) FROM employees WHERE status = 'active'`);
      const activeEmpCount = parseInt(empCountResult.rows[0].count) || 0;
      await pool.query(`INSERT INTO biometric_devices (name, type, location, ip, mac_address, subnet_mask, gateway, dns, make, status, employees) VALUES
        ('IDENTIX-K30-BackIn', 'fingerprint', 'Back In', '192.168.1.235', '00:17:61:11:38:A0', '255.255.255.0', '192.168.1.1', 'Pri: 192.168.1.15, Sec: 192.168.1.16', 'IDENTIX', 'online', $1),
        ('IDENTIX-K30-MainEntry', 'fingerprint', 'Main Entry', '192.168.1.237', '00:17:61:11:38:7F', '255.255.255.0', '192.168.1.1', 'Pri: 192.168.1.15, Sec: 192.168.1.16', 'IDENTIX', 'online', $1),
        ('IDENTIX-K30-MainExit', 'fingerprint', 'Main Exit', '192.168.1.238', '00:17:61:12:C5:D1', '255.255.255.0', '192.168.1.1', 'Pri: 192.168.1.15, Sec: 192.168.1.16', 'IDENTIX', 'online', $1)
      `, [activeEmpCount]);
      log(`Auto-migration: 3 biometric devices registered with ${activeEmpCount} employees`);
    }
    // Always sync employee count on existing devices
    const activeEmpResult = await pool.query(`SELECT COUNT(*) FROM employees WHERE status = 'active'`);
    const activeCount = parseInt(activeEmpResult.rows[0].count) || 0;
    await pool.query(`UPDATE biometric_devices SET employees = $1`, [activeCount]);

    await pool.query(`CREATE TABLE IF NOT EXISTS biometric_punch_logs (
      id SERIAL PRIMARY KEY,
      device_id TEXT,
      device_ip TEXT,
      employee_code TEXT,
      employee_id INTEGER,
      punch_time TIMESTAMP NOT NULL,
      punch_type TEXT,
      raw_payload TEXT,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    log("Auto-migration: all tables verified");
  } catch (e: any) {
    console.error("Auto-migration warning:", e.message);
  }

  console.log("[STARTUP] Phase: auth setup");
  await setupAuth(app);
  registerAuthRoutes(app);
  
  console.log("[STARTUP] Phase: registerRoutes");
  await registerRoutes(httpServer, app);
  console.log("[STARTUP] Phase: registerRoutes complete");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express error:", err.message || err);
    res.status(status).json({ message });
  });

  console.log("[STARTUP] Phase: static/vite setup");
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
    console.log("[STARTUP] Phase: serveStatic complete");
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
    
  httpServer.on('error', (err: any) => {
    console.error(`Server error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
  });

  console.log("[STARTUP] Phase: about to listen on port", port);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });

  async function applyPendingShifts() {
    try {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const todayStr = istNow.toISOString().split('T')[0];

      const result = await pool.query(
        `SELECT id, pending_shift_id, shift_effective_date FROM employees WHERE pending_shift_id IS NOT NULL AND shift_effective_date IS NOT NULL AND shift_effective_date <= $1`,
        [todayStr]
      );

      for (const row of result.rows) {
        await pool.query(
          `UPDATE employees SET shift_id = $1, pending_shift_id = NULL, shift_effective_date = NULL WHERE id = $2`,
          [row.pending_shift_id, row.id]
        );
        console.log(`[Shift] Applied pending shift ${row.pending_shift_id} for employee ${row.id} (effective ${row.shift_effective_date})`);
      }

      if (result.rows.length > 0) {
        console.log(`[Shift] Applied ${result.rows.length} pending shift change(s)`);
      }
    } catch (e: any) {
      console.error(`[Shift] Error applying pending shifts:`, e?.message);
    }
  }

  setTimeout(() => applyPendingShifts(), 5000);
  setInterval(() => applyPendingShifts(), 5 * 60 * 1000);

  async function syncBiometricDevice(device: any) {
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
          if (Array.isArray(data)) {
            records = data;
          } else if (data.data && Array.isArray(data.data)) {
            records = data.data;
          } else if (data.rows && Array.isArray(data.rows)) {
            records = data.rows;
          } else if (data.records && Array.isArray(data.records)) {
            records = data.records;
          }
          fetched = true;
          break;
        }
      } catch (e: any) {
        continue;
      }
    }

    if (!fetched) {
      await pool.query(
        `UPDATE biometric_devices SET last_sync_status='skipped', last_sync_error='Device on private network — using ADMS push mode instead', auto_sync_enabled=false WHERE id=$1`,
        [device.id]
      );
      return { synced: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

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
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.EXTERNAL_API_KEY || '',
            'X-Forwarded-For': device.ip,
          },
          body: JSON.stringify({
            emp_id: empCode,
            timestamp: punchTime.toISOString(),
            device_id: device.name,
            punch_type: record.punch_state || record.Status || record.InOutMode || '0',
          }),
        });

        if (internalRes.ok) {
          processed++;
        } else {
          errors++;
        }
      } catch (e: any) {
        errors++;
      }
    }

    await pool.query(
      `UPDATE biometric_devices SET last_sync=NOW(), last_sync_status=$1, last_sync_records=$2, last_sync_error=$3 WHERE id=$4`,
      [errors > 0 ? 'partial' : 'success', processed, errors > 0 ? `${errors} record(s) failed` : null, device.id]
    );

    console.log(`[BiometricSync] Device ${device.name}: ${processed} records synced, ${errors} errors (from ${records.length} total)`);
    return { synced: processed, errors };
  }

  async function runBiometricAutoSync() {
    try {
      const result = await pool.query(
        `SELECT * FROM biometric_devices WHERE auto_sync_enabled=true AND status='online' AND ip IS NOT NULL`
      );

      for (const device of result.rows) {
        const interval = (device.sync_interval_minutes || 5) * 60 * 1000;
        const lastSync = device.last_sync ? new Date(device.last_sync).getTime() : 0;
        const now = Date.now();

        if (now - lastSync >= interval) {
          try {
            await syncBiometricDevice(device);
          } catch (e: any) {
            console.error(`[BiometricSync] Error syncing device ${device.name}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      console.error(`[BiometricSync] Auto-sync error:`, e?.message);
    }
  }

  setTimeout(() => runBiometricAutoSync(), 15000);
  setInterval(() => runBiometricAutoSync(), 60 * 1000);
})();
