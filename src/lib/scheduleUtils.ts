import { DayOperatingHours, GymOperatingHours, GymProfile } from '../types';

export interface GymOpenEvaluation {
  isOpen: boolean;
  status: 'open' | 'break' | 'outside_hours' | 'day_closed' | 'forced_closed';
  label: string;
  sublabel: string;
  todaySchedule: DayOperatingHours;
  currentDayId: number;
  currentTimeStr: string;
  nextEvent?: string | null;
  shiftName?: 'first_shift' | 'second_shift' | 'single_shift' | null;
  isAutomaticSchedule: boolean;
}

/**
 * Parses "HH:mm" time string into minutes since midnight (0 to 1439).
 */
export function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const [hoursStr, minutesStr] = timeStr.trim().split(':');
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Formats minutes since midnight back into "HH:mm".
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Returns current day of week (0=Sun, 1=Mon, ..., 6=Sat) and time in minutes
 * according to the gym timezone (default 'America/Sao_Paulo').
 */
export function getGymCurrentTime(referenceDate: Date = new Date(), timeZone: string = 'America/Sao_Paulo'): {
  dayId: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  timeStr: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(referenceDate);
    let weekday = '';
    let hours = 0;
    let minutes = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hours = parseInt(part.value, 10);
      if (part.type === 'minute') minutes = parseInt(part.value, 10);
    }

    if (hours === 24) hours = 0;

    const daysMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };

    const dayId = daysMap[weekday] !== undefined ? daysMap[weekday] : referenceDate.getDay();
    const totalMinutes = hours * 60 + minutes;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return { dayId, hours, minutes, totalMinutes, timeStr };
  } catch {
    // Fallback to local system time if Intl timezone format fails
    const dayId = referenceDate.getDay();
    const hours = referenceDate.getHours();
    const minutes = referenceDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return { dayId, hours, minutes, totalMinutes, timeStr };
  }
}

/**
 * Retrieves the day configuration from GymOperatingHours for a given dayId (0-6).
 */
export function getDayOperatingHours(operatingHours: GymOperatingHours | undefined, dayId: number): DayOperatingHours {
  const fallbackSchedule: GymOperatingHours = {
    weekdays: { open: '06:00', close: '23:00', isOpen: true, hasBreak: false, breakOpen: '12:00', breakClose: '14:00' },
    saturday: { open: '07:00', close: '17:00', isOpen: true, hasBreak: false, breakOpen: '12:00', breakClose: '13:00' },
    sunday: { open: '08:00', close: '14:00', isOpen: true, hasBreak: false, breakOpen: '12:00', breakClose: '13:00' }
  };

  const hours = operatingHours || fallbackSchedule;

  if (dayId === 0) return hours.sunday || fallbackSchedule.sunday;
  if (dayId === 6) return hours.saturday || fallbackSchedule.saturday;
  return hours.weekdays || fallbackSchedule.weekdays;
}

/**
 * Evaluates whether the gym is open right now strictly based on its operating hours schedule.
 */
