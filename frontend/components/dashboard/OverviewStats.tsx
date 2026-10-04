import React from 'react';
import { StatBlock } from '@/components/ui/StatBlock';
import { DashboardOverview } from '@/types/api';

export const OverviewStats: React.FC<{ overview?: DashboardOverview; isLoading?: boolean }> = ({
  overview,
  isLoading,
}) => {
  const totalMyTasks = overview?.myTasksCount || 0;
  const overdueCount = overview?.overdueTasksCount || 0;
  const dueThisWeek = overview?.dueThisWeekCount || 0;

  const inProgress = overview?.tasksByStatus?.in_progress || 0;
  const inReview = overview?.tasksByStatus?.in_review || 0;
  const doneCount = overview?.tasksByStatus?.done || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBlock
        label="ASSIGNED TO ME"
        value={totalMyTasks < 10 ? `0${totalMyTasks}` : totalMyTasks}
        subValue={`${inProgress} IN PROGRESS // ${inReview} IN REVIEW`}
        badge="ACTIVE"
        badgeColor="blue"
        bgPattern
      />

      <StatBlock
        label="OVERDUE DEADLINES"
        value={overdueCount < 10 ? `0${overdueCount}` : overdueCount}
        subValue={overdueCount > 0 ? 'REQUIRES IMMEDIATE RESOLUTION' : 'ZERO OVERDUE ITEMS'}
        badge={overdueCount > 0 ? 'CRITICAL' : 'CLEAN'}
        badgeColor={overdueCount > 0 ? 'red' : 'green'}
        variant={overdueCount > 0 ? 'outlined' : 'solid'}
      />

      <StatBlock
        label="DUE THIS WEEK"
        value={dueThisWeek < 10 ? `0${dueThisWeek}` : dueThisWeek}
        subValue="NEXT 7 DAYS LIFECYCLE"
        badge="UPCOMING"
        badgeColor="yellow"
      />

      <StatBlock
        label="COMPLETED TASKS"
        value={doneCount < 10 ? `0${doneCount}` : doneCount}
        subValue="CLOSED & VERIFIED"
        badge="DONE"
        badgeColor="green"
        variant="inverted"
      />
    </div>
  );
};
