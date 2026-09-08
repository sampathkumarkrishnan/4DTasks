import dayjs from 'dayjs';
import { titlePrefix } from '../services/googleTasksApi';

export function isOnMatrix(task) {
  if (task?.parent) return false; // Subtasks never appear as top-level matrix cards
  if (!task?.due) return false;
  if (!titlePrefix.hasPrefix(task.title)) return false;
  const due = dayjs(task.due).startOf('day');
  const today = dayjs().startOf('day');
  return due.isSame(today) || due.isBefore(today);
}

export function isInBacklog(task) {
  if (task?.parent) return false; // Subtasks never appear as top-level backlog cards
  if (task?.status === 'completed') return false;
  return !isOnMatrix(task);
}

export function isScheduledFuture(task) {
  if (!task?.due || !titlePrefix.hasPrefix(task.title)) return false;
  return dayjs(task.due).startOf('day').isAfter(dayjs().startOf('day'));
}
