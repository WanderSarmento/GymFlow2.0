import React, { useState } from 'react';
import { Target, Zap, Clock, ThumbsUp, Calendar, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { OccupancyData } from '../types';

interface StudentWorkoutPlannerProps {
  occupancy: OccupancyData;
}

export const StudentWorkoutPlanner: React.FC<StudentWorkoutPlannerProps> = ({ occupancy }) => {
  const [muscleGroup, setMuscleGroup] = useState<string>('superior');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedDayTime, setSelectedDayTime] = useState<'manha' | 'tarde' | 'noite'>('tarde');

  const getSmartRecommendations = () => {
    switch (muscleGroup) {
      case 'superior':
        return {
          title: 'Treino de Peitoral, Costas & Braços',
          equipments: 'Supinos, Crossover, Puxadas e Halteres',
          bestTimeWindow: selectedDayTime === 'manha' ? '10:00 às 11:30' : selectedDayTime === 'tarde' ? '13:30 às 16:00' : '21:15 às 22:45',
          congestionRisk: 'Alto no horário de pico das 18h às 20h30 devido à alta concorrência por bancos e anilhas.',
          tip: 'No horário recomendado, você não precisará esperar para montar barras nem revezar banco reto.'
        };
      case 'inferior':
        return {
          title: 'Treino de Pernas & Glúteos',
          equipments: 'Leg Press 45º, Hack Squat, Cadeiras Extensoras',
          bestTimeWindow: selectedDayTime === 'manha' ? '09:30 às 11:00' : selectedDayTime === 'tarde' ? '14:00 às 16:30' : '21:30 às 22:45',
          congestionRisk: 'Moderado. Aparelhos articulados costumam ser desocupados com rapidez fora das 19h.',
          tip: 'Aproveite o período da tarde para realizar descansos adequados entre séries pesadas de agachamento.'
        };
      case 'cardio':
        return {
          title: 'Cardio, Esteiras & Funcional',
          equipments: 'Esteiras ergométricas, Elípticos e Bikes',
          bestTimeWindow: selectedDayTime === 'manha' ? '06:00 às 07:00' : selectedDayTime === 'tarde' ? '11:30 às 14:00' : '20:30 às 22:30',
          congestionRisk: 'Baixo. A academia possui 18 esteiras e totens de ventilação.',
          tip: 'Horário ideal para corridas contínuas de média e longa duração sem limite de tempo.'
        };
      default:
        return {
          title: 'Treino Geral de Musculação',
          equipments: 'Polias e Máquinas Gerais',
          bestTimeWindow: '13:00 às 15:30',
          congestionRisk: 'Baixo',
          tip: 'Circulação livre em toda a academia.'
        };
    }
  };

  const rec = getSmartRecommendations();

  return (
    <div id="student-workout-planner" className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      
      <div className="flex items-center gap-2.5 border-b border-gray-800 pb-4 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Planejamento Inteligente
          </h3>
          <h2 className="font-['Outfit'] text-lg font-black text-white">
            Otimizador de Treino para o Aluno
          </h2>
        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-5">
        
        {/* Muscle group */}
        <div>
          <label className="block text-gray-500 font-bold mb-2 uppercase tracking-widest text-[10px]">
            Foco do Treino Hoje:
          </label>
          <div className="space-y-2">
            {[
              { id: 'superior', label: 'Superiores (Peito/Costas)' },
              { id: 'inferior', label: 'Inferiores (Pernas/Glúteos)' },
              { id: 'cardio', label: 'Aeróbico / Cardio' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMuscleGroup(item.id)}
                className={`w-full min-h-[44px] flex items-center text-left px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider active:scale-98 cursor-pointer ${
                  muscleGroup === item.id
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.25)] font-black'
                    : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-gray-500 font-bold mb-2 uppercase tracking-widest text-[10px]">
            Duração Estimada:
          </label>
          <div className="space-y-2">
            {[
              { mins: 45, label: '45 min (Rápido)' },
              { mins: 60, label: '60 min (Padrão)' },
              { mins: 90, label: '90 min (Completo)' }
            ].map(item => (
              <button
                key={item.mins}
                type="button"
                onClick={() => setSelectedDuration(item.mins)}
                className={`w-full min-h-[44px] flex items-center text-left px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider active:scale-98 cursor-pointer ${
                  selectedDuration === item.mins
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.25)] font-black'
                    : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred time of day */}
        <div>
          <label className="block text-gray-500 font-bold mb-2 uppercase tracking-widest text-[10px]">
            Turno de Preferência:
          </label>
          <div className="space-y-2">
            {[
              { id: 'manha', label: 'Manhã (06h às 12h)' },
              { id: 'tarde', label: 'Tarde (12h às 18h)' },
              { id: 'noite', label: 'Noite (18h às 23h)' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDayTime(item.id as any)}
                className={`w-full min-h-[44px] flex items-center text-left px-3.5 py-2.5 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider active:scale-98 cursor-pointer ${
                  selectedDayTime === item.id
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.25)] font-black'
                    : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Generated Recommendation Card */}
      <div className="rounded-2xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 p-5 border border-cyan-400/20 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <span className="text-sm font-black font-['Outfit'] text-white">
            {rec.title} ({selectedDuration} min)
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
            <Clock className="h-3.5 w-3.5" />
            Janela Ideal: {rec.bestTimeWindow}
          </span>
        </div>

        <p className="text-xs text-gray-300 mb-2.5">
          <strong className="text-white">Aparelhos chave:</strong> {rec.equipments}
        </p>

        <div className="flex items-start gap-2 text-xs text-gray-400 pt-2.5 border-t border-gray-800">
          <ThumbsUp className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>{rec.tip}</span>
        </div>
      </div>

    </div>
  );
};
