import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Board from "./pages/Board";
import Evals from "./pages/Evals";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<AppShell />}>
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/board" element={<Board />} />
        <Route path="/evals" element={<Evals />} />
      </Route>
    </Routes>
  );
}
