import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Calendar, Clock, Sparkles, AlertCircle, CheckCircle, TrendingDown, Info } from 'lucide-react';
import { WEEKLY_CROWD_DATA, GYM_SCHEDULE } from '../data/gymData';
import { HourlyCrowdItem } from '../types';

export const CrowdPredictorChart: React.FC = () => {
  const currentDayOfWeek = new Date().getDay(); // 0 = Dom, 1 = Seg, ...
  const currentHour = new Date().getHours();

  // Selected day state (defaults to today, or Monday if Sunday evening)
  const [selectedDay, setSelectedDay] = useState<number>(currentDayOfWeek);
  const [workoutDuration, setWorkoutDuration] = useState<number>(60); // 45, 60, 90 min

  const dayStats = WEEKLY_CROWD_DATA[selectedDay] || WEEKLY_CROWD_DATA[1];
  const daySchedule = GYM_SCHEDULE.find(s => s.dayId === selectedDay) || GYM_SCHEDULE[1];

  // Helper color for bar based on occupancy percent
  const getBarColor = (percent: number, isCurrent: boolean) => {
    if (isCurrent) return '#22d3ee'; // vibrant cyan
    if (percent < 45) return '#1e293b'; // subtle dark slate
    if (percent < 75) return '#f59e0b'; // amber
    return '#f43f5e'; // rose/red
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: HourlyCrowdItem = payload[0].payload;
      const isCurrent = selectedDay === currentDayOfWeek && data.hour === currentHour;

      return (
        <div className="rounded-2xl border border-gray-800 bg-gray-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs">
          <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-2 mb-2">
            <span className="font-black text-white font-mono">{data.label}</span>
            {isCurrent && (
              <span className="rounded-full bg-cyan-400 text-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Horário Atual
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="flex justify-between text-gray-300">
              <span>Lotação esperada:</span>
              <strong className="text-cyan-400 font-mono ml-2">{data.occupancyPercent}%</strong>
            </p>
            <p className="flex justify-between text-gray-300">
              <span>Média de alunos:</span>
              <strong className="text-white font-mono ml-2">~{data.averagePeople} pessoas</strong>
            </p>
            <p className="flex justify-between text-gray-300">
              <span>Nível de fluxo:</span>
              <strong className={`font-bold capitalize ${
                data.level === 'low' ? 'text-cyan-400' : data.level === 'moderate' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {data.level === 'low' ? 'Livre' : data.level === 'moderate' ? 'Moderado' : 'Pico Intenso'}
              </strong>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Days list for buttons
  const daysList = [
    { id: 1, name: 'Seg', fullName: 'Segunda-feira' },
    { id: 2, name: 'Ter', fullName: 'Terça-feira' },
    { id: 3, name: 'Qua', fullName: 'Quarta-feira' },
    { id: 4, name: 'Qui', fullName: 'Quinta-feira' },
    { id: 5, name: 'Sex', fullName: 'Sexta-feira' },
    { id: 6, name: 'Sáb', fullName: 'Sábado' },
    { id: 0, name: 'Dom', fullName: 'Domingo' }
  ];

  return (
    <div id="crowd-predictor-card" className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      
      {/* Header with Title and Day Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Movimentação Semanal
              </h3>
              <h2 className="text-lg font-black font-['Outfit'] text-white">
                Previsão de Movimento ao Longo da Semana
              </h2>
            </div>
          </div>
        </div>

        {/* Day of Week Selector Tabs (Touch-friendly and horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 bg-gray-900 p-1.5 rounded-2xl border border-gray-800 overflow-x-auto touch-scroll max-w-full">
          {daysList.map(d => {
            const isToday = d.id === currentDayOfWeek;
            const isSelected = d.id === selectedDay;

            return (
              <button
                key={d.id}
                id={`btn-day-${d.id}`}
                type="button"
                onClick={() => setSelectedDay(d.id)}
                className={`relative min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs uppercase font-bold tracking-wider rounded-xl transition-all shrink-0 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.3)] font-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{d.name}</span>
                {isToday && (
                  <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${isSelected ? 'bg-black' : 'bg-cyan-400'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Overview Banner */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-gray-950/80 p-3.5 border border-gray-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Melhores Horários (Livre)</span>
            <p className="text-xs font-bold text-cyan-400 mt-0.5">{dayStats.bestTimes}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-950/80 p-3.5 border border-gray-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Horários de Pico (Evitar)</span>
            <p className="text-xs font-bold text-rose-300 mt-0.5">{dayStats.peakTimes}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-950/80 p-3.5 border border-gray-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-gray-900 text-gray-300 border border-gray-800">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Funcionamento em {dayStats.dayName}</span>
            <p className="text-xs font-bold text-gray-200 mt-0.5">Das {daySchedule.open} às {daySchedule.close}</p>
          </div>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-700"></span>
            <span>Tranquilo (&lt; 45%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500"></span>
            <span>Moderado (45-75%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500"></span>
            <span>Pico Intenso (&gt; 75%)</span>
          </span>
        </div>
        {selectedDay === currentDayOfWeek && (
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Coluna Ciano: Horário de Agora ({currentHour}:00)</span>
          </span>
        )}
      </div>

      {/* Functional Interactive Recharts Bar Visualization */}
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayStats.hours} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.4} />
            <Bar dataKey="occupancyPercent" radius={[6, 6, 2, 2]}>
              {dayStats.hours.map((entry) => {
                const isCurrent = selectedDay === currentDayOfWeek && entry.hour === currentHour;
                return (
                  <Cell
                    key={`cell-${entry.hour}`}
                    fill={getBarColor(entry.occupancyPercent, isCurrent)}
                    stroke={isCurrent ? '#22d3ee' : 'transparent'}
                    strokeWidth={isCurrent ? 2 : 0}
                    className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Smart Workout Advice Box */}
      <div className="mt-5 rounded-2xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 p-4 border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Dica para o Aluno Hoje ({dayStats.dayName})
            </h4>
            <p className="text-xs text-gray-300 mt-0.5">
              Para um treino contínuo de {workoutDuration} min sem revezamento de halteres ou banco, o melhor período é <span className="text-cyan-400 font-bold">{dayStats.bestTimes}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1">Seu treino:</span>
          {[45, 60, 90].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => setWorkoutDuration(mins)}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs rounded-xl font-bold uppercase transition-all active:scale-95 cursor-pointer ${
                workoutDuration === mins
                  ? 'bg-white text-black shadow font-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
