import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Cake, Award,
  TrendingUp, Briefcase, BarChart3, MapPin
} from "lucide-react";
import { useMemo } from "react";
import { useEntity } from "@/lib/entityContext";
import type { Employee } from "@shared/schema";
import { format, differenceInYears, isSameDay, isAfter, isBefore, addDays, startOfDay } from "date-fns";


export default function Engagement() {
  const { entityFilterParam, selectedEntityIds } = useEntity();

  const { data: allEmployees = [] } = useQuery<Employee[]>({
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

  const activeEmployees = allEmployees.filter(e => e.status === "active");
  const today = startOfDay(new Date());
  const currentYear = new Date().getFullYear();

  const upcomingBirthdays = useMemo(() => {
    const next30Days = addDays(today, 30);
    return activeEmployees
      .filter(emp => emp.dateOfBirth)
      .map(emp => {
        const dob = new Date(emp.dateOfBirth!);
        const thisYearBday = new Date(currentYear, dob.getMonth(), dob.getDate());
        if (isBefore(thisYearBday, today)) {
          thisYearBday.setFullYear(currentYear + 1);
        }
        const isToday = isSameDay(thisYearBday, today);
        return { ...emp, nextBirthday: thisYearBday, isToday };
      })
      .filter(emp => !isAfter(emp.nextBirthday, next30Days))
      .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
  }, [activeEmployees, today, currentYear]);

  const workAnniversaries = useMemo(() => {
    const next30Days = addDays(today, 30);
    return activeEmployees
      .filter(emp => emp.joinDate)
      .map(emp => {
        const joinDate = new Date(emp.joinDate!);
        const years = differenceInYears(today, joinDate);
        const thisYearAnniversary = new Date(currentYear, joinDate.getMonth(), joinDate.getDate());
        if (isBefore(thisYearAnniversary, today)) {
          thisYearAnniversary.setFullYear(currentYear + 1);
        }
        const isToday = isSameDay(thisYearAnniversary, today);
        const completedYears = isToday ? years : (isAfter(thisYearAnniversary, today) ? years : years + 1);
        return { ...emp, anniversary: thisYearAnniversary, years: completedYears, isToday };
      })
      .filter(emp => emp.years > 0 && !isAfter(emp.anniversary, next30Days))
      .sort((a, b) => a.anniversary.getTime() - b.anniversary.getTime());
  }, [activeEmployees, today, currentYear]);

  const tenureDistribution = useMemo(() => {
    const buckets = { "< 1 year": 0, "1-2 years": 0, "2-3 years": 0, "3-5 years": 0, "5+ years": 0 };
    activeEmployees.forEach(emp => {
      if (!emp.joinDate) return;
      const years = differenceInYears(today, new Date(emp.joinDate));
      if (years < 1) buckets["< 1 year"]++;
      else if (years < 2) buckets["1-2 years"]++;
      else if (years < 3) buckets["2-3 years"]++;
      else if (years < 5) buckets["3-5 years"]++;
      else buckets["5+ years"]++;
    });
    return Object.entries(buckets);
  }, [activeEmployees, today]);

  const employmentTypeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const key = (emp as any).employmentType || "Full-time";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeEmployees]);

  const locationDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const key = (emp as any).workLocation || (emp as any).location || "Office";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [activeEmployees]);

  const newJoiners = useMemo(() => {
    const last30Days = addDays(today, -30);
    return activeEmployees
      .filter(emp => emp.joinDate && isAfter(new Date(emp.joinDate), last30Days))
      .sort((a, b) => new Date(b.joinDate!).getTime() - new Date(a.joinDate!).getTime());
  }, [activeEmployees, today]);

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return "";
    const dept = departments.find((d: any) => d.id === deptId);
    return dept?.name || "";
  };

  const departmentDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const key = getDepartmentName(emp.departmentId) || "Unassigned";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [activeEmployees, departments]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Engagement & Communication</h1>
          <p className="text-slate-500">Birthdays, anniversaries, workforce insights, and team updates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Employees</p>
                <p className="text-2xl font-bold text-slate-800" data-testid="text-active-count">{activeEmployees.length}</p>
                <p className="text-xs text-green-600 mt-1">Currently active</p>
              </div>
              <Users className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Upcoming Birthdays</p>
                <p className="text-2xl font-bold text-pink-600" data-testid="text-birthday-count">{upcomingBirthdays.length}</p>
                <p className="text-xs text-slate-400 mt-1">Next 30 days</p>
              </div>
              <Cake className="w-8 h-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Work Anniversaries</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-anniversary-count">{workAnniversaries.length}</p>
                <p className="text-xs text-slate-400 mt-1">Next 30 days</p>
              </div>
              <Award className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New Joiners</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-new-joiners-count">{newJoiners.length}</p>
                <p className="text-xs text-slate-400 mt-1">Last 30 days</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="celebrations" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="celebrations" data-testid="tab-celebrations">Celebrations</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Workforce Insights</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="celebrations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-500" />
                  Upcoming Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBirthdays.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No upcoming birthdays in the next 30 days</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {upcomingBirthdays.map((emp) => (
                      <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg ${emp.isToday ? 'bg-pink-100 border border-pink-300' : 'bg-pink-50'}`} data-testid={`card-birthday-${emp.id}`}>
                        <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm">
                          {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">
                            {emp.firstName} {emp.lastName || ''}
                            {emp.isToday && <span className="ml-2 text-pink-600">🎂 Today!</span>}
                          </p>
                          <p className="text-xs text-slate-500">{emp.designation || emp.employeeCode}</p>
                        </div>
                        <Badge className="bg-pink-100 text-pink-700">
                          {format(emp.nextBirthday, 'dd MMM')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Work Anniversaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workAnniversaries.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No upcoming work anniversaries in the next 30 days</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {workAnniversaries.map((emp) => (
                      <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg ${emp.isToday ? 'bg-amber-100 border border-amber-300' : 'bg-amber-50'}`} data-testid={`card-anniversary-${emp.id}`}>
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                          {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">
                            {emp.firstName} {emp.lastName || ''}
                            {emp.isToday && <span className="ml-2 text-amber-600">🎉 Today!</span>}
                          </p>
                          <p className="text-xs text-slate-500">{emp.designation || emp.employeeCode}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-amber-100 text-amber-700">{emp.years} {emp.years === 1 ? 'year' : 'years'}</Badge>
                          <p className="text-xs text-slate-400 mt-1">{format(emp.anniversary, 'dd MMM')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Tenure Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenureDistribution.map(([bucket, count]) => {
                    const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                    return (
                      <div key={bucket} data-testid={`tenure-${bucket}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600">{bucket}</span>
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
                  <Users className="w-5 h-5 text-teal-500" />
                  Employment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employmentTypeDistribution.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No data</p>
                ) : (
                  <div className="space-y-3">
                    {employmentTypeDistribution.map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg" data-testid={`emp-type-${type}`}>
                        <span className="text-sm font-medium text-slate-700 capitalize">{type.replace(/_/g, ' ')}</span>
                        <Badge className="bg-teal-100 text-teal-700">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  By Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationDistribution.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No data</p>
                ) : (
                  <div className="space-y-3">
                    {locationDistribution.map(([loc, count]) => {
                      const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                      return (
                        <div key={loc} data-testid={`location-${loc}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600 capitalize">{loc.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-slate-800">{count}</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-2.5">
                            <div className="bg-orange-400 rounded-full h-2.5 transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  New Joiners (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newJoiners.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No new joiners in the last 30 days</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {newJoiners.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg" data-testid={`card-new-joiner-${emp.id}`}>
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0) || ''}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{emp.firstName} {emp.lastName || ''}</p>
                          <p className="text-xs text-slate-500">{emp.designation || "N/A"} · {emp.employeeCode}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">
                          {emp.joinDate ? format(new Date(emp.joinDate), 'dd MMM') : '-'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-emerald-700">{activeEmployees.length}</p>
                      <p className="text-xs text-emerald-600">Active</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-700">
                        {activeEmployees.filter(e => e.employmentStatus === "probation").length}
                      </p>
                      <p className="text-xs text-yellow-600">On Probation</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium text-slate-700">By Department</p>
                    {departmentDistribution.map(([dept, count]) => {
                      const percentage = activeEmployees.length > 0 ? (count / activeEmployees.length) * 100 : 0;
                      return (
                        <div key={dept} className="flex items-center gap-3">
                          <div className="w-28 truncate text-xs text-slate-600">{dept}</div>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div className="bg-primary rounded-full h-2" style={{ width: `${percentage}%` }} />
                          </div>
                          <div className="w-8 text-xs text-right text-slate-500">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
