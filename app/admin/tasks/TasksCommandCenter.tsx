'use client';

import { useState, useMemo, useEffect } from 'react';
import { AgencyTask, TaskIdea, ClientProfile, TaskStatus, TaskPriority, TaskCategory, TaskRecurrenceType, IdeaType, IdeaStatus, TaskNote } from '@/types/database';
import { createOrUpdateTask, deleteTask } from '@/app/actions/tasks';
import { createOrUpdateTaskIdea, deleteTaskIdea } from '@/app/actions/task-ideas';
import { 
  CheckCircle2, Circle, Clock, AlertTriangle, Lightbulb, Plus, Calendar, 
  RefreshCw, Trash2, Edit2, Play, Search, Filter, MoreHorizontal, User, Save, CheckSquare, ArrowLeft, X
} from 'lucide-react';

type FilterType = 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'waiting' | 'recurring' | 'unassigned' | 'recently_completed';

export function TasksCommandCenter({ 
  initialTasks, 
  initialIdeas, 
  clients 
}: { 
  initialTasks: AgencyTask[], 
  initialIdeas: TaskIdea[], 
  clients: ClientProfile[] 
}) {
  const [tasks, setTasks] = useState<AgencyTask[]>(initialTasks);
  const [ideas, setIdeas] = useState<TaskIdea[]>(initialIdeas);
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isIdeasMode, setIsIdeasMode] = useState(false);
  
  // Mobile responsiveness state
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const isMobileDetailsView = !!selectedTaskId || isIdeasMode;
  
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Quick Add State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskClient, setNewTaskClient] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState(getTodayStr());
  const [isNewTaskRecurring, setIsNewTaskRecurring] = useState(false);
  const [newTaskRecurrenceType, setNewTaskRecurrenceType] = useState<TaskRecurrenceType>('weekly');
  const [isAdding, setIsAdding] = useState(false);

  // Restore last selected client from localStorage
  useEffect(() => {
    const savedClient = localStorage.getItem('nvm_last_task_client');
    if (savedClient) setNewTaskClient(savedClient);
  }, []);

  const handleClientSelect = (clientId: string) => {
    setNewTaskClient(clientId);
    localStorage.setItem('nvm_last_task_client', clientId);
  };

  // Derived state
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // Active client tags for filtering
  const activeClients = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => {
      if (t.clientId && t.clientNameSnapshot && t.status !== 'done') {
        map.set(t.clientId, t.clientNameSnapshot);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // Filter Logic
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.clientNameSnapshot?.toLowerCase().includes(q));
    }

    // Client Filter
    if (clientFilter !== 'all') {
      result = result.filter(t => t.clientId === clientFilter);
    }

    // Filter
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    
    const tmrwObj = new Date(todayObj);
    tmrwObj.setDate(todayObj.getDate() + 1);
    const tmrwStr = `${tmrwObj.getFullYear()}-${String(tmrwObj.getMonth() + 1).padStart(2, '0')}-${String(tmrwObj.getDate()).padStart(2, '0')}`;
    
    // Week starts on Saturday
    const daysSinceSat = (todayObj.getDay() + 1) % 7;
    const startOfWeek = new Date(todayObj);
    startOfWeek.setDate(todayObj.getDate() - daysSinceSat);
    const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

    switch (filter) {
      case 'today':
        result = result.filter(t => t.status !== 'done' && t.dueDate === todayStr);
        break;
      case 'tomorrow':
        result = result.filter(t => t.status !== 'done' && t.dueDate === tmrwStr);
        break;
      case 'this_week':
        result = result.filter(t => t.status !== 'done' && t.dueDate && t.dueDate >= startOfWeekStr && t.dueDate <= endOfWeekStr);
        break;
      case 'overdue':
        result = result.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);
        break;
      case 'waiting':
        result = result.filter(t => ['waiting', 'waiting_approval', 'waiting_response', 'on_hold'].includes(t.status));
        break;
      case 'recurring':
        result = result.filter(t => t.isRecurring && t.status !== 'done');
        break;
      case 'unassigned':
        result = result.filter(t => !t.clientId && t.status !== 'done');
        break;
      case 'recently_completed':
        result = result.filter(t => t.status === 'done');
        break;
      case 'all':
      default:
        result = result.filter(t => t.status !== 'done' && t.status !== 'archived');
        break;
    }

    // Sort: Overdue -> Due Today -> Priority -> Updated At
    result.sort((a, b) => {
      // If one is done and the other isn't, put done at the bottom
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;

      // Overdue first
      const isAOverdue = a.dueDate && a.dueDate < todayStr;
      const isBOverdue = b.dueDate && b.dueDate < todayStr;
      if (isAOverdue && !isBOverdue) return -1;
      if (!isAOverdue && isBOverdue) return 1;

      // Priority mapping
      const pMap = { urgent: 4, high: 3, medium: 2, low: 1 };
      const pDiff = pMap[b.priority] - pMap[a.priority];
      if (pDiff !== 0) return pDiff;

      // Due date closer
      if (a.dueDate && b.dueDate) {
        if (a.dueDate < b.dueDate) return -1;
        if (a.dueDate > b.dueDate) return 1;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }

      // Updated At
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return result;
  }, [tasks, filter, search, clientFilter]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAdding(true);
    const selectedClientObj = clients.find(c => c.id === newTaskClient);
    
    const newTaskPayload: Partial<AgencyTask> = {
      title: newTaskTitle,
      clientId: newTaskClient || undefined,
      clientNameSnapshot: selectedClientObj?.businessName || '',
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
      isRecurring: isNewTaskRecurring,
      recurrenceType: isNewTaskRecurring ? newTaskRecurrenceType : undefined,
      status: 'todo',
    };

    const res = await createOrUpdateTask(newTaskPayload);
    if (res.success) {
      // Optimistic locally (will be refetched by server action revalidate, but to make UI instant)
      setTasks(prev => [{...newTaskPayload, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), autoRegenerateOnComplete: true} as AgencyTask, ...prev]);
      setNewTaskTitle('');
      setNewTaskDueDate(getTodayStr());
      setIsMobileAddOpen(false); // Close modal on mobile if open
    }
    setIsAdding(false);
  };

  const updateTaskStatus = async (task: AgencyTask, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await createOrUpdateTask({ id: task.id, status: newStatus });
    // if marking as done and it's recurring, we should probably do a hard reload to get the new generated task, 
    // but revalidatePath covers this if we force a router.refresh, but server actions automatically revalidate in App Router.
  };

  const updateTaskNotes = async (taskId: string, taskNotes: TaskNote[]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, taskNotes } : t));
    await createOrUpdateTask({ id: taskId, taskNotes });
  };

  const quickAddForm = (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative">
      {isMobileAddOpen && (
        <button onClick={() => setIsMobileAddOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 lg:hidden">
          <X className="w-5 h-5" />
        </button>
      )}
      <h2 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-brand-orange" />
        Quick Add Task
      </h2>
      <form onSubmit={handleQuickAdd} className="space-y-3">
        <div>
          <textarea 
            placeholder="What needs to be done?" 
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            className="w-full text-sm rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-orange focus:border-brand-orange resize-none"
            rows={3}
            required
          />
        </div>
        
        <div className="flex flex-wrap gap-1 items-center bg-neutral-100 dark:bg-zinc-800 p-1 rounded-md">
          {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setNewTaskPriority(p)}
              className={`flex-1 text-[10px] py-1.5 rounded transition-colors uppercase font-bold tracking-wider ${
                newTaskPriority === p 
                  ? p === 'urgent' ? 'bg-red-500 text-white shadow-sm' 
                    : p === 'high' ? 'bg-orange-500 text-white shadow-sm' 
                    : p === 'medium' ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-neutral-200/50 dark:hover:bg-zinc-700/50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div>
          <input 
            type="date"
            value={newTaskDueDate}
            onChange={e => setNewTaskDueDate(e.target.value)}
            className="w-full text-sm rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-orange focus:border-brand-orange"
          />
        </div>

        <div>
          <select
            value={newTaskClient}
            onChange={e => handleClientSelect(e.target.value)}
            className="w-full text-sm rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-orange focus:border-brand-orange"
          >
            <option value="">No Client (Internal)</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.businessName}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input 
            type="checkbox" 
            id="isRecurring"
            checked={isNewTaskRecurring}
            onChange={e => setIsNewTaskRecurring(e.target.checked)}
            className="rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
          />
          <label htmlFor="isRecurring" className="text-sm text-zinc-700 dark:text-zinc-300">Recurring Task</label>
        </div>

        {isNewTaskRecurring && (
          <select
            value={newTaskRecurrenceType}
            onChange={e => setNewTaskRecurrenceType(e.target.value as TaskRecurrenceType)}
            className="w-full text-sm rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-orange focus:border-brand-orange"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        )}

        <button
          type="submit"
          disabled={isAdding || !newTaskTitle.trim()}
          className="w-full bg-brand-orange hover:bg-orange-600 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50 text-sm"
        >
          {isAdding ? 'Adding...' : 'Create Task'}
        </button>
      </form>
    </div>
  );

  const filtersContent = (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative">
      {isMobileFilterOpen && (
        <button onClick={() => setIsMobileFilterOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 lg:hidden">
          <X className="w-5 h-5" />
        </button>
      )}
      <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
        <Filter className="w-4 h-4 text-brand-blue" />
        Filters
      </h2>
      
      <div className="space-y-1">
        {[
          { id: 'all', label: 'All Active' },
          { id: 'waiting', label: 'Waiting / On Hold' },
          { id: 'recurring', label: 'Recurring Work' },
          { id: 'unassigned', label: 'Internal / No Client' },
          { id: 'recently_completed', label: 'Done Tasks' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id as FilterType); setIsMobileFilterOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f.id 
                ? 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-blue-400' 
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'
            } ${f.textClass || ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Filter by Date</h3>
        <div className="space-y-1">
          {[
            { id: 'all', label: 'Any Date' },
            { id: 'today', label: 'Due Today' },
            { id: 'tomorrow', label: 'Due Tomorrow' },
            { id: 'this_week', label: 'Due This Week' },
            { id: 'overdue', label: 'Overdue', textClass: 'text-red-600 dark:text-red-400' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id as FilterType); setIsMobileFilterOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f.id 
                  ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 dark:text-orange-400' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'
              } ${f.textClass || ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Tags Filter */}
      {activeClients.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Filter by Client</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setClientFilter('all'); setIsMobileFilterOpen(false); }}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                clientFilter === 'all' 
                  ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                  : 'bg-neutral-100 text-zinc-600 hover:bg-neutral-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              All Clients
            </button>
            {activeClients.map(c => (
              <button
                key={c.id}
                onClick={() => { setClientFilter(c.id); setIsMobileFilterOpen(false); }}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  clientFilter === c.id 
                    ? 'bg-brand-blue text-white' 
                    : 'bg-blue-50 text-brand-blue hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      
      {/* Mobile Modals */}
      {isMobileAddOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl rounded-xl">
            {quickAddForm}
          </div>
        </div>
      )}

      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl rounded-xl">
            {filtersContent}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 gap-0 lg:gap-6 min-h-0 h-full">
        
        {/* COLUMN 1: Quick Add & Filters (Desktop only) */}
        <div className="hidden lg:flex w-80 flex-col gap-6 overflow-y-auto pr-2 pb-6 custom-scrollbar shrink-0">
          {quickAddForm}
          {filtersContent}
        </div>

        {/* COLUMN 2: Active Task List */}
        <div className={`w-full lg:flex-1 flex-col bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden relative ${isMobileDetailsView ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 md:p-4 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between bg-neutral-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-1.5 md:gap-2 flex-1 max-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 md:pr-4 py-1.5 text-sm rounded-full border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-blue focus:border-brand-blue"
              />
              <button 
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden p-1.5 md:p-2 text-zinc-500 hover:text-brand-blue bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-full shrink-0"
              >
                <Filter className="w-4 h-4 md:w-4 md:h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-1.5 md:ml-2">
              <button 
                onClick={() => setIsMobileAddOpen(true)}
                className="lg:hidden p-1.5 md:p-2 text-white bg-brand-orange hover:bg-orange-600 rounded-full shrink-0 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setSelectedTaskId(null); setIsIdeasMode(true); }}
                className={`text-sm px-3 md:px-4 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${isIdeasMode ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700'}`}
              >
                <Lightbulb className="w-4 h-4 inline md:mr-1" />
                <span className="hidden md:inline">Future Ideas</span>
              </button>
            </div>
          </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
              No tasks match this view.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'done';
                const isSelected = selectedTaskId === task.id && !isIdeasMode;
                
                return (
                  <div 
                    key={task.id}
                    onClick={() => { setSelectedTaskId(task.id || null); setIsIdeasMode(false); }}
                    className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-brand-blue bg-brand-blue/5 shadow-sm' 
                        : 'border-transparent hover:bg-neutral-50 dark:hover:bg-zinc-800/50 hover:border-neutral-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Status Toggle Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskStatus(task, task.status === 'done' ? 'todo' : 'done');
                      }}
                      className="mt-0.5 text-zinc-400 hover:text-brand-orange transition-colors"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-medium text-sm truncate pr-4 ${task.status === 'done' ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {task.title}
                        </h3>
                        
                        {/* Priority Badge */}
                        {task.priority === 'urgent' && <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">URGENT</span>}
                        {task.priority === 'high' && <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">HIGH</span>}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.clientNameSnapshot && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientFilter(clientFilter === task.clientId ? 'all' : (task.clientId || 'all'));
                            }}
                            className={`flex items-center gap-1 font-medium px-1.5 py-0.5 rounded transition-colors ${
                              clientFilter === task.clientId 
                                ? 'bg-brand-blue text-white' 
                                : 'text-brand-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                            }`}
                          >
                            <User className="w-3 h-3" />
                            {task.clientNameSnapshot}
                          </button>
                        )}
                        
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                        )}
                        
                        {['waiting', 'waiting_approval', 'waiting_response', 'on_hold'].includes(task.status) && (
                          <span className={`flex items-center gap-1 ${task.status === 'on_hold' ? 'text-zinc-500' : 'text-amber-600 dark:text-amber-400'}`}>
                            <Clock className="w-3 h-3" />
                            {task.status === 'waiting_approval' ? 'Waiting (Approval)' 
                             : task.status === 'waiting_response' ? 'Waiting (Response)' 
                             : task.status === 'on_hold' ? 'On Hold' 
                             : 'Waiting'}
                          </span>
                        )}

                        {task.isRecurring && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <RefreshCw className="w-3 h-3" />
                            {task.recurrenceType}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this task?')) {
                          setTasks(prev => prev.filter(t => t.id !== task.id));
                          if (selectedTaskId === task.id) setSelectedTaskId(null);
                          if (task.id) await deleteTask(task.id);
                        }
                      }}
                      className="lg:opacity-0 lg:group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all ml-2 shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

        {/* COLUMN 3: Task Details OR Future Ideas */}
        <div className={`w-full lg:w-[400px] flex-col bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden ${isMobileDetailsView ? 'flex' : 'hidden lg:flex'}`}>
          {isIdeasMode ? (
            <FutureIdeasPanel ideas={ideas} clients={clients} setIdeas={setIdeas} onBack={() => { setIsIdeasMode(false); }} />
          ) : selectedTask ? (
            <TaskDetailPanel 
              task={selectedTask} 
              updateTaskNotes={updateTaskNotes} 
              updateTaskStatus={updateTaskStatus}
              onBack={() => setSelectedTaskId(null)}
              onDelete={async (id) => {
                setTasks(prev => prev.filter(t => t.id !== id));
                setSelectedTaskId(null);
                await deleteTask(id);
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <CheckSquare className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium text-zinc-600 dark:text-zinc-300">Select a task</p>
              <p className="text-sm mt-1">View details, update notes, or manage recurrence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----- Subcomponents for Column 3 -----

function TaskDetailPanel({ 
  task, 
  updateTaskNotes, 
  updateTaskStatus,
  onBack,
  onDelete 
}: { 
  task: AgencyTask, 
  updateTaskNotes: (id: string, notes: TaskNote[]) => Promise<void>,
  updateTaskStatus: (task: AgencyTask, status: TaskStatus) => Promise<void>,
  onBack: () => void,
  onDelete: (id: string) => Promise<void>
}) {
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.id || !newNote.trim()) return;
    setIsSaving(true);
    const noteObj: TaskNote = {
      id: Date.now().toString(),
      content: newNote.trim(),
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...(task.taskNotes || []), noteObj];
    await updateTaskNotes(task.id, updatedNotes);
    setNewNote('');
    setIsSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!task.id) return;
    const updatedNotes = (task.taskNotes || []).filter(n => n.id !== noteId);
    await updateTaskNotes(task.id, updatedNotes);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-start bg-neutral-50/50 dark:bg-zinc-900/50">
        <div className="flex items-start gap-2">
          <button onClick={onBack} className="lg:hidden p-1 -ml-2 shrink-0 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg leading-tight text-zinc-900 dark:text-white pr-4">
            {task.title}
          </h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => {if(task.id) onDelete(task.id)}}
            className="p-1.5 text-zinc-400 hover:text-red-500 rounded transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-neutral-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-neutral-100 dark:border-zinc-800">
          <div>
            <span className="block text-zinc-500 text-xs mb-1">Status</span>
            <select 
              value={task.status}
              onChange={(e) => updateTaskStatus(task, e.target.value as TaskStatus)}
              className="w-full text-sm py-1 px-2 rounded border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
            >
              <option value="todo">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_approval">Waiting (Approval)</option>
              <option value="waiting_response">Waiting (Response)</option>
              <option value="on_hold">On Hold</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <span className="block text-zinc-500 text-xs mb-1">Client</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-200 truncate block">
              {task.clientNameSnapshot || 'Internal'}
            </span>
          </div>
          <div>
            <span className="block text-zinc-500 text-xs mb-1">Due Date</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-200">
              {task.dueDate || 'No date set'}
            </span>
          </div>
          <div>
            <span className="block text-zinc-500 text-xs mb-1">Recurrence</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-200 capitalize">
              {task.isRecurring ? task.recurrenceType?.replace('_', ' ') : 'None'}
            </span>
          </div>
        </div>

        {/* Notes Area */}
        <div className="flex flex-col h-72">
          <div className="flex items-center mb-3">
            <span className="font-semibold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-brand-orange" />
              Running Notes
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-2 custom-scrollbar">
            {(!task.taskNotes || task.taskNotes.length === 0) ? (
              <div className="text-sm text-zinc-400 italic">No notes yet.</div>
            ) : (
              task.taskNotes.map(note => (
                <div key={note.id} className="group relative bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-neutral-200 dark:border-zinc-700 shadow-sm text-sm">
                  <div className="pr-6 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                    {note.content}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1.5 font-medium">
                    {new Date(note.createdAt).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                    })}
                  </div>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="absolute top-2 right-2 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 rounded bg-white dark:bg-zinc-800 shadow-sm lg:shadow-none"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an update or thought..."
              className="flex-1 text-sm rounded-lg border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-brand-orange focus:border-brand-orange"
            />
            <button 
              type="submit"
              disabled={isSaving || !newNote.trim()}
              className="shrink-0 px-3 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isSaving ? '...' : 'Add'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FutureIdeasPanel({
  ideas,
  clients,
  setIdeas,
  onBack
}: {
  ideas: TaskIdea[],
  clients: ClientProfile[],
  setIdeas: React.Dispatch<React.SetStateAction<TaskIdea[]>>,
  onBack: () => void
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IdeaType>('future_feature');
  const [clientId, setClientId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsAdding(true);
    
    const selectedClientObj = clients.find(c => c.id === clientId);
    const payload: Partial<TaskIdea> = {
      title,
      ideaType: type,
      clientId: clientId || undefined,
      clientNameSnapshot: selectedClientObj?.businessName || '',
      status: 'backlog'
    };

    const res = await createOrUpdateTaskIdea(payload);
    if (res.success) {
      setIdeas(prev => [{...payload, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()} as TaskIdea, ...prev]);
      setTitle('');
    }
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-amber-50/30 dark:bg-amber-900/10">
      <div className="p-4 border-b border-amber-200/50 dark:border-amber-900/30 bg-amber-100/50 dark:bg-amber-900/20">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
          <button onClick={onBack} className="lg:hidden p-1 -ml-2 text-amber-700 hover:text-amber-900 dark:hover:text-amber-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Future Ideas
          </h3>
        </div>
        <p className="text-xs text-amber-700/70 dark:text-amber-500/70 mt-1 lg:ml-0 ml-7">
          Capture thoughts before they escape.
        </p>
      </div>

      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form onSubmit={handleAdd} className="space-y-3">
          <input 
            type="text" 
            placeholder="What's the big idea?"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            className="w-full text-sm rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-amber-500 focus:border-amber-500"
            required
          />
          <div className="flex gap-2">
            <select
              value={type}
              onChange={e=>setType(e.target.value as IdeaType)}
              className="flex-1 text-xs rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="future_feature">Feature</option>
              <option value="upsell">Upsell</option>
              <option value="campaign_idea">Campaign</option>
              <option value="content_idea">Content</option>
            </select>
            <select
              value={clientId}
              onChange={e=>setClientId(e.target.value)}
              className="flex-1 text-xs rounded-md border-neutral-300 dark:border-zinc-700 dark:bg-zinc-800 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">No Client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.businessName}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isAdding || !title.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 rounded-md transition-colors disabled:opacity-50 text-xs"
          >
            {isAdding ? 'Saving...' : 'Drop in bucket'}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
        {ideas.length === 0 ? (
           <p className="text-center text-sm text-zinc-400 py-8">No ideas yet.</p>
        ) : (
          ideas.map(idea => (
            <div key={idea.id} className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 shadow-sm">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{idea.title}</h4>
                <button 
                  onClick={async () => {
                    if(idea.id) {
                      setIdeas(prev => prev.filter(i => i.id !== idea.id));
                      await deleteTaskIdea(idea.id);
                    }
                  }}
                  className="text-zinc-300 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium capitalize">
                  {idea.ideaType.replace('_', ' ')}
                </span>
                {idea.clientNameSnapshot && (
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-brand-blue dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                    {idea.clientNameSnapshot}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
