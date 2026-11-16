import React from 'react';
import { AppTab } from './AppHeaderAndNav';

export const ScreenSkeleton: React.FC<{ tab?: AppTab }> = ({ tab = 'feed' }) => {
  if (tab === 'expenses') {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-[#E6E8EE] rounded-xl" />
            <div className="h-4 w-72 bg-[#E6E8EE]/70 rounded-lg" />
          </div>
          <div className="h-12 w-36 bg-[#E6E8EE] rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-5 w-44 bg-[#E6E8EE] rounded-lg" />
            <div className="h-36 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-10 w-48 bg-[#E6E8EE]/70 rounded-xl" />
                <div className="h-8 w-20 bg-[#E6E8EE] rounded-xl" />
              </div>
              <div className="h-8 w-full bg-[#E6E8EE]/50 rounded-xl" />
            </div>
            <div className="h-36 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-10 w-44 bg-[#E6E8EE]/70 rounded-xl" />
                <div className="h-8 w-24 bg-[#E6E8EE] rounded-xl" />
              </div>
              <div className="h-8 w-full bg-[#E6E8EE]/50 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-64 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5 space-y-4">
              <div className="h-10 w-36 bg-[#E6E8EE] rounded-xl" />
              <div className="h-24 w-full bg-[#E6E8EE]/60 rounded-2xl" />
              <div className="h-12 w-full bg-[#E6E8EE] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'chores' || tab === 'apartment') {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="h-32 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5 space-y-3">
              <div className="h-6 w-52 bg-[#E6E8EE] rounded-xl" />
              <div className="h-4 w-64 bg-[#E6E8EE]/70 rounded-lg" />
              <div className="h-10 w-full bg-[#E6E8EE]/60 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-40 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
              <div className="h-40 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-5">
            <div className="h-72 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5 space-y-3">
              <div className="h-6 w-48 bg-[#E6E8EE] rounded-xl" />
              <div className="h-14 w-full bg-[#E6E8EE]/60 rounded-2xl" />
              <div className="h-14 w-full bg-[#E6E8EE]/60 rounded-2xl" />
              <div className="h-14 w-full bg-[#E6E8EE]/60 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-36 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-6 space-y-3">
            <div className="h-8 w-48 bg-[#E6E8EE] rounded-xl" />
            <div className="h-4 w-64 bg-[#E6E8EE]/70 rounded-lg" />
            <div className="h-8 w-36 bg-[#E6E8EE]/60 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
            <div className="h-44 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
          </div>
          <div className="h-56 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-64 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
          <div className="h-36 bg-white border-2 border-[#E6E8EE] rounded-[24px] p-5" />
        </div>
      </div>
    </div>
  );
};

export const AppBootstrapSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#F7F8FB] flex flex-col pt-safe pb-safe">
    <div className="h-16 border-b border-[#E6E8EE] bg-white/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between animate-pulse">
      <div className="h-9 w-40 bg-[#E6E8EE] rounded-2xl" />
      <div className="hidden md:flex gap-2">
        <div className="h-9 w-24 bg-[#E6E8EE]/70 rounded-xl" />
        <div className="h-9 w-24 bg-[#E6E8EE]/70 rounded-xl" />
        <div className="h-9 w-24 bg-[#E6E8EE]/70 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-[#E6E8EE]/80 rounded-2xl" />
        <div className="h-10 w-10 bg-[#E6E8EE] rounded-2xl" />
      </div>
    </div>
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ScreenSkeleton tab="feed" />
    </div>
  </div>
);
