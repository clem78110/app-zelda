import { useEffect, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Trash2, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const ShareDialog = () => {
  const { activePet } = useAnimal();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    if (!activePet) return;
    const { data } = await api.get("/shares", { params: { pet_id: activePet.id } });
    setShares(data);
  };
  useEffect(() => { if (open) load(); }, [open, activePet?.id]);

  const create = async () => {
    const expires_in_days = expiry === "never" ? null : Number(expiry);
    await api.post("/shares", { pet_id: activePet.id, label, expires_in_days });
    toast.success("Lien créé");
    setLabel("");
    load();
  };

  const remove = async (id) => {
    await api.delete(`/shares/${id}`);
    toast.success("Lien révoqué");
    load();
  };

  const buildUrl = (token) => `${window.location.origin}/share/${token}`;

  const copy = async (s) => {
    try {
      await navigator.clipboard.writeText(buildUrl(s.token));
      setCopiedId(s.id);
      toast.success("Lien copié");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copie impossible");
    }
  };

  const expired = (s) => s.expires_at && new Date(s.expires_at) < new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="open-share-btn" variant="outline" className="rounded-full border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59]/10">
          <Share2 size={16} className="mr-1.5" /> Partager le dossier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Partager le dossier de {activePet?.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-[#5C6B60]">Génère un lien public, en lecture seule, à transmettre à votre vétérinaire.</p>

        <Card className="p-4 rounded-2xl border border-[#E9E3D3] space-y-3">
          <div>
            <Label>Étiquette (facultatif)</Label>
            <Input data-testid="share-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Dr. Martin - consultation du 12 mars" />
          </div>
          <div>
            <Label>Expiration</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger data-testid="share-expiry"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 jour</SelectItem>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
                <SelectItem value="never">Sans expiration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button data-testid="create-share-btn" onClick={create} className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347]">
            <LinkIcon size={16} className="mr-1.5" /> Générer un lien
          </Button>
        </Card>

        {shares.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A8E] font-bold">Liens actifs</div>
            {shares.map((s) => (
              <Card key={s.id} data-testid={`share-item-${s.id}`} className={`p-3 rounded-2xl border border-[#E9E3D3] ${expired(s) ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{s.label || "Sans titre"}</div>
                      {expired(s) && <Badge variant="outline" className="text-[10px] border-[#B75D5D] text-[#B75D5D]">expiré</Badge>}
                    </div>
                    <div className="text-[11px] text-[#8A9A8E] truncate font-mono">{buildUrl(s.token)}</div>
                    <div className="text-[10px] text-[#8A9A8E] mt-0.5">
                      {s.expires_at ? `Expire le ${new Date(s.expires_at).toLocaleDateString("fr-FR")}` : "Sans expiration"}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button data-testid={`copy-share-${s.id}`} variant="ghost" size="icon" onClick={() => copy(s)} disabled={expired(s)}>
                      {copiedId === s.id ? <Check size={16} className="text-[#4A7C59]" /> : <Copy size={16} className="text-[#5C6B60]" />}
                    </Button>
                    <Button data-testid={`revoke-share-${s.id}`} variant="ghost" size="icon" onClick={() => remove(s.id)}>
                      <Trash2 size={16} className="text-[#B75D5D]" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
