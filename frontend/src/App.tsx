import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Board from "./pages/Board";
import Evals from "./pages/Evals";
import Inbox from "./pages/Inbox";

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"}`;

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <div className="text-xl font-bold tracking-tight">EventPilot</div>
        <nav className="flex gap-1">
          <NavLink to="/inbox" className={link}>Inbox</NavLink>
          <NavLink to="/board" className={link}>Board</NavLink>
          <NavLink to="/evals" className={link}>Evals</NavLink>
        </nav>
      </header>
      <main className="flex-1 pb-10">
        <Routes>
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/board" element={<Board />} />
          <Route path="/evals" element={<Evals />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Demo uses synthetic emails. Do not paste confidential information.
      </footer>
    </div>
  );
}
