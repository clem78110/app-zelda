import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AnimalProvider } from "./context/AnimalContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AnimalProvider>
      <App />
    </AnimalProvider>
  </React.StrictMode>
);
