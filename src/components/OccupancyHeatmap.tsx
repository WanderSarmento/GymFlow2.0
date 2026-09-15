import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine
} from 'recharts';
import { Clock, TrendingDown, Users, Calendar } from 'lucide-react';
import { DayCrowdStats, HourlyCrowdItem } from '../types';

interface OccupancyHeatmapProps {
  gymSlug: string;
  refreshInterval?: number;
}

export const OccupancyHeatmap: React.FC<OccupancyHeatmapProps> = ({ 
  gymSlug,
  refreshInterval = 300000 // 5 minutes default
}) => {
  const [data, setData] = useState<DayCrowdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentHour = new Date().getHours();

  const fetchHeatmap = async () => {
    try {
      const response = await fetch(`/api/gyms/${gymSlug}/heatmap`);
      const result = await response.json();
      if (result.success) {
        setData(result.heatmap);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erro ao carregar dados de fluxo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, refreshInterval);
    return () => clearInterval(interval);
  }, [gymSlug, refreshInterval]);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-gray-950/50 rounded-3xl border border-gray-800 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <Clock className="h-6 w-6 text-gray-700 animate-spin" />
          <span className="text-xs text-gray-600 font-bold uppercase tracking-widest">Calculando Fluxo...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 text-center bg-gray-950/50 rounded-3xl border border-gray-800">
        <span className="text-xs text-gray-500 font-medium">Não foi possível carregar a previsão de fluxo.</span>
      </div>
    );
  }

  // Filter only operating hours for better display (6h to 23h)
  const chartData = data.hours.filter(h => h.hour >= 5 && h.hour <= 23);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as HourlyCrowdItem;
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              item.level === 'peak' ? 'bg-rose-500' : item.level === 'moderate' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <p className="text-sm font-bold text-white">
              {item.occupancyPercent}% <span className="text-gray-500 font-normal">de lotação</span>
            </p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Média de {item.averagePeople} pessoas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Janelas de Tranquilidade • {data.dayName}
            </h3>
          </div>
          <h2 className="text-xl font-black text-white font-['Outfit']">
            Melhores Horários para Treinar
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              {data.bestTimes}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative w-full bg-gray-950/40 p-4 sm:p-6 rounded-3xl border border-gray-800 shadow-inner overflow-hidden">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.5} />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#6b7280', fontWeight: 700 }}
                interval={2}
              />
              <YAxis 
                hide 
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.1 }} />
              <ReferenceLine x={currentHour + 'h'} stroke="#22d3ee" strokeDasharray="3 3" />
              <Bar 
                dataKey="occupancyPercent" 
                radius={[4, 4, 4, 4]}
                barSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.hour === currentHour 
                        ? '#22d3ee' 
                        : entry.level === 'peak' 
                          ? '#f43f5e' 
                          : entry.level === 'moderate' 
                            ? '#fbbf24' 
                            : '#10b981'
                    }
                    fillOpacity={entry.hour === currentHour ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-gray-800/50 pt-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 opacity-60" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Vazio / Baixo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400 opacity-60" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Moderado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-500 opacity-60" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Horário de Pico</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 border-l border-gray-800 pl-4">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Hora Atual</span>
          </div>
        </div>
      </div>

      {/* Advice Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3 items-start">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Dica de Fluxo</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              O horário de pico hoje é previsto para <strong className="text-gray-200">{data.peakTimes}</strong>. Tente antecipar ou adiar seu treino para estas janelas de tranquilidade.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 flex gap-3 items-start">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-cyan-400/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-0.5">Previsão Inteligente</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Baseado nos acessos dos últimos 15 dias, os horários mais calmos são <strong className="text-gray-200">{data.bestTimes}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
