import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { EntityProvider } from "@/lib/entityContext";
import { lazy, Suspense } from "react";
import type { Employee } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Employees = lazy(() => import("@/pages/Employees"));
const Departments = lazy(() => import("@/pages/Departments"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Leaves = lazy(() => import("@/pages/Leaves"));
const Holidays = lazy(() => import("@/pages/Holidays"));
const Payroll = lazy(() => import("@/pages/Payroll"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Assets = lazy(() => import("@/pages/Assets"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const ExitManagement = lazy(() => import("@/pages/ExitManagement"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const CompanyPolicies = lazy(() => import("@/pages/CompanyPolicies"));
const EmployeeDirectory = lazy(() => import("@/pages/EmployeeDirectory"));
const DocumentManagement = lazy(() => import("@/pages/DocumentManagement"));
const OrgTree = lazy(() => import("@/pages/OrgTree"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const EmployeeSelfService = lazy(() => import("@/pages/EmployeeSelfService"));
const Reports = lazy(() => import("@/pages/Reports"));
const Integrations = lazy(() => import("@/pages/Integrations"));
// const Performance = lazy(() => import("@/pages/Performance"));
// const Learning = lazy(() => import("@/pages/Learning"));
const Engagement = lazy(() => import("@/pages/Engagement"));
// const Travel = lazy(() => import("@/pages/Travel"));
const Projects = lazy(() => import("@/pages/Projects"));
const Login = lazy(() => import("@/pages/Login"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const OnboardingSignup = lazy(() => import("@/pages/OnboardingSignup"));
const EmployeeDetails = lazy(() => import("@/pages/EmployeeDetails"));
const AddEmployee = lazy(() => import("@/pages/AddEmployee"));
const EditEmployee = lazy(() => import("@/pages/EditEmployee"));
const TeamAssets = lazy(() => import("@/pages/TeamAssets"));
const TeamPayroll = lazy(() => import("@/pages/TeamPayroll"));
const TeamProjects = lazy(() => import("@/pages/TeamProjects"));
const TeamOnboarding = lazy(() => import("@/pages/TeamOnboarding"));
// const TeamPMS = lazy(() => import("@/pages/TeamPMS"));
// const TeamLMS = lazy(() => import("@/pages/TeamLMS"));
const SalaryStructures = lazy(() => import("@/pages/SalaryStructures"));
const ShiftManagement = lazy(() => import("@/pages/ShiftManagement"));
const TaxReview = lazy(() => import("@/pages/TaxReview"));
const OrgStructure = lazy(() => import("@/pages/OrgStructure"));
const AdvanceLoans = lazy(() => import("@/pages/AdvanceLoans"));
const StatutoryCompliance = lazy(() => import("@/pages/StatutoryCompliance"));
const EntityManagement = lazy(() => import("@/pages/EntityManagement"));
const SalaryAdjustments = lazy(() => import("@/pages/SalaryAdjustments"));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-xl animate-pulse">
          HR
        </div>
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </main>
    </div>
  );
}

function DashboardRoute() {
  const { user, isLoading } = useAuth();
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });

  if (isLoading || (user && employeesLoading)) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const userRole = currentEmployee?.accessRole || "employee";
  const userRoles = userRole.split(",").map((r: string) => r.trim());
  const isAdmin = userRoles.includes("admin") || userRoles.includes("hr_manager");

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Suspense fallback={<PageLoader />}>
            <EmployeeSelfService />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Suspense fallback={<PageLoader />}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}

function RoleProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });

  const currentEmployee = employees.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const userAccessRole = currentEmployee?.accessRole || "employee";

  if (isLoading || (user && employeesLoading)) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  const userRolesList = userAccessRole.split(",").map((r: string) => r.trim());
  const hasAccess = currentEmployee ? (userRolesList.includes("admin") || userRolesList.includes("hr_manager") || userRolesList.some((r: string) => allowedRoles.includes(r))) : false;

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="flex flex-col items-center justify-center h-64">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500">You don't have permission to view this page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Suspense fallback={<PageLoader />}>
          <Component />
        </Suspense>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Suspense fallback={<PageLoader />}>
          <Login />
        </Suspense>
      </Route>
      <Route path="/forgot-password">
        <Suspense fallback={<PageLoader />}>
          <ForgotPassword />
        </Suspense>
      </Route>
      <Route path="/reset-password/:token">
        <Suspense fallback={<PageLoader />}>
          <ResetPassword />
        </Suspense>
      </Route>
      <Route path="/onboarding-signup/:token">
        <Suspense fallback={<PageLoader />}>
          <OnboardingSignup />
        </Suspense>
      </Route>
      
      <Route path="/">
        <DashboardRoute />
      </Route>
      <Route path="/employees">
        <ProtectedRoute component={Employees} />
      </Route>
      <Route path="/employees/new">
        <ProtectedRoute component={AddEmployee} />
      </Route>
      <Route path="/employees/:id/edit">
        <ProtectedRoute component={EditEmployee} />
      </Route>
      <Route path="/employees/:id">
        <ProtectedRoute component={EmployeeDetails} />
      </Route>
      <Route path="/directory">
        <ProtectedRoute component={EmployeeDirectory} />
      </Route>
      <Route path="/documents">
        <ProtectedRoute component={DocumentManagement} />
      </Route>
      <Route path="/departments">
        <ProtectedRoute component={Departments} />
      </Route>
      <Route path="/org-tree">
        <ProtectedRoute component={OrgTree} />
      </Route>
      <Route path="/org-structure">
        <ProtectedRoute component={OrgStructure} />
      </Route>
      <Route path="/advance-loans">
        <ProtectedRoute component={AdvanceLoans} />
      </Route>
      <Route path="/salary-adjustments">
        <ProtectedRoute component={SalaryAdjustments} />
      </Route>
      <Route path="/statutory-compliance">
        <ProtectedRoute component={StatutoryCompliance} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/self-service">
        <ProtectedRoute component={EmployeeSelfService} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={Attendance} />
      </Route>
      <Route path="/leaves">
        <ProtectedRoute component={Leaves} />
      </Route>
      <Route path="/holidays">
        <ProtectedRoute component={Holidays} />
      </Route>
      <Route path="/payroll">
        <ProtectedRoute component={Payroll} />
      </Route>
      <Route path="/salary-structures">
        <ProtectedRoute component={SalaryStructures} />
      </Route>
      <Route path="/shift-management">
        <RoleProtectedRoute component={ShiftManagement} allowedRoles={["admin", "hr", "hr_manager"]} />
      </Route>
      <Route path="/tax-review">
        <ProtectedRoute component={TaxReview} />
      </Route>
      <Route path="/expenses">
        <ProtectedRoute component={Expenses} />
      </Route>
      <Route path="/assets">
        <ProtectedRoute component={Assets} />
      </Route>
      <Route path="/onboarding">
        <ProtectedRoute component={Onboarding} />
      </Route>
      <Route path="/exit">
        <ProtectedRoute component={ExitManagement} />
      </Route>
      <Route path="/announcements">
        <ProtectedRoute component={Announcements} />
      </Route>
      <Route path="/company-policies">
        <RoleProtectedRoute component={CompanyPolicies} allowedRoles={["admin", "hr", "hr_manager"]} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      <Route path="/integrations">
        <ProtectedRoute component={Integrations} />
      </Route>
      <Route path="/entity-management">
        <ProtectedRoute component={EntityManagement} />
      </Route>
      {/* <Route path="/performance">
        <ProtectedRoute component={Performance} />
      </Route>
      <Route path="/learning">
        <ProtectedRoute component={Learning} />
      </Route> */}
      {/* <Route path="/engagement">
        <ProtectedRoute component={Engagement} />
      </Route> */}
      {/* <Route path="/travel">
        <ProtectedRoute component={Travel} />
      </Route> */}
      <Route path="/projects">
        <ProtectedRoute component={Projects} />
      </Route>

      <Route path="/team/assets">
        <RoleProtectedRoute component={TeamAssets} allowedRoles={["asset_team"]} />
      </Route>
      <Route path="/team/payroll">
        <RoleProtectedRoute component={TeamPayroll} allowedRoles={["payroll_team"]} />
      </Route>
      <Route path="/team/projects">
        <RoleProtectedRoute component={TeamProjects} allowedRoles={["project_team"]} />
      </Route>
      <Route path="/team/onboarding">
        <RoleProtectedRoute component={TeamOnboarding} allowedRoles={["onboarding_team"]} />
      </Route>
      {/* <Route path="/team/pms">
        <RoleProtectedRoute component={TeamPMS} allowedRoles={["pms_team"]} />
      </Route>
      <Route path="/team/lms">
        <RoleProtectedRoute component={TeamLMS} allowedRoles={["lms_team"]} />
      </Route> */}

      <Route>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EntityProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </EntityProvider>
    </QueryClientProvider>
  );
}

export default App;
