import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { API } from "@/lib/api";
import { toast } from "sonner";

export const ExportButton = () => {
  const download = async () => {
    try {
      const res = await fetch(`${API}/export`);
      if (!res.ok) throw new Error("err");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `compagnons-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch (e) {
      toast.error("Export impossible");
    }
  };

  return (
    <Button
      data-testid="export-btn"
      onClick={download}
      variant="ghost"
      size="icon"
      title="Sauvegarder mes données"
      className="rounded-full h-9 w-9 text-[#5C6B60] hover:bg-[#F2EFE9] hover:text-[#2C3D30]"
    >
      <Download size={18} strokeWidth={1.8} />
    </Button>
  );
};
