import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type Toast = { id: number; title: string; tone: "success" | "error" };
const ToastContext = createContext<{ toast: (title: string, tone?: Toast["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((title: string, tone: Toast["tone"] = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);
  return <ToastContext.Provider value={{ toast }}>{children}
    <div className="fixed bottom-5 right-5 z-[100] grid w-[min(360px,calc(100vw-2.5rem))] gap-2">
      {toasts.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg">
        {item.tone === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
        <span className="flex-1">{item.title}</span><button onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}><X className="h-4 w-4 text-slate-500" /></button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
