import { Sparkles, Video, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface AvatarPlaceholderProps {
  variant?: 'hero' | 'workspace' | 'profile' | 'camera' | 'avatar';
  className?: string;
}

export function AvatarPlaceholder({ variant = 'avatar', className }: AvatarPlaceholderProps) {
  const isCamera = variant === 'camera';
  const isProfile = variant === 'profile';
  
  // Choose icon
  const Icon = isCamera ? Video : (isProfile ? User : Sparkles);
  
  // Choose labels
  const title = isCamera 
    ? 'Live Camera Feed Placeholder' 
    : (isProfile ? 'Avatar Placeholder' : 'AI Avatar Placeholder');
  const subtitle = 'Reserved for backend integration';

  // Base styling for the container
  const baseStyle = 'flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-primary/20 bg-surface-alt/40 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/40';
  
  const sizeClasses = {
    hero: 'w-full min-h-[300px]',
    workspace: 'w-full h-full min-h-[320px]',
    profile: 'w-24 h-24 rounded-2xl border border-border p-2',
    camera: 'w-full h-full min-h-[320px]',
    avatar: 'w-full h-full min-h-[320px]',
  };

  return (
    <div className={cn(baseStyle, sizeClasses[variant], className)} aria-label={title}>
      <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary mb-3">
        <Icon size={20} className={variant === 'avatar' || variant === 'hero' ? 'animate-pulse' : ''} />
      </div>
      <p className="text-sm font-general font-semibold text-text-primary tracking-tight">
        {title}
      </p>
      {variant !== 'profile' && (
        <p className="text-[10px] font-mono-sb text-text-secondary mt-1 uppercase tracking-wider">
          {subtitle}
        </p>
      )}
    </div>
  );
}
