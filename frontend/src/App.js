import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimalProvider, useAnimal } from "@/context/AnimalContext";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Rations from "@/pages/Rations";
import Veterinaire from "@/pages/Veterinaire";
import Poids from "@/pages/Poids";
import Journal from "@/pages/Journal";
import Balades from "@/pages/Balades";
import PublicShare from "@/pages/PublicShare";

const DogOnly = ({ children }) => {
  const { activePet } = useAnimal();
  if (!activePet) return null;
  if (activePet.species !== "dog") return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/share/:token" element={<PublicShare />} />
          <Route
            path="/*"
            element={
              <AnimalProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="rations" element={<Rations />} />
                    <Route path="veterinaire" element={<Veterinaire />} />
                    <Route path="poids" element={<Poids />} />
                    <Route path="journal" element={<Journal />} />
                    <Route path="balades" element={<DogOnly><Balades /></DogOnly>} />
                  </Route>
                </Routes>
              </AnimalProvider>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
