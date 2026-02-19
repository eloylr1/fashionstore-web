/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Dashboard Completo (React Island)
 * Panel de administración con auto-refresh y métricas en tiempo real
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardStats {
  products: number;
  orders: number;
  customers: number;
  lowStock: number;
  pendingOrders: number;
}

interface Revenue {
  totalCents: number;
  monthCents: number;
  lastMonthCents: number;
  changePercent: number;
}

interface KPIs {
  monthSalesCents: number;
  monthOrdersCount: number;
  pendingCount: number;
  topProductName: string;
  topProductUnits: number;
}

interface ChartDataPoint {
  date: string;
  salesCents: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  image: string;
  slug: string;
}

interface DashboardData {
  stats: DashboardStats;
  revenue: Revenue;
  kpis: KPIs;
  chartData: ChartDataPoint[];
  recentOrders: RecentOrder[];
  lowStockProducts: LowStockProduct[];
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const formatCentsToEuros = (cents: number): string => {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
};

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
    paid: { label: 'Pagado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    processing: { label: 'Procesando', bg: 'bg-blue-100', text: 'text-blue-700' },
    shipped: { label: 'Enviado', bg: 'bg-purple-100', text: 'text-purple-700' },
    delivered: { label: 'Entregado', bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
  };
  return styles[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
};

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH INTERVAL (30 segundos)
// ═══════════════════════════════════════════════════════════════════════════
const REFRESH_INTERVAL = 15000;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardComplete() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) {
      setIsRefreshing(true);
    }
    
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      const result = await response.json();
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch inicial y auto-refresh
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      fetchData(false);
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  // Manual refresh
  const handleRefresh = () => {
    fetchData(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-charcoal-100 p-5 animate-pulse">
              <div className="h-3 bg-charcoal-200 rounded w-20 mb-3"></div>
              <div className="h-10 bg-charcoal-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-charcoal-100 rounded w-16"></div>
            </div>
          ))}
        </div>
        
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-700 font-medium">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, revenue, kpis, chartData, recentOrders, lowStockProducts } = data;

  // Chart configuration
  const chartDataConfig = {
    labels: chartData.map(d => formatShortDate(d.date)),
    datasets: [
      {
        label: 'Ventas (€)',
        data: chartData.map(d => d.salesCents / 100),
        backgroundColor: 'rgba(10, 22, 40, 0.8)',
        borderColor: '#0a1628',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#b8a067',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0a1628',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => formatCentsToEuros(context.raw * 100),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b6b6b', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          color: '#6b6b6b',
          font: { size: 11 },
          callback: (value: any) => `${value}€`,
        },
      },
    },
  };

  const hasChartData = chartData.some(d => d.salesCents > 0);

  return (
    <div className="space-y-6">
      {/* Header con refresh indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-charcoal-500">
          Última actualización: {formatTime(lastRefresh.toISOString())}
          {isRefreshing && (
            <span className="ml-2 inline-flex items-center gap-1">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Actualizando...
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50 border border-navy-200 rounded transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATS GRID - Métricas principales */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Productos */}
        <a href="/admin/productos" className="group bg-white p-5 border border-charcoal-100 hover:border-navy-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Productos</p>
              <p className="text-3xl font-serif font-bold text-navy-900 mt-1">{stats.products}</p>
              <p className="text-xs text-charcoal-400 mt-1">en catálogo</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-medium text-navy-600 group-hover:text-leather transition-colors">
            Ver productos
            <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Pedidos */}
        <a href="/admin/pedidos" className="group bg-white p-5 border border-charcoal-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Pedidos</p>
              <p className="text-3xl font-serif font-bold text-navy-900 mt-1">{stats.orders}</p>
              <p className="text-xs text-charcoal-400 mt-1">totales</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-medium text-navy-600 group-hover:text-leather transition-colors">
            Ver pedidos
            <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Ingresos Totales */}
        <div className="group bg-white p-5 border border-charcoal-100 hover:border-green-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Ingresos</p>
              <p className="text-3xl font-serif font-bold text-navy-900 mt-1">
                {Math.round(revenue.totalCents / 100)}€
              </p>
              <p className="text-xs text-charcoal-400 mt-1">totales</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl font-bold text-green-700">€</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-charcoal-400">Pedidos completados</p>
        </div>

        {/* Stock Bajo */}
        <a 
          href="/admin/stock" 
          className={`group p-5 border transition-all duration-300 ${
            stats.lowStock > 0 
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg hover:shadow-amber-100' 
              : 'bg-white border-charcoal-100 hover:shadow-lg'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Stock Bajo</p>
              <p className={`text-3xl font-serif font-bold mt-1 ${stats.lowStock > 0 ? 'text-amber-600' : 'text-navy-900'}`}>
                {stats.lowStock}
              </p>
              <p className="text-xs text-charcoal-400 mt-1">productos</p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform ${
              stats.lowStock > 0 ? 'bg-amber-100' : 'bg-charcoal-100'
            }`}>
              <svg className={`w-6 h-6 ${stats.lowStock > 0 ? 'text-amber-600' : 'text-charcoal-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className={`mt-3 flex items-center text-xs font-medium ${stats.lowStock > 0 ? 'text-amber-600' : 'text-charcoal-500'}`}>
            {stats.lowStock > 0 ? 'Requiere atención' : 'Todo en orden'}
            <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Clientes */}
        <a href="/admin/clientes" className="group bg-white p-5 border border-charcoal-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Clientes</p>
              <p className="text-3xl font-serif font-bold text-navy-900 mt-1">{stats.customers}</p>
              <p className="text-xs text-charcoal-400 mt-1">registrados</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-medium text-navy-600 group-hover:text-leather transition-colors">
            Ver clientes
            <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KPIs DEL MES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ventas del Mes */}
        <div className="group bg-gradient-to-br from-navy-900 to-navy-800 p-5 text-white hover:shadow-xl transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Ventas del Mes</p>
              <p className="text-3xl font-serif font-bold mt-2">{formatCentsToEuros(kpis.monthSalesCents)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/60">
                  {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                {revenue.changePercent !== 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    revenue.changePercent > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {revenue.changePercent > 0 ? '+' : ''}{revenue.changePercent}%
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Pedidos Pendientes</p>
              <p className={`text-3xl font-serif font-bold mt-2 ${kpis.pendingCount > 0 ? 'text-amber-600' : 'text-navy-900'}`}>
                {kpis.pendingCount}
              </p>
              <p className="text-xs text-charcoal-500 mt-1 flex items-center gap-1">
                {kpis.pendingCount > 0 ? (
                  <>
                    <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Requieren atención
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Todo al día
                  </>
                )}
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
              <p className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">Más Vendido</p>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GRÁFICO DE VENTAS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-navy-900">Ingresos diarios por pedidos completados</h3>
            <p className="text-sm text-charcoal-500 mt-0.5">Últimos 7 días</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-charcoal-500">
            <span className="w-3 h-3 bg-navy-900 rounded-sm"></span>
            Ventas
          </div>
        </div>
        
        <div className="p-6">
          {hasChartData ? (
            <div style={{ height: '280px' }}>
              <Bar data={chartDataConfig} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <svg className="w-16 h-16 text-charcoal-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-charcoal-500 font-medium">Sin ventas en los últimos 7 días</p>
              <p className="text-sm text-charcoal-400 mt-1">Los datos aparecerán cuando se completen pedidos</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GRIDS SECUNDARIOS: PEDIDOS RECIENTES + STOCK BAJO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos Recientes */}
        <div className="bg-white border border-charcoal-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-navy-900">Pedidos Recientes</h3>
            <a href="/admin/pedidos" className="text-sm text-navy-600 hover:text-leather transition-colors">
              Ver todos →
            </a>
          </div>
          <div className="divide-y divide-charcoal-100">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const status = getStatusStyle(order.status);
                return (
                  <a 
                    key={order.id} 
                    href={`/admin/pedidos/${order.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-charcoal-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-900 truncate">
                        #{order.orderNumber}
                      </p>
                      <p className="text-sm text-charcoal-500 truncate">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-navy-900">{formatCentsToEuros(order.total)}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center text-charcoal-500">
                <svg className="w-12 h-12 mx-auto text-charcoal-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>No hay pedidos aún</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Bajo */}
        <div className="bg-white border border-charcoal-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-navy-900">Stock Bajo</h3>
            <a href="/admin/stock" className="text-sm text-navy-600 hover:text-leather transition-colors">
              Ver todos →
            </a>
          </div>
          <div className="divide-y divide-charcoal-100">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <a 
                  key={product.id}
                  href={`/admin/productos/${product.slug}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-charcoal-50 transition-colors"
                >
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900 truncate">{product.name}</p>
                    <p className={`text-sm font-semibold ${
                      product.stock === 0 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {product.stock === 0 ? 'Sin stock' : `${product.stock} unidades`}
                    </p>
                  </div>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    product.stock === 0 ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    <svg className={`w-4 h-4 ${product.stock === 0 ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </a>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-charcoal-500">
                <svg className="w-12 h-12 mx-auto text-green-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-600 font-medium">¡Todo el stock está bien!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
