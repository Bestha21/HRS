import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Clock, LogIn, LogOut, Users, Calendar, AlertTriangle, Building2,
  Timer, ChevronLeft, ChevronRight, Shield, FileText,
  TrendingUp, TrendingDown, CheckCircle, XCircle, Info, Plus, Hourglass, Download,
  List, LayoutGrid, Search, MoreHorizontal, CalendarPlus, Briefcase, ArrowRight
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, subDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, Attendance as AttendanceType } from "@shared/schema";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin } from "lucide-react";

interface CycleStats {
  cycleStart: string;
  cycleEnd: string;
  presentToday: number;
  lateToday: number;
  totalEmployees: number;
  workingDaysInCycle: number;
  todayLogs: Array<AttendanceType & { employeeName: string; employeeCode: string; department: string }>;
  employeeCycleStats: Record<number, { lateCount: number; earlyCount: number; lateDeducted: number; earlyDeducted: number; name: string; code: string; department: string }>;
  cycleHolidays: Array<{ id: number; name: string; date: string; type: string }>;
  policyConfig: {
    shiftStart: string;
    shiftEnd: string;
    workingHours: number;
    halfDayHours: number;
    graceInstances: number;
    lateGraceWindow: string;
    earlyGraceWindow: string;
    lateDeduction: string;
    afterTenDeduction: string;
    beforeSixDeduction: string;
    weeklyOff: string;
    attendanceCycle: string;
  };
}

