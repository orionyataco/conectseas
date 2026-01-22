
import React from 'react';
import { ChevronLeft, ChevronRight, Printer, RefreshCcw, Plus, X, Edit2, Trash2, Calendar as CalendarIcon, Clock, Eye, EyeOff } from 'lucide-react';
import { Event, User } from '../types';
import api from '../services/api';

interface CalendarProps {
  user: User | null;
}

const Calendar: React.FC<CalendarProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<Event[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [sharedWith, setSharedWith] = React.useState<string[]>([]);

  // Form state
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    eventDate: '',
    eventEndDate: '',
    eventTime: '',
    eventEndTime: '',
    meetingLink: '',
    visibility: 'public' as 'public' | 'private' | 'shared',
    eventType: 'other' as 'meeting' | 'holiday' | 'birthday' | 'vacation' | 'other'
  });

  const parseLocalDate = (dateStr: string) => {
    // splits YYYY-MM-DD and creates a date object in local time
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };
  const [viewType, setViewType] = React.useState<'day' | 'week' | 'month' | 'year'>('month');

  const weekDays = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  React.useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/events?userId=${user.id}&userRole=${user.role}`);
      setEvents(res.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !formData.title || !formData.eventDate) return;

    try {
      await api.post('/events', {
        userId: user.id,
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        eventEndDate: formData.eventEndDate || null,
        eventTime: formData.eventTime || null,
        eventEndTime: formData.eventEndTime || null,
        visibility: formData.visibility,
        eventType: formData.eventType,
        meetingLink: formData.meetingLink || null,
        sharedWith: formData.visibility === 'shared' ? sharedWith : []
      });

      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleEditEvent = async () => {
    if (!user || !editingEvent) return;

    try {
      await api.put(`/events/${editingEvent.id}`, {
        userId: user.id,
        userRole: user.role,
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        eventEndDate: formData.eventEndDate || null,
        eventTime: formData.eventTime || null,
        eventEndTime: formData.eventEndTime || null,
        visibility: formData.visibility,
        eventType: formData.eventType,
        meetingLink: formData.meetingLink || null,
        sharedWith: formData.visibility === 'shared' ? sharedWith : []
      });

      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Failed to edit event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!user || !confirm('Deseja realmente excluir este evento?')) return;

    try {
      await api.delete(`/events/${eventId}?userId=${user.id}&userRole=${user.role}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventDate: '',
      eventEndDate: '',
      eventTime: '',
      eventEndTime: '',
      meetingLink: '',
      visibility: 'public',
      eventType: 'other'
    });
    setSharedWith([]);
    setEditingEvent(null);
    setShowModal(false);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      eventDate: event.event_date ? event.event_date.split('T')[0] : '',
      eventEndDate: event.event_end_date ? event.event_end_date.split('T')[0] : '',
      eventTime: event.event_time || '',
      eventEndTime: event.event_end_time || '',
      meetingLink: event.meeting_link || '',
      visibility: event.visibility,
      eventType: event.event_type
    });
    if (event.visibility === 'shared' && event.shared_with) {
      setSharedWith(event.shared_with.split(','));
    } else {
      setSharedWith([]);
    }
    setShowModal(true);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };



  const previous = () => {
    switch (viewType) {
      case 'day': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1)); break;
      case 'week': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)); break;
      case 'month': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); break;
      case 'year': setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)); break;
    }
  };

  const next = () => {
    switch (viewType) {
      case 'day': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)); break;
      case 'week': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)); break;
      case 'month': setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); break;
      case 'year': setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1)); break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-700',
      holiday: 'bg-red-100 text-red-700',
      birthday: 'bg-orange-100 text-orange-700',
      vacation: 'bg-green-100 text-green-700',
      other: 'bg-purple-100 text-purple-700'
    };
    return colors[type] || colors.other;
  };

  const isBetween = (date: Date, start: Date, end: Date) => {
    const d = new Date(date).setHours(0, 0, 0, 0);
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eventStart = parseLocalDate(e.event_date.split('T')[0]);
      const eventEnd = e.event_end_date ? parseLocalDate(e.event_end_date.split('T')[0]) : eventStart;
      return isBetween(date, eventStart, eventEnd);
    });
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    return (
      <div className="p-8 flex-1 overflow-auto">
        <h3 className="font-bold text-slate-400 mb-6 uppercase tracking-widest text-xs">Eventos para este dia</h3>
        <div className="space-y-4">
          {dayEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">Sem eventos para hoje</div>
          ) : (
            dayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => openEditModal(event)}
                className={`p-4 rounded-2xl border-l-4 ${getEventColor(event.event_type)} cursor-pointer hover:shadow-md transition-all`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg">{event.title}</h4>
                  <span className="text-[10px] uppercase font-bold opacity-60 bg-white/50 px-2 py-0.5 rounded">{event.event_type}</span>
                </div>
                {event.description && <p className="text-sm mb-3 opacity-90">{event.description}</p>}
                <div className="flex items-center gap-4 text-xs font-medium opacity-60">
                  <div className="flex items-center gap-1">
                    <Clock size={14} /> {event.event_time || 'O dia todo'}{event.event_end_time ? ` - ${event.event_end_time}` : ''}
                  </div>
                  {event.event_end_date && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={14} /> Até {formatDate(event.event_end_date)}
                    </div>
                  )}
                </div>
                {event.meeting_link && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(event.meeting_link, '_blank');
                      }}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} /> Ingressar na Reunião
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
    const weekDaysList = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
      weekDaysList.push(day);
    }

    return (
      <div className="grid grid-cols-7 flex-1 min-h-[600px]">
        {weekDaysList.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentToday = day.toDateString() === new Date().toDateString();

          return (
            <div key={i} className={`border-r border-slate-100 flex flex-col ${isCurrentToday ? 'bg-blue-50/20' : ''}`}>
              <div className="p-4 border-b border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">{weekDays[i]}</span>
                <span className={`text-lg font-bold ${isCurrentToday ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-slate-700'}`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="p-2 gap-2 flex flex-col flex-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => openEditModal(event)}
                    className={`${getEventColor(event.event_type)} text-[10px] font-bold p-2 rounded-xl cursor-pointer hover:opacity-80 transition-opacity`}
                    title={event.title}
                  >
                    <div className="truncate">{event.title}</div>
                    {event.event_time && <div className="text-[8px] opacity-70 mt-1">{event.event_time}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDaysList = getDaysInMonth();
    return (
      <>
        <div className="grid grid-cols-7 border-b border-slate-100">
          {weekDays.map(d => (
            <div key={d} className="p-4 text-center text-[10px] font-bold text-slate-400 tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {monthDaysList.map((day, i) => {
            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
            const dayEvents = date ? getEventsForDay(date) : [];

            return (
              <div key={i} className={`border-r border-b border-slate-100 p-3 flex flex-col gap-2 min-h-[140px] ${day === null ? 'bg-slate-50/50' : ''}`}>
                {day !== null && (
                  <span className={`text-xs font-bold ${isToday(day) ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>
                    {day}
                  </span>
                )}
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`${getEventColor(event.event_type)} text-[9px] font-bold px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-between`}
                      onClick={() => openEditModal(event)}
                      title={event.title}
                    >
                      <span className="truncate flex-1">{event.title}</span>
                      {event.visibility === 'private' && <EyeOff size={10} className="ml-1" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-6 p-6 overflow-auto max-h-[700px]">
        {months.map(m => {
          const monthDate = new Date(currentDate.getFullYear(), m, 1);
          const firstDay = monthDate.getDay();
          const lastDayOffset = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
          const monthDaysList = [];
          for (let i = 0; i < firstDay; i++) monthDaysList.push(null);
          for (let i = 1; i <= lastDayOffset; i++) monthDaysList.push(i);

          return (
            <div key={m} className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm text-center border-b pb-2">{monthNames[m]}</h4>
              <div className="grid grid-cols-7 gap-1 text-[8px] font-bold text-slate-400 text-center">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDaysList.map((d, i) => {
                  if (d === null) return <div key={i}></div>;
                  const date = new Date(currentDate.getFullYear(), m, d);
                  const hasEvents = events.some(e => {
                    const s = parseLocalDate(e.event_date.split('T')[0]);
                    const end = e.event_end_date ? parseLocalDate(e.event_end_date.split('T')[0]) : s;
                    return isBetween(date, s, end);
                  });

                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded-sm text-[8px] ${hasEvents ? 'bg-blue-500 text-white font-bold' : 'text-slate-600'} cursor-pointer hover:bg-slate-100`}
                      onClick={() => {
                        setCurrentDate(new Date(currentDate.getFullYear(), m, d));
                        setViewType('day');
                      }}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const days = getDaysInMonth();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header>
          <h1 className="text-2xl font-bold text-slate-800">Calendário Institucional</h1>
          <p className="text-slate-500">Gestão de agenda, eventos públicos e feriados do Estado do Amapá.</p>
        </header>
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={18} /> Sincronizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left pane */}
        <div className="space-y-6">
          <button
            onClick={openCreateModal}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Criar Novo Evento
          </button>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <div className="flex gap-1">
                <button onClick={previous} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ChevronLeft size={16} /></button>
                <button onClick={next} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg cursor-pointer transition-colors ${day === null ? '' :
                    isToday(day) ? 'bg-blue-600 text-white font-bold' :
                      'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tipos de Eventos</h3>
            <div className="space-y-3">
              {[
                { label: 'Reuniões', type: 'meeting', color: 'bg-blue-500' },
                { label: 'Feriados', type: 'holiday', color: 'bg-red-500' },
                { label: 'Aniversários', type: 'birthday', color: 'bg-orange-500' },
                { label: 'Férias', type: 'vacation', color: 'bg-green-500' },
                { label: 'Outros', type: 'other', color: 'bg-purple-500' },
              ].map(cat => (
                <div key={cat.type} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${cat.color}`}></span>
                  <span className="text-sm text-slate-600">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={goToToday} className="px-4 py-2 bg-slate-100 text-slate-800 text-sm font-bold rounded-xl">Hoje</button>
              <div className="flex items-center gap-2 text-slate-400">
                <ChevronLeft size={20} className="cursor-pointer hover:text-slate-800" onClick={previous} />
                <ChevronRight size={20} className="cursor-pointer hover:text-slate-800" onClick={next} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {viewType === 'day' && `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`}
                {viewType === 'week' && `Semana de ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).getDate()} de ${monthNames[new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).getMonth()]}`}
                {viewType === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                {viewType === 'year' && `${currentDate.getFullYear()}`}
              </h2>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['day', 'week', 'month', 'year'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setViewType(v)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {viewType === 'day' && renderDayView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'month' && renderMonthView()}
            {viewType === 'year' && renderYearView()}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nome do evento"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Descrição do evento (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Término</label>
                  <input
                    type="date"
                    value={formData.eventEndDate}
                    onChange={(e) => setFormData({ ...formData, eventEndDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hora de Início</label>
                  <input
                    type="time"
                    value={formData.eventTime}
                    onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hora de Término</label>
                  <input
                    type="time"
                    value={formData.eventEndTime}
                    onChange={(e) => setFormData({ ...formData, eventEndTime: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Link da Reunião (Online)</label>
                  {formData.meetingLink && (
                    <a
                      href={formData.meetingLink.startsWith('http') ? formData.meetingLink : `https://${formData.meetingLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      Testar Link <ChevronRight size={12} />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://meet.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Evento</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="meeting">Reunião</option>
                  <option value="holiday">Feriado</option>
                  <option value="birthday">Aniversário</option>
                  <option value="vacation">Férias</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Visibilidade</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === 'public'}
                      onChange={() => setFormData({ ...formData, visibility: 'public' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <Eye size={16} className="text-slate-500" />
                    <span className="text-sm text-slate-700">Público</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === 'private'}
                      onChange={() => setFormData({ ...formData, visibility: 'private' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <EyeOff size={16} className="text-slate-500" />
                    <span className="text-sm text-slate-700">Privado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === 'shared'}
                      onChange={() => setFormData({ ...formData, visibility: 'shared' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <Eye size={16} className="text-blue-500" />
                    <span className="text-sm text-slate-700">Compartilhado</span>
                  </label>
                </div>
              </div>

              {formData.visibility === 'shared' && (
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Compartilhar com:</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                    {users.filter(u => u.id != user?.id).map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          checked={sharedWith.includes(u.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSharedWith([...sharedWith, u.id.toString()]);
                            } else {
                              setSharedWith(sharedWith.filter(id => id !== u.id.toString()));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-6 h-6 rounded-full" alt="" />
                        <span className="text-sm text-slate-700 group-hover:text-blue-600 font-medium">{u.name}</span>
                      </label>
                    ))}
                  </div>
                  {sharedWith.length === 0 && (
                    <p className="text-[10px] text-red-500 font-medium italic">Selecione pelo menos um usuário.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingEvent ? handleEditEvent : handleCreateEvent}
                disabled={!formData.title || !formData.eventDate}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
              </button>
              {editingEvent && (
                <button
                  onClick={() => {
                    handleDeleteEvent(editingEvent.id);
                    resetForm();
                  }}
                  className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
