import { useEffect, useState, useCallback, createContext, useContext } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ToastCtx {
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
}

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: "success" | "error", duration = 3000) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const ctx: ToastCtx = {
    success: (msg, duration) => add(msg, "success", duration),
    error: (msg, duration) => add(msg, "error", duration),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
