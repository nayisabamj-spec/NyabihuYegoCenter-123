import React from 'react';
import {
  Sparkles,
  Laptop,
  BookOpen,
  ShieldCheck,
  Trophy,
  Megaphone,
  HeartHandshake,
  Briefcase,
  Users,
  LucideIcon
} from 'lucide-react';

interface ServiceIconProps {
  name?: string;
  iconName?: string;
  className?: string;
  size?: number;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  name = '',
  iconName = '',
  className = 'w-5 h-5',
  size = 20
}) => {
  const normalized = (name || iconName).toLowerCase();

  let IconComponent: LucideIcon = Sparkles;

  if (normalized.includes('ict') || normalized.includes('laptop') || normalized.includes('computer')) {
    IconComponent = Laptop;
  } else if (normalized.includes('library') || normalized.includes('book')) {
    IconComponent = BookOpen;
  } else if (normalized.includes('vct') || normalized.includes('shield')) {
    IconComponent = ShieldCheck;
  } else if (normalized.includes('sport') || normalized.includes('trophy')) {
    IconComponent = Trophy;
  } else if (normalized.includes('outreach') || normalized.includes('megaphone')) {
    IconComponent = Megaphone;
  } else if (normalized.includes('srh') || normalized.includes('heart')) {
    IconComponent = HeartHandshake;
  } else if (normalized.includes('job') || normalized.includes('desk') || normalized.includes('briefcase')) {
    IconComponent = Briefcase;
  } else if (normalized.includes('volunteer') || normalized.includes('civic') || normalized.includes('users')) {
    IconComponent = Users;
  } else if (normalized.includes('empower') || normalized.includes('entrepreneur')) {
    IconComponent = Sparkles;
  }

  return <IconComponent size={size} className={className} />;
};
