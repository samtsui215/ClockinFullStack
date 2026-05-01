// app/profile/components/ProfileInfoCard.tsx
'use client';
import React, { useState } from 'react';
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileInfoCardProps {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    isActive?: boolean | number;
    createdAt?: string;
    userType?: string;
  };
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user }) => {
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || 'User';

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user.email[0] || 'U').toUpperCase();

  const isActive = user.isActive !== false && user.isActive !== 0;
  const roleLabel = user.userType === 'admin' ? 'Administrator' : 'Team Member';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      // Call the sign-out API
      const response = await fetch('/api/signout', {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to sign-in page
        router.push('/sign-in');
      } else {
        console.error('Failed to sign out');
        alert('Failed to sign out. Please try again.');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('An error occurred while signing out.');
    } finally {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 h-[450px] flex flex-col">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-6">
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
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              {isActive ? 'Active Account' : 'Inactive Account'}
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-2 gap-4 flex-1">
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
            <p className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-slate-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <User className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Role</span>
            </div>
            <p className="text-sm text-slate-900">{roleLabel}</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => setShowSignOutModal(true)}
          className="mt-6 w-full px-4 py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-slate-200 hover:border-red-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setShowSignOutModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-600" />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Sign Out?
            </h3>

            {/* Description */}
            <p className="text-slate-600 text-center mb-6">
              Are you sure you want to sign out? You&apos;ll need to log in again to access your dashboard.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};