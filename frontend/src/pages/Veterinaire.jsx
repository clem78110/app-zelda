import { useEffect, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api, fileToBase64 } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarDays, FileImage, Sparkles, Upload, Check, Clock } from "lucide-react";
import { toast } from "sonner";

const CAT_APPT = ["consultation", "vaccin", "traitement", "chirurgie", "contrôle", "vermifuge"];
const CAT_FILE = ["ordonnance", "vaccin", "facture", "radio", "analyse", "autre"];

export default function Veterinaire() {
  const { activePet } = useAnimal();
  const [appts, setAppts] = useState([]);
  const [files, setFiles] = useState([]);

  const load = async () => {
    if (!activePet) return;
    const [a, f] = await Promise.all([
      api.get("/appointments", { params: { pet_id: activePet.id } }),
      api.get("/files", { params: { pet_id: activePet.id } }),
    ]);
    setAppts(a.data);
    setFiles(f.data);
  };
  useEffect(() => { load(); }, [activePet?.id]);

  return (
    <div className="space-y-6" data-testid="vet-page">
      <div>
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "Manrope" }}>Vétérinaire</h1>
        <p className="text-sm text-[#5C6B60]">Rendez-vous, fichiers et analyse IA</p>
      </div>

      <Tabs defaultValue="appts">
        <TabsList className="rounded-full bg-[#F2EFE9] p-1">
          <TabsTrigger data-testid="tab-appts" value="appts" className="rounded-full data-[state=active]:bg-white">
            <CalendarDays size={16} className="mr-1.5" /> Rendez-vous
          </TabsTrigger>
          <TabsTrigger data-testid="tab-files" value="files" className="rounded-full data-[state=active]:bg-white">
            <FileImage size={16} className="mr-1.5" /> Fichiers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appts" className="mt-5">
          <Appointments appts={appts} reload={load} petId={activePet?.id} />
        </TabsContent>
        <TabsContent value="files" className="mt-5">
          <Files files={files} reload={load} petId={activePet?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Appointments = ({ appts, reload, petId }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", date: new Date().toISOString().slice(0, 10), category: "consultation", vet_name: "", notes: "", done: false,
  });

  const submit = async () => {
    if (!form.title || !form.date) return toast.error("Titre et date requis");
    await api.post("/appointments", { ...form, pet_id: petId });
    toast.success("Rendez-vous ajouté");
    setOpen(false);
    setForm({ title: "", date: new Date().toISOString().slice(0, 10), category: "consultation", vet_name: "", notes: "", done: false });
    reload();
  };

  const toggleDone = async (a) => {
    await api.patch(`/appointments/${a.id}`, {
      pet_id: a.pet_id, title: a.title, date: a.date, category: a.category,
      vet_name: a.vet_name || "", notes: a.notes || "", done: !a.done,
    });
    reload();
  };

  const remove = async (id) => { await api.delete(`/appointments/${id}`); reload(); };

  const now = new Date();
  const upcoming = appts.filter((a) => new Date(a.date) >= now && !a.done).sort((x, y) => new Date(x.date) - new Date(y.date));
  const past = appts.filter((a) => new Date(a.date) < now || a.done).sort((x, y) => new Date(y.date) - new Date(x.date));

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-appt-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouveau rdv
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titre</Label>
                <Input data-testid="appt-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rappel vaccin annuel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input data-testid="appt-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="appt-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAT_APPT.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Vétérinaire</Label>
                <Input value={form.vet_name} onChange={(e) => setForm({ ...form, vet_name: e.target.value })} placeholder="Dr. ..." />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button data-testid="save-appt-btn" onClick={submit} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Section title="À venir" empty="Aucun rendez-vous à venir" icon={<Clock size={16} />}>
        {upcoming.map((a) => <ApptCard key={a.id} a={a} onToggle={toggleDone} onDelete={remove} />)}
      </Section>

      <Section title="Historique" empty="Aucun rendez-vous passé" icon={<Check size={16} />}>
        {past.map((a) => <ApptCard key={a.id} a={a} onToggle={toggleDone} onDelete={remove} past />)}
      </Section>
    </div>
  );
};

