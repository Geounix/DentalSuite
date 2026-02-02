import { Badge } from "./ui/badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes('active') || lowerStatus.includes('completed') || lowerStatus.includes('paid') || lowerStatus.includes('signed')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (lowerStatus.includes('inactive') || lowerStatus.includes('cancelled') || lowerStatus.includes('canceled') || lowerStatus.includes('overdue')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('scheduled') || lowerStatus.includes('unsigned')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (lowerStatus.includes('progress') || lowerStatus.includes('partial')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (lowerStatus.includes('planned')) {
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
