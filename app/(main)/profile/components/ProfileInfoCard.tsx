// app/profile/components/ProfileInfoCard.tsx
import React from 'react';
import { User, Mail, Calendar, Shield } from 'lucide-react';

interface ProfileInfoCardProps {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    isActive?: boolean | string;
    createdAt?: string;
  };
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user }) => {
  const fullName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.firstName || 'User';
    
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user.email[0] || 'U').toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 h-[450px] flex flex-col justify-center">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1c3260] to-[#4062ad] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {initials}
        </div>
        
        {/* Name and Email */}
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{fullName}</h2>
          <div className="flex items-center gap-2 text-slate-600 mb-3">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Active Account
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">User ID</span>
          </div>
          <p className="text-sm font-mono text-slate-900 truncate">{user.id}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Member Since</span>
          </div>
          <p className="text-sm text-slate-900">
            {user.createdAt 
              ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })
              : 'N/A'
            }
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Account Status</span>
          </div>
          <p className="text-sm text-slate-900 capitalize">
            {user.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <User className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Role</span>
          </div>
          <p className="text-sm text-slate-900">Team Member</p>
        </div>
      </div>
    </div>
  );
};