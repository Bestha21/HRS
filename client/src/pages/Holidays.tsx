import { useQuery, useMutation } from "@tanstack/react-query";
import { useEntity } from "@/lib/entityContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarDays, Sun, Star, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO, isAfter, isBefore, startOfToday } from "date-fns";
import type { Holiday, Employee } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const holidaySchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().optional(),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export default function Holidays() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: [`/api/holidays?year=${currentYear}`],
  });

  const { entityFilterParam, selectedEntityIds } = useEntity();
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", selectedEntityIds],
    queryFn: async () => {
      const res = await fetch(`/api/employees${entityFilterParam ? `?${entityFilterParam}` : ''}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const currentEmployee = employees?.find(e => e.email?.toLowerCase() === user?.email?.toLowerCase());
  const isAdmin = (currentEmployee?.accessRole || "employee").split(",").map(r => r.trim()).includes("admin");

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
      type: "public",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: HolidayFormData) => 
      apiRequest("POST", "/api/holidays", {
        ...data,
        year: new Date(data.date).getFullYear(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith('/api/holidays') });
      toast({ title: "Holiday added successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add holiday", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith('/api/holidays') });
      toast({ title: "Holiday deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete holiday", variant: "destructive" });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "public": return "bg-green-100 text-green-700";
      case "optional": return "bg-blue-100 text-blue-700";
      case "restricted": return "bg-yellow-100 text-yellow-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const today = startOfToday();
  const upcomingHolidays = holidays?.filter(h => isAfter(parseISO(h.date), today) || format(parseISO(h.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) || [];
  const pastHolidays = holidays?.filter(h => isBefore(parseISO(h.date), today)) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Holiday Calendar</h1>
          <p className="text-slate-500">View and manage company holidays for {currentYear}</p>
        </div>
        {isAdmin && (<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-holiday">
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Holiday Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Diwali" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public Holiday</SelectItem>
                            <SelectItem value="optional">Optional Holiday</SelectItem>
                            <SelectItem value="restricted">Restricted Holiday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description..." {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-holiday">
                  {createMutation.isPending ? "Adding..." : "Add Holiday"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Holidays</p>
                <p className="text-2xl font-bold text-slate-800">{holidays?.length || 0}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Upcoming</p>
                <p className="text-2xl font-bold text-green-600">{upcomingHolidays.length}</p>
              </div>
              <Sun className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Public Holidays</p>
                <p className="text-2xl font-bold text-blue-600">
                  {holidays?.filter(h => h.type === "public").length || 0}
                </p>
              </div>
              <Star className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {upcomingHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => (
                <div 
                  key={holiday.id} 
                  data-testid={`holiday-upcoming-${holiday.id}`}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white border border-yellow-200 flex flex-col items-center justify-center shadow-sm">
                      <span className="text-xs font-medium text-yellow-600">{format(parseISO(holiday.date), "MMM")}</span>
                      <span className="text-xl font-bold text-slate-800">{format(parseISO(holiday.date), "dd")}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{holiday.name}</p>
                      <p className="text-sm text-slate-500">{format(parseISO(holiday.date), "EEEE")}</p>
                    </div>
                  </div>
                  <Badge className={getTypeColor(holiday.type || "public")}>
                    {holiday.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Holidays {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {!holidays?.length ? (
            <p className="text-slate-400 text-center py-8">No holidays added for this year</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Day</th>
                    <th className="pb-3 font-medium">Holiday</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Status</th>
                    {isAdmin && <th className="pb-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((holiday) => {
                    const holidayDate = parseISO(holiday.date);
                    const isPast = isBefore(holidayDate, today);
                    return (
                      <tr 
                        key={holiday.id} 
                        data-testid={`holiday-row-${holiday.id}`} 
                        className={`border-b last:border-0 ${isPast ? "opacity-60" : ""}`}
                      >
                        <td className="py-4 text-sm font-medium text-slate-900">
                          {format(holidayDate, "MMM dd, yyyy")}
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          {format(holidayDate, "EEEE")}
                        </td>
                        <td className="py-4">
                          <p className="font-medium text-slate-900">{holiday.name}</p>
                          {holiday.description && (
                            <p className="text-xs text-slate-400">{holiday.description}</p>
                          )}
                        </td>
                        <td className="py-4">
                          <Badge className={getTypeColor(holiday.type || "public")}>
                            {holiday.type}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge className={isPast ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
                            {isPast ? "Passed" : "Upcoming"}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm(`Delete "${holiday.name}"?`)) {
                                  deleteMutation.mutate(holiday.id);
                                }
                              }}
                              data-testid={`button-delete-holiday-${holiday.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
