import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Project {
  id: string;
  name: string;
  description: string;
}

interface KanbanTask {
  id: string;
  name: string;
  details: string;
  status: 'pending' | 'in-progress' | 'blocked' | 'done';
  priority?: number;
  complexity?: number;
  estimatedHours?: number;
  tags?: string[];
  projectId: string;
}

interface Column {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'blocked' | 'done';
  tasks: KanbanTask[];
}

const COLUMNS: Omit<Column, 'tasks'>[] = [
  { id: 'pending', title: 'To Do', status: 'pending' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
  { id: 'blocked', title: 'Blocked', status: 'blocked' },
  { id: 'done', title: 'Done', status: 'done' },
];

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<string>('pending');

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      return response.json();
    },
  });

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Fetch tasks for selected project
  const { data: tasks = [], isLoading } = useQuery<KanbanTask[]>({
    queryKey: ['tasks', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const response = await fetch(`/api/projects/${selectedProject}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!selectedProject,
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<KanbanTask> }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: Omit<KanbanTask, 'id'>) => {
      const response = await fetch(`/api/projects/${selectedProject}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] });
      setShowNewTaskModal(false);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject] });
    },
  });

  // Organize tasks by column
  const columns: Column[] = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((task) => task.status === col.status),
  }));

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId as KanbanTask['status'];
    updateTaskMutation.mutate({ id: task.id, updates: { status: newStatus } });
  };

  const getPriorityColor = (priority?: number) => {
    if (!priority) return 'bg-slate-600';
    if (priority >= 8) return 'bg-red-600';
    if (priority >= 5) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-slate-600';
      case 'in-progress':
        return 'border-blue-600';
      case 'blocked':
        return 'border-red-600';
      case 'done':
        return 'border-green-600';
      default:
        return 'border-slate-600';
    }
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
          <p className="text-sm text-slate-400">Create a project to start managing tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Task Board</h2>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1 rounded border border-slate-700 bg-slate-900 text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setNewTaskColumn('pending');
            setShowNewTaskModal(true);
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">Loading tasks...</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 grid grid-cols-4 gap-4 overflow-auto">
            {columns.map((column) => (
              <div key={column.id} className={`flex flex-col border-t-4 ${getColumnColor(column.status)} rounded-lg bg-slate-900/50 p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 min-h-[200px] ${
                        snapshot.isDraggingOver ? 'bg-slate-800/50 rounded-lg' : ''
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-slate-800 rounded-lg p-3 border border-slate-700 cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging ? 'shadow-lg shadow-blue-500/20' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm flex-1">{task.name}</h4>
                                <button
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="text-slate-400 hover:text-red-400 transition-colors"
                                  title="Delete task"
                                >
                                  ×
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.details}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.priority && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)} text-white`}>
                                    P{task.priority}
                                  </span>
                                )}
                                {task.complexity && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600/50 text-purple-200">
                                    C{task.complexity}
                                  </span>
                                )}
                                {task.estimatedHours && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                    {task.estimatedHours}h
                                  </span>
                                )}
                                {task.tags?.map((tag) => (
                                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <NewTaskModal
          projectId={selectedProject}
          initialStatus={newTaskColumn as KanbanTask['status']}
          onClose={() => setShowNewTaskModal(false)}
          onSubmit={(task) => createTaskMutation.mutate(task)}
        />
      )}
    </div>
  );
}

// New Task Modal Component
function NewTaskModal({
  projectId,
  initialStatus,
  onClose,
  onSubmit,
}: {
  projectId: string;
  initialStatus: KanbanTask['status'];
  onClose: () => void;
  onSubmit: (task: Omit<KanbanTask, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(5);
  const [complexity, setComplexity] = useState(5);
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      details,
      status,
      priority,
      complexity,
      estimatedHours: estimatedHours || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      projectId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm h-24"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KanbanTask['status'])}
                className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              >
                <option value="pending">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Complexity (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={complexity}
                onChange={(e) => setComplexity(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-700 bg-slate-800 text-sm"
              placeholder="frontend, api, bug"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-700 hover:bg-slate-800 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
