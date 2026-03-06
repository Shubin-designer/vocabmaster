import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ChevronLeft, ChevronRight, Calendar, FileText, ClipboardList,
  BookOpen, PenLine, X, Clock, Users
} from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({ userId, role = 'student', isDark = true }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);

  useEffect(() => {
    if (userId) {
      loadEvents();
    }
  }, [userId, currentDate]);

  const loadEvents = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first and last day of month (with buffer for display)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);

    const allEvents = [];

    if (role === 'teacher') {
      // Load homework
      const { data: homework } = await supabase
        .from('homework')
        .select('id, title, due_date')
        .eq('teacher_id', userId)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString());

      homework?.forEach(h => {
        allEvents.push({
          id: h.id,
          title: h.title,
          date: new Date(h.due_date),
          type: 'homework',
          color: 'pink',
          icon: PenLine
        });
      });

      // Load content assignments with due dates
      const { data: assignments } = await supabase
        .from('content_assignments')
        .select('id, content_type, content_id, due_date')
        .eq('teacher_id', userId)
        .not('due_date', 'is', null)
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString());

      for (const a of assignments || []) {
        let title = 'Assignment';
        if (a.content_type === 'test') {
          const { data } = await supabase.from('tests').select('title').eq('id', a.content_id).single();
          title = data?.title || 'Test';
        } else if (a.content_type === 'material') {
          const { data } = await supabase.from('learning_materials').select('title').eq('id', a.content_id).single();
          title = data?.title || 'Material';
        } else if (a.content_type === 'reading_text') {
          const { data } = await supabase.from('reading_texts').select('title').eq('id', a.content_id).single();
          title = data?.title || 'Reading';
        }

        allEvents.push({
          id: a.id,
          title,
          date: new Date(a.due_date),
          type: a.content_type,
          color: a.content_type === 'test' ? 'orange' : a.content_type === 'reading_text' ? 'cyan' : 'purple',
          icon: a.content_type === 'test' ? ClipboardList : a.content_type === 'reading_text' ? BookOpen : FileText
        });
      }
    } else {
      // Student view
      const { data: studentHomework } = await supabase
        .rpc('get_student_homework', { p_student_id: userId });

      studentHomework?.forEach(h => {
        if (h.due_date) {
          allEvents.push({
            id: h.homework_id,
            title: h.title,
            date: new Date(h.due_date),
            type: 'homework',
            color: 'pink',
            icon: PenLine,
            status: h.submission_status,
            score: h.score
          });
        }
      });

      // Load student assignments
      const { data: studentAssignments } = await supabase
        .rpc('get_student_assignments', { p_student_id: userId });

      for (const a of studentAssignments || []) {
        if (a.due_date) {
          allEvents.push({
            id: a.assignment_id,
            title: a.content_type,
            date: new Date(a.due_date),
            type: a.content_type,
            color: a.content_type === 'test' ? 'orange' : a.content_type === 'reading_text' ? 'cyan' : 'purple',
            icon: a.content_type === 'test' ? ClipboardList : a.content_type === 'reading_text' ? BookOpen : FileText
          });
        }
      }
    }

    setEvents(allEvents);
    setLoading(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const eventDate = e.date;
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const handleDayClick = (day) => {
    const evts = getEventsForDay(day);
    if (evts.length > 0) {
      setSelectedDay(day);
      setDayEvents(evts);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      pink: isDark ? 'bg-pink-500/30 border-pink-500' : 'bg-pink-100 border-pink-500',
      orange: isDark ? 'bg-orange-500/30 border-orange-500' : 'bg-orange-100 border-orange-500',
      purple: isDark ? 'bg-purple-500/30 border-purple-500' : 'bg-purple-100 border-purple-500',
      cyan: isDark ? 'bg-cyan-500/30 border-cyan-500' : 'bg-cyan-100 border-cyan-500',
      green: isDark ? 'bg-green-500/30 border-green-500' : 'bg-green-100 border-green-500',
    };
    return colors[color] || colors.pink;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isToday = (day) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/[0.05] text-white/70' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/[0.05] text-white/70' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { color: 'pink', label: 'Homework', icon: PenLine },
          { color: 'orange', label: 'Tests', icon: ClipboardList },
          { color: 'purple', label: 'Materials', icon: FileText },
          { color: 'cyan', label: 'Reading', icon: BookOpen },
        ].map(item => (
          <div key={item.color} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              item.color === 'pink' ? 'bg-pink-500' :
              item.color === 'orange' ? 'bg-orange-500' :
              item.color === 'purple' ? 'bg-purple-500' : 'bg-cyan-500'
            }`} />
            <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'
      }`}>
        {/* Day headers */}
        <div className={`grid grid-cols-7 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}>
          {DAYS.map(day => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-medium ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={idx}
                onClick={() => day && handleDayClick(day)}
                className={`min-h-[100px] p-2 border-b border-r last:border-r-0 transition-colors ${
                  isDark ? 'border-white/[0.03]' : 'border-gray-100'
                } ${
                  day && hasEvents ? 'cursor-pointer' : ''
                } ${
                  day && hasEvents && (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50')
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day)
                        ? 'w-7 h-7 rounded-full bg-pink-vibrant text-white flex items-center justify-center'
                        : isDark ? 'text-white/70' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded truncate border-l-2 ${getColorClasses(event.color)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day details modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-[#1a1a1e]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDark ? 'border-white/10' : 'border-gray-200'
            }`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {MONTHS[month]} {selectedDay}, {year}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
              >
                <X size={18} className={isDark ? 'text-white/60' : 'text-gray-500'} />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {dayEvents.map((event, idx) => {
                const Icon = event.icon;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border-l-4 ${getColorClasses(event.color)}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={18} className={
                        event.color === 'pink' ? 'text-pink-500' :
                        event.color === 'orange' ? 'text-orange-500' :
                        event.color === 'purple' ? 'text-purple-500' : 'text-cyan-500'
                      } />
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {event.title}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {event.type === 'homework' ? 'Homework' :
                           event.type === 'test' ? 'Test' :
                           event.type === 'material' ? 'Material' : 'Reading'}
                        </p>
                        {event.status && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            event.status === 'graded' ? 'bg-green-500/20 text-green-400' :
                            event.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {event.status === 'graded' ? `Graded: ${event.score}` :
                             event.status === 'submitted' ? 'Submitted' : 'Pending'}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <Clock size={12} className="inline mr-1" />
                        {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
