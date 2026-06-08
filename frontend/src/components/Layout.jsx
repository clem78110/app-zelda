import { NavLink, Outlet } from "react-router-dom";
import { AnimalSelector } from "./AnimalSelector";
import { ExportButton } from "./ExportButton";
import { Home, UtensilsCrossed, Stethoscope, Scale, BookHeart, Footprints } from "lucide-react";
import { useAnimal } from "@/context/AnimalContext";

const navItems = [
  { to: "/", label: "Accueil", icon: Home, end: true, testId: "nav-home" },
  { to: "/rations", label: "Rations", icon: UtensilsCrossed, testId: "nav-rations" },
  { to: "/veterinaire", label: "Véto", icon: Stethoscope, testId: "nav-vet" },
  { to: "/poids", label: "Poids", icon: Scale, testId: "nav-weight" },
  { to: "/journal", label: "Journal", icon: BookHeart, testId: "nav-journal" },
  { to: "/balades", label: "Balades", icon: Footprints, testId: "nav-walks", dogOnly: true },
];

export const Layout = () => {
  const { activePet } = useAnimal();
  const isDog = activePet?.species === "dog";

  return (
    <div className="min-h-screen pb-24 leaf-bg">
      <header className="sticky top-0 z-30 bg-[#F9F8F6]/85 backdrop-blur-xl border-b border-[#E9E3D3]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#4A7C59] flex items-center justify-center">
              <span className="text-white font-extrabold text-lg" style={{ fontFamily: "Manrope" }}>C</span>
            </div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight" style={{ fontFamily: "Manrope" }}>Compagnons</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8A9A8E]">Zelda & Maddie</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimalSelector />
            <ExportButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav
        data-testid="bottom-nav"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-xl border border-[#E9E3D3] shadow-lg rounded-full px-2 py-1.5 flex items-center gap-1"
      >
        {navItems
          .filter((it) => !it.dogOnly || isDog)
          .map(({ to, label, icon: Icon, end, testId }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testId}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-colors min-w-[58px] ${
                  isActive
                    ? "bg-[#4A7C59] text-white"
                    : "text-[#5C6B60] hover:bg-[#F2EFE9]"
                }`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="text-[10px] mt-0.5 font-semibold">{label}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
};
