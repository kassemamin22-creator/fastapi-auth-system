import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import SealMark from "../ui/SealMark";

export default function Shell() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-fog bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-slate">
          <div className="flex items-center gap-2">
            <SealMark size={20} spinning={false} />
            <span>Vaultkeep</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Vaultkeep. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