export function evaluateOperatingHoursSchedule(
  operatingHours: GymOperatingHours | undefined,
  referenceDate: Date = new Date(),
  timeZone: string = 'America/Sao_Paulo'
): GymOpenEvaluation {
  const { dayId, totalMinutes, timeStr } = getGymCurrentTime(referenceDate, timeZone);
  const todaySchedule = getDayOperatingHours(operatingHours, dayId);

  // 1. Day is completely closed in schedule
  if (!todaySchedule.isOpen) {
    return {
      isOpen: false,
      status: 'day_closed',
      label: 'Fechado Hoje',
      sublabel: 'A academia não opera neste dia da semana.',
      todaySchedule,
      currentDayId: dayId,
      currentTimeStr: timeStr,
      nextEvent: null,
      shiftName: null,
      isAutomaticSchedule: true
    };
  }

  const openMinutes = parseTimeToMinutes(todaySchedule.open);
  const closeMinutes = parseTimeToMinutes(todaySchedule.close);

  // 2. Schedule with Break / Split Shifts (e.g. lunch break)
  if (todaySchedule.hasBreak && todaySchedule.breakOpen && todaySchedule.breakClose) {
    const breakOpenMinutes = parseTimeToMinutes(todaySchedule.breakOpen);
    const breakCloseMinutes = parseTimeToMinutes(todaySchedule.breakClose);

    // Before first opening
    if (totalMinutes < openMinutes) {
      return {
        isOpen: false,
        status: 'outside_hours',
        label: 'Fechado',
        sublabel: `Abre hoje às ${todaySchedule.open}`,
        todaySchedule,
        currentDayId: dayId,
        currentTimeStr: timeStr,
        nextEvent: todaySchedule.open,
        shiftName: null,
        isAutomaticSchedule: true
      };
    }

    // Inside first shift (e.g. 06:00 to 12:00)
    if (totalMinutes >= openMinutes && totalMinutes < breakOpenMinutes) {
      return {
        isOpen: true,
        status: 'open',
        label: 'Aberto',
        sublabel: `Pausa para almoço às ${todaySchedule.breakOpen}`,
        todaySchedule,
        currentDayId: dayId,
        currentTimeStr: timeStr,
        nextEvent: todaySchedule.breakOpen,
        shiftName: 'first_shift',
        isAutomaticSchedule: true
      };
    }

    // Inside break (e.g. 12:00 to 14:00)
    if (totalMinutes >= breakOpenMinutes && totalMinutes < breakCloseMinutes) {
      return {
        isOpen: false,
        status: 'break',
        label: 'Fechado (Pausa para Almoço)',
        sublabel: `Retorna hoje às ${todaySchedule.breakClose}`,
        todaySchedule,
        currentDayId: dayId,
        currentTimeStr: timeStr,
        nextEvent: todaySchedule.breakClose,
        shiftName: null,
        isAutomaticSchedule: true
      };
    }

    // Inside second shift (e.g. 14:00 to 22:00)
    if (totalMinutes >= breakCloseMinutes && totalMinutes < closeMinutes) {
      return {
        isOpen: true,
        status: 'open',
        label: 'Aberto',
        sublabel: `Fecha hoje às ${todaySchedule.close}`,
        todaySchedule,
        currentDayId: dayId,
        currentTimeStr: timeStr,
        nextEvent: todaySchedule.close,
        shiftName: 'second_shift',
        isAutomaticSchedule: true
      };
    }

    // After closing
    return {
      isOpen: false,
      status: 'outside_hours',
      label: 'Fechado',
      sublabel: 'Expediente encerrado por hoje.',
      todaySchedule,
      currentDayId: dayId,
      currentTimeStr: timeStr,
      nextEvent: null,
      shiftName: null,
      isAutomaticSchedule: true
    };
  }

  // 3. Continuous Schedule without Break (e.g. 06:00 to 23:00)
  if (totalMinutes < openMinutes) {
    return {
      isOpen: false,
      status: 'outside_hours',
      label: 'Fechado',
      sublabel: `Abre hoje às ${todaySchedule.open}`,
      todaySchedule,
      currentDayId: dayId,
      currentTimeStr: timeStr,
      nextEvent: todaySchedule.open,
      shiftName: null,
      isAutomaticSchedule: true
    };
  }

  if (totalMinutes >= openMinutes && totalMinutes < closeMinutes) {
    return {
      isOpen: true,
      status: 'open',
      label: 'Aberto',
      sublabel: `Fecha hoje às ${todaySchedule.close}`,
      todaySchedule,
      currentDayId: dayId,
      currentTimeStr: timeStr,
      nextEvent: todaySchedule.close,
      shiftName: 'single_shift',
      isAutomaticSchedule: true
    };
  }

  // Past closing
  return {
    isOpen: false,
    status: 'outside_hours',
    label: 'Fechado',
    sublabel: 'Expediente encerrado por hoje.',
    todaySchedule,
    currentDayId: dayId,
    currentTimeStr: timeStr,
    nextEvent: null,
    shiftName: null,
    isAutomaticSchedule: true
  };
}

/**
 * Returns the effective open status of a gym, combining automatic schedule evaluation
 * with optional manual override (e.g. if reception forced closure for maintenance).
 */
export function getEffectiveGymOpenStatus(
  gym: { operatingHours?: GymOperatingHours; forceClosed?: boolean; isOpen?: boolean } | null | undefined,
  referenceDate: Date = new Date(),
  timeZone: string = 'America/Sao_Paulo'
): GymOpenEvaluation {
  const scheduleEval = evaluateOperatingHoursSchedule(gym?.operatingHours, referenceDate, timeZone);

  // If gym was manually marked as force-closed by reception
  if (gym?.forceClosed) {
    return {
      ...scheduleEval,
      isOpen: false,
      status: 'forced_closed',
      label: 'Fechada Temporariamente',
      sublabel: 'Fechamento manual forçado pela administração.',
      isAutomaticSchedule: false
    };
  }

  return scheduleEval;
}
