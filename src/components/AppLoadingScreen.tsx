import { Loader2 } from 'lucide-react';

interface AppLoadingScreenProps {
  label?: string;
}

export default function AppLoadingScreen({ label }: AppLoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#0A0A1E] flex flex-col items-center justify-center text-[#F5F5F7]">
      <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      {label ? <p className="mt-4 text-sm text-white/60">{label}</p> : null}
    </div>
  );
}
