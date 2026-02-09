import { Badge } from "./ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const lowerStatus = String(status || '').toLowerCase().trim();

    // Exact matches to avoid substring collisions (e.g., 'unpaid' contains 'paid')
    if (lowerStatus === 'paid' || lowerStatus === 'completed' || lowerStatus === 'active' || lowerStatus === 'paid') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (lowerStatus === 'unpaid' || lowerStatus === 'inactive' || lowerStatus === 'cancelled' || lowerStatus === 'canceled' || lowerStatus === 'overdue') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (lowerStatus === 'pending' || lowerStatus === 'partial' || lowerStatus === 'scheduled' || lowerStatus === 'unsigned') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (lowerStatus === 'inprogress' || lowerStatus === 'in-progress' || lowerStatus === 'progress') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerStatus === 'planned') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }

    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Badge variant="outline" className={`${getStatusColor(status)} text-xs font-medium`}>
      {status}
    </Badge>
  );
}
