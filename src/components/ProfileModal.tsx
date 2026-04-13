import React, { useRef, useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { Player } from '../types';

interface Props {
  player: Player;
  onClose: () => void;
  onUpload: (playerId: string, file: File) => Promise<string | null>;
}

const ProfileModal: React.FC<Props> = ({ player, onClose, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError(null);
    const result = await onUpload(player.id, file);
    setUploading(false);
    if (result) {
      onClose();
    } else {
      setError('Upload failed. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl p-6 space-y-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white uppercase tracking-tight">Profile</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              {player.avatarUrl && !imgError ? (
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-3xl font-black text-green-500">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-black text-white uppercase tracking-tight">{player.name}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              {player.points % 1 === 0 ? player.points : player.points.toFixed(1)} pts
            </p>
          </div>
        </div>

        {/* Upload */}
        <div className="space-y-2">
          {error && (
            <p className="text-[11px] text-red-400 font-bold text-center">{error}</p>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-zinc-950 font-black uppercase tracking-widest text-sm py-3.5 rounded-2xl transition-all active:scale-[0.98]"
          >
            {uploading ? (
              <>
                <Upload size={16} className="animate-bounce" /> Uploading…
              </>
            ) : (
              <>
                <Camera size={16} /> {player.avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
