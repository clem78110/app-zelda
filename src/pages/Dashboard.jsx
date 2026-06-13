import { useEffect, useState } from "react";
import { useAnimal } from "../context/AnimalContext";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Stethoscope, Scale, Footprints, BookHeart, FileImage, ArrowRight, Camera } from "lucide-react";
import  AvatarEditor  from "../components/AvatarEditor";
import ShareDialog from '../components/ShareDialog';
import Supplements from '../components/Supplements';
const StatCard = ({ to, icon: Icon, label, value, accent, testId }) => (
  <Link to={to} data-testid={testId} className="group">
    <Card className="p-5 rounded-3xl border border-[#E9E3D3] bg-white hover:-translate-y-1 transition-transform">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: accent + "22", color: accent }}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <ArrowRight size={16} className="text-[#8A9A8E] opacity-0 group-hover:opacity-100 transition" />
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-[#2C3D30]" style={{ fontFamily: "Manrope" }}>
        {value}
      </div>
    </Card>
  </Link>
);

export default function Dashboard() {
  const { activePet } = useAnimal();
  const [stats, setStats] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    if (!activePet) return;
    (async () => {
      const [r, a, w, j, walks, files] = await Promise.all([
        api.get(`/rations`, { params: { pet_id: activePet.id } }),
        api.get(`/appointments`, { params: { pet_id: activePet.id } }),
        api.get(`/weights`, { params: { pet_id: activePet.id } }),
        api.get(`/journal`, { params: { pet_id: activePet.id } }),
        api.get(`/walks`, { params: { pet_id: activePet.id } }),
        api.get(`/files`, { params: { pet_id: activePet.id } }),
      ]);
      const current = r.data.find((x) => x.is_current);
      const upcoming = a.data
        .filter((x) => !x.done && new Date(x.date) >= new Date())
        .sort((x, y) => new Date(x.date) - new Date(y.date))[0];
      const lastW = w.data[w.data.length - 1];
      const totalKm = walks.data.reduce((s, x) => s + x.distance_km, 0);
      setStats({
        ration: current,
        nextAppt: upcoming,
        lastWeight: lastW,
        journal: j.data.length,
        walksKm: totalKm,
        files: files.data.length,
      });
    })();
  }, [activePet]);

  if (!activePet) return null;
  const isDog = activePet.species === "dog";

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E9E3D3] via-[#F2EFE9] to-[#D0E5D8] p-6 md:p-8 border border-[#E9E3D3] grain">
        <div className="flex items-center gap-5">
          <button
            data-testid="open-avatar-editor"
            onClick={() => setAvatarOpen(true)}
            className="relative group flex-shrink-0"
            aria-label="Modifier la photo"
          >
            <img
              src={activePet.avatar_url}
              alt={activePet.name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-cover border-4 border-white shadow-sm"
            />
            <div className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#4A7C59] border-2 border-white flex items-center justify-center shadow-md">
              <Camera size={12} className="text-white" />
            </div>
          </button>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#5C6B60] font-bold">Bonjour</div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#2C3D30]" style={{ fontFamily: "Manrope" }}>
              {activePet.name}
            </h1>
            <div className="text-sm text-[#5C6B60] mt-0.5">
              {activePet.breed} · {isDog ? "Chienne" : "Chatte"}
            </div>
          </div>
        </div>
      </div>

      <AvatarEditor open={avatarOpen} onOpenChange={setAvatarOpen} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          testId="stat-ration"
          to="/rations"
          icon={UtensilsCrossed}
          label="Ration actuelle"
          accent="#4A7C59"
          value={stats?.ration ? `${stats.ration.daily_grams}g / jour` : "—"}
        />
        <StatCard
          testId="stat-next-vet"
          to="/veterinaire"
          icon={Stethoscope}
          label="Prochain rdv véto"
          accent="#C87941"
          value={
            stats?.nextAppt
              ? new Date(stats.nextAppt.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
              : "Aucun"
          }
        />
        <StatCard
          testId="stat-weight"
          to="/poids"
          icon={Scale}
          label="Dernier poids"
          accent="#6B8E9B"
          value={stats?.lastWeight ? `${stats.lastWeight.kg} kg` : "—"}
        />
        {isDog && (
          <StatCard
            testId="stat-walks"
            to="/balades"
            icon={Footprints}
            label="Km parcourus"
            accent="#4A7C59"
            value={stats ? `${stats.walksKm.toFixed(1)} km` : "—"}
          />
        )}
        <StatCard
          testId="stat-journal"
          to="/journal"
          icon={BookHeart}
          label="Notes journal"
          accent="#B75D5D"
          value={stats?.journal ?? "—"}
        />
        <StatCard
          testId="stat-files"
          to="/veterinaire"
          icon={FileImage}
          label="Fichiers véto"
          accent="#C87941"
          value={stats?.files ?? "—"}
        />
      </div>
    </div>
  );
}
