import { useEffect, useMemo, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, BookHeart, List, CalendarRange } from "lucide-react";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const MOODS = [
  { key: "super", label: "Super", color: "#4A7C59", emoji: "🌿" },
  { key: "ok", label: "OK", color: "#6B8E9B", emoji: "🌤" },
  { key: "inquiet", label: "Inquiet", color: "#C87941", emoji: "🍂" },
  { key: "malade", label: "Malade", color: "#B75D5D", emoji: "🌧" },
];

const findMood = (k) => MOODS.find((m) => m.key === k) || MOODS[1];

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function Journal() {
  const { activePet } = useAnimal();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [form, setForm] = useState({ title: "", body: "", mood: "ok", date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    if (!activePet) return;
    try {
      const { data } = await api.get("/journal", { params: { pet_id: activePet.id } });
      setItems(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, [activePet?.id]);

  const submit = async () => {
    if (!form.title) return toast.error("Titre requis");
    try {
      await api.post("/journal", { ...form, pet_id: activePet.id, date: new Date(form.date).toISOString() });
      toast.success("Note ajoutée");
      setOpen(false);
      setForm({ title: "", body: "", mood: "ok", date: new Date().toISOString().slice(0, 10) });
      load();
    } catch {
      toast.error("Enregistrement impossible");
    }
  };

  const remove = async (id) => { try { await api.delete(`/journal/${id}`); load(); } catch { toast.error("Suppression impossible"); } };

  const openNewFor = (d) => {
    setForm((p) => ({ ...p, date: d.toISOString().slice(0, 10), title: "", body: "", mood: "ok" }));
    setOpen(true);
  };

  // Calendar data: for each mood, days that have at least one entry of that mood
  const daysByMood = useMemo(() => {
    const m = { super: [], ok: [], inquiet: [], malade: [] };
    for (const j of items) {
      const d = new Date(j.date);
      const k = j.mood && m[j.mood] ? j.mood : "ok";
      // avoid duplicates same day same mood
      if (!m[k].some((x) => sameDay(x, d))) m[k].push(d);
    }
    return m;
  }, [items]);

  const selectedEntries = useMemo(
    () => items
      .filter((j) => sameDay(new Date(j.date), selectedDate))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [items, selectedDate]
  );

  return (
    <div className="space-y-6" data-testid="journal-page">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Journal</h1>
          <p className="text-sm text-[#5C6B60]">Observations & comportement</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-full bg-[#F2EFE9] border border-[#E9E3D3]">
            <button
              data-testid="journal-view-calendar"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${view === "calendar" ? "bg-white text-[#2C3D30] shadow-sm" : "text-[#5C6B60]"}`}
            >
              <CalendarRange size={14} /> Calendrier
            </button>
            <button
              data-testid="journal-view-list"
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${view === "list" ? "bg-white text-[#2C3D30] shadow-sm" : "text-[#5C6B60]"}`}
            >
              <List size={14} /> Liste
            </button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-journal-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
                <Plus size={16} className="mr-1" /> Nouvelle note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouvelle observation</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Titre</Label>
                  <Input data-testid="journal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Très en forme aujourd'hui…" />
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
                          form.mood === m.key ? "border-[#4A7C59] bg-[#D0E5D8]/40" : "border-[#E9E3D3] hover:bg-[#F2EFE9]"
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
      </div>

      {view === "calendar" ? (
        <div className="space-y-4" data-testid="journal-calendar-view">
          <Card className="p-2 sm:p-4 rounded-3xl border border-[#E9E3D3] bg-white">
            <Calendar
              mode="single"
              locale={fr}
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{
                moodSuper: daysByMood.super,
                moodOk: daysByMood.ok,
                moodInquiet: daysByMood.inquiet,
                moodMalade: daysByMood.malade,
              }}
              modifiersClassNames={{
                moodSuper: "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#4A7C59]",
                moodOk: "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#6B8E9B]",
                moodInquiet: "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#C87941]",
                moodMalade: "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#B75D5D]",
              }}
              numberOfMonths={1}
              showOutsideDays
              className="mx-auto"
              classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "w-full space-y-3",
                table: "w-full border-collapse",
                day_selected: "bg-[#4A7C59] text-white hover:bg-[#3B6347] hover:text-white focus:bg-[#4A7C59] focus:text-white",
                day_today: "bg-[#E9E3D3] text-[#2C3D30] font-bold",
                head_cell: "text-[#8A9A8E] rounded-md w-10 sm:w-12 font-semibold text-[0.72rem] uppercase tracking-wider",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-full",
                day: "h-10 w-10 sm:h-12 sm:w-12 p-0 font-normal rounded-full aria-selected:opacity-100 hover:bg-[#F2EFE9]",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-base font-bold capitalize",
                nav: "space-x-1 flex items-center",
                nav_button: "h-8 w-8 rounded-full hover:bg-[#F2EFE9] flex items-center justify-center text-[#5C6B60]",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
              }}
            />
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#E9E3D3] flex-wrap text-[10px] uppercase tracking-[0.18em] font-bold text-[#8A9A8E]">
              {MOODS.map((m) => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />{m.label}
                </div>
              ))}
            </div>
          </Card>

          <div data-testid="day-journal">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[#2C3D30] font-bold capitalize" style={{ fontFamily: "Manrope" }}>
                {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <Button variant="ghost" size="sm" data-testid="add-journal-day-btn" onClick={() => openNewFor(selectedDate)} className="text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded-full text-xs">
                <Plus size={14} className="mr-1" /> Ajouter
              </Button>
            </div>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-[#8A9A8E] italic text-center py-6">Aucune note ce jour-là.</p>
            ) : (
              <div className="space-y-3">
                {selectedEntries.map((j) => <JournalCard key={j.id} j={j} onDelete={remove} />)}
              </div>
            )}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[#8A9A8E]">
          <BookHeart size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucune note pour {activePet?.name}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((j) => <JournalCard key={j.id} j={j} onDelete={remove} />)}
        </div>
      )}
    </div>
  );
}

const JournalCard = ({ j, onDelete }) => {
  const m = findMood(j.mood);
  return (
    <Card data-testid={`journal-card-${j.id}`} className="p-5 rounded-2xl border border-[#E9E3D3]">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: m.color + "20" }}>
          {m.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold truncate" style={{ fontFamily: "Manrope" }}>{j.title}</div>
              <div className="text-xs text-[#8A9A8E]">{new Date(j.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</div>
            </div>
            <Button data-testid={`delete-journal-${j.id}`} variant="ghost" size="icon" onClick={() => onDelete(j.id)}>
              <Trash2 size={16} className="text-[#B75D5D]" />
            </Button>
          </div>
          {j.body && <p className="text-sm text-[#5C6B60] mt-2 whitespace-pre-wrap">{j.body}</p>}
        </div>
      </div>
    </Card>
  );
};
