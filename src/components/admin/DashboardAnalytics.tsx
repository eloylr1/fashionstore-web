/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Dashboard Analytics Component (Isla React)
 * KPIs ejecutivos y gráfico de ventas para el panel de admin
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface KPIs {
  monthSalesCents: number;
  pendingCount: number;
  topProductName: string;
  topProductUnits: number;
}

interface DailyData {
  date: string;
  salesCents: number;
}

interface AnalyticsData {
  kpis: KPIs;
  last7Days: DailyData[];
}

// Formatear céntimos a euros
const formatCentsToEuros = (cents: number): string => {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
};

// Formatear fecha corta (día y mes)
const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Error al cargar datos');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-charcoal-100 p-5 animate-pulse">
              <div className="h-3 bg-charcoal-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-charcoal-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-charcoal-100 rounded w-20"></div>
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="bg-white border border-charcoal-100 p-6 animate-pulse">
          <div className="h-4 bg-charcoal-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-charcoal-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-700 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, last7Days } = data;

  // Configuración del gráfico
  const chartData = {
    labels: last7Days.map(d => formatShortDate(d.date)),
    datasets: [
      {
        label: 'Ventas (€)',
        data: last7Days.map(d => d.salesCents / 100),
        backgroundColor: 'rgba(10, 22, 40, 0.8)', // navy-900
        borderColor: '#0a1628',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#b8a067', // gold-matte
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0a1628',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${formatCentsToEuros(context.raw * 100)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b6b6b',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)',
        },
        ticks: {
          color: '#6b6b6b',
          font: {
            size: 11,
          },
          callback: (value: any) => `${value}€`,
        },
      },
    },
  };

  // Verificar si hay datos de ventas
  const hasChartData = last7Days.some(d => d.salesCents > 0);

  return (
    <div className="space-y-6">
      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ventas del Mes */}
        <div className="group bg-gradient-to-br from-navy-900 to-navy-800 p-5 text-white hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Ventas del Mes
              </p>
              <p className="text-3xl font-serif font-bold mt-2">
                {formatCentsToEuros(kpis.monthSalesCents)}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pedidos Pendientes */}
        <div className={`group p-5 transition-all duration-300 hover:shadow-lg ${
          kpis.pendingCount > 0 
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200' 
            : 'bg-white border border-charcoal-100'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                Pedidos Pendientes
              </p>
              <p className={`text-3xl font-serif font-bold mt-2 ${
                kpis.pendingCount > 0 ? 'text-amber-600' : 'text-navy-900'
              }`}>
                {kpis.pendingCount}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                {kpis.pendingCount > 0 ? '⚠️ Requieren atención' : '✓ Todo al día'}
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform ${
              kpis.pendingCount > 0 ? 'bg-amber-100' : 'bg-charcoal-100'
            }`}>
              <svg className={`w-6 h-6 ${kpis.pendingCount > 0 ? 'text-amber-600' : 'text-charcoal-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Producto Más Vendido */}
        <div className="group bg-white border border-charcoal-100 p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                Más Vendido
              </p>
              <p className="text-lg font-semibold text-navy-900 mt-2 truncate" title={kpis.topProductName}>
                {kpis.topProductName}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                {kpis.topProductUnits > 0 ? `${kpis.topProductUnits} uds vendidas` : 'Sin ventas este mes'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-navy-900">
              Ventas Últimos 7 Días
            </h3>
            <p className="text-sm text-charcoal-500 mt-0.5">
              Ingresos diarios por pedidos completados
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-charcoal-500">
            <span className="w-3 h-3 bg-navy-900 rounded-sm"></span>
            Ventas
          </div>
        </div>
        
        <div className="p-6">
          {hasChartData ? (
            <div style={{ height: '280px' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <svg className="w-16 h-16 text-charcoal-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-charcoal-500 font-medium">Sin ventas en los últimos 7 días</p>
              <p className="text-sm text-charcoal-400 mt-1">
                Los datos aparecerán cuando se completen pedidos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
