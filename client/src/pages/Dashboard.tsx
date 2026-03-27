import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserMinus, 
  Clock, 
  CalendarRange, 
  Receipt, 
  TrendingUp, 
  Bell,
  UserPlus,
  CheckCircle2
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import type { Employee, Announcement, Department } from "@shared/schema";
import { useEntity } from "@/lib/entityContext";

type DashboardStats = {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingExpenses: number;
  presentToday: number;
  newJoinees: number;
  upcomingBirthdays: Employee[];
  recentAnnouncements: Announcement[];
};

const chartData = [
  { name: 'Jul', employees: 42 },
  { name: 'Aug', employees: 45 },
  { name: 'Sep', employees: 48 },
  { name: 'Oct', employees: 52 },
  { name: 'Nov', employees: 55 },
  { name: 'Dec', employees: 58 },
];

const COLORS = ['#0066FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function Dashboard() {
  const { entityFilterParam, selectedEntityIds } = useEntity();
  const entityParam = entityFilterParam ? `?${entityFilterParam}` : "";
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats/", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats/${entityParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/departments${entityParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const getDepartmentData = () => {
    if (!departments || !employees) return [];
    return departments.map(dept => ({
      name: dept.name,
      value: employees.filter(e => e.departmentId === dept.id).length,
    })).filter(d => d.value > 0);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-sm text-slate-400 font-medium bg-white px-4 py-2 rounded-lg border">
          {format(new Date(), "EEEE, MMMM dd, yyyy")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalEmployees || 0}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stats?.newJoinees || 0} new this month
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{stats?.presentToday || 0}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {stats?.onLeaveToday || 0} on leave
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Leaves</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingLeaveRequests || 0}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Awaiting approval
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CalendarRange className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Expenses</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.pendingExpenses || 0}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Claims to review
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Workforce Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0066FF" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="employees" stroke="#0066FF" strokeWidth={3} fillOpacity={1} fill="url(#colorEmployees)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getDepartmentData().length > 0 ? (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getDepartmentData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {getDepartmentData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {getDepartmentData().map((dept, index) => (
                    <div key={dept.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm text-slate-600">{dept.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{dept.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-center py-8">No department data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentAnnouncements && stats.recentAnnouncements.length > 0 ? (
              <div className="space-y-4">
                {stats.recentAnnouncements.map((announcement: Announcement) => (
                  <div key={announcement.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{announcement.content}</p>
                      </div>
                      <Badge className={
                        announcement.priority === "urgent" ? "bg-red-100 text-red-700" :
                        announcement.priority === "high" ? "bg-orange-100 text-orange-700" :
                        "bg-green-100 text-green-700"
                      }>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {announcement.publishedAt ? format(new Date(announcement.publishedAt), "MMM dd, yyyy") : "Draft"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No announcements yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Recent Joiners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees && employees.length > 0 ? (
              <div className="space-y-3">
                {employees.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm">
                      {emp.firstName?.[0]}{(emp.lastName || emp.firstName)?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{emp.designation}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {emp.status}
                      </Badge>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(emp.joinDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No employees found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
