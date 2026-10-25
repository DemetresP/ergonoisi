import type { Task } from "./schema";

// The parts of the signed-in user that decide what they may do with a task
export interface TaskPermissionUser {
  uid: string;
  isAdmin: boolean;
  memberName?: string;
}

function isAssignedTo(task: Pick<Task, "assignee">, user: TaskPermissionUser) {
  return Boolean(user.memberName && task.assignee === user.memberName);
}

// Edit title, notes, format, series, guest: the admin, the assignee, or whoever created the task
export function canEditTask(task: Pick<Task, "assignee" | "userId">, user: TaskPermissionUser) {
  return user.isAdmin || isAssignedTo(task, user) || task.userId === user.uid;
}

// Change the status: the admin or the assignee (the creator only while nobody is assigned)
export function canChangeStatus(task: Pick<Task, "assignee" | "userId">, user: TaskPermissionUser) {
  return user.isAdmin || isAssignedTo(task, user) || (!task.assignee && task.userId === user.uid);
}
