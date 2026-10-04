'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiErrorInstance } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/lib/socket/socket-provider';
import { BrutalDrawer } from '@/components/ui/BrutalDrawer';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTextarea } from '@/components/ui/BrutalTextarea';
import { BrutalSelect } from '@/components/ui/BrutalSelect';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { CollisionModal } from '@/components/task/CollisionModal';
import { toast } from '@/stores/toast-store';
import { Task, TaskStatus, TaskPriority, Comment, Attachment, ActivityLog, AssigneeCandidate } from '@/types/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  Clock,
  Sparkles,
  Paperclip,
  MessageSquare,
  History,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Send,
  X,
  FileIcon,
  Download,
} from 'lucide-react';

export interface TaskDrawerProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  taskId,
  open,
  onOpenChange,
  onDeleted,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { peerEditingMap, startEditingTask, stopEditingTask } = useSocket();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments' | 'activity'>('details');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Save State indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // OCC Conflict state
  const [collisionOpen, setCollisionOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);

  // Comments state
  const [newComment, setNewComment] = useState('');

  // Smart Assignee candidates state
  const [smartCandidates, setSmartCandidates] = useState<AssigneeCandidate[]>([]);
  const [isSuggestingAssignee, setIsSuggestingAssignee] = useState(false);

  // Drag & drop file upload state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Fetch Task Details
  const { data: task, isLoading, refetch } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => api.tasks.getById(taskId),
    enabled: open && !!taskId,
  });

  // Project Members for assignee dropdown
  const { data: project } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => (task?.projectId ? api.projects.getById(task.projectId) : null),
    enabled: !!task?.projectId,
  });

  // Comments Query
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', taskId],
    queryFn: () => api.comments.listByTask(taskId),
    enabled: open && activeTab === 'comments',
  });

  // Attachments Query
  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['attachments', taskId],
    queryFn: () => api.attachments.listByTask(taskId),
    enabled: open && activeTab === 'attachments',
  });

  const initialVersionRef = useRef<number | null>(null);
  const initialTaskRef = useRef<Task | null>(null);
  const [hasPeerUpdatedWhileDirty, setHasPeerUpdatedWhileDirty] = useState(false);

  // Sync state when task loads
  useEffect(() => {
    if (task) {
      if (initialVersionRef.current === null) {
        initialVersionRef.current = task.version;
        initialTaskRef.current = task;
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setAssigneeId(task.assigneeId || '');
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      } else if (task.version !== initialVersionRef.current) {
        setHasPeerUpdatedWhileDirty(true);
      }
    }
  }, [task]);

  useEffect(() => {
    if (!open) {
      initialVersionRef.current = null;
      initialTaskRef.current = null;
      setHasPeerUpdatedWhileDirty(false);
    }
  }, [open]);

  // Advisory Editing Heartbeat
  useEffect(() => {
    if (open && taskId && task?.projectId) {
      startEditingTask(taskId, task.projectId);
    }
    return () => {
      if (taskId && task?.projectId) {
        stopEditingTask(taskId, task.projectId);
      }
    };
  }, [open, taskId, task?.projectId, startEditingTask, stopEditingTask]);

  // Debounced Smart Assignee Suggestions
  useEffect(() => {
    if (!task?.projectId || !title || title.length < 4) {
      setSmartCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggestingAssignee(true);
      try {
        const res = await api.ai.suggestAssignee(task.projectId, {
          title,
          description: description || undefined,
          priority,
        });
        if (Array.isArray(res)) {
          setSmartCandidates(res);
        }
      } catch (err) {
        setSmartCandidates([]);
      } finally {
        setIsSuggestingAssignee(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description, priority, task?.projectId]);

  // Save Task Mutation with OCC
  const saveMutation = useMutation({
    mutationFn: async (updatedFields: Partial<Task>) => {
      if (!task) return;
      return api.tasks.update(task.id, {
        ...updatedFields,
        version: initialVersionRef.current ?? task.version,
      });
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: (updated: any) => {
      setSaveStatus('saved');
      const wasMerged = updated?.autoMerged || (updated && initialVersionRef.current && updated.version > initialVersionRef.current);
      if (wasMerged) {
        toast.merged(
          'MERGED WITH CONCURRENT EDITS',
          `Your changes were auto-merged cleanly with peer edits on version ${updated?.version || ''}.`
        );
      }
      if (updated?.version) {
        initialVersionRef.current = updated.version;
        initialTaskRef.current = updated;
      }
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task?.projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setTimeout(() => setSaveStatus('idle'), 2500);
    },
    onError: (err: any) => {
      if (err instanceof ApiErrorInstance && err.status === 409) {
        // Version conflict!
        setConflictData({
          task: err.details?.currentTask || task,
          yourChanges: {
            title,
            description,
            status,
            priority,
            assigneeId: assigneeId || null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          },
          conflictingFields: err.details?.conflictingFields || ['title', 'description'],
          baseVersion: initialVersionRef.current || task?.version || 1,
        });
        setCollisionOpen(true);
        setSaveStatus('failed');
      } else {
        setSaveStatus('failed');
        toast.error('SAVE FAILED', err.message || 'Could not update task');
      }
    },
  });

  const handleManualSave = () => {
    const dirtyFields: Record<string, any> = {};
    if (initialTaskRef.current) {
      if (title !== initialTaskRef.current.title) dirtyFields.title = title;
      if ((description || null) !== (initialTaskRef.current.description || null)) dirtyFields.description = description || null;
      if (status !== initialTaskRef.current.status) dirtyFields.status = status;
      if (priority !== initialTaskRef.current.priority) dirtyFields.priority = priority;
      if ((assigneeId || null) !== (initialTaskRef.current.assigneeId || null)) dirtyFields.assigneeId = assigneeId || null;
      const initialDue = initialTaskRef.current.dueDate ? new Date(initialTaskRef.current.dueDate).toISOString().split('T')[0] : '';
      if (dueDate !== initialDue) {
        dirtyFields.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
      }
    }
    const payload = Object.keys(dirtyFields).length > 0 ? dirtyFields : {
      title,
      description: description || null,
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    };
    saveMutation.mutate(payload);
  };

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: (body: string) => api.comments.create(taskId, { body }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('COMMENT POSTED');
    },
    onError: (err: any) => {
      toast.error('COMMENT FAILED', err.message);
    },
  });

  // Upload Attachment Handler
  const handleFileUpload = async (file: File) => {
    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('FILE TOO LARGE', 'Maximum upload size is 10MB.');
      return;
    }

    // MIME Whitelist Check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('UNSUPPORTED TYPE', `File format ${file.type || 'unknown'} is not permitted.`);
      return;
    }

    try {
      setUploadProgress(50);
      await api.attachments.upload(taskId, file);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      toast.success('ATTACHMENT UPLOADED', `${file.name} attached to task.`);
      setTimeout(() => setUploadProgress(null), 1000);
    } catch (err: any) {
      setUploadProgress(null);
      toast.error('UPLOAD FAILED', err.message || 'Could not upload attachment');
    }
  };

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: () => api.tasks.delete(taskId),
    onSuccess: () => {
      toast.success('TASK DELETED');
      queryClient.invalidateQueries({ queryKey: ['tasks', task?.projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      onOpenChange(false);
      if (onDeleted) onDeleted();
    },
    onError: (err: any) => {
      toast.error('DELETE FAILED', err.message);
    },
  });

  if (!task && isLoading) {
    return (
      <BrutalDrawer open={open} onOpenChange={onOpenChange} title="LOADING TASK...">
        <div className="space-y-4">
          <div className="h-8 bg-zinc-200 animate-pulse border-2 border-ink" />
          <div className="h-32 bg-zinc-200 animate-pulse border-2 border-ink" />
        </div>
      </BrutalDrawer>
    );
  }

  if (!task) return null;

  const peerEditing = peerEditingMap[taskId];
  const isPeerEditing = !!peerEditing && peerEditing.userId !== user?.id;

  return (
    <>
      <BrutalDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={task.title}
        subtitle={`ID: #${task.id.slice(0, 8)} // OCC REVISION #${task.version}`}
        hazardHeader={isPeerEditing}
        hazardText={
          isPeerEditing
            ? `⚠ PEER EDITING LOCK ACTIVE // ${peerEditing.userName.toUpperCase()} IS CURRENTLY MODIFYING THIS TASK`
            : undefined
        }
        headerRight={
          <div className="flex items-center gap-2">
            {/* Save indicator */}
            <span
              className={`text-[10px] font-mono font-black uppercase px-2 py-1 border-2 border-ink ${
                saveStatus === 'saving'
                  ? 'bg-acid-yellow text-ink animate-pulse'
                  : saveStatus === 'saved'
                  ? 'bg-toxic-green text-ink'
                  : saveStatus === 'failed'
                  ? 'bg-signal-red text-white'
                  : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
              }`}
            >
              {saveStatus === 'saving'
                ? 'SAVING...'
                : saveStatus === 'saved'
                ? 'SAVED ✓'
                : saveStatus === 'failed'
                ? 'FAILED ↻ RETRY'
                : `VER #${task.version}`}
            </span>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Concurrent Peer Update Warning Banner */}
          {hasPeerUpdatedWhileDirty && (
            <div className="p-3 border-3 border-ink bg-signal-red text-white flex items-center justify-between font-mono text-xs shadow-brutal-sm animate-pulse">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-acid-yellow" />
                <span>
                  <strong>SERVER UPDATE DETECTED:</strong> Task revision bumped to #{task.version} while you have unsaved edits. Click Save to open the 3-Way Collision Resolver or reload to discard.
                </span>
              </div>
            </div>
          )}

          {/* Peer Editing Soft Lock Banner if active */}
          {isPeerEditing && (
            <div className="p-3 border-3 border-ink bg-hot-pink/20 dark:bg-pink-950/80 text-ink dark:text-paper flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <Avatar user={{ id: peerEditing.userId, name: peerEditing.userName }} size="xs" isEditing />
                <span className="font-bold text-ink dark:text-paper">
                  {peerEditing.userName} is actively modifying this task.
                </span>
              </div>
              <span className="text-[10px] bg-ink text-paper dark:bg-paper dark:text-ink px-1.5 py-0.5 uppercase font-bold">
                SOFT LOCK
              </span>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="flex border-b-3 border-ink pb-2 gap-2 font-mono text-xs font-black uppercase">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 border-2 border-ink transition-all ${
                activeTab === 'details'
                  ? 'bg-acid-yellow text-ink shadow-brutal-sm'
                  : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
              }`}
            >
              DETAILS
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-3 py-1.5 border-2 border-ink transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'bg-acid-yellow text-ink shadow-brutal-sm'
                  : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              COMMENTS ({comments.length})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`px-3 py-1.5 border-2 border-ink transition-all flex items-center gap-1.5 ${
                activeTab === 'attachments'
                  ? 'bg-acid-yellow text-ink shadow-brutal-sm'
                  : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              FILES ({attachments.length})
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <BrutalInput
                label="TASK TITLE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <BrutalTextarea
                label="TECHNICAL SPECIFICATION / DESCRIPTION"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BrutalSelect
                  label="STATUS"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  options={[
                    { value: 'todo', label: 'TODO' },
                    { value: 'in_progress', label: 'IN PROGRESS' },
                    { value: 'in_review', label: 'IN REVIEW' },
                    { value: 'done', label: 'DONE' },
                  ]}
                />

                <BrutalSelect
                  label="PRIORITY"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  options={[
                    { value: 'low', label: 'LOW' },
                    { value: 'medium', label: 'MEDIUM' },
                    { value: 'high', label: 'HIGH' },
                    { value: 'urgent', label: 'URGENT' },
                  ]}
                />
              </div>

              {/* Assignee & Smart AI Suggestions */}
              <div className="space-y-2">
                <BrutalSelect
                  label="ASSIGNEE"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">UNASSIGNED</option>
                  {project?.members?.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </BrutalSelect>

                {/* Smart Assignee AI Chips */}
                {smartCandidates.length > 0 && (
                  <div className="p-2.5 border-2 border-ink bg-acid-yellow/20 dark:bg-zinc-800 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-ink dark:text-paper">
                      <Sparkles className="h-3.5 w-3.5 text-ink" />
                      <span>✨ SMART ASSIGNEE RECOMMENDATIONS:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {smartCandidates.slice(0, 3).map((cand) => (
                        <button
                          key={cand.userId}
                          type="button"
                          onClick={() => {
                            setAssigneeId(cand.userId);
                            toast.info('ASSIGNEE SELECTED', `Assigned to ${cand.name} (${cand.fitPercentage}% fit)`);
                          }}
                          className="px-2 py-1 bg-white hover:bg-acid-yellow text-ink border-2 border-ink font-mono text-[10px] font-black uppercase flex items-center gap-1.5 shadow-brutal-sm"
                          title={cand.reasons.join('; ')}
                        >
                          <span>{cand.name.split(' ')[0]}</span>
                          <span className="bg-ink text-acid-yellow px-1">{cand.fitPercentage}% FIT</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <BrutalInput
                label="DUE DATE"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              {/* Action Buttons */}
              <div className="pt-4 border-t-3 border-ink flex items-center justify-between gap-3">
                <BrutalButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to permanently delete this task?')) {
                      deleteTaskMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> DELETE
                </BrutalButton>

                <div className="flex items-center gap-2">
                  <BrutalButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                    CLOSE
                  </BrutalButton>
                  <BrutalButton
                    variant="primary"
                    size="md"
                    disabled={saveMutation.isPending}
                    onClick={handleManualSave}
                  >
                    {saveMutation.isPending ? 'COMMITTING...' : 'SAVE CHANGES →'}
                  </BrutalButton>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* New Comment input */}
              <div className="space-y-2">
                <BrutalTextarea
                  placeholder="Leave an engineering note or update discussion..."
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end">
                  <BrutalButton
                    variant="primary"
                    size="sm"
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    onClick={() => addCommentMutation.mutate(newComment)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> POST COMMENT
                  </BrutalButton>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3 pt-2 divide-y-2 divide-ink/10 font-mono text-xs">
                {comments.length === 0 ? (
                  <div className="p-6 text-center text-zinc-700 dark:text-zinc-300 font-bold">
                    NO COMMENTS POSTED YET.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="pt-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar user={c.author} size="xs" />
                          <span className="font-black uppercase">{c.author.name}</span>
                          <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>
                        {user?.id === c.authorId && (
                          <button
                            onClick={() => {
                              if (confirm('Delete comment?')) {
                                api.comments.delete(c.id).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
                                });
                              }
                            }}
                            className="text-zinc-400 hover:text-signal-red"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="p-3 bg-white dark:bg-zinc-950 border-2 border-ink whitespace-pre-wrap">
                        {c.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {/* Drag-Drop Zone with Hazard Tape Border */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-6 border-4 border-dashed border-ink text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  isDraggingFile ? 'bg-acid-yellow/30 border-solid' : 'bg-paper dark:bg-zinc-950'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-8 w-8 text-ink dark:text-paper" />
                <div className="font-mono text-xs font-black uppercase">
                  DRAG & DROP ATTACHMENTS (MAX 10MB)
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  PDF, IMAGES, CSV, ZIP, MARKDOWN, DOCX
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="p-2 border-2 border-ink bg-acid-yellow font-mono text-xs font-bold text-center">
                  UPLOADING ATTACHMENT... {uploadProgress}%
                </div>
              )}

              {/* File List */}
              <div className="space-y-2 font-mono text-xs">
                {attachments.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 font-bold">
                    NO ATTACHED DOCUMENTS.
                  </div>
                ) : (
                  attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 border-2 border-ink bg-white dark:bg-zinc-950 flex items-center justify-between gap-3 shadow-brutal-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileIcon className="h-5 w-5 text-electric-blue shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{att.fileName}</span>
                          <span className="text-[10px] text-zinc-500">
                            {Math.round(att.sizeBytes / 1024)} KB // {att.mimeType}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={att.fileUrl.startsWith('http') ? att.fileUrl : `http://localhost:5000${att.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 border border-ink bg-paper hover:bg-acid-yellow text-ink"
                          title="Download / View"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            if (confirm('Delete attachment?')) {
                              api.attachments.delete(att.id).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
                              });
                            }
                          }}
                          className="p-1.5 border border-ink bg-paper hover:bg-signal-red hover:text-white"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </BrutalDrawer>

      {/* OCC Collision Resolver Modal */}
      {collisionOpen && conflictData && (
        <CollisionModal
          open={collisionOpen}
          onOpenChange={setCollisionOpen}
          task={conflictData.task}
          yourChanges={conflictData.yourChanges}
          conflictingFields={conflictData.conflictingFields}
          baseVersion={conflictData.baseVersion}
          onResolved={(resolved) => {
            queryClient.setQueryData(['task', taskId], resolved);
            queryClient.invalidateQueries({ queryKey: ['tasks', resolved.projectId] });
            setSaveStatus('saved');
          }}
        />
      )}
    </>
  );
};
