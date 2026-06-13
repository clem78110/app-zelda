import { useEffect, useState, useCallback } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Poids() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kg: "", date: new Date().toISOString().slice(0, 10), notes: "" });

  const load = useCallback(async () => {
    if (!activePet) return;
    const { data } = await api.get("/weights", { params: { pet_id: activePet.id } });
    setItems(data);
  }, [activePet]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.kg) return toast.error("Poids requis");
    await api.post("/weights", { pet_id: activePet.id, kg: Number(form.kg), date: form.date, notes: form.notes });
    toast.success("Poids enregistré");
    setOpen(false);
    setForm({ kg: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    load();
  };

  const remove = async (id) => { await api.delete(`/weights/${id}`); load(); };

  const last = items[items.length - 1];
  const prev = items[items.length - 2];
  const diff = last && prev ? +(last.kg - prev.kg).toFixed(2) : 0;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

  const chartData = items.map((w) => ({
    date: new Date(w.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    kg: w.kg,
  }));

  return (
    <div className="space-y-6" data-testid="weight-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Poids</h1>
          <p className="text-sm text-[#5C6B60]">Suivi & évolution</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-weight-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouveau poids
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouveau relevé</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Poids (kg)</Label>
                  <Input data-testid="weight-kg" type="number" step="0.1" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input data-testid="weight-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button data-testid="save-weight-btn" onClick={submit} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {last && (
        <Card className="p-6 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-white to-[#D0E5D8]/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Actuel</div>
              <div className="text-4xl font-extrabold mt-1" style={{ fontFamily: "Manrope" }}>{last.kg} kg</div>
              <div className="text-xs text-[#8A9A8E] mt-1">{new Date(last.date).toLocaleDateString("fr-FR")}</div>
            </div>
            {prev && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                diff > 0 ? "bg-[#C87941]/15 text-[#C87941]" : diff < 0 ? "bg-[#4A7C59]/15 text-[#4A7C59]" : "bg-[#F2EFE9] text-[#5C6B60]"
              }`}>
                <TrendIcon size={16} /> {diff > 0 ? "+" : ""}{diff} kg
              </div>
            )}
          </div>
        </Card>
      )}

      {chartData.length >= 2 && (
        <Card className="p-4 rounded-3xl border border-[#E9E3D3]">
          <div className="text-sm font-bold mb-3" style={{ fontFamily: "Manrope" }}>Évolution</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4A7C59" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4A7C59" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9E3D3" />
              <XAxis dataKey="date" stroke="#8A9A8E" fontSize={11} />
              <YAxis stroke="#8A9A8E" fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E9E3D3" }} />
              <Area type="monotone" dataKey="kg" stroke="#4A7C59" strokeWidth={2.5} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="space-y-2">
        {items.slice().reverse().map((w) => (
          <Card key={w.id} className="p-3 rounded-2xl border border-[#E9E3D3] flex items-center justify-between">
            <div>
              <div className="font-semibold">{w.kg} kg</div>
              <div className="text-xs text-[#8A9A8E]">{new Date(w.date).toLocaleDateString("fr-FR")}{w.notes ? ` · ${w.notes}` : ""}</div>
            </div>
            <Button data-testid={`delete-weight-${w.id}`} variant="ghost" size="icon" onClick={() => remove(w.id)}>
              <Trash2 size={16} className="text-[#B75D5D]" />
            </Button>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-[#8A9A8E]">
          <Scale size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucun relevé de poids pour {activePet?.name}.</p>
        </div>
      )}
    </div>
  );
}
