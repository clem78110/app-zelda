import { useRef, useState } from "react";
import { useAnimal } from "@/context/AnimalContext";
import { fileToBase64 } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_AVATARS = {
  dog: "https://images.unsplash.com/photo-1524511751214-b0a384dd9afe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMG91dGRvb3JzJTIwbmF0dXJlfGVufDB8fHx8MTc4MDkwNDE0NHww&ixlib=rb-4.1.0&q=85",
  cat: "https://images.unsplash.com/photo-1572897263855-ea51655f9f0b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwd2luZG93JTIwc3VubGlnaHR8ZW58MHx8fHwxNzgwOTA0MTU2fDA&ixlib=rb-4.1.0&q=85",
};

// Resize an image client-side to keep base64 small
const resizeImage = (file, maxSize = 800) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AvatarEditor = ({ open, onOpenChange }) => {
  const { activePet, updatePet } = useAnimal();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  if (!activePet) return null;

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Format non supporté (JPG, PNG, WEBP)");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await resizeImage(f, 800);
      await updatePet(activePet.id, { avatar_url: dataUrl });
      toast.success("Photo mise à jour");
      onOpenChange(false);
    } catch (err) {
      toast.error("Impossible d'enregistrer la photo");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resetToDefault = async () => {
    setSaving(true);
    try {
      await updatePet(activePet.id, { avatar_url: DEFAULT_AVATARS[activePet.species] });
      toast.success("Photo par défaut restaurée");
      onOpenChange(false);
    } catch {
      toast.error("Action impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Photo de {activePet.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={activePet.avatar_url}
              alt={activePet.name}
              className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md"
            />
          </div>

          <div className="space-y-2">
            <input
              ref={fileRef}
              data-testid="avatar-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              capture="environment"
              onChange={onPick}
            />
            <Button
              data-testid="avatar-camera-btn"
              onClick={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}
              disabled={saving}
              className="w-full rounded-full bg-[#4A7C59] hover:bg-[#3B6347] h-11"
            >
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Camera size={16} className="mr-2" />}
              Prendre une photo
            </Button>
            <Button
              data-testid="avatar-upload-btn"
              onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}
              disabled={saving}
              variant="outline"
              className="w-full rounded-full border-[#E9E3D3] h-11"
            >
              <Upload size={16} className="mr-2" /> Choisir depuis la galerie
            </Button>
            <Button
              data-testid="avatar-reset-btn"
              onClick={resetToDefault}
              disabled={saving}
              variant="ghost"
              className="w-full rounded-full h-10 text-[#5C6B60] text-xs"
            >
              <RotateCcw size={14} className="mr-1.5" /> Restaurer la photo par défaut
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
