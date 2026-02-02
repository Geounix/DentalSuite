import { Badge } from "./ui/badge";
import { Shield, Stethoscope, Users } from "lucide-react";

interface RoleBadgeProps {
  role: 'admin' | 'doctor' | 'staff';
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const getRoleConfig = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Shield
        };
      case 'doctor':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Stethoscope
        };
      case 'staff':
        return {
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: Users
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Users
        };
    }
  };

  const config = getRoleConfig(role);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} text-xs font-medium flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
