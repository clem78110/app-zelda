import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, FileImage, Scale, UtensilsCrossed, BookHeart, Lock, Loader2, AlertCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function PublicShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public/share/${token}`);
        setData(data);
      } catch (e) {
        setError(e?.response?.data?.detail || "Lien invalide");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6]">
        <Loader2 size={28} className="animate-spin text-[#4A7C59]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6] p-6">
        <Card data-testid="share-error" className="p-8 rounded-3xl border border-[#E9E3D3] max-w-md text-center">
          <AlertCircle size={40} className="mx-auto text-[#B75D5D] mb-3" strokeWidth={1.5} />
          <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "Manrope" }}>Lien indisponible</h1>
          <p className="text-sm text-[#5C6B60]">{error}</p>
        </Card>
      </div>
    );
  }

  const { pet, share, appointments, files, weights, rations, journal } = data;
  const weightChart = weights.map((w) => ({
    date: new Date(w.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    kg: w.kg,
  }));
  const currentRation = rations.find((r) => r.is_current);

  return (
    <div className="min-h-screen bg-[#F9F8F6] leaf-bg pb-16" data-testid="public-share-page">
      <header className="bg-white/85 backdrop-blur-xl border-b border-[#E9E3D3] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#4A7C59] flex items-center justify-center">
              <span className="text-white font-extrabold text-lg" style={{ fontFamily: "Manrope" }}>C</span>
            </div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-sm" style={{ fontFamily: "Manrope" }}>Compagnons</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8A9A8E]">Dossier partagé</div>
            </div>
          </div>
          <Badge variant="outline" className="border-[#E9E3D3] text-[10px]"><Lock size={10} className="mr-1" />Lecture seule</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-[#E9E3D3]/60 via-white to-[#D0E5D8]/40 grain">
          <div className="flex items-center gap-5">
            <img src={pet.avatar_url} alt={pet.name} className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-sm" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#5C6B60] font-bold">Dossier vétérinaire</div>
              <h1 className="text-3xl font-extrabold text-[#2C3D30]" style={{ fontFamily: "Manrope" }}>{pet.name}</h1>
              <div className="text-sm text-[#5C6B60]">{pet.breed} · {pet.species === "dog" ? "Chienne" : "Chatte"}</div>
            </div>
          </div>
          {share.expires_at && (
            <div className="mt-4 text-xs text-[#8A9A8E]">
              Ce lien expire le <span className="font-semibold text-[#5C6B60]">{new Date(share.expires_at).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
        </Card>

        <Tabs defaultValue="appts">
          <TabsList className="rounded-full bg-[#F2EFE9] p-1 flex-wrap h-auto">
            <TabsTrigger value="appts" className="rounded-full data-[state=active]:bg-white"><Stethoscope size={14} className="mr-1.5" />RDV</TabsTrigger>
            <TabsTrigger value="files" className="rounded-full data-[state=active]:bg-white"><FileImage size={14} className="mr-1.5" />Fichiers</TabsTrigger>
            <TabsTrigger value="weight" className="rounded-full data-[state=active]:bg-white"><Scale size={14} className="mr-1.5" />Poids</TabsTrigger>
            <TabsTrigger value="ration" className="rounded-full data-[state=active]:bg-white"><UtensilsCrossed size={14} className="mr-1.5" />Ration</TabsTrigger>
            <TabsTrigger value="journal" className="rounded-full data-[state=active]:bg-white"><BookHeart size={14} className="mr-1.5" />Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="appts" className="mt-5 space-y-2">
            {appointments.length === 0 && <p className="text-sm text-[#8A9A8E] italic">Aucun rendez-vous.</p>}
            {appointments.map((a) => (
              <Card key={a.id} className="p-4 rounded-2xl border border-[#E9E3D3] flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F2EFE9] flex flex-col items-center justify-center flex-shrink-0">
                  <div className="text-[10px] uppercase font-bold">{new Date(a.date).toLocaleDateString("fr-FR", { month: "short" })}</div>
                  <div className="text-lg font-extrabold leading-none">{new Date(a.date).getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">{a.title}</div>
                    <Badge variant="outline" className="text-[10px] border-[#E9E3D3]">{a.category}</Badge>
                    {a.done && <Badge className="bg-[#4A7C59] text-[10px]">fait</Badge>}
                  </div>
                  {a.vet_name && <div className="text-xs text-[#8A9A8E]">{a.vet_name}</div>}
                  {a.notes && <div className="text-xs text-[#5C6B60] mt-1">{a.notes}</div>}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="files" className="mt-5">
            {files.length === 0 ? (
              <p className="text-sm text-[#8A9A8E] italic">Aucun fichier vétérinaire.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {files.map((f) => (
                  <Card key={f.id} className="p-3 rounded-2xl border border-[#E9E3D3]">
                    {f.mime_type?.startsWith("image/") ? (
                      <img src={f.file_base64} alt={f.title} className="w-full aspect-square object-cover rounded-xl mb-2" />
                    ) : (
                      <a href={f.file_base64} download={f.title} className="w-full aspect-square rounded-xl bg-[#F2EFE9] flex items-center justify-center mb-2 hover:bg-[#E9E3D3]">
                        <FileImage size={28} className="text-[#8A9A8E]" strokeWidth={1.5} />
                      </a>
                    )}
                    <Badge variant="outline" className="text-[10px] border-[#E9E3D3] mb-1">{f.category}</Badge>
                    <div className="font-semibold text-sm line-clamp-2">{f.title}</div>
                    <div className="text-[10px] text-[#8A9A8E] mt-1">{new Date(f.created_at).toLocaleDateString("fr-FR")}</div>
                    {f.ai_summary && <p className="text-xs text-[#5C6B60] mt-2 line-clamp-3">{f.ai_summary}</p>}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weight" className="mt-5 space-y-3">
            {weightChart.length >= 2 && (
              <Card className="p-4 rounded-3xl border border-[#E9E3D3]">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weightChart} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A7C59" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4A7C59" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9E3D3" />
                    <XAxis dataKey="date" stroke="#8A9A8E" fontSize={11} />
                    <YAxis stroke="#8A9A8E" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E9E3D3" }} />
                    <Area type="monotone" dataKey="kg" stroke="#4A7C59" strokeWidth={2.5} fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
            {weights.length === 0 && <p className="text-sm text-[#8A9A8E] italic">Aucun relevé de poids.</p>}
            {weights.slice().reverse().map((w) => (
              <Card key={w.id} className="p-3 rounded-2xl border border-[#E9E3D3] flex justify-between">
                <div className="font-semibold">{w.kg} kg</div>
                <div className="text-xs text-[#8A9A8E]">{new Date(w.date).toLocaleDateString("fr-FR")}</div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="ration" className="mt-5 space-y-3">
            {currentRation ? (
              <Card className="p-5 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-white to-[#D0E5D8]/40">
                <Badge className="bg-[#4A7C59] hover:bg-[#4A7C59] mb-2">Actuelle</Badge>
                <div className="text-xl font-extrabold" style={{ fontFamily: "Manrope" }}>{currentRation.brand}</div>
                <div className="text-sm text-[#5C6B60]">{currentRation.food_type}</div>
                <div className="mt-3 flex gap-6 text-sm">
                  <div><span className="font-bold">{currentRation.daily_grams}g</span> / jour</div>
                  <div><span className="font-bold">{currentRation.meals_per_day}</span> repas</div>
                </div>
              </Card>
            ) : <p className="text-sm text-[#8A9A8E] italic">Aucune ration enregistrée.</p>}
          </TabsContent>

          <TabsContent value="journal" className="mt-5 space-y-2">
            {journal.length === 0 && <p className="text-sm text-[#8A9A8E] italic">Aucune observation.</p>}
            {journal.map((j) => (
              <Card key={j.id} className="p-4 rounded-2xl border border-[#E9E3D3]">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{j.title}</div>
                  <Badge variant="outline" className="text-[10px] border-[#E9E3D3]">{j.mood}</Badge>
                </div>
                <div className="text-xs text-[#8A9A8E]">{new Date(j.date).toLocaleDateString("fr-FR")}</div>
                {j.body && <p className="text-sm text-[#5C6B60] mt-2 whitespace-pre-wrap">{j.body}</p>}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
