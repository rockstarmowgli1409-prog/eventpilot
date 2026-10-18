import { Link, NavLink, Outlet } from "react-router-dom";
import { BoardIcon, ChartIcon, InboxIcon, LogoMark } from "../icons";
import EventPicker from "./EventPicker";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { to: "/inbox", label: "Inbox", Icon: InboxIcon },
  { to: "/board", label: "Board", Icon: BoardIcon },
  { to: "/evals", label: "Evals", Icon: ChartIcon },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70"
  }`;

export default function AppShell() {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <LogoMark /> EventPilot
          </Link>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav className="mt-3 flex gap-1 lg:mt-8 lg:flex-col" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 lg:mt-8">
          <EventPicker />
        </div>
        <div className="mt-auto hidden items-center justify-between pt-6 lg:flex">
          <span className="text-xs text-slate-400">Prototype</span>
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Demo uses synthetic emails. Do not paste confidential information.
        </footer>
      </div>
    </div>
  );
}
