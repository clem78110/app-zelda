import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AnimalContext = createContext(null);

export const AnimalProvider = ({ children }) => {
  const [pets, setPets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/pets");
        setPets(data);
        const stored = localStorage.getItem("activePetId");
        const valid = data.find((p) => p.id === stored);
        setActiveId(valid ? valid.id : data[0]?.id || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setActive = (id) => {
    setActiveId(id);
    localStorage.setItem("activePetId", id);
  };

  const activePet = pets.find((p) => p.id === activeId) || null;

  return (
    <AnimalContext.Provider value={{ pets, activePet, activeId, setActive, loading }}>
      {children}
    </AnimalContext.Provider>
  );
};

export const useAnimal = () => useContext(AnimalContext);
