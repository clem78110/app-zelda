import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Pill, Pause, Play } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", brand: "", dose: "", frequency: "", notes: "", is_active: true };

export default function Supplements({ petId }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!petId) return;
    try {
      const { data } = await api.get("/supplements", { params: { pet_id: petId } });
      setItems(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, [petId]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nom du complément requis");
    const payload = { ...form, pet_id: petId };
    try {
      if (editingId) {
        await api.patch(`/supplements/${editingId}`, payload);
        toast.success("Complément mis à jour");
      } else {
        await api.post("/supplements", payload);
        toast.success("Complément ajouté");
      }
      reset(false);
      load();
    } catch {
      toast.error("Enregistrement impossible");
    }
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name || "", brand: s.brand || "", dose: s.dose || "",
      frequency: s.frequency || "", notes: s.notes || "", is_active: s.is_active,
    });
    setOpen(true);
  };

  const reset = (keepOpen) => {
    setOpen(keepOpen);
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleActive = async (s) => {
    try {
      await api.patch(`/supplements/${s.id}`, {
        pet_id: s.pet_id, name: s.name, brand: s.brand || "", dose: s.dose || "",
        frequency: s.frequency || "", notes: s.notes || "", is_active: !s.is_active,
      });
      load();
    } catch { toast.error("Action impossible"); }
  };

  const remove = async (id) => {
    try { await api.delete(`/supplements/${id}`); load(); } catch { toast.error("Suppression impossible"); }
  };

  const active = items.filter((s) => s.is_active);
  const inactive = items.filter((s) => !s.is_active);

  return (
    <div className="space-y-4" data-testid="supplements-section">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
          <Pill size={18} className="text-[#C87941]" /> Compléments alimentaires
        </h2>
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset(false))}>
          <DialogTrigger asChild>
            <Button data-testid="add-supplement-btn" className="rounded-full bg-[#C87941] hover:bg-[#A8632F]">
              <Plus size={16} className="mr-1" /> Nouveau complément
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Modifier le complément" : "Nouveau complément"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nom</Label>
                <Input data-testid="sup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Huile de saumon, glucosamine…" />
              </div>
              <div>
                <Label>Marque (optionnel)</Label>
                <Input data-testid="sup-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Vetoquinol, Anibio…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dose</Label>
                  <Input data-testid="sup-dose" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="5 ml, 1 gélule…" />
                </div>
                <div>
                  <Label>Fréquence</Label>
                  <Input data-testid="sup-frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="1× / jour, matin & soir…" />
                </div>
              </div>
              <div>
                <Label>Notes (cure, raison…)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button data-testid="save-supplement-btn" onClick={submit} className="w-full rounded-full bg-[#C87941] hover:bg-[#A8632F]">
                {editingId ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {active.length === 0 && inactive.length === 0 && (
        <div className="text-center py-10 text-[#8A9A8E]">
          <Pill size={32} className="mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm">Aucun complément alimentaire.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((s) => (
            <Card key={s.id} data-testid={`sup-card-${s.id}`} className="p-4 rounded-2xl border border-[#E9E3D3] bg-gradient-to-br from-white to-[#F2EFE9]/40">
              <div className="flex items-start justify-between gap-2">
                <button className="text-left flex-1 min-w-0" onClick={() => openEdit(s)} data-testid={`edit-sup-${s.id}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold truncate" style={{ fontFamily: "Manrope" }}>{s.name}</div>
                    <Badge className="bg-[#C87941] hover:bg-[#C87941] text-[10px]">en cours</Badge>
                  </div>
                  {s.brand && <div className="text-xs text-[#8A9A8E]">{s.brand}</div>}
                  <div className="text-sm text-[#5C6B60] mt-1 flex flex-wrap gap-x-3">
                    {s.dose && <span><span className="font-semibold">{s.dose}</span></span>}
                    {s.frequency && <span>{s.frequency}</span>}
                  </div>
                  {s.notes && <p className="text-xs text-[#5C6B60] mt-2 whitespace-pre-wrap">{s.notes}</p>}
                </button>
                <div className="flex flex-col gap-1">
                  <Button data-testid={`pencil-sup-${s.id}`} variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8">
                    <Pencil size={14} className="text-[#5C6B60]" />
                  </Button>
                  <Button data-testid={`pause-sup-${s.id}`} variant="ghost" size="icon" onClick={() => toggleActive(s)} className="h-8 w-8" title="Mettre en pause">
                    <Pause size={14} className="text-[#5C6B60]" />
                  </Button>
                  <Button data-testid={`delete-sup-${s.id}`} variant="ghost" size="icon" onClick={() => remove(s.id)} className="h-8 w-8">
                    <Trash2 size={14} className="text-[#B75D5D]" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold mb-2 mt-4">Anciens / en pause</div>
          <div className="space-y-2">
            {inactive.map((s) => (
              <Card key={s.id} className="p-3 rounded-2xl border border-[#E9E3D3] opacity-70 flex items-center justify-between">
                <button className="text-left min-w-0 flex-1" onClick={() => openEdit(s)}>
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-[#8A9A8E]">{[s.dose, s.frequency].filter(Boolean).join(" · ")}</div>
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(s)} title="Réactiver" className="h-8 w-8">
                    <Play size={14} className="text-[#4A7C59]" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="h-8 w-8">
                    <Trash2 size={14} className="text-[#B75D5D]" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
