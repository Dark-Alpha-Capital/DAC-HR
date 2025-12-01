"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Client component for Pie Chart
export function CandidatesByStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const COLORS: Record<string, string> = {
    pending: "#93C5FD",
    reviewed: "#A78BFA",
    shortlisted: "#6366F1",
    interviewing: "#60A5FA",
    hired: "#34D399",
    rejected: "#EF4444",
    withdrawn: "#9CA3AF",
  };

  const chartData = data.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: COLORS[item.status] || "#9CA3AF",
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Client component for Bar Chart
export function CandidatesByPositionChart({
  data,
}: {
  data: { positionName: string; count: number }[];
}) {
  const chartData = data.map((item) => ({
    name: item.positionName,
    candidates: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "currentColor" }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Bar dataKey="candidates" fill="#6366F1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Client component for Line Chart - Applications Over Time
export function ApplicationsOverTimeChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const chartData = data.map((item) => ({
    month: new Date(item.month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    applications: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tick={{ fill: "currentColor" }}
        />
        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Line
          type="monotone"
          dataKey="applications"
          stroke="#6366F1"
          strokeWidth={2}
          dot={{ fill: "#6366F1", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Client component for Employees by Department Chart
export function EmployeesByDepartmentChart({
  data,
}: {
  data: { department: string; count: number }[];
}) {
  const COLORS = [
    "#6366F1",
    "#8B5CF6",
    "#EC4899",
    "#F43F5E",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#06B6D4",
    "#6B7280",
  ];

  const chartData = data.map((item, index) => ({
    name:
      item.department.charAt(0).toUpperCase() +
      item.department.slice(1).replace("-", " "),
    employees: item.count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs"
            tick={{ fill: "currentColor" }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="employees" fill="#6366F1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Client component for Interview Ratings Distribution
export function InterviewRatingsChart({
  data,
}: {
  data: { rating: number; count: number }[];
}) {
  const chartData = data.map((item) => ({
    rating: `${item.rating}⭐`,
    count: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="rating"
          className="text-xs"
          tick={{ fill: "currentColor" }}
        />
        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
