import { useEffect, useRef, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Footprints, Trash2, MapPin, Timer, Route } from "lucide-react";
import { toast } from "sonner";

const haversine = (a, b) => {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function Balades() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gpsError, setGpsError] = useState(null);

  const watchId = useRef(null);
  const lastPoint = useRef(null);
  const timerRef = useRef(null);

  const load = async () => {
    if (!activePet) return;
    const { data } = await api.get("/walks", { params: { pet_id: activePet.id } });
    setItems(data);
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const start = () => {
    if (!navigator.geolocation) { setGpsError("GPS non supporté par ce navigateur"); return; }
    setDistance(0); setDuration(0); setGpsError(null); lastPoint.current = null;
    setTracking(true);

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (lastPoint.current) {
          const d = haversine(lastPoint.current, p);
          if (d > 0.002) { // ignore <2m noise
            setDistance((cur) => cur + d);
            lastPoint.current = p;
          }
        } else {
          lastPoint.current = p;
        }
      },
      (err) => setGpsError("Position indisponible : " + err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  };

  const stop = async (save = true) => {
    setTracking(false);
    if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (save && (distance > 0 || duration > 5)) {
      await api.post("/walks", {
        pet_id: activePet.id,
        distance_km: +distance.toFixed(3),
        duration_seconds: duration,
        notes: "",
      });
      toast.success("Balade enregistrée");
      load();
    }
    setDistance(0); setDuration(0);
  };

  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); if (timerRef.current) clearInterval(timerRef.current); }, []);

  const remove = async (id) => { await api.delete(`/walks/${id}`); load(); };

  const totalKm = items.reduce((s, w) => s + w.distance_km, 0);
  const totalTime = items.reduce((s, w) => s + w.duration_seconds, 0);

  return (
    <div className="space-y-6" data-testid="walks-page">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Balades</h1>
        <p className="text-sm text-[#5C6B60]">Podomètre GPS pour {activePet?.name}</p>
      </div>

      <Card className="p-6 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-[#D0E5D8]/50 via-white to-[#E9E3D3]/40 grain">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold flex items-center gap-1.5"><Route size={12} />Distance</div>
            <div className="text-4xl font-extrabold mt-1" style={{ fontFamily: "Manrope" }}>
              {distance.toFixed(2)} <span className="text-base text-[#5C6B60] font-bold">km</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold flex items-center gap-1.5"><Timer size={12} />Durée</div>
            <div className="text-4xl font-extrabold mt-1" style={{ fontFamily: "Manrope" }}>{fmtTime(duration)}</div>
          </div>
        </div>

        {!tracking ? (
          <Button data-testid="start-walk-btn" onClick={start} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347] h-12 text-base">
            <Play size={18} className="mr-2" /> Démarrer la balade
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-[#4A7C59] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" /> Suivi GPS en cours
            </div>
            <Button data-testid="stop-walk-btn" onClick={() => stop(true)} className="w-full rounded-full bg-[#B75D5D] hover:bg-[#9A4848] h-12 text-base">
              <Square size={18} className="mr-2" /> Arrêter & enregistrer
            </Button>
          </div>
        )}
        {gpsError && <p data-testid="gps-error" className="text-xs text-[#B75D5D] mt-3 text-center">{gpsError}</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 rounded-2xl border border-[#E9E3D3]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Total parcouru</div>
          <div className="text-2xl font-extrabold mt-1" style={{ fontFamily: "Manrope" }}>{totalKm.toFixed(1)} km</div>
        </Card>
        <Card className="p-4 rounded-2xl border border-[#E9E3D3]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Temps total</div>
          <div className="text-2xl font-extrabold mt-1" style={{ fontFamily: "Manrope" }}>{Math.floor(totalTime / 60)} min</div>
        </Card>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-[#8A9A8E]">
          <Footprints size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucune balade enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-bold" style={{ fontFamily: "Manrope" }}>Historique</h2>
          {items.map((w) => (
            <Card key={w.id} className="p-4 rounded-2xl border border-[#E9E3D3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D0E5D8] flex items-center justify-center text-[#4A7C59]">
                  <MapPin size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="font-semibold">{w.distance_km.toFixed(2)} km · {fmtTime(w.duration_seconds)}</div>
                  <div className="text-xs text-[#8A9A8E]">{new Date(w.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
              <Button data-testid={`delete-walk-${w.id}`} variant="ghost" size="icon" onClick={() => remove(w.id)}>
                <Trash2 size={16} className="text-[#B75D5D]" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
