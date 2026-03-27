import { useQuery } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Search, Users, Award, Clock, BookOpen,
  TrendingUp, Briefcase, BarChart3, CheckCircle2, Target
} from "lucide-react";
import { useState, useMemo } from "react";
import type { Employee } from "@shared/schema";
import { format, differenceInMonths } from "date-fns";

export default function TeamLMS() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { entityFilterParam, selectedEntityIds } = useEntity();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/departments"],
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "-";
    const dept = departments.find((d: any) => d.id === deptId);
    return dept?.name || "-";
  };

  const getEmployeeName = (emp: Employee) => `${emp.firstName} ${emp.lastName || ''}`.trim();

  const probationEmployees = useMemo(() => {
    return activeEmployees.filter(e => e.employmentStatus === "probation");
  }, [activeEmployees]);

  const newJoiners = useMemo(() => {
    const today = new Date();
    return activeEmployees.filter(e => e.joinDate && differenceInMonths(today, new Date(e.joinDate)) < 6);
  }, [activeEmployees]);

  const designationDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const key = emp.designation || "Unassigned";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [activeEmployees]);

  const departmentBreakdown = useMemo(() => {
    const map: Record<string, { total: number, probation: number, newJoiners: number }> = {};
    const today = new Date();
    activeEmployees.forEach(emp => {
      const dept = getDepartmentName(emp.departmentId);
      if (!map[dept]) map[dept] = { total: 0, probation: 0, newJoiners: 0 };
      map[dept].total++;
      if (emp.employmentStatus === "probation") map[dept].probation++;
      if (emp.joinDate && differenceInMonths(today, new Date(emp.joinDate)) < 6) map[dept].newJoiners++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [activeEmployees, departments]);

  const experienceLevels = useMemo(() => {
    const buckets: Record<string, number> = {
      "Freshers (< 1y)": 0, "Junior (1-2y)": 0, "Mid (2-4y)": 0,
      "Senior (4-7y)": 0, "Lead (7y+)": 0
    };
    const today = new Date();
    activeEmployees.forEach(emp => {
      if (!emp.joinDate) return;
      const months = differenceInMonths(today, new Date(emp.joinDate));
      if (months < 12) buckets["Freshers (< 1y)"]++;
      else if (months < 24) buckets["Junior (1-2y)"]++;
      else if (months < 48) buckets["Mid (2-4y)"]++;
      else if (months < 84) buckets["Senior (4-7y)"]++;
      else buckets["Lead (7y+)"]++;
    });
    return Object.entries(buckets);
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesSearch =
        getEmployeeName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === "all" || String(emp.departmentId) === departmentFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "probation" && emp.employmentStatus === "probation") ||
        (statusFilter === "confirmed" && (emp.employmentStatus === "confirmed" || !emp.employmentStatus)) ||
        (statusFilter === "new" && emp.joinDate && differenceInMonths(new Date(), new Date(emp.joinDate)) < 6);
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [activeEmployees, searchTerm, departmentFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900" data-testid="text-page-title">Learning Management System</h1>
        <p className="text-sm sm:text-base text-slate-600">Skills development, training needs, and employee growth tracking</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Workforce</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-total-workforce">{activeEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Active employees</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New Joiners (6m)</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-new-joiners">{newJoiners.length}</p>
                <p className="text-xs text-blue-500 mt-1">Need onboarding training</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Probation</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-probation">{probationEmployees.length}</p>
                <p className="text-xs text-yellow-500 mt-1">Need skill assessment</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Unique Roles</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-roles">{designationDistribution.length}</p>
                <p className="text-xs text-slate-400 mt-1">Designation types</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg text-xs sm:text-sm">
          <TabsTrigger value="skills" data-testid="tab-skills">Skills & Roles</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Training Needs</TabsTrigger>
          <TabsTrigger value="directory" data-testid="tab-directory">Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Role Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {designationDistribution.map(([designation, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={designation} data-testid={`role-${designation}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 truncate max-w-[60%]">{designation}</span>
                          <span className="text-sm font-medium text-slate-800">{count}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2.5">
                          <div className="bg-indigo-500 rounded-full h-2.5 transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Experience Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experienceLevels.map(([level, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={level} data-testid={`exp-${level}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600">{level}</span>
                          <span className="text-sm font-medium text-slate-800">{count} ({Math.round(percentage)}%)</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-3">
                          <div className="bg-emerald-500 rounded-full h-3 transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Department Training Needs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentBreakdown.map(([dept, data]) => (
                    <div key={dept} className="p-4 bg-slate-50 rounded-lg border" data-testid={`dept-training-${dept}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{dept}</p>
                        <Badge className="bg-primary/10 text-primary">{data.total} employees</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {data.newJoiners > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <GraduationCap className="w-3 h-3" /> {data.newJoiners} new joiners
                          </span>
                        )}
                        {data.probation > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="w-3 h-3" /> {data.probation} on probation
                          </span>
                        )}
                        {data.newJoiners === 0 && data.probation === 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-3 h-3" /> Fully trained
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  Employees Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-slate-700">On Probation — Skill Assessment Needed</p>
                  {probationEmployees.length === 0 ? (
                    <p className="text-slate-400 text-sm py-3">No employees on probation</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {probationEmployees.map(emp => {
                        const months = emp.joinDate ? differenceInMonths(new Date(), new Date(emp.joinDate)) : 0;
                        const totalProbation = (emp as any).probationPeriod || 6;
                        const progress = Math.min(100, Math.round((months / totalProbation) * 100));
                        return (
                          <div key={emp.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg" data-testid={`probation-${emp.id}`}>
                            <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 font-bold text-xs">
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{getEmployeeName(emp)}</p>
                              <p className="text-xs text-slate-500">{emp.designation || emp.employeeCode}</p>
                            </div>
                            <div className="w-20">
                              <Progress value={progress} className="h-1.5" />
                              <p className="text-xs text-slate-400 mt-0.5 text-right">{months}/{totalProbation}m</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">New Joiners — Onboarding Training</p>
                  {newJoiners.length === 0 ? (
                    <p className="text-slate-400 text-sm py-3">No new joiners in the last 6 months</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {newJoiners.filter(e => e.employmentStatus !== "probation").slice(0, 10).map(emp => (
                        <div key={emp.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg" data-testid={`new-joiner-${emp.id}`}>
                          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{getEmployeeName(emp)}</p>
                            <p className="text-xs text-slate-500">{emp.designation || emp.employeeCode}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : '-'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Employee Skills Directory ({filteredEmployees.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-9 w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-44" data-testid="select-dept-filter">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="probation">On Probation</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="new">New Joiners (6m)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Tenure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">No employees found</TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.slice(0, 50).map((emp) => {
                        const months = emp.joinDate ? differenceInMonths(new Date(), new Date(emp.joinDate)) : 0;
                        const years = Math.floor(months / 12);
                        const rem = months % 12;
                        return (
                          <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                            <TableCell className="font-medium">{getEmployeeName(emp)}</TableCell>
                            <TableCell className="text-slate-500">{emp.employeeCode || '-'}</TableCell>
                            <TableCell>{getDepartmentName(emp.departmentId)}</TableCell>
                            <TableCell className="text-slate-600">{emp.designation || '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                emp.employmentStatus === "probation" ? "bg-yellow-100 text-yellow-700" :
                                months < 6 ? "bg-blue-100 text-blue-700" :
                                "bg-green-100 text-green-700"
                              }>
                                {emp.employmentStatus === "probation" ? "Probation" :
                                 months < 6 ? "New Joiner" : "Confirmed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {emp.joinDate ? (years > 0 ? `${years}y ${rem}m` : `${rem}m`) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredEmployees.length > 50 && (
                <p className="text-sm text-slate-400 mt-3 text-center">Showing 50 of {filteredEmployees.length} employees</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
