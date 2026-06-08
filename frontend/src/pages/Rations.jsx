import { useEffect, useMemo, useState } from "react";
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
import { Plus, Trash2, UtensilsCrossed, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import Supplements from "@/components/Supplements";

const DEFAULT_PROTEINS = [
  { key: "Dinde", emoji: "🦃" },
  { key: "Poulet", emoji: "🍗" },
  { key: "Cœur de dinde", emoji: "❤️" },
  { key: "Maquereau", emoji: "🐟" },
  { key: "Sardine", emoji: "🐟" },
  { key: "Éperlans", emoji: "🐟" },
  { key: "Moules", emoji: "🦪" },
];

const findMeta = (name) => DEFAULT_PROTEINS.find((p) => p.key === name);

const emptyForm = {
  brand: "", food_type: "ration ménagère", daily_grams: 0, meals_per_day: 2,
  proteins: [], notes: "",
};

export default function Rations() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [customProtein, setCustomProtein] = useState("");

  const isMenagere = form.food_type === "ration ménagère";

  const proteinSum = useMemo(
    () => form.proteins.reduce((s, p) => s + (Number(p.grams) || 0), 0),
    [form.proteins]
  );

  const load = async () => {
    if (!activePet) return;
    try {
      const { data } = await api.get("/rations", { params: { pet_id: activePet.id } });
      setItems(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const toggleProtein = (name) => {
    setForm((p) => {
      const has = p.proteins.find((x) => x.name === name);
      const proteins = has
        ? p.proteins.filter((x) => x.name !== name)
        : [...p.proteins, { name, grams: 0 }];
      return { ...p, proteins };
    });
  };

  const setProteinGrams = (name, grams) => {
    setForm((p) => ({
      ...p,
      proteins: p.proteins.map((x) => (x.name === name ? { ...x, grams } : x)),
    }));
  };

  const addCustomProtein = () => {
    const v = customProtein.trim();
    if (!v) return;
    if (form.proteins.some((x) => x.name.toLowerCase() === v.toLowerCase())) { setCustomProtein(""); return; }
    setForm((p) => ({ ...p, proteins: [...p.proteins, { name: v, grams: 0 }] }));
    setCustomProtein("");
  };

  const submit = async () => {
    if (!isMenagere && !form.brand) return toast.error("Marque requise");
    if (isMenagere && form.proteins.length === 0) return toast.error("Sélectionnez au moins une protéine");

    const proteinsClean = form.proteins.map((p) => ({ name: p.name, grams: Number(p.grams) || 0 }));
    const daily = isMenagere
      ? proteinsClean.reduce((s, p) => s + p.grams, 0)
      : Number(form.daily_grams);

    if (daily <= 0) return toast.error("Indiquez une quantité quotidienne");

    const payload = {
      ...form,
      brand: form.brand || (isMenagere ? "Ration maison" : ""),
      pet_id: activePet.id,
      daily_grams: daily,
      meals_per_day: Number(form.meals_per_day),
      proteins: proteinsClean,
    };

    try {
      if (editingId) {
        await api.patch(`/rations/${editingId}`, payload);
        toast.success("Ration mise à jour");
      } else {
        await api.post("/rations", payload);
        toast.success("Ration enregistrée");
      }
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setCustomProtein("");
      load();
    } catch (e) {
      toast.error("Enregistrement impossible");
    }
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      brand: r.brand || "",
      food_type: r.food_type || "ration ménagère",
      daily_grams: r.daily_grams || 0,
      meals_per_day: r.meals_per_day || 2,
      proteins: (r.proteins || []).map((p) => ({ name: p.name, grams: p.grams })),
      notes: r.notes || "",
    });
    setOpen(true);
  };

  const resetDialog = (v) => {
    setOpen(v);
    if (!v) {
      setEditingId(null);
      setForm(emptyForm);
      setCustomProtein("");
    }
  };

  const remove = async (id) => {
    try { await api.delete(`/rations/${id}`); load(); } catch { toast.error("Suppression impossible"); }
  };

  const current = items.find((i) => i.is_current);
  const history = items.filter((i) => !i.is_current);

  return (
    <div className="space-y-6" data-testid="rations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Rations</h1>
          <p className="text-sm text-[#5C6B60]">Alimentation actuelle et historique</p>
        </div>
        <Dialog open={open} onOpenChange={resetDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-ration-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouvelle ration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Modifier la ration" : "Nouvelle ration"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.food_type} onValueChange={(v) => setForm({ ...form, food_type: v })}>
                  <SelectTrigger data-testid="ration-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ration ménagère">Ration ménagère</SelectItem>
                    <SelectItem value="pâtée">Pâtée</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isMenagere ? (
                <>
                  <div>
                    <Label className="block mb-2">Choisir les protéines</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_PROTEINS.map((p) => {
                        const on = form.proteins.some((x) => x.name === p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            data-testid={`protein-${p.key.toLowerCase().replace(/\s|œ/g, "_")}`}
                            onClick={() => toggleProtein(p.key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                              on
                                ? "bg-[#4A7C59] text-white border-[#4A7C59]"
                                : "bg-white text-[#5C6B60] border-[#E9E3D3] hover:bg-[#F2EFE9]"
                            }`}
                          >
                            <span className="mr-1">{p.emoji}</span>{p.key}
                          </button>
                        );
                      })}
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

                  {form.proteins.length > 0 && (
                    <div className="space-y-2 p-3 rounded-2xl bg-[#F2EFE9]/60 border border-[#E9E3D3]">
                      <Label className="block">Quantité par protéine (g / jour)</Label>
                      {form.proteins.map((p) => {
                        const meta = findMeta(p.name);
                        return (
                          <div key={p.name} className="flex items-center gap-2">
                            <div className="flex-1 text-sm font-medium flex items-center gap-1.5 min-w-0">
                              {meta && <span>{meta.emoji}</span>}
                              <span className="truncate">{p.name}</span>
                            </div>
                            <div className="relative">
                              <Input
                                data-testid={`grams-${p.name.toLowerCase().replace(/\s|œ/g, "_")}`}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="5"
                                value={p.grams}
                                onChange={(e) => setProteinGrams(p.name, e.target.value)}
                                className="w-24 pr-8 text-right"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A9A8E]">g</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleProtein(p.name)}
                            >
                              <X size={14} className="text-[#8A9A8E]" />
                            </Button>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E9E3D3]">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#8A9A8E] font-bold">Total / jour</div>
                        <div className="text-lg font-extrabold" style={{ fontFamily: "Manrope" }}>{proteinSum} g</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Label>Marque</Label>
                    <Input data-testid="ration-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Royal Canin…" />
                  </div>
                  <div>
                    <Label>Grammes / jour</Label>
                    <Input data-testid="ration-grams" type="number" value={form.daily_grams} onChange={(e) => setForm({ ...form, daily_grams: e.target.value })} />
                  </div>
                </>
              )}

              <div>
                <Label>Repas / jour</Label>
                <Input data-testid="ration-meals" type="number" value={form.meals_per_day} onChange={(e) => setForm({ ...form, meals_per_day: e.target.value })} />
              </div>
              <div>
                <Label>Notes (recette, supplémentation…)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button data-testid="save-ration-btn" onClick={submit} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">{editingId ? "Mettre à jour" : "Enregistrer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {current && (
        <Card
          data-testid="current-ration"
          onClick={() => openEdit(current)}
          className="p-6 rounded-3xl border border-[#E9E3D3] bg-gradient-to-br from-white to-[#D0E5D8]/40 cursor-pointer hover:-translate-y-0.5 transition-transform"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#4A7C59] text-white flex items-center justify-center">
                <UtensilsCrossed size={20} />
              </div>
              <Badge className="bg-[#4A7C59] hover:bg-[#4A7C59]">Actuelle</Badge>
            </div>
            <Button
              data-testid="edit-current-ration"
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); openEdit(current); }}
              className="text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded-full text-xs"
            >
              <Pencil size={14} className="mr-1" /> Modifier
            </Button>
          </div>
          <div className="text-2xl font-extrabold" style={{ fontFamily: "Manrope" }}>{current.brand}</div>
          <div className="text-sm text-[#5C6B60] mt-1">{current.food_type}</div>

          {current.proteins?.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {current.proteins.map((p) => {
                const meta = findMeta(p.name);
                return (
                  <div key={p.name} className="flex items-center justify-between text-sm py-1 border-b border-[#E9E3D3]/50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      {meta && <span>{meta.emoji}</span>}
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="font-bold text-[#2C3D30]">{p.grams} g</div>
                  </div>
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
              <Card key={r.id} className="p-4 rounded-2xl border border-[#E9E3D3] flex items-center justify-between gap-3 hover:bg-[#F2EFE9]/40 transition">
                <button onClick={() => openEdit(r)} className="text-left flex-1 min-w-0" data-testid={`edit-ration-${r.id}`}>
                  <div className="font-semibold truncate">{r.brand} · <span className="text-[#5C6B60] font-normal">{r.food_type}</span></div>
                  {r.proteins?.length > 0 && (
                    <div className="text-xs text-[#5C6B60] mt-0.5 truncate">
                      {r.proteins.map((p) => `${p.name} ${p.grams}g`).join(" · ")}
                    </div>
                  )}
                  <div className="text-xs text-[#8A9A8E]">{r.daily_grams}g/j — {new Date(r.started_on).toLocaleDateString("fr-FR")}</div>
                </button>
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

      <div className="pt-4 border-t border-[#E9E3D3]">
        <Supplements petId={activePet?.id} />
      </div>
    </div>
  );
}
