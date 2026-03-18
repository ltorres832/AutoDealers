'use client';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardChartsProps {
  leadsData: Array<{ date: string; count: number }>;
  salesData: Array<{ date: string; amount: number }>;
  sourceData: Array<{ name: string; value: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function LeadsTrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Leads" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalesTrendChart({ data }: { data: Array<{ date: string; amount: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        <Legend />
        <Bar dataKey="amount" fill="#10B981" name="Ventas ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsBySourceChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function DashboardCharts({ leadsData, salesData, sourceData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Tendencia de Leads (Últimos 7 días)</h3>
        <LeadsTrendChart data={leadsData} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Ventas por Día (Últimos 7 días)</h3>
        <SalesTrendChart data={salesData} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
        <h3 className="text-lg font-bold mb-4">Leads por Fuente</h3>
        <LeadsBySourceChart data={sourceData} />
      </div>
    </div>
  );
}
