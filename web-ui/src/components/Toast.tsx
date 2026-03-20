import { useEffect, useState, useCallback, createContext, useContext } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ToastCtx {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: "success" | "error") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const ctx: ToastCtx = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
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