function isWeeklyOff(date: Date): boolean {
  const day = date.getDay();
  if (day === 0) return true;
  if (day === 6) {
    const weekOfMonth = Math.ceil(date.getDate() / 7);
    return weekOfMonth === 2 || weekOfMonth === 4;
  }
  return false;
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'present':
      return <Badge className="bg-green-100 text-green-700" data-testid="badge-present">Present</Badge>;
    case 'late':
      return <Badge className="bg-orange-100 text-orange-700" data-testid="badge-late">Late (Grace)</Badge>;
    case 'late_deducted':
      return <Badge className="bg-red-100 text-red-700" data-testid="badge-late-deducted">Late (1/3 Deduction)</Badge>;
    case 'early_departure':
      return <Badge className="bg-orange-100 text-orange-700" data-testid="badge-early">Early (Grace)</Badge>;
    case 'early_deducted':
      return <Badge className="bg-red-100 text-red-700" data-testid="badge-early-deducted">Early (1/3 Deduction)</Badge>;
    case 'half_day':
      return <Badge className="bg-yellow-100 text-yellow-700" data-testid="badge-halfday">Half Day</Badge>;
    case 'full_day_deduction':
      return <Badge className="bg-red-100 text-red-700" data-testid="badge-full-deduction">Full Day Deduction</Badge>;
    case 'absent':
      return <Badge className="bg-red-100 text-red-700" data-testid="badge-absent">Absent</Badge>;
    case 'leave':
      return <Badge className="bg-blue-100 text-blue-700" data-testid="badge-leave">On Leave</Badge>;
    case 'early':
      return <Badge className="bg-orange-100 text-orange-700" data-testid="badge-early-status">Early</Badge>;
    case 'missed_punch':
      return <Badge className="bg-red-100 text-red-700" data-testid="badge-missed-punch">Missed Punch</Badge>;
    case 'holiday':
      return <Badge className="bg-purple-100 text-purple-700" data-testid="badge-holiday">Holiday</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-500" data-testid="badge-unknown">{status || 'N/A'}</Badge>;
  }
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'log';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'log') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: cycleStats, isLoading: cycleLoading } = useQuery<CycleStats>({
    queryKey: ["/api/attendance/cycle-stats"],
  });

  const cycleRange = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    let start: Date, end: Date;
    if (day >= 26) {
      start = new Date(now.getFullYear(), now.getMonth(), 26);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 26);
      end = new Date(now.getFullYear(), now.getMonth(), 25);
    }
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, []);

  const { data: attendanceLogs } = useQuery<AttendanceType[]>({
    queryKey: ["/api/attendance", cycleRange.startDate, cycleRange.endDate],
    queryFn: async () => {
      const resp = await fetch(`/api/attendance?startDate=${cycleRange.startDate}&endDate=${cycleRange.endDate}`);
      if (!resp.ok) throw new Error("Failed to fetch attendance");
      return resp.json();
    },
  });

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const todayDate = new Date().toISOString().split('T')[0];
  const todayLog = attendanceLogs?.find(l => 
    l.employeeId === currentEmployee?.id && l.date === todayDate
  );

  const getGeoLocation = useCallback((): Promise<{ latitude?: string; longitude?: string; locationLabel: string }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ title: "Location not supported", description: "Your browser does not support geolocation. Please enable location services.", variant: "destructive" });
        resolve({ locationLabel: "Unknown" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = String(pos.coords.latitude);
          const lng = String(pos.coords.longitude);
          let locationLabel = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
            if (resp.ok) {
              const data = await resp.json();
              const addr = data.address || {};
              locationLabel = [addr.suburb || addr.neighbourhood || addr.village || '', addr.city || addr.town || addr.state_district || '', addr.state || ''].filter(Boolean).join(', ') || data.display_name || locationLabel;
            }
          } catch (e) {}
          resolve({ latitude: lat, longitude: lng, locationLabel });
        },
        (err) => {
          toast({ title: "Location access denied", description: "Please turn on location services in your browser to capture your check-in location.", variant: "destructive" });
          resolve({ locationLabel: "Location denied" });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, [toast]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const locPerm = (currentEmployee?.locationPermission || "office").toLowerCase();
      const needsGeo = locPerm === "remote" || locPerm === "hybrid";
      if (needsGeo) {
        const geo = await getGeoLocation();
        return apiRequest("POST", "/api/attendance/check-in", { employeeId: currentEmployee!.id, location: geo.locationLabel, latitude: geo.latitude, longitude: geo.longitude });
      }
      return apiRequest("POST", "/api/attendance/check-in", { employeeId: currentEmployee!.id, location: "Office" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/cycle-stats"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const locPerm = (currentEmployee?.locationPermission || "office").toLowerCase();
      const needsGeo = locPerm === "remote" || locPerm === "hybrid";
      if (needsGeo) {
        const geo = await getGeoLocation();
        return apiRequest("POST", "/api/attendance/check-out", { employeeId: currentEmployee!.id, location: geo.locationLabel, latitude: geo.latitude, longitude: geo.longitude });
      }
      return apiRequest("POST", "/api/attendance/check-out", { employeeId: currentEmployee!.id, location: "Office" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/cycle-stats"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Check-out failed", description: err.message, variant: "destructive" });
    }
  });

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const holidays = cycleStats?.cycleHolidays || [];
  const policy = cycleStats?.policyConfig;

  const { data: shiftsData } = useQuery<{ id: number; name: string; startTime: string; endTime: string; graceMinutes: number; workingHours: string; isDefault?: boolean }[]>({
    queryKey: ["/api/shifts"],
  });

  const currentShift = useMemo(() => {
    if (!shiftsData) return null;
    const empShift = currentEmployee?.shiftId ? shiftsData.find(s => s.id === currentEmployee.shiftId) : null;
    return empShift || shiftsData.find(s => (s as any).isDefault) || shiftsData[0] || null;
  }, [shiftsData, currentEmployee]);

  const { data: allHolidays } = useQuery<{ id: number; name: string; date: string; type: string }[]>({
    queryKey: ["/api/holidays"],
  });

  const [, navigate] = useLocation();

  const [otFilter, setOtFilter] = useState<string>("all");
  const [showOtDialog, setShowOtDialog] = useState(false);
  const [otForm, setOtForm] = useState({ employeeId: "", date: "", overtimeHours: "", reason: "" });
  const [otRemarks, setOtRemarks] = useState("");
  const [otActionId, setOtActionId] = useState<number | null>(null);
  const [otActionType, setOtActionType] = useState<string>("");

  const { data: overtimeRequests, isLoading: otLoading } = useQuery<any[]>({
    queryKey: ["/api/overtime", otFilter],
    queryFn: async () => {
      const res = await fetch(`/api/overtime?status=${otFilter}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: otSummary } = useQuery<any>({
    queryKey: ["/api/overtime/summary"],
  });

  const createOtMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/overtime", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime/summary"] });
      toast({ title: "Overtime request created" });
      setShowOtDialog(false);
      setOtForm({ employeeId: "", date: "", overtimeHours: "", reason: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateOtMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
      apiRequest("PATCH", `/api/overtime/${id}`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overtime/summary"] });
      toast({ title: "Overtime request updated" });
      setOtActionId(null);
      setOtRemarks("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const userRoles = (currentEmployee?.accessRole || "employee").split(",").map((r: string) => r.trim());
  const isAdminUser = userRoles.includes("admin");
  const isHrUser = userRoles.includes("hr") || userRoles.includes("hr_manager");

  const hasReportees = useMemo(() => {
    if (!currentEmployee || !employees) return false;
    if (isAdminUser || isHrUser) return true;
    return employees.some(e =>
      e.status === 'active' && (
        e.reportingManagerId === currentEmployee.employeeCode ||
        e.hodId === currentEmployee.employeeCode
      )
    );
  }, [currentEmployee, employees, isAdminUser, isHrUser]);

  const displayOT = overtimeRequests || [];

  const lateEarlyEmployees = useMemo(() => {
    if (!cycleStats?.employeeCycleStats) return [];
    return Object.entries(cycleStats.employeeCycleStats)
      .filter(([_, stats]) => stats.lateCount > 0 || stats.earlyCount > 0)
      .sort(([_, a], [__, b]) => (b.lateCount + b.earlyCount) - (a.lateCount + a.earlyCount));
  }, [cycleStats]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Attendance Management</h1>
          <p className="text-slate-500">
            Cycle: {cycleStats ? `${format(new Date(cycleStats.cycleStart + 'T00:00:00'), 'dd MMM yyyy')} - ${format(new Date(cycleStats.cycleEnd + 'T00:00:00'), 'dd MMM yyyy')}` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-3">
          {currentEmployee && !currentEmployee.attendanceExempt && (
            <>
              {(!todayLog || todayLog.checkOut) && (
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  data-testid="button-check-in"
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
                </Button>
              )}
              {todayLog && todayLog.checkIn && !todayLog.checkOut && (
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  data-testid="button-check-out"
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-late-today">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Late/Early Instances</p>
                <p className="text-2xl font-bold text-orange-600">{cycleStats?.lateToday || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Current cycle</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-shift-hours">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Shift Timing</p>
                <p className="text-lg font-bold text-slate-800">{currentShift ? `${currentShift.startTime} - ${currentShift.endTime}` : '09:30 - 18:30'}</p>
                <p className="text-xs text-slate-400 mt-1">{currentShift?.name || 'General Shift'}</p>
              </div>
              <Timer className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
        <div></div>
        <div></div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap w-full">
          <TabsTrigger value="log" data-testid="tab-log">Attendance Log</TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">Today's Log</TabsTrigger>
          <TabsTrigger value="tracking" data-testid="tab-tracking">Late / Early</TabsTrigger>
          <TabsTrigger value="overtime" data-testid="tab-overtime">Overtime</TabsTrigger>
          {hasReportees && <TabsTrigger value="sheet" data-testid="tab-sheet">Att. Sheet</TabsTrigger>}
          <TabsTrigger value="regularize" data-testid="tab-regularize">Regularization</TabsTrigger>
          <TabsTrigger value="onduty" data-testid="tab-onduty">On Duty</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
          {isAdminUser && <TabsTrigger value="policy" data-testid="tab-policy">Policy</TabsTrigger>}
        </TabsList>

        <TabsContent value="log">
          <AttendanceLogTab 
            currentEmployee={currentEmployee}
            employees={employees || []}
            isAdmin={isAdminUser}
            shiftsData={shiftsData || []}
            allHolidays={allHolidays || []}
            navigate={navigate}
            onSwitchTab={handleTabChange}
          />
        </TabsContent>

        <TabsContent value="daily">
          {currentEmployee && todayLog && (
            <Card className="mb-6" data-testid="card-my-attendance">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  My Attendance Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-slate-500">Check In</p>
                    <p className="text-lg font-semibold text-green-700">
                      {todayLog.checkIn ? format(new Date(todayLog.checkIn), 'hh:mm a') : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-slate-500">Check Out</p>
                    <p className="text-lg font-semibold text-red-700">
                      {todayLog.checkOut ? format(new Date(todayLog.checkOut), 'hh:mm a') : 'Pending'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-slate-500">Work Hours</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {todayLog.workHours ? `${parseFloat(todayLog.workHours).toFixed(1)}h` : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Status</p>
                    <div className="mt-1">{getStatusBadge(todayLog.status)}</div>
                  </div>
                </div>
                {(todayLog.checkInLatitude || todayLog.checkInLocation) && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Check-In Location</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {todayLog.checkInLatitude && todayLog.checkInLongitude && (
                        <div>
                          <span className="text-slate-500">Lat/Long: </span>
                          <span className="font-medium text-purple-700">{todayLog.checkInLatitude}, {todayLog.checkInLongitude}</span>
                        </div>
                      )}
                      {todayLog.checkInLocation && (
                        <div>
                          <span className="text-slate-500">Area: </span>
                          <span className="font-medium text-purple-700">{todayLog.checkInLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-todays-log">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Attendance Log - {format(new Date(), 'dd MMM yyyy, EEEE')}</CardTitle>
                <Button variant="outline" size="sm" data-testid="button-download-today-log"
                  disabled={!(cycleStats?.todayDetailedLogs?.length || cycleStats?.todayLogs?.length)}
                  onClick={() => {
                    const detLogs = cycleStats?.todayDetailedLogs || [];
                    if (detLogs.length > 0) {
                      const headers = ['Employee Code','Employee Name','Department','Type','Time','Latitude','Longitude','Location'];
                      const rows = detLogs.map((log: any) => [
                        log.employeeCode || '',
                        log.employeeName || '',
                        log.department || '',
                        log.type === 'check_in' ? 'Check In' : 'Check Out',
                        log.timestamp ? format(new Date(log.timestamp), 'hh:mm a') : '',
                        log.latitude || '',
                        log.longitude || '',
                        log.location || '',
                      ]);
                      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Todays_Attendance_Log_${format(new Date(), 'dd_MMM_yyyy')}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } else {
                      const todayLogs = cycleStats?.todayLogs || [];
                      if (todayLogs.length === 0) return;
                      const headers = ['Employee Code','Employee Name','Department','Check In','Check Out','Work Hours','Status','Latitude','Longitude','Location'];
                      const rows = todayLogs.map((log: any) => [
                        log.employeeCode || '',
                        log.employeeName || '',
                        log.department || '',
                        log.checkIn ? format(new Date(log.checkIn), 'hh:mm a') : '',
                        log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : '',
                        log.workHours ? parseFloat(log.workHours).toFixed(1) : '',
                        log.status || '',
                        log.checkInLatitude || '',
                        log.checkInLongitude || '',
                        log.checkInLocation || '',
                      ]);
                      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Todays_Attendance_Log_${format(new Date(), 'dd_MMM_yyyy')}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-1" /> Download Today's Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cycleLoading ? (
                <p className="text-slate-500 text-center py-8">Loading attendance data...</p>
              ) : (() => {
                const detailedLogs = (isAdminUser || isHrUser || hasReportees)
                  ? cycleStats?.todayDetailedLogs
                  : cycleStats?.todayDetailedLogs?.filter((l: any) => l.employeeId === currentEmployee?.id);
                const filteredTodayLogs = (isAdminUser || isHrUser || hasReportees)
                  ? cycleStats?.todayLogs
                  : cycleStats?.todayLogs?.filter((l: any) => l.employeeId === currentEmployee?.id);
                const showDetailed = detailedLogs && detailedLogs.length > 0;
                return ((!showDetailed && (filteredTodayLogs?.length || 0) === 0) || false) ? (
                <p className="text-slate-500 text-center py-8">No attendance records for today yet.</p>
              ) : showDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-today-log">
                    <thead>
                      <tr className="border-b text-left text-sm text-slate-500">
                        <th className="pb-3 font-medium">Employee</th>
                        <th className="pb-3 font-medium">Code</th>
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Latitude</th>
                        <th className="pb-3 font-medium">Longitude</th>
                        <th className="pb-3 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedLogs?.map((log: any) => (
                        <tr key={log.id} className="border-b last:border-0" data-testid={`row-attendance-log-${log.id}`}>
                          <td className="py-3 font-medium text-slate-900">{log.employeeName}</td>
                          <td className="py-3 text-slate-600">{log.employeeCode}</td>
                          <td className="py-3 text-slate-600">{log.department}</td>
                          <td className="py-3">
                            <Badge className={log.type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {log.type === 'check_in' ? 'Check In' : 'Check Out'}
                            </Badge>
                          </td>
                          <td className="py-3 font-medium">
                            {log.timestamp ? format(new Date(log.timestamp), 'hh:mm a') : '-'}
                          </td>
                          <td className="py-3 text-xs text-slate-600">{log.latitude || '-'}</td>
                          <td className="py-3 text-xs text-slate-600">{log.longitude || '-'}</td>
                          <td className="py-3 text-xs text-purple-700 max-w-[150px] truncate">{log.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-today-log">
                    <thead>
                      <tr className="border-b text-left text-sm text-slate-500">
                        <th className="pb-3 font-medium">Employee</th>
                        <th className="pb-3 font-medium">Code</th>
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Check In</th>
                        <th className="pb-3 font-medium">Check Out</th>
                        <th className="pb-3 font-medium">Work Hours</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Latitude</th>
                        <th className="pb-3 font-medium">Longitude</th>
                        <th className="pb-3 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTodayLogs?.map((log: any) => (
                        <tr key={log.id} className="border-b last:border-0" data-testid={`row-attendance-${log.id}`}>
                          <td className="py-3 font-medium text-slate-900">{log.employeeName}</td>
                          <td className="py-3 text-slate-600">{log.employeeCode}</td>
                          <td className="py-3 text-slate-600">{log.department}</td>
                          <td className="py-3 text-green-600">
                            {log.checkIn ? format(new Date(log.checkIn), 'hh:mm a') : '-'}
                          </td>
                          <td className="py-3 text-red-600">
                            {log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : '-'}
                          </td>
                          <td className="py-3 text-slate-700">
                            {log.workHours ? `${parseFloat(log.workHours).toFixed(1)}h` : '-'}
                          </td>
                          <td className="py-3">{getStatusBadge(log.status)}</td>
                          <td className="py-3 text-xs text-slate-600">{log.checkInLatitude || '-'}</td>
                          <td className="py-3 text-xs text-slate-600">{log.checkInLongitude || '-'}</td>
                          <td className="py-3 text-xs text-purple-700 max-w-[150px] truncate">{log.checkInLocation || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <div className="space-y-6">
            <Card data-testid="card-grace-info">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">Grace Period Policy (Per Cycle)</p>
                    <p className="text-sm text-slate-600 mt-1">
                      3 instances of late arrival (09:30-10:00 AM) or early departure (06:00-06:30 PM) are allowed per cycle.
                      From the 4th instance, 1/3rd day salary is deducted per occurrence. Arrival after 10:00 AM or departure before 06:00 PM results in a half-day deduction.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-late-early-tracking">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Late Arrival & Early Departure - Current Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lateEarlyEmployees.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    <p>No late arrivals or early departures recorded in this cycle.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-late-early">
                      <thead>
                        <tr className="border-b text-left text-sm text-slate-500">
                          <th className="pb-3 font-medium">Employee</th>
                          <th className="pb-3 font-medium">Code</th>
                          <th className="pb-3 font-medium">Department</th>
                          <th className="pb-3 font-medium text-center">Late Arrivals</th>
                          <th className="pb-3 font-medium text-center">Early Departures</th>
                          <th className="pb-3 font-medium text-center">Total Instances</th>
                          <th className="pb-3 font-medium text-center">Grace Used</th>
                          <th className="pb-3 font-medium">Deduction Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lateEarlyEmployees.map(([empId, stats]) => {
                          const total = stats.lateCount + stats.earlyCount;
                          const graceUsed = Math.min(total, 3);
                          const deductedInstances = stats.lateDeducted + stats.earlyDeducted;
                          const deductionDays = (deductedInstances / 3).toFixed(1);
                          return (
                            <tr key={empId} className="border-b last:border-0" data-testid={`row-late-early-${empId}`}>
                              <td className="py-3 font-medium text-slate-900">{stats.name}</td>
                              <td className="py-3 text-slate-600">{stats.code}</td>
                              <td className="py-3 text-slate-600">{stats.department}</td>
                              <td className="py-3 text-center">
                                <span className={`font-semibold ${stats.lateCount > 3 ? 'text-red-600' : stats.lateCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {stats.lateCount}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`font-semibold ${stats.earlyCount > 3 ? 'text-red-600' : stats.earlyCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {stats.earlyCount}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <Badge className={total > 3 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                                  {total}
                                </Badge>
                              </td>
                              <td className="py-3 text-center">{graceUsed} / 3</td>
                              <td className="py-3">
                                {deductedInstances > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {deductedInstances} x (1/3 day) = {deductionDays} day(s)
                                  </span>
                                ) : (
                                  <span className="text-green-600">No deduction</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card data-testid="card-late-rules">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                    Late Arrival Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                      <p className="font-medium text-sm text-slate-900">09:30 AM - 10:00 AM</p>
                      <p className="text-xs text-slate-600 mt-1">3 instances grace per cycle. After 3rd: 1/3rd day salary deduction per occurrence</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <p className="font-medium text-sm text-slate-900">After 10:00 AM</p>
                      <p className="text-xs text-slate-600 mt-1">Half-day salary deduction (no exceptions)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-early-rules">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    Early Departure Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                      <p className="font-medium text-sm text-slate-900">06:00 PM - 06:30 PM</p>
                      <p className="text-xs text-slate-600 mt-1">3 instances grace per cycle. After 3rd: 1/3rd day salary deduction per occurrence</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <p className="font-medium text-sm text-slate-900">Before 06:00 PM</p>
                      <p className="text-xs text-slate-600 mt-1">Half-day salary deduction (no exceptions)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2" data-testid="card-calendar">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Monthly Calendar
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => setCalendarMonth(prev => subMonths(prev, 1))}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-medium text-slate-900 min-w-[140px] text-center">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </span>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-xs font-medium text-slate-500 py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12" />
                  ))}
                  {calendarDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const wo = isWeeklyOff(day);
                    const holiday = holidays.find(h => h.date === dateStr);
                    const isToday = isSameDay(day, new Date());

                    let bgColor = 'bg-white hover:bg-slate-50';
                    let textColor = 'text-slate-900';
                    if (wo) {
                      bgColor = 'bg-slate-100';
                      textColor = 'text-slate-400';
                    }
                    if (holiday) {
                      bgColor = 'bg-purple-50';
                      textColor = 'text-purple-700';
                    }
                    if (isToday) {
                      bgColor = 'bg-blue-100 ring-2 ring-blue-400';
                      textColor = 'text-blue-900';
                    }

                    return (
                      <div
                        key={dateStr}
                        className={`h-12 rounded-lg flex flex-col items-center justify-center relative ${bgColor} ${textColor} text-sm`}
                        title={wo ? (day.getDay() === 0 ? 'Sunday (Weekly Off)' : '2nd/4th Saturday (Weekly Off)') : holiday ? holiday.name : ''}
                        data-testid={`cal-day-${dateStr}`}
                      >
                        <span className="font-medium">{day.getDate()}</span>
                        {wo && <span className="text-[9px] leading-none text-slate-400">WO</span>}
                        {holiday && <span className="text-[9px] leading-none text-purple-500">H</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                    <span>Weekly Off (WO)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-purple-50 border border-purple-200" />
                    <span>Holiday (H)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-100 ring-1 ring-blue-400" />
                    <span>Today</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card data-testid="card-weekly-off-rules">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    Weekly Off Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-sm text-slate-900">Every Sunday</p>
                      <p className="text-xs text-slate-500">All Sundays are weekly off</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-sm text-slate-900">2nd & 4th Saturday</p>
                      <p className="text-xs text-slate-500">Second and fourth Saturdays are weekly off</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-sm text-slate-900">Working Week</p>
                      <p className="text-xs text-slate-500">Monday to Saturday (except 2nd & 4th Sat)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-holidays">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Holidays in Cycle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {holidays.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No holidays in this cycle</p>
                  ) : (
                    <div className="space-y-2">
                      {holidays.map(h => (
                        <div key={h.id} className="flex items-center justify-between p-2 bg-purple-50 rounded text-sm">
                          <span className="font-medium text-slate-900">{h.name}</span>
                          <span className="text-purple-600">{format(new Date(h.date + 'T00:00:00'), 'dd MMM')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="policy">
          <div className="space-y-6">
            <Card data-testid="card-policy-overview">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  FC TecNergy Pvt. Ltd. - Attendance Policy v1.3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-sm text-slate-900">Standard Shift</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">09:30 AM - 06:30 PM</p>
                      <p className="text-xs text-slate-500 mt-1">9 continuous hours including breaks</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className="w-4 h-4 text-green-600" />
                        <p className="font-semibold text-sm text-slate-900">Half Day</p>
                      </div>
                      <p className="text-2xl font-bold text-green-700">4.5 Hours</p>
                      <p className="text-xs text-slate-500 mt-1">1st Half: 09:30-14:00 | 2nd Half: 14:00-18:30</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <p className="font-semibold text-sm text-slate-900">Attendance Cycle</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-700">26th - 25th</p>
                      <p className="text-xs text-slate-500 mt-1">Locked on 26th for payroll processing</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Breaks Entitlement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-900">Lunch Break</p>
                        <p className="text-slate-500">30 minutes</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-900">Tea Break (1st Half)</p>
                        <p className="text-slate-500">15 minutes</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium text-slate-900">Tea Break (2nd Half)</p>
                        <p className="text-slate-500">15 minutes</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Late Arrival & Early Departure - Deduction Matrix
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="table-deduction-matrix">
                        <thead>
                          <tr className="border-b text-left text-slate-500">
                            <th className="pb-2 font-medium">Category</th>
                            <th className="pb-2 font-medium">Time Window</th>
                            <th className="pb-2 font-medium">Grace</th>
                            <th className="pb-2 font-medium">Deduction Rule</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-orange-700">Late Arrival</td>
                            <td className="py-2">09:30 AM - 10:00 AM</td>
                            <td className="py-2">3 instances/cycle</td>
                            <td className="py-2">After 3rd: 1/3rd day salary per occurrence</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-red-700">Late Arrival</td>
                            <td className="py-2">After 10:00 AM</td>
                            <td className="py-2">None</td>
                            <td className="py-2">Half-day salary deduction</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-orange-700">Early Departure</td>
                            <td className="py-2">06:00 PM - 06:30 PM</td>
                            <td className="py-2">3 instances/cycle</td>
                            <td className="py-2">After 3rd: 1/3rd day salary per occurrence</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 font-medium text-red-700">Early Departure</td>
                            <td className="py-2">Before 06:00 PM</td>
                            <td className="py-2">None</td>
                            <td className="py-2">Half-day salary deduction</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      Key Policy Points
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p><strong>Unauthorized Absence:</strong> 5+ continuous working days without approval is treated as absconding and attracts disciplinary action.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p><strong>Missed Attendance:</strong> Failure to mark attendance = LWP/LOP unless approved regularization/leave/OD exists.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p><strong>Less than 4.5 hours:</strong> Working less than 4.5 hours in a day results in full-day salary deduction.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p><strong>Remote Login:</strong> Strictly prohibited for Gurgaon office employees unless authorized by MD & CEO.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <p><strong>Biometric Compliance:</strong> First biometric entry = Arrival Time, Last biometric entry = Departure Time.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <p><strong>Attendance Lock:</strong> Records are locked on the 26th of each month for payroll. No modifications after that.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overtime">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Hourglass className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{otSummary?.totalApprovedHours || 0}</div>
                  <p className="text-sm text-muted-foreground">Approved OT Hours</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{otSummary?.totalPendingHours || 0}</div>
                  <p className="text-sm text-muted-foreground">Pending OT Hours</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{otSummary?.totalApprovedCount || 0}</div>
                  <p className="text-sm text-muted-foreground">Approved Requests</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{otSummary?.totalPendingCount || 0}</div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                </CardContent>
              </Card>
            </div>

            {isAdminUser && otSummary?.employeeSummary?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Overtime Summary by Employee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Approved Hours</TableHead>
                        <TableHead>Pending Hours</TableHead>
                        <TableHead>Estimated OT Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otSummary.employeeSummary.map((emp: any) => (
                        <TableRow key={emp.employeeId} data-testid={`ot-summary-row-${emp.employeeId}`}>
                          <TableCell className="font-medium">{emp.employeeName}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{emp.approvedHours}h</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{emp.pendingHours}h</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">₹{emp.estimatedPay.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Hourglass className="w-5 h-5 text-primary" />
                    {isAdminUser ? "All Overtime Requests" : "My Overtime Requests"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={otFilter} onValueChange={setOtFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-ot-filter">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    {isAdminUser && (
                      <Button onClick={() => setShowOtDialog(true)} data-testid="button-add-overtime">
                        <Plus className="w-4 h-4 mr-2" />
                        Add OT Request
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {otLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : !displayOT || displayOT.length === 0 ? (
                  <div className="text-center py-12">
                    <Hourglass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No overtime requests found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Overtime is automatically tracked when employees work beyond the standard 9-hour shift.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdminUser && <TableHead>Employee</TableHead>}
                        <TableHead>Date</TableHead>
                        <TableHead>OT Hours</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                        {isAdminUser && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayOT.map((req: any) => {
                        const emp = employees?.find(e => e.id === req.employeeId);
                        return (
                          <TableRow key={req.id} data-testid={`ot-row-${req.id}`}>
                            {isAdminUser && (
                              <TableCell className="font-medium">{emp ? `${emp.firstName} ${emp.lastName || ''}` : `ID ${req.employeeId}`}</TableCell>
                            )}
                            <TableCell>{format(new Date(req.date), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {parseFloat(req.overtimeHours).toFixed(1)}h
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{req.reason || '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                req.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{req.remarks || '-'}</TableCell>
                            {isAdminUser && (
                              <TableCell>
                                {req.status === 'pending' && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-green-600 hover:text-green-700"
                                      disabled={updateOtMutation.isPending}
                                      data-testid={`approve-ot-${req.id}`}
                                      onClick={() => { setOtActionId(req.id); setOtActionType("approved"); }}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700"
                                      disabled={updateOtMutation.isPending}
                                      data-testid={`reject-ot-${req.id}`}
                                      onClick={() => { setOtActionId(req.id); setOtActionType("rejected"); }}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-primary" />
                  Overtime Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-1">Standard Working Hours</p>
                      <p>9 hours per day (09:30 AM - 06:30 PM)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-1">Overtime Rate</p>
                      <p>1.5x the regular hourly rate</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-1">Auto-Detection</p>
                      <p>Overtime is automatically recorded when you work beyond 9 hours</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-foreground mb-1">Approval Required</p>
                      <p>All overtime must be approved by admin before it reflects in payroll</p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Payroll Integration</p>
                    <p className="text-blue-600 dark:text-blue-300">Approved overtime hours are automatically included in the monthly payroll calculation. OT Pay = Approved Hours × (Daily Rate / 9) × 1.5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={showOtDialog} onOpenChange={setShowOtDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Overtime Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Employee</Label>
                  <Select value={otForm.employeeId} onValueChange={v => setOtForm({ ...otForm, employeeId: v })}>
                    <SelectTrigger data-testid="select-ot-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.filter(e => e.status === 'active').map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName || ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={otForm.date} onChange={e => setOtForm({ ...otForm, date: e.target.value })} data-testid="input-ot-date" />
                  </div>
                  <div>
                    <Label>OT Hours</Label>
                    <Input type="number" step="0.5" min="0.5" value={otForm.overtimeHours} onChange={e => setOtForm({ ...otForm, overtimeHours: e.target.value })} placeholder="e.g. 2.5" data-testid="input-ot-hours" />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={otForm.reason} onChange={e => setOtForm({ ...otForm, reason: e.target.value })} placeholder="Reason for overtime..." className="resize-none" data-testid="input-ot-reason" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOtDialog(false)}>Cancel</Button>
                <Button
                  disabled={!otForm.employeeId || !otForm.date || !otForm.overtimeHours || createOtMutation.isPending}
                  onClick={() => createOtMutation.mutate({
                    employeeId: Number(otForm.employeeId),
                    date: otForm.date,
                    overtimeHours: otForm.overtimeHours,
                    reason: otForm.reason,
                  })}
                  data-testid="button-submit-ot"
                >
                  {createOtMutation.isPending ? "Creating..." : "Create Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!otActionId} onOpenChange={(open) => { if (!open) { setOtActionId(null); setOtRemarks(""); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{otActionType === 'approved' ? 'Approve' : 'Reject'} Overtime Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Remarks (optional)</Label>
                  <Textarea value={otRemarks} onChange={e => setOtRemarks(e.target.value)} placeholder="Add remarks..." className="resize-none" data-testid="input-ot-remarks" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOtActionId(null); setOtRemarks(""); }}>Cancel</Button>
                <Button
                  className={otActionType === 'approved' ? '' : 'bg-red-600 hover:bg-red-700'}
                  disabled={updateOtMutation.isPending}
                  onClick={() => {
                    if (otActionId) updateOtMutation.mutate({ id: otActionId, status: otActionType, remarks: otRemarks });
                  }}
                  data-testid="button-confirm-ot-action"
                >
                  {updateOtMutation.isPending ? "Processing..." : otActionType === 'approved' ? 'Approve' : 'Reject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sheet">
          <AttendanceSheetTab isAdmin={isAdminUser || isHrUser} currentEmployee={currentEmployee} employees={employees || []} />
        </TabsContent>

        <TabsContent value="regularize">
          <RegularizationTab 
            isAdmin={isAdminUser || isHrUser} 
            currentEmployee={currentEmployee}
            attendanceLogs={attendanceLogs || []}
          />
        </TabsContent>

        <TabsContent value="onduty">
          <OnDutyTab 
            isAdmin={isAdminUser || isHrUser} 
            currentEmployee={currentEmployee}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AttendanceLogTabProps {
  currentEmployee?: Employee;
  employees: Employee[];
  isAdmin: boolean;
  shiftsData: { id: number; name: string; startTime: string; endTime: string; graceMinutes: number; workingHours: string }[];
  allHolidays: { id: number; name: string; date: string; type: string }[];
  navigate: (to: string) => void;
  onSwitchTab: (tab: string) => void;
}

function AttendanceLogTab({ currentEmployee, employees, isAdmin, shiftsData, allHolidays, navigate, onSwitchTab }: AttendanceLogTabProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [logMonth, setLogMonth] = useState(new Date());
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [empSearch, setEmpSearch] = useState("");

  const viewingEmpId = selectedEmpId || currentEmployee?.id;
  const viewingEmployee = employees.find(e => e.id === viewingEmpId);

  const monthDays = useMemo(() => {
    const start = startOfMonth(logMonth);
    const end = endOfMonth(logMonth);
    return eachDayOfInterval({ start, end });
  }, [logMonth]);

  const dateRange = useMemo(() => {
    const start = startOfMonth(logMonth);
    const end = endOfMonth(logMonth);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [logMonth]);

  const { data: logAttendance, isLoading: logLoading } = useQuery<AttendanceType[]>({
    queryKey: ["/api/attendance", "log", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const resp = await fetch(`/api/attendance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!resp.ok) throw new Error("Failed to fetch attendance");
      return resp.json();
    },
  });

  const { data: leaveRequests } = useQuery<any[]>({
    queryKey: ["/api/leave-requests"],
  });

  const employeeShift = useMemo(() => {
    if (!viewingEmployee?.shiftId || !shiftsData?.length) return null;
    return shiftsData.find(s => s.id === viewingEmployee.shiftId) || null;
  }, [viewingEmployee, shiftsData]);

  const defaultShift = shiftsData?.find(s => (s as any).isDefault) || (shiftsData?.length ? shiftsData[0] : null);
  const activeShift = employeeShift || defaultShift;

  const canSelectEmployees = isAdmin || (currentEmployee?.accessRole?.includes('hr'));

  const teamMembers = useMemo(() => {
    if (!currentEmployee || !employees?.length) return [];
    if (isAdmin || currentEmployee.accessRole?.includes('hr')) return employees.filter(e => e.status === 'active');
    return employees.filter(e => 
      e.status === 'active' && (
        e.reportingManagerId === currentEmployee.employeeCode ||
        e.hodId === currentEmployee.employeeCode ||
        e.id === currentEmployee.id
      )
    );
  }, [currentEmployee, employees, isAdmin]);

  const filteredTeamMembers = useMemo(() => {
    if (!empSearch) return teamMembers;
    const s = empSearch.toLowerCase();
    return teamMembers.filter(e =>
      (e.firstName + ' ' + e.lastName).toLowerCase().includes(s) ||
      e.employeeCode?.toLowerCase().includes(s) ||
      e.email?.toLowerCase().includes(s)
    );
  }, [teamMembers, empSearch]);

  const dayData = useMemo(() => {
    return monthDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay();
      const weekOfMonth = Math.ceil(day.getDate() / 7);
      const wo = dayOfWeek === 0 || (dayOfWeek === 6 && (weekOfMonth === 2 || weekOfMonth === 4));
      const holiday = allHolidays?.find(h => h.date === dateStr);
      const log = logAttendance?.find(l => l.employeeId === viewingEmpId && l.date === dateStr);
      const leave = leaveRequests?.find(lr =>
        lr.employeeId === viewingEmpId &&
        (lr.status === 'approved') &&
        lr.startDate <= dateStr && lr.endDate >= dateStr
      );
      const isToday = isSameDay(day, new Date());
      const isFuture = day > new Date();

      let dayStatus: string;
      let statusLabel: string;
      let statusColor: string;
      let arrivalNote = '';

      if (holiday) {
        dayStatus = 'holiday';
        statusLabel = holiday.name;
        statusColor = 'bg-purple-100 text-purple-700';
      } else if (wo) {
        dayStatus = 'weeklyoff';
        statusLabel = dayOfWeek === 0 ? 'Sunday - Weekly Off' : '2nd/4th Sat - Weekly Off';
        statusColor = 'bg-slate-100 text-slate-500';
      } else if (leave) {
        dayStatus = 'leave';
        statusLabel = leave.leaveType ? `${leave.leaveType} Leave` : 'On Leave';
        statusColor = 'bg-blue-100 text-blue-700';
      } else if (log) {
        if (log.checkIn && !log.checkOut && !isToday && !isFuture) {
          dayStatus = 'missedpunch';
          statusLabel = 'Missed Punch';
          statusColor = 'bg-red-100 text-red-700';
          arrivalNote = 'Missed Punch (LOP)';
        } else if (log.status === 'present') {
          dayStatus = 'present';
          statusLabel = 'Present';
          statusColor = 'bg-green-100 text-green-700';
          arrivalNote = 'On Time';
        } else if (log.status === 'late' || log.status === 'late_deducted') {
          dayStatus = 'late';
          statusLabel = 'Present';
          statusColor = 'bg-green-100 text-green-700';
          if (log.checkIn && activeShift) {
            const checkInTime = new Date(log.checkIn);
            const [sh, sm] = activeShift.startTime.split(':').map(Number);
            const shiftStart = new Date(checkInTime);
            shiftStart.setHours(sh, sm, 0, 0);
            const diffMs = checkInTime.getTime() - shiftStart.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);
            arrivalNote = `${String(Math.floor(diffMins / 60)).padStart(1, '0')}:${String(diffMins % 60).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')} late`;
          } else {
            arrivalNote = 'Late';
          }
        } else if (log.status === 'half_day') {
          dayStatus = 'halfday';
          statusLabel = 'Half Day';
          statusColor = 'bg-yellow-100 text-yellow-700';
          arrivalNote = 'Half Day';
        } else if (log.status === 'full_day_deduction') {
          dayStatus = 'absent';
          statusLabel = 'Full Day Deduction (LOP)';
          statusColor = 'bg-red-100 text-red-700';
          arrivalNote = 'Under 4.5 hrs';
        } else if (log.status === 'early_departure' || log.status === 'early_deducted') {
          dayStatus = 'early';
          statusLabel = 'Early';
          statusColor = 'bg-orange-100 text-orange-700';
          arrivalNote = 'Early Departure';
        } else {
          dayStatus = log.status || 'present';
          statusLabel = log.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Present';
          statusColor = 'bg-green-100 text-green-700';
          arrivalNote = 'On Time';
        }
      } else if (isFuture) {
        dayStatus = 'future';
        statusLabel = '';
        statusColor = 'bg-slate-50 text-slate-300';
      } else {
        dayStatus = 'absent';
        statusLabel = 'Absent';
        statusColor = 'bg-red-100 text-red-700';
      }

      return {
        date: day,
        dateStr,
        dayOfWeek,
        wo,
        holiday,
        log,
        leave,
        isToday,
        isFuture,
        dayStatus,
        statusLabel,
        statusColor,
        arrivalNote,
      };
    }).reverse();
  }, [monthDays, logAttendance, leaveRequests, allHolidays, viewingEmpId, activeShift]);

  const formatTime = (dt: string | null | undefined) => {
    if (!dt) return '-';
    try {
      return format(new Date(dt), 'hh:mm a');
    } catch { return '-'; }
  };

  const formatHours = (hours: string | null | undefined) => {
    if (!hours) return '-';
    const h = parseFloat(hours);
    if (isNaN(h)) return '-';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push({ date: d, label: format(d, 'MMM yyyy') });
    }
    return months;
  }, []);

  const summary = useMemo(() => {
    let present = 0, absent = 0, leaves = 0, holidays = 0, weeklyOff = 0, halfDays = 0, late = 0, early = 0, missedPunch = 0, lateEarlyInstances = 0;
    dayData.forEach(d => {
      if (d.dayStatus === 'present' || d.dayStatus === 'late') present++;
      else if (d.dayStatus === 'absent') absent++;
      else if (d.dayStatus === 'leave') leaves++;
      else if (d.dayStatus === 'holiday') holidays++;
      else if (d.dayStatus === 'weeklyoff') weeklyOff++;
      else if (d.dayStatus === 'halfday') halfDays++;
      else if (d.dayStatus === 'missedpunch') missedPunch++;
      if (d.dayStatus === 'late') late++;
      if (d.arrivalNote === 'Early Departure' || d.dayStatus === 'early') early++;
      if (d.dayStatus === 'late' || d.arrivalNote === 'Early Departure' || d.dayStatus === 'early') lateEarlyInstances++;
    });
    return { present, absent, leaves, holidays, weeklyOff, halfDays, late, early, missedPunch, lateEarlyInstances };
  }, [dayData]);

  useEffect(() => {
    if (logLoading || viewMode !== "list") return;
    const timer = setTimeout(() => {
      const todayRow = document.getElementById('today-log-row');
      if (todayRow) {
        todayRow.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [logLoading, viewMode, logMonth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {(canSelectEmployees || teamMembers.length > 1) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email or code..."
                className="pl-9 w-[220px]"
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                data-testid="input-emp-search"
              />
              {empSearch && filteredTeamMembers.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-[280px] bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTeamMembers.map(emp => (
                    <button
                      key={emp.id}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between ${viewingEmpId === emp.id ? 'bg-blue-50' : ''}`}
                      onClick={() => { setSelectedEmpId(emp.id); setEmpSearch(''); }}
                      data-testid={`emp-option-${emp.id}`}
                    >
                      <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                      <span className="text-slate-400 text-xs">{emp.employeeCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewingEmployee && viewingEmpId !== currentEmployee?.id && (
            <Badge className="bg-blue-100 text-blue-700 px-3 py-1.5">
              Viewing: {viewingEmployee.firstName} {viewingEmployee.lastName} ({viewingEmployee.employeeCode})
              <button className="ml-2 text-blue-500 hover:text-blue-800" onClick={() => setSelectedEmpId(null)}>&times;</button>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setLogMonth(prev => subMonths(prev, 1))}
            data-testid="button-log-prev-month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select
            value={format(logMonth, 'yyyy-MM')}
            onValueChange={v => {
              const [y, m] = v.split('-').map(Number);
              setLogMonth(new Date(y, m - 1, 1));
            }}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-log-month">
              <SelectValue>{format(logMonth, 'MMM yyyy')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(mo => (
                <SelectItem key={format(mo.date, 'yyyy-MM')} value={format(mo.date, 'yyyy-MM')}>
                  {mo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setLogMonth(prev => addMonths(prev, 1))}
            data-testid="button-log-next-month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="border-l ml-2 pl-2 flex gap-1">
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "calendar" ? "default" : "outline"}
              onClick={() => setViewMode("calendar")}
              data-testid="button-view-calendar"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{summary.present}</p>
          <p className="text-xs text-green-600">Present</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
          <p className="text-xs text-red-600">Absent</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{summary.leaves}</p>
          <p className="text-xs text-blue-600">Leaves</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{summary.halfDays}</p>
          <p className="text-xs text-yellow-600">Half Days</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{summary.lateEarlyInstances}</p>
          <p className="text-xs text-orange-600">Late/Early Instances</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{summary.missedPunch}</p>
          <p className="text-xs text-red-600">Missed Punch</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{summary.holidays}</p>
          <p className="text-xs text-purple-600">Holidays</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{activeShift ? `${activeShift.startTime} - ${activeShift.endTime}` : '09:30 - 18:30'}</p>
          <p className="text-xs text-indigo-600">Shift Timing</p>
        </div>
      </div>

      {logLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading attendance log...</div>
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[520px]" id="attendance-log-scroll">
              <table className="w-full" data-testid="table-attendance-log">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check In</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Out</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hours</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deviations</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dayData.map((d) => {
                    const isSpecialDay = d.dayStatus === 'holiday' || d.dayStatus === 'weeklyoff' || d.dayStatus === 'leave';
                    const rowBg = d.isToday ? 'bg-blue-50/50' : d.dayStatus === 'holiday' ? 'bg-purple-50/30' : d.dayStatus === 'weeklyoff' ? 'bg-slate-50/50' : d.dayStatus === 'leave' ? 'bg-blue-50/30' : '';

                    return (
                      <tr key={d.dateStr} id={d.isToday ? 'today-log-row' : undefined} className={`border-b last:border-0 hover:bg-slate-50/80 transition-colors ${rowBg}`} data-testid={`row-log-${d.dateStr}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${d.isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {d.date.getDate()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{format(d.date, 'EEE')}</p>
                              <p className="text-xs text-slate-400">{format(d.date, 'dd MMM yyyy')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isSpecialDay ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <div className="text-xs text-slate-600">
                              <p className="font-medium">{activeShift?.name || 'General'}</p>
                              <p className="text-slate-400">{activeShift ? `${activeShift.startTime} - ${activeShift.endTime}` : '09:30 - 18:30'}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isSpecialDay ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : d.log?.checkIn ? (
                            <span className="text-sm font-medium text-green-700">{formatTime(d.log.checkIn)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isSpecialDay ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : d.log?.checkOut ? (
                            <span className="text-sm font-medium text-red-600">{formatTime(d.log.checkOut)}</span>
                          ) : d.log?.checkIn ? (
                            <span className="text-xs text-orange-500 italic">Pending</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isSpecialDay ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : d.log?.workHours ? (
                            <span className="text-sm font-semibold text-slate-800">{formatHours(d.log.workHours)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {d.isFuture ? (
                            <span className="text-xs text-slate-300">-</span>
                          ) : isSpecialDay ? (
                            <Badge className={`${d.statusColor} text-xs`}>{d.statusLabel}</Badge>
                          ) : (
                            <Badge className={`${d.statusColor} text-xs`}>{d.statusLabel}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {d.arrivalNote && !isSpecialDay ? (
                            <span className={`text-xs font-medium ${
                              d.arrivalNote === 'On Time' ? 'text-green-600' :
                              d.arrivalNote.includes('Missed Punch') || d.arrivalNote.includes('LOP') ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {d.arrivalNote === 'On Time' ? (
                                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> On Time</span>
                              ) : d.arrivalNote}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!d.isFuture && !isSpecialDay && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`btn-action-${d.dateStr}`}>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onSwitchTab('regularize')} data-testid={`action-regularize-${d.dateStr}`}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Regularize
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onSwitchTab('onduty')} data-testid={`action-od-${d.dateStr}`}>
                                  <Briefcase className="w-4 h-4 mr-2" />
                                  On Duty
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/leaves')} data-testid={`action-leave-${d.dateStr}`}>
                                  <CalendarPlus className="w-4 h-4 mr-2" />
                                  Apply Leave
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs font-semibold text-slate-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: getDay(monthDays[0]) }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24" />
              ))}
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const d = dayData.find(dd => dd.dateStr === dateStr);
                if (!d) return <div key={dateStr} className="h-24" />;

                let bgClass = 'bg-white border-slate-200';
                let textClass = 'text-slate-900';
                if (d.dayStatus === 'present' || d.dayStatus === 'late') {
                  bgClass = 'bg-green-50 border-green-200';
                } else if (d.dayStatus === 'absent') {
                  bgClass = 'bg-red-50 border-red-200';
                } else if (d.dayStatus === 'leave') {
                  bgClass = 'bg-blue-50 border-blue-200';
                } else if (d.dayStatus === 'holiday') {
                  bgClass = 'bg-purple-50 border-purple-200';
                } else if (d.dayStatus === 'weeklyoff') {
                  bgClass = 'bg-slate-50 border-slate-200';
                  textClass = 'text-slate-400';
                } else if (d.dayStatus === 'halfday') {
                  bgClass = 'bg-yellow-50 border-yellow-200';
                } else if (d.dayStatus === 'missedpunch') {
                  bgClass = 'bg-red-50 border-red-200';
                } else if (d.dayStatus === 'early') {
                  bgClass = 'bg-orange-50 border-orange-200';
                }
                if (d.isToday) bgClass += ' ring-2 ring-blue-500';

                return (
                  <div
                    key={dateStr}
                    className={`h-24 rounded-lg border p-1.5 flex flex-col ${bgClass} ${textClass}`}
                    data-testid={`cal-log-${dateStr}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{day.getDate()}</span>
                      <span className="text-[10px] text-slate-400">{format(day, 'EEE')}</span>
                    </div>
                    {d.dayStatus === 'holiday' && (
                      <p className="text-[10px] text-purple-600 mt-1 truncate">{d.holiday?.name}</p>
                    )}
                    {d.dayStatus === 'weeklyoff' && (
                      <p className="text-[10px] text-slate-400 mt-1">Weekly Off</p>
                    )}
                    {d.dayStatus === 'leave' && (
                      <p className="text-[10px] text-blue-600 mt-1 truncate">{d.statusLabel}</p>
                    )}
                    {d.dayStatus === 'missedpunch' && (
                      <div className="mt-auto space-y-0.5">
                        <p className="text-[10px] text-red-600 font-medium">Missed Punch</p>
                        {d.log?.checkIn && <p className="text-[10px] text-green-700 truncate">In: {formatTime(d.log.checkIn)}</p>}
                      </div>
                    )}
                    {(d.dayStatus === 'present' || d.dayStatus === 'late' || d.dayStatus === 'halfday' || d.dayStatus === 'early') && d.log && (
                      <div className="mt-auto space-y-0.5">
                        <p className="text-[10px] text-green-700 truncate">In: {formatTime(d.log.checkIn)}</p>
                        <p className="text-[10px] text-red-600 truncate">Out: {d.log.checkOut ? formatTime(d.log.checkOut) : 'Pending'}</p>
                        {d.log.workHours && <p className="text-[10px] font-semibold text-slate-700">{formatHours(d.log.workHours)}</p>}
                      </div>
                    )}
                    {d.dayStatus === 'absent' && !d.isFuture && (
                      <p className="text-[10px] text-red-600 mt-1">Absent</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-50 border border-green-200" /><span>Present</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50 border border-red-200" /><span>Absent / Missed Punch</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /><span>Leave</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /><span>Half Day</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-50 border border-orange-200" /><span>Early</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-50 border border-purple-200" /><span>Holiday</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-50 border border-slate-200" /><span>Weekly Off</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getCodeColor(code: string): string {
  if (code === 'P') return 'bg-green-100 text-green-800';
  if (code === 'WH' || code === 'WOW') return 'bg-green-200 text-green-900';
  if (code === 'H') return 'bg-purple-100 text-purple-700';
  if (code === 'WO') return 'bg-slate-100 text-slate-600';
  if (code === 'A') return 'bg-red-100 text-red-700';
  if (code === 'LWP') return 'bg-red-50 text-red-600';
  if (code === 'PMS') return 'bg-orange-100 text-orange-700';
  if (code === '½P') return 'bg-yellow-100 text-yellow-700';
  if (code.startsWith('½')) return 'bg-blue-50 text-blue-700';
  if (['CL', 'SL', 'EL', 'PL', 'ML', 'CO', 'BL', 'OD'].includes(code)) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-50 text-slate-600';
}

function AttendanceSheetTab({ isAdmin, currentEmployee, employees }: { isAdmin: boolean; currentEmployee?: Employee; employees: Employee[] }) {
  const now = new Date();
  const [sheetMonth, setSheetMonth] = useState(now.getMonth() + 1);
  const [sheetYear, setSheetYear] = useState(now.getFullYear());
  const [sheetSearch, setSheetSearch] = useState("");

  const { data: sheetData, isLoading } = useQuery<{
    cycleStart: string; cycleEnd: string; dates: string[];
    sheet: Array<{
      employeeId: number; employeeCode: string; employeeName: string; department: string;
      dailyCodes: Record<string, string>;
      summary: { present: number; absent: number; halfDay: number; leaves: number; holidays: number; weeklyOff: number; lop: number };
    }>;
  }>({
    queryKey: ["/api/attendance/sheet", sheetMonth, sheetYear],
    queryFn: async () => {
      const resp = await fetch(`/api/attendance/sheet?month=${sheetMonth}&year=${sheetYear}`);
      if (!resp.ok) throw new Error("Failed to fetch");
      return resp.json();
    },
  });

  const filteredSheet = useMemo(() => {
    if (!sheetData?.sheet) return [];
    let filtered = sheetData.sheet;
    if (!isAdmin && currentEmployee) {
      const myCode = currentEmployee.employeeCode;
      const reporteeIds = new Set<number>();
      employees.forEach(e => {
        if (e.status === 'active' && (e.reportingManagerId === myCode || e.hodId === myCode)) {
          reporteeIds.add(e.id);
        }
      });
      filtered = filtered.filter(s => reporteeIds.has(s.employeeId));
    }
    if (sheetSearch.trim()) {
      const q = sheetSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.employeeName.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [sheetData, isAdmin, currentEmployee, employees, sheetSearch]);

  const exportCSV = () => {
    if (!sheetData) return;
    const dates = sheetData.dates;
    const headers = ["Emp Code", "Employee Name", "Dept", ...dates.map(d => format(new Date(d + 'T00:00:00'), 'dd')), "P", "A", "½D", "Lv", "H", "WO", "LWP"];
    const rows = filteredSheet.map(emp => [
      emp.employeeCode,
      emp.employeeName,
      emp.department,
      ...dates.map(d => emp.dailyCodes[d] || '-'),
      emp.summary.present,
      emp.summary.absent,
      emp.summary.halfDay,
      emp.summary.leaves,
      emp.summary.holidays,
      emp.summary.weeklyOff,
      emp.summary.lop,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance_sheet_${sheetMonth}_${sheetYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={String(sheetMonth)} onValueChange={v => setSheetMonth(Number(v))}>
            <SelectTrigger className="w-[140px]" data-testid="select-sheet-month"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(sheetYear)} onValueChange={v => setSheetYear(Number(v))}>
            <SelectTrigger className="w-[100px]" data-testid="select-sheet-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[sheetYear - 1, sheetYear, sheetYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, code or dept..."
              className="pl-9 w-[220px] h-9"
              value={sheetSearch}
              onChange={e => setSheetSearch(e.target.value)}
              data-testid="input-sheet-search"
            />
          </div>
          {sheetData && (
            <span className="text-xs text-muted-foreground">
              Cycle: {format(new Date(sheetData.cycleStart + 'T00:00:00'), 'dd MMM')} – {format(new Date(sheetData.cycleEnd + 'T00:00:00'), 'dd MMM yyyy')}
              {!isAdmin && currentEmployee && <span className="ml-2 text-blue-600">({filteredSheet.length} reportees)</span>}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!sheetData} data-testid="button-export-sheet">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        {[
          { code: 'P', label: 'Present' }, { code: 'A', label: 'Absent' }, { code: 'H', label: 'Holiday' },
          { code: 'WH', label: 'Worked Holiday' }, { code: 'WO', label: 'Weekly Off' }, { code: 'WOW', label: 'Worked Weekend' },
          { code: 'PMS', label: 'Missing Swipe' }, { code: '½P', label: 'Half Day' }, { code: 'LWP', label: 'Leave W/O Pay' },
          { code: 'CL', label: 'Casual Leave' }, { code: 'SL', label: 'Sick Leave' }, { code: 'EL', label: 'Earned Leave' },
          { code: 'CO', label: 'Comp Off' },
        ].map(item => (
          <span key={item.code} className={`px-1.5 py-0.5 rounded ${getCodeColor(item.code)} font-medium`}>
            {item.code} = {item.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Clock className="w-5 h-5 animate-spin mr-2" /> Loading attendance sheet...</div>
      ) : sheetData ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse" data-testid="table-attendance-sheet">
                <thead>
                  <tr className="bg-muted">
                    <th className="sticky left-0 z-10 bg-muted px-2 py-1.5 text-left font-medium border-r min-w-[120px]">Employee</th>
                    {sheetData.dates.map(d => {
                      const dt = new Date(d + 'T00:00:00');
                      const dayName = format(dt, 'EEE');
                      return (
                        <th key={d} className={`px-1 py-1.5 text-center font-medium min-w-[32px] border-r ${dayName === 'Sun' || dayName === 'Sat' ? 'bg-slate-200' : ''}`}>
                          <div>{format(dt, 'dd')}</div>
                          <div className="text-[8px] text-muted-foreground">{dayName}</div>
                        </th>
                      );
                    })}
                    <th className="px-1 py-1.5 text-center font-medium min-w-[28px] bg-green-50 border-r">P</th>
                    <th className="px-1 py-1.5 text-center font-medium min-w-[28px] bg-red-50 border-r">A</th>
                    <th className="px-1 py-1.5 text-center font-medium min-w-[28px] bg-yellow-50 border-r">½D</th>
                    <th className="px-1 py-1.5 text-center font-medium min-w-[28px] bg-blue-50 border-r">Lv</th>
                    <th className="px-1 py-1.5 text-center font-medium min-w-[28px] bg-red-50">LWP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSheet.map((emp, idx) => (
                    <tr key={emp.employeeId} className={idx % 2 === 0 ? '' : 'bg-muted/30'}>
                      <td className="sticky left-0 z-10 bg-white px-2 py-1 border-r font-medium" style={{ background: idx % 2 === 0 ? 'white' : 'hsl(var(--muted)/0.3)' }}>
                        <div className="truncate max-w-[110px]">{emp.employeeName}</div>
                        <div className="text-[8px] text-muted-foreground">{emp.employeeCode}</div>
                      </td>
                      {sheetData.dates.map(d => {
                        const code = emp.dailyCodes[d] || '-';
                        return (
                          <td key={d} className="px-0.5 py-1 text-center border-r">
                            <span className={`inline-block w-full px-0.5 py-0.5 rounded text-[9px] font-medium ${getCodeColor(code)}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-1 py-1 text-center font-bold text-green-700 bg-green-50/50 border-r">{emp.summary.present}</td>
                      <td className="px-1 py-1 text-center font-bold text-red-700 bg-red-50/50 border-r">{emp.summary.absent}</td>
                      <td className="px-1 py-1 text-center font-bold text-yellow-700 bg-yellow-50/50 border-r">{emp.summary.halfDay}</td>
                      <td className="px-1 py-1 text-center font-bold text-blue-700 bg-blue-50/50 border-r">{emp.summary.leaves}</td>
                      <td className="px-1 py-1 text-center font-bold text-red-600 bg-red-50/50">{emp.summary.lop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RegularizationTab({ isAdmin, currentEmployee, attendanceLogs }: { 
  isAdmin: boolean; 
  currentEmployee: Employee | undefined;
  attendanceLogs: AttendanceType[];
}) {
  const { toast } = useToast();
  const [regReason, setRegReason] = useState("");
  const [selectedAttId, setSelectedAttId] = useState<number | null>(null);

  const { data: pendingRegs, isLoading } = useQuery<Array<AttendanceType & { employeeName: string; employeeCode: string }>>({
    queryKey: ["/api/attendance/pending-regularizations"],
  });

  const myPmsEntries = attendanceLogs.filter(a => 
    a.employeeId === currentEmployee?.id && a.checkIn && !a.checkOut && a.regularizationStatus !== 'approved'
  ).sort((a, b) => b.date.localeCompare(a.date));

  const submitRegMutation = useMutation({
    mutationFn: async ({ attendanceId, reason }: { attendanceId: number; reason: string }) => {
      return apiRequest("POST", "/api/attendance/regularize", { attendanceId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/pending-regularizations"] });
      toast({ title: "Regularization request submitted" });
      setRegReason("");
      setSelectedAttId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    }
  });

  const approveRegMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/attendance/regularize/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/pending-regularizations"] });
      toast({ title: "Regularization updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      {currentEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Missing Swipe (PMS) Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {myPmsEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No missing swipe entries found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Regularization</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPmsEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{entry.date}</TableCell>
                      <TableCell className="text-sm">{entry.checkIn ? format(new Date(entry.checkIn), 'hh:mm a') : '-'}</TableCell>
                      <TableCell><Badge className="bg-orange-100 text-orange-700">PMS</Badge></TableCell>
                      <TableCell>
                        {entry.regularizationStatus === 'pending' ? (
                          <Badge className="bg-yellow-100 text-yellow-700">Pending Approval</Badge>
                        ) : entry.regularizationStatus === 'rejected' ? (
                          <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!entry.regularizationStatus || entry.regularizationStatus === 'rejected' ? (
                          selectedAttId === entry.id ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                placeholder="Reason for missed punch"
                                value={regReason}
                                onChange={e => setRegReason(e.target.value)}
                                className="h-7 text-xs w-48"
                                data-testid={`input-reg-reason-${entry.id}`}
                              />
                              <Button size="sm" className="h-7 text-xs" disabled={!regReason.trim() || submitRegMutation.isPending}
                                onClick={() => submitRegMutation.mutate({ attendanceId: entry.id, reason: regReason })}
                                data-testid={`button-submit-reg-${entry.id}`}
                              >Submit</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelectedAttId(null); setRegReason(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => setSelectedAttId(entry.id)}
                              data-testid={`button-regularize-${entry.id}`}
                            >Request Regularization</Button>
                          )
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {(isAdmin || (pendingRegs && pendingRegs.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Regularization Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !pendingRegs || pendingRegs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRegs.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{entry.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{entry.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-sm">{entry.date}</TableCell>
                      <TableCell className="text-sm">{entry.checkIn ? format(new Date(entry.checkIn), 'hh:mm a') : '-'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{entry.regularizationReason}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs" disabled={approveRegMutation.isPending}
                            onClick={() => approveRegMutation.mutate({ id: entry.id, status: 'approved' })}
                            data-testid={`button-approve-reg-${entry.id}`}
                          ><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={approveRegMutation.isPending}
                            onClick={() => approveRegMutation.mutate({ id: entry.id, status: 'rejected' })}
                            data-testid={`button-reject-reg-${entry.id}`}
                          ><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OnDutyTab({ isAdmin, currentEmployee }: { isAdmin: boolean; currentEmployee: Employee | undefined }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [odDate, setOdDate] = useState("");
  const [odReason, setOdReason] = useState("");
  const [odLocation, setOdLocation] = useState("");
  const [odType, setOdType] = useState("full_day");
  const [odFromTime, setOdFromTime] = useState("");
  const [odToTime, setOdToTime] = useState("");

  const { data: odRequests, isLoading } = useQuery<Array<any>>({
    queryKey: ["/api/on-duty-requests"],
  });

  const createOdMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/on-duty-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/on-duty-requests"] });
      toast({ title: "On Duty request submitted successfully" });
      setShowForm(false);
      setOdDate(""); setOdReason(""); setOdLocation(""); setOdType("full_day"); setOdFromTime(""); setOdToTime("");
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const level1Mutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
      apiRequest("PATCH", `/api/on-duty-requests/${id}/level1`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/on-duty-requests"] });
      toast({ title: "Level 1 approval updated" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const level2Mutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
      apiRequest("PATCH", `/api/on-duty-requests/${id}/level2`, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/on-duty-requests"] });
      toast({ title: "Level 2 approval updated" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const myRequests = odRequests?.filter(r => r.employeeId === currentEmployee?.id) || [];
  const pendingLevel1 = odRequests?.filter(r => r.level1Status === 'pending' && r.employeeId !== currentEmployee?.id) || [];
  const pendingLevel2 = odRequests?.filter(r => r.level1Status === 'approved' && r.level2Status === 'pending' && r.employeeId !== currentEmployee?.id) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">On Duty (OD) Requests</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Two-level approval: Reporting Manager → VP/HOD</p>
          </div>
          {currentEmployee && (
            <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-new-od">
              <Plus className="w-4 h-4 mr-1" />New OD Request
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="border rounded-lg p-4 mb-4 bg-slate-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={odDate} onChange={e => setOdDate(e.target.value)} className="h-8 text-sm" data-testid="input-od-date" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={odType} onValueChange={setOdType}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-od-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_day">Full Day</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {odType === 'half_day' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">From Time</Label>
                    <Input type="time" value={odFromTime} onChange={e => setOdFromTime(e.target.value)} className="h-8 text-sm" data-testid="input-od-from" />
                  </div>
                  <div>
                    <Label className="text-xs">To Time</Label>
                    <Input type="time" value={odToTime} onChange={e => setOdToTime(e.target.value)} className="h-8 text-sm" data-testid="input-od-to" />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Location / Client Site</Label>
                <Input value={odLocation} onChange={e => setOdLocation(e.target.value)} placeholder="e.g., Client office, Bangalore" className="h-8 text-sm" data-testid="input-od-location" />
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <Textarea value={odReason} onChange={e => setOdReason(e.target.value)} placeholder="Purpose of on-duty..." className="text-sm" rows={2} data-testid="input-od-reason" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={!odDate || !odReason.trim() || createOdMutation.isPending}
                  onClick={() => createOdMutation.mutate({ date: odDate, reason: odReason, location: odLocation, odType, fromTime: odFromTime || undefined, toTime: odToTime || undefined })}
                  data-testid="button-submit-od"
                >Submit Request</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">My OD Requests</h3>
            {myRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No OD requests found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Level 1</TableHead>
                    <TableHead>Level 2</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map(r => (
                    <TableRow key={r.id} data-testid={`row-od-${r.id}`}>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="text-sm capitalize">{(r.odType || 'full_day').replace('_', ' ')}</TableCell>
                      <TableCell className="text-sm">{r.location || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell>
                        <Badge className={r.level1Status === 'approved' ? 'bg-green-100 text-green-700' : r.level1Status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {r.level1Status === 'approved' ? 'Approved' : r.level1Status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={r.level2Status === 'approved' ? 'bg-green-100 text-green-700' : r.level2Status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {r.level2Status === 'approved' ? 'Approved' : r.level2Status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {pendingLevel1.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />Level 1 Approval (Reporting Manager)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLevel1.map(r => (
                  <TableRow key={r.id} data-testid={`row-od-l1-${r.id}`}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{r.employeeCode}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm capitalize">{(r.odType || 'full_day').replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{r.location || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{r.reason}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" disabled={level1Mutation.isPending}
                          onClick={() => level1Mutation.mutate({ id: r.id, status: 'approved' })}
                          data-testid={`button-approve-l1-${r.id}`}
                        ><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={level1Mutation.isPending}
                          onClick={() => level1Mutation.mutate({ id: r.id, status: 'rejected' })}
                          data-testid={`button-reject-l1-${r.id}`}
                        ><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pendingLevel2.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />Level 2 Approval (VP / Manager's Manager / HOD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>L1 Approved By</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLevel2.map(r => (
                  <TableRow key={r.id} data-testid={`row-od-l2-${r.id}`}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{r.employeeCode}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm capitalize">{(r.odType || 'full_day').replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{r.location || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{r.reason}</TableCell>
                    <TableCell className="text-sm">{r.level1ApprovedBy || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" disabled={level2Mutation.isPending}
                          onClick={() => level2Mutation.mutate({ id: r.id, status: 'approved' })}
                          data-testid={`button-approve-l2-${r.id}`}
                        ><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={level2Mutation.isPending}
                          onClick={() => level2Mutation.mutate({ id: r.id, status: 'rejected' })}
                          data-testid={`button-reject-l2-${r.id}`}
                        ><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />On Duty Policy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Two-Level Approval Process:</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Level 1:</strong> Reporting Manager approval is required first.</li>
            <li><strong>Level 2:</strong> VP / Manager's Manager / HOD approval is required after Level 1.</li>
          </ul>
          <p className="mt-2"><strong>Guidelines:</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>OD requests must be submitted in advance or on the same day.</li>
            <li>Approved OD counts as present for attendance purposes.</li>
            <li>Location and purpose must be clearly mentioned.</li>
            <li>Both levels of approval are mandatory for the OD to be effective.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
