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
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export default function Rations() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    brand: "", food_type: "croquettes", daily_grams: 200, meals_per_day: 2, notes: "",
  });

  const load = async () => {
    if (!activePet) return;
    const { data } = await api.get("/rations", { params: { pet_id: activePet.id } });
    setItems(data);
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const submit = async () => {
    if (!form.brand) return toast.error("Marque requise");
    await api.post("/rations", { ...form, pet_id: activePet.id, daily_grams: Number(form.daily_grams), meals_per_day: Number(form.meals_per_day) });
    toast.success("Ration enregistrée");
    setOpen(false);
    setForm({ brand: "", food_type: "croquettes", daily_grams: 200, meals_per_day: 2, notes: "" });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/rations/${id}`);
    load();
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-ration-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouvelle ration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvelle ration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Marque</Label>
                <Input data-testid="ration-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Royal Canin..." />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.food_type} onValueChange={(v) => setForm({ ...form, food_type: v })}>
                  <SelectTrigger data-testid="ration-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="croquettes">Croquettes</SelectItem>
                    <SelectItem value="pâtée">Pâtée</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                    <SelectItem value="ration ménagère">Ration ménagère</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
          {current.notes && <p className="text-sm text-[#5C6B60] mt-4">{current.notes}</p>}
        </Card>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "Manrope" }}>Historique</h2>
          <div className="space-y-2">
            {history.map((r) => (
              <Card key={r.id} className="p-4 rounded-2xl border border-[#E9E3D3] flex items-center justify-between">
                <div>
                  <div className="font-semibold">{r.brand} · <span className="text-[#5C6B60] font-normal">{r.food_type}</span></div>
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