const Section = ({ title, empty, icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3 text-[#5C6B60] text-xs uppercase tracking-[0.2em] font-bold">
      {icon}{title}
    </div>
    {children && Array.isArray(children) && children.length > 0
      ? <div className="space-y-2">{children}</div>
      : <p className="text-sm text-[#8A9A8E] italic">{empty}</p>}
  </div>
);

const ApptCard = ({ a, onToggle, onDelete, past }) => (
  <Card data-testid={`appt-card-${a.id}`} className={`p-4 rounded-2xl border border-[#E9E3D3] flex items-center justify-between ${past ? "opacity-70" : ""}`}>
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-[#F2EFE9] flex flex-col items-center justify-center text-[#2C3D30] flex-shrink-0">
        <div className="text-[10px] uppercase font-bold">{new Date(a.date).toLocaleDateString("fr-FR", { month: "short" })}</div>
        <div className="text-lg font-extrabold leading-none">{new Date(a.date).getDate()}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-semibold truncate">{a.title}</div>
          <Badge variant="outline" className="text-[10px] border-[#E9E3D3]">{a.category}</Badge>
          {a.done && <Badge className="bg-[#4A7C59] text-[10px]">fait</Badge>}
        </div>
        {a.vet_name && <div className="text-xs text-[#8A9A8E]">{a.vet_name}</div>}
        {a.notes && <div className="text-xs text-[#5C6B60] mt-1 line-clamp-2">{a.notes}</div>}
      </div>
    </div>
    <div className="flex gap-1">
      <Button data-testid={`toggle-appt-${a.id}`} variant="ghost" size="icon" onClick={() => onToggle(a)}>
        <Check size={16} className={a.done ? "text-[#4A7C59]" : "text-[#8A9A8E]"} />
      </Button>
      <Button data-testid={`delete-appt-${a.id}`} variant="ghost" size="icon" onClick={() => onDelete(a.id)}>
        <Trash2 size={16} className="text-[#B75D5D]" />
      </Button>
    </div>
  </Card>
);

const Files = ({ files, reload, petId }) => {
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "ordonnance", notes: "" });
  const [fileData, setFileData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [viewing, setViewing] = useState(null);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) {
      toast.error("Format non supporté (JPG/PNG/WEBP/PDF)");
      return;
    }
    const b64 = await fileToBase64(f);
    setFileData({ mime: f.type, b64, name: f.name });
    if (!form.title) setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") }));
  };

  const saveFile = async () => {
    if (!fileData) return toast.error("Sélectionnez un fichier");
    if (!form.title) return toast.error("Titre requis");
    await api.post("/files", {
      pet_id: petId, title: form.title, category: form.category,
      mime_type: fileData.mime, file_base64: fileData.b64, notes: form.notes,
    });
    toast.success("Fichier enregistré");
    setOpen(false);
    setForm({ title: "", category: "ordonnance", notes: "" });
    setFileData(null);
    reload();
  };

  const analyze = async () => {
    if (!fileData) return toast.error("Choisissez d'abord une image");
    if (fileData.mime === "application/pdf") return toast.error("L'IA n'analyse que les images");
    setAnalyzing(true);
    setAiSummary("");
    try {
      const { data } = await api.post("/ai/analyze-document", {
        image_base64: fileData.b64, mime_type: fileData.mime,
      });
      setAiSummary(data.summary || "");
      toast.success("Analyse terminée");
    } catch (e) {
      toast.error("Erreur d'analyse IA");
    } finally {
      setAnalyzing(false);
    }
  };

  const openFile = async (id) => {
    const { data } = await api.get(`/files/${id}`);
    setViewing(data);
  };

  const remove = async (id) => { await api.delete(`/files/${id}`); reload(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Dialog open={scanOpen} onOpenChange={(v) => { setScanOpen(v); if (!v) { setFileData(null); setAiSummary(""); }}}>
          <DialogTrigger asChild>
            <Button data-testid="ai-scan-btn" variant="outline" className="rounded-full border-[#C87941] text-[#C87941] hover:bg-[#C87941]/10">
              <Sparkles size={16} className="mr-1" /> Analyser par IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Analyser un document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="block">
                <div className="border-2 border-dashed border-[#E9E3D3] rounded-2xl p-6 text-center cursor-pointer hover:bg-[#F2EFE9]">
                  <Upload size={28} className="mx-auto text-[#8A9A8E]" strokeWidth={1.5} />
                  <div className="mt-2 text-sm">{fileData ? fileData.name : "Choisir une photo"}</div>
                  <div className="text-xs text-[#8A9A8E]">JPG, PNG, WEBP</div>
                </div>
                <input data-testid="ai-file-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
              </Label>
              {fileData && fileData.mime.startsWith("image/") && (
                <img src={fileData.b64} alt="preview" className="w-full max-h-56 object-contain rounded-xl border border-[#E9E3D3]" />
              )}
              <Button data-testid="run-ai-btn" onClick={analyze} disabled={!fileData || analyzing} className="w-full rounded-full bg-[#C87941] hover:bg-[#A8632F]">
                {analyzing ? "Analyse en cours..." : (<><Sparkles size={16} className="mr-1" />Analyser</>)}
              </Button>
              {aiSummary && (
                <Card data-testid="ai-summary" className="p-4 rounded-2xl bg-[#F2EFE9] border border-[#E9E3D3] whitespace-pre-wrap text-sm">
                  {aiSummary}
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFileData(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-file-btn" className="rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
              <Plus size={16} className="mr-1" /> Nouveau fichier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau fichier vétérinaire</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="block">
                <div className="border-2 border-dashed border-[#E9E3D3] rounded-2xl p-6 text-center cursor-pointer hover:bg-[#F2EFE9]">
                  <Upload size={28} className="mx-auto text-[#8A9A8E]" strokeWidth={1.5} />
                  <div className="mt-2 text-sm">{fileData ? fileData.name : "Photo ou PDF"}</div>
                </div>
                <input data-testid="file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={onPick} />
              </Label>
              <div>
                <Label>Titre</Label>
                <Input data-testid="file-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="file-category"><SelectValue /></SelectTrigger>
                  <SelectContent>{CAT_FILE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button data-testid="save-file-btn" onClick={saveFile} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-16 text-[#8A9A8E]">
          <FileImage size={40} className="mx-auto mb-3" strokeWidth={1.5} />
          <p>Aucun fichier vétérinaire pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((f) => (
            <Card key={f.id} data-testid={`file-card-${f.id}`} className="p-4 rounded-2xl border border-[#E9E3D3] hover:-translate-y-1 transition-transform">
              <button onClick={() => openFile(f.id)} className="text-left w-full">
                <div className="w-full aspect-square rounded-xl bg-[#F2EFE9] flex items-center justify-center mb-3">
                  <FileImage size={28} className="text-[#8A9A8E]" strokeWidth={1.5} />
                </div>
                <Badge variant="outline" className="text-[10px] border-[#E9E3D3] mb-1">{f.category}</Badge>
                <div className="font-semibold text-sm line-clamp-2">{f.title}</div>
                <div className="text-[10px] text-[#8A9A8E] mt-1">{new Date(f.created_at).toLocaleDateString("fr-FR")}</div>
              </button>
              <Button data-testid={`delete-file-${f.id}`} variant="ghost" size="sm" onClick={() => remove(f.id)} className="mt-2 w-full text-[#B75D5D] hover:bg-[#B75D5D]/10">
                <Trash2 size={14} className="mr-1" /> Supprimer
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.title}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              {viewing.mime_type?.startsWith("image/") ? (
                <img src={viewing.file_base64} alt={viewing.title} className="w-full rounded-xl" />
              ) : (
                <a href={viewing.file_base64} download={viewing.title} className="block p-4 bg-[#F2EFE9] rounded-xl text-center text-sm">
                  Télécharger le PDF
                </a>
              )}
              {viewing.notes && <p className="text-sm text-[#5C6B60]">{viewing.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
