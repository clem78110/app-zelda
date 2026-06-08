import { useEffect, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PROTEINS = [
  { key: "dinde", label: "Dinde", emoji: "🦃" },
  { key: "poulet", label: "Poulet", emoji: "🍗" },
  { key: "coeur_dinde", label: "Cœur de dinde", emoji: "❤️" },
  { key: "maquereau", label: "Maquereau", emoji: "🐟" },
  { key: "sardine", label: "Sardine", emoji: "🐟" },
  { key: "eperlans", label: "Éperlans", emoji: "🐟" },
  { key: "moules", label: "Moules", emoji: "🦪" },
];

const emptyForm = {
  brand: "", food_type: "ration ménagère", daily_grams: 200, meals_per_day: 2,
  proteins: [], notes: "",
};

export default function Rations() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customProtein, setCustomProtein] = useState("");

  const isMenagere = form.food_type === "ration ménagère";

  const load = async () => {
    if (!activePet) return;
    try {
      const { data } = await api.get("/rations", { params: { pet_id: activePet.id } });
      setItems(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const toggleProtein = (key) => {
    setForm((p) => ({
      ...p,
      proteins: p.proteins.includes(key)
        ? p.proteins.filter((x) => x !== key)
        : [...p.proteins, key],
    }));
  };

  const addCustomProtein = () => {
    const v = customProtein.trim();
    if (!v) return;
    if (form.proteins.includes(v)) { setCustomProtein(""); return; }
    setForm((p) => ({ ...p, proteins: [...p.proteins, v] }));
    setCustomProtein("");
  };

  const submit = async () => {
    if (!isMenagere && !form.brand) return toast.error("Marque requise");
    if (isMenagere && form.proteins.length === 0) return toast.error("Sélectionnez au moins une protéine");
    try {
      await api.post("/rations", {
        ...form,
        brand: form.brand || (isMenagere ? "Ration maison" : ""),
        pet_id: activePet.id,
        daily_grams: Number(form.daily_grams),
        meals_per_day: Number(form.meals_per_day),
      });
      toast.success("Ration enregistrée");
      setOpen(false);
      setForm(emptyForm);
      setCustomProtein("");
      load();
    } catch (e) {
      toast.error("Enregistrement impossible");
    }
  };

  const remove = async (id) => {
    try { await api.delete(`/rations/${id}`); load(); } catch { toast.error("Suppression impossible"); }
  };

  const proteinLabel = (key) =>
    DEFAULT_PROTEINS.find((p) => p.key === key)?.label || key;

  const current = items.find((i) => i.is_current);
  const history = items.filter((i) => !i.is_current);

  return (
    <div className="space-y-6" data-testid="rations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Rations</h1>
          <p className="text-sm text-[#5C6B60]">Alimentation actuelle et historique</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setCustomProtein(""); } }}>
          <DialogTrigger asChild>
            <Button data-testid="add-ration-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouvelle ration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle ration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.food_type} onValueChange={(v) => setForm({ ...form, food_type: v })}>
                  <SelectTrigger data-testid="ration-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ration ménagère">Ration ménagère</SelectItem>
                    <SelectItem value="croquettes">Croquettes</SelectItem>
                    <SelectItem value="pâtée">Pâtée</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isMenagere ? (
                <div>
                  <Label className="block mb-2">Protéines</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PROTEINS.map((p) => {
                      const on = form.proteins.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          data-testid={`protein-${p.key}`}
                          onClick={() => toggleProtein(p.key)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                            on
                              ? "bg-[#4A7C59] text-white border-[#4A7C59]"
                              : "bg-white text-[#5C6B60] border-[#E9E3D3] hover:bg-[#F2EFE9]"
                          }`}
                        >
                          <span className="mr-1">{p.emoji}</span>{p.label}
                        </button>
                      );
                    })}
                    {form.proteins
                      .filter((k) => !DEFAULT_PROTEINS.some((p) => p.key === k))
                      .map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleProtein(k)}
                          className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#4A7C59] text-white border border-[#4A7C59] flex items-center gap-1"
                        >
                          {k}<X size={12} />
                        </button>
                      ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      data-testid="custom-protein-input"
                      placeholder="Autre protéine…"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomProtein(); } }}
                    />
                    <Button type="button" data-testid="add-custom-protein-btn" variant="outline" onClick={addCustomProtein} className="rounded-full border-[#E9E3D3]">
                      Ajouter
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Marque</Label>
                  <Input data-testid="ration-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Royal Canin…" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Grammes / jour</Label>
                  <Input data-testid="ration-grams" type="number" value={form.daily_grams} onChange={(e) => setForm({ ...form, daily_grams: e.target.value })} />
                </div>
                <div>
                  <Label>Repas / jour</Label>
                  <Input data-testid="ration-meals" type="number" value={form.meals_per_day} onChange={(e) => setForm({ ...form, meals_per_day: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes (recette, proportions…)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button data-testid="save-ration-btn" onClick={submit} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {current && (
        <Card data-testid="current-ration" className="p-6 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-white to-[#D0E5D8]/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4A7C59] text-white flex items-center justify-center">
              <UtensilsCrossed size={20} />
            </div>
            <Badge className="bg-[#4A7C59] hover:bg-[#4A7C59]">Actuelle</Badge>
          </div>
          <div className="text-2xl font-extrabold" style={{ fontFamily: "Manrope" }}>{current.brand}</div>
          <div className="text-sm text-[#5C6B60] mt-1">{current.food_type}</div>

          {current.proteins?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.proteins.map((k) => {
                const p = DEFAULT_PROTEINS.find((x) => x.key === k);
                return (
                  <Badge key={k} variant="outline" className="border-[#E9E3D3] bg-white text-[#2C3D30] font-medium">
                    {p ? <span className="mr-1">{p.emoji}</span> : null}{proteinLabel(k)}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Quotidien</div>
              <div className="text-xl font-bold">{current.daily_grams} g</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Repas</div>
              <div className="text-xl font-bold">{current.meals_per_day}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Par repas</div>
              <div className="text-xl font-bold">{Math.round(current.daily_grams / current.meals_per_day)} g</div>
            </div>
          </div>
          {current.notes && <p className="text-sm text-[#5C6B60] mt-4 whitespace-pre-wrap">{current.notes}</p>}
        </Card>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "Manrope" }}>Historique</h2>
          <div className="space-y-2">
            {history.map((r) => (
              <Card key={r.id} className="p-4 rounded-2xl border border-[#E9E3D3] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.brand} · <span className="text-[#5C6B60] font-normal">{r.food_type}</span></div>
                  {r.proteins?.length > 0 && (
                    <div className="text-xs text-[#5C6B60] mt-0.5 truncate">
                      {r.proteins.map(proteinLabel).join(" · ")}
                    </div>
                  )}
                  <div className="text-xs text-[#8A9A8E]">{r.daily_grams}g/j — {new Date(r.started_on).toLocaleDateString("fr-FR")}</div>
                </div>
                <Button data-testid={`delete-ration-${r.id}`} variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 size={16} className="text-[#B75D5D]" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16 text-[#8A9A8E]">
          <UtensilsCrossed size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucune ration enregistrée pour {activePet?.name}.</p>
        </div>
      )}
    </div>
  );
}
