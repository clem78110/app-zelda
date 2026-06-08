import { useAnimal } from "@/context/AnimalContext";
import { motion } from "framer-motion";

export const AnimalSelector = () => {
  const { pets, activeId, setActive } = useAnimal();

  return (
    <div
      data-testid="animal-selector"
      className="flex items-center gap-1 p-1 rounded-full bg-white/70 backdrop-blur-xl border border-[#E9E3D3] shadow-sm"
    >
      {pets.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            data-testid={`animal-tab-${p.name.toLowerCase()}`}
            onClick={() => setActive(p.id)}
            className={`relative px-3 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
              active ? "text-white" : "text-[#5C6B60] hover:text-[#2C3D30]"
            }`}
          >
            {active && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: p.color || "#4A7C59" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <img
              src={p.avatar_url}
              alt={p.name}
              className="relative z-10 w-7 h-7 rounded-full object-cover border-2 border-white"
            />
            <span className="relative z-10">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
};
