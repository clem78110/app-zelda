import { createContext, useContext, useState } from "react";

const AnimalContext = createContext(null);

export const AnimalProvider = ({ children }) => {
  const [animal, setAnimal] = useState([]);

  return (
    <AnimalContext.Provider value={{ animal, setAnimal }}>
      {children}
    </AnimalContext.Provider>
  );
};

export const useAnimal = () => {
  return useContext(AnimalContext);
};