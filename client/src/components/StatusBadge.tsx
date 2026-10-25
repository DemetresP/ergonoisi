import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, PlayCircle } from "lucide-react";
import { STATUS_LABELS } from "@/lib/studio";

interface StatusBadgeProps {
  status: 'todo' | 'inprogress' | 'done';
  isOverdue?: boolean;
}

export function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
  if (isOverdue && status !== 'done') {
    return (
      <Badge variant="destructive" className="gap-1.5" data-testid={`badge-status-overdue`}>
        <Clock className="w-3 h-3" />
        Εκπρόθεσμο
      </Badge>
    );
  }

  const config = {
    todo: {
      label: STATUS_LABELS.todo,
      icon: Clock,
      variant: 'secondary' as const,
      className: '',
    },
    inprogress: {
      label: STATUS_LABELS.inprogress,
      icon: PlayCircle,
      variant: 'default' as const,
      className: '',
    },
    done: {
      label: STATUS_LABELS.done,
      icon: CheckCircle,
      variant: 'outline' as const,
      className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    },
  };

  const { label, icon: Icon, variant, className } = config[status];

  return (
    <Badge variant={variant} className={`gap-1.5 ${className}`} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
