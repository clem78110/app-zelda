import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AnimalContext = createContext(null);

export const AnimalProvider = ({ children }) => {
  const [pets, setPets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/pets");
      setPets(data);
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      const data = await refresh();
      const stored = localStorage.getItem("activePetId");
      const valid = data.find((p) => p.id === stored);
      setActiveId(valid ? valid.id : data[0]?.id || null);
      setLoading(false);
    })();
  }, [refresh]);

  const setActive = (id) => {
    setActiveId(id);
    localStorage.setItem("activePetId", id);
  };

  const updatePet = async (id, patch) => {
    const { data } = await api.patch(`/pets/${id}`, patch);
    setPets((curr) => curr.map((p) => (p.id === id ? data : p)));
    return data;
  };

  const activePet = pets.find((p) => p.id === activeId) || null;

  return (
    <AnimalContext.Provider value={{ pets, activePet, activeId, setActive, loading, refresh, updatePet }}>
      {children}
    </AnimalContext.Provider>
  );
};

export const useAnimal = () => useContext(AnimalContext);
