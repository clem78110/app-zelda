import { useEffect, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, BookHeart } from "lucide-react";
import { toast } from "sonner";

const MOODS = [
  { key: "super", label: "Super", color: "#4A7C59", emoji: "🌿" },
  { key: "ok", label: "OK", color: "#6B8E9B", emoji: "🌤" },
  { key: "inquiet", label: "Inquiet", color: "#C87941", emoji: "🍂" },
  { key: "malade", label: "Malade", color: "#B75D5D", emoji: "🌧" },
];

export default function Journal() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", mood: "ok", date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    if (!activePet) return;
    const { data } = await api.get("/journal", { params: { pet_id: activePet.id } });
    setItems(data);
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const submit = async () => {
    if (!form.title) return toast.error("Titre requis");
    await api.post("/journal", { ...form, pet_id: activePet.id, date: new Date(form.date).toISOString() });
    toast.success("Note ajoutée");
    setOpen(false);
    setForm({ title: "", body: "", mood: "ok", date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const remove = async (id) => { await api.delete(`/journal/${id}`); load(); };

  return (
    <div className="space-y-6" data-testid="journal-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Journal</h1>
          <p className="text-sm text-[#5C6B60]">Observations & comportement</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-journal-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouvelle note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvelle observation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titre</Label>
                <Input data-testid="journal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Très en forme aujourd'hui..." />
              </div>
              <div>
                <Label>Date</Label>
                <Input data-testid="journal-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label className="block mb-2">Humeur</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.key}
                      data-testid={`mood-${m.key}`}
                      type="button"
                      onClick={() => setForm({ ...form, mood: m.key })}
                      className={`p-2 rounded-xl border text-xs font-semibold transition ${
                        form.mood === m.key
                          ? "border-[#4A7C59] bg-[#D0E5D8]/40"
                          : "border-[#E9E3D3] hover:bg-[#F2EFE9]"
                      }`}
                    >
                      <div className="text-xl">{m.emoji}</div>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Détails</Label>
                <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <Button data-testid="save-journal-btn" onClick={submit} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-[#8A9A8E]">
          <BookHeart size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucune note pour {activePet?.name}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((j) => {
            const m = MOODS.find((x) => x.key === j.mood) || MOODS[1];
            return (
              <Card key={j.id} data-testid={`journal-card-${j.id}`} className="p-5 rounded-2xl border border-[#E9E3D3]">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: m.color + "20" }}
                  >
                    {m.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold" style={{ fontFamily: "Manrope" }}>{j.title}</div>
                        <div className="text-xs text-[#8A9A8E]">{new Date(j.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</div>
                      </div>
                      <Button data-testid={`delete-journal-${j.id}`} variant="ghost" size="icon" onClick={() => remove(j.id)}>
                        <Trash2 size={16} className="text-[#B75D5D]" />
                      </Button>
                    </div>
                    {j.body && <p className="text-sm text-[#5C6B60] mt-2 whitespace-pre-wrap">{j.body}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
