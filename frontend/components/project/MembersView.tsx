'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Project, ProjectMember, ProjectRole } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalSelect } from '@/components/ui/BrutalSelect';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/stores/toast-store';
import { Users, UserPlus, Shield, Trash2, Check, Lock } from 'lucide-react';

export interface MembersViewProps {
  project: Project;
}

export const MembersView: React.FC<MembersViewProps> = ({ project }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('member');
  const [isInviting, setIsInviting] = useState(false);

  // Check current user role
  const currentMembership = project.members?.find((m) => m.userId === user?.id);
  const isOwner = project.ownerId === user?.id;
  const isAdmin = isOwner || currentMembership?.role === 'admin';
  const isViewer = currentMembership?.role === 'viewer';

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: () =>
      api.projects.addMember(project.id, {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('MEMBER ADDED', `${inviteEmail} granted ${inviteRole.toUpperCase()} access.`);
      setInviteEmail('');
      setIsInviting(false);
    },
    onError: (err: any) => {
      toast.error('FAILED TO ADD MEMBER', err.message || 'User not found or already in project');
    },
  });

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api.projects.updateMemberRole(project.id, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('ROLE UPDATED');
    },
    onError: (err: any) => {
      toast.error('ROLE UPDATE FAILED', err.message);
    },
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.projects.removeMember(project.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('MEMBER REMOVED');
    },
    onError: (err: any) => {
      toast.error('REMOVAL FAILED', err.message);
    },
  });

  const roleVariants: Record<ProjectRole, any> = {
    owner: 'yellow',
    admin: 'pink',
    member: 'blue',
    viewer: 'paper',
  };

  return (
    <div className="space-y-8">
      {/* RBAC Notice if Viewer */}
      {isViewer && (
        <div className="p-3 border-3 border-ink bg-acid-yellow/20 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-ink" />
            <span className="font-bold">VIEWER ACCESS LEVEL: READ-ONLY PERMISSIONS.</span>
          </div>
          <StickerBadge variant="ink" size="sm">
            VIEWER: READ ONLY
          </StickerBadge>
        </div>
      )}

      {/* Invite Member Form (Admins & Owners only) */}
      {isAdmin && (
        <BrutalCard
          headerTitle="INVITE COLLABORATOR TO ROOM"
          headerGlyph="arrow"
          headerBg="yellow"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <BrutalInput
                label="COLLABORATOR EMAIL"
                placeholder="colleague@workspace.dev"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <BrutalSelect
                label="ACCESS ROLE"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                options={[
                  { value: 'admin', label: 'ADMIN (FULL ACCESS)' },
                  { value: 'member', label: 'MEMBER (TASKS + COMMENTS)' },
                  { value: 'viewer', label: 'VIEWER (READ-ONLY)' },
                ]}
              />
            </div>
            <div className="sm:col-span-3">
              <BrutalButton
                variant="primary"
                size="md"
                fullWidth
                disabled={!inviteEmail || addMemberMutation.isPending}
                onClick={() => addMemberMutation.mutate()}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {addMemberMutation.isPending ? 'ADDING...' : 'GRANT ACCESS'}
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      )}

      {/* Members Registry Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-3 border-ink pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="font-display text-xl uppercase tracking-tight">
              ROSTER & RBAC PRIVILEGES ({project.members?.length || 0})
            </h3>
          </div>
          <span className="font-mono text-xs text-ink dark:text-paper font-bold">
            ENFORCED SERVER-SIDE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.members?.map((member) => {
            const isThisMemberOwner = project.ownerId === member.userId;
            const canManage = isAdmin && !isThisMemberOwner && member.userId !== user?.id;

            return (
              <div
                key={member.id}
                className="p-4 border-3 border-ink bg-white shadow-brutal-sm flex items-center justify-between gap-4 dark:bg-zinc-900 dark:border-paper"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={member.user} size="md" isOnline />
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-bold text-sm uppercase truncate text-ink dark:text-paper">
                      {member.user.name}
                    </span>
                    <span className="font-mono text-xs text-ink dark:text-paper font-bold truncate">
                      {member.user.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canManage ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          userId: member.userId,
                          role: e.target.value as ProjectRole,
                        })
                      }
                      className="bg-paper border-2 border-ink font-mono text-xs font-bold px-2 py-1 uppercase dark:bg-zinc-800 dark:border-paper"
                    >
                      <option value="admin">ADMIN</option>
                      <option value="member">MEMBER</option>
                      <option value="viewer">VIEWER</option>
                    </select>
                  ) : (
                    <StickerBadge size="sm" variant={roleVariants[member.role]}>
                      {isThisMemberOwner ? 'OWNER' : member.role}
                    </StickerBadge>
                  )}

                  {canManage && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.user.name} from this project?`)) {
                          removeMemberMutation.mutate(member.userId);
                        }
                      }}
                      className="p-1.5 border border-ink hover:bg-signal-red hover:text-white"
                      title="Remove Member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
