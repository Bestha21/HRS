import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: ReactNode;
  className?: string;
}

export function StatCard({ title, value, trend, trendUp, icon, className }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-6 transition-all hover:translate-y-[-2px] hover:shadow-2xl", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold font-display text-slate-800">{value}</h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-primary border border-slate-100">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium">
          <span className={trendUp ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" : "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full"}>
            {trend}
          </span>
          <span className="text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
}
