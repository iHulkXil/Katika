import React, { useState, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Upload, Camera, Check, Image as ImageIcon, Sparkles, X, User } from 'lucide-react';
import { extractUserProfilePicture, extractUserDisplayName, processImageFile } from '@/lib/avatar-upload';
import { ARCHETYPES } from '@/components/legend-avatar';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onSelectPhoto: (photoUrl: string, flag?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  onSelectPhoto,
  isOpen = true,
  onClose,
  inline = false,
}: ProfilePhotoUploadProps) {
  const { user } = usePrivy();
  const [activeTab, setActiveTab] = useState<'upload' | 'social' | 'athletes'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socialPhoto = extractUserProfilePicture(user);
  const userName = extractUserDisplayName(user);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrl = await processImageFile(file, 900, 1100);
      onSelectPhoto(dataUrl);
      if (onClose) onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error uploading photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex rounded-xl border border-[#1C3A2E] bg-[#07110E] p-1 font-mono-custom text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 rounded-lg py-2 font-bold transition-colors ${
            activeTab === 'upload'
              ? 'bg-[#FEF08A] text-black shadow'
              : 'text-[#8FA39A] hover:text-white'
          }`}
        >
          Upload Photo
        </button>
        {socialPhoto && (
          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`flex-1 rounded-lg py-2 font-bold transition-colors ${
              activeTab === 'social'
                ? 'bg-[#FEF08A] text-black shadow'
                : 'text-[#8FA39A] hover:text-white'
            }`}
          >
            Google Avatar
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('athletes')}
          className={`flex-1 rounded-lg py-2 font-bold transition-colors ${
            activeTab === 'athletes'
              ? 'bg-[#FEF08A] text-black shadow'
              : 'text-[#8FA39A] hover:text-white'
          }`}
        >
          Pro Athlete Cutouts
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-center text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: FILE UPLOAD (DRAG & DROP + PICKER) */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#FEF08A] bg-[#FEF08A]/10 scale-[1.01]'
                : 'border-[#244838] bg-[#0A1612] hover:border-[#FEF08A]/60 hover:bg-[#0E1F1A]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FEF08A]/50 bg-[#FEF08A]/10 text-[#FEF08A] mb-2 shadow">
              {isProcessing ? (
                <Sparkles className="animate-spin" size={24} />
              ) : (
                <Upload size={24} />
              )}
            </div>

            <p className="font-mono-custom text-xs font-bold text-white">
              {isProcessing ? 'Processing image...' : 'Click to select or drag & drop photo'}
            </p>
            <p className="text-[11px] text-[#8FA39A] mt-1 max-w-xs">
              Supports selfies, portraits, and athlete cutouts (JPG, PNG, WEBP).
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: SOCIAL / GOOGLE AVATAR */}
      {activeTab === 'social' && socialPhoto && (
        <div className="rounded-2xl border border-[#FEF08A]/40 bg-[#0E1F1A] p-4 text-center">
          <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-[#FEF08A] shadow-md">
            <img
              src={socialPhoto}
              alt="Social avatar"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="font-mono-custom text-xs font-bold text-white mt-2">
            Use your connected account profile photo
          </p>
          <p className="text-[11px] text-[#8FA39A] mt-0.5">
            Connected as <span className="text-[#FEF08A] font-semibold">{userName}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              onSelectPhoto(socialPhoto);
              if (onClose) onClose();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FEF08A] px-5 py-2 font-mono-custom text-xs font-black uppercase text-black hover:scale-105 transition-transform"
          >
            <Check size={14} /> Apply Profile Picture
          </button>
        </div>
      )}

      {/* TAB 3: PRO ATHLETE PRESETS */}
      {activeTab === 'athletes' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ARCHETYPES.map((arch) => {
            const isSelected = currentPhotoUrl === arch.photoUrl;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => {
                  onSelectPhoto(arch.photoUrl, arch.nation.flag);
                  if (onClose) onClose();
                }}
                className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#FEF08A] bg-[#FEF08A]/15 shadow-[0_0_12px_rgba(254,240,138,0.25)]'
                    : 'border-[#1C3A2E] bg-[#0A1612] hover:border-[#FEF08A]/40'
                }`}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/40">
                  <img
                    src={arch.photoUrl}
                    alt={arch.name}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-mono-custom text-xs font-bold text-white">
                    {arch.nation.flag} {arch.name}
                  </span>
                  <span className="block truncate text-[9px] text-[#8FA39A]">{arch.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-[#FEF08A]/40 bg-[#07130F] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#1C3A2E]">
          <div className="flex items-center gap-2">
            <Camera className="text-[#FEF08A]" size={18} />
            <h3 className="font-mono-custom text-sm font-black uppercase tracking-wider text-white">
              Card Athlete Photo
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-[#8FA39A] hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mt-4">{content}</div>
      </div>
    </div>
  );
}
