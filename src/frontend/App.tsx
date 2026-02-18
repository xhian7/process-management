import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/MainLayout";
import { EquipmentList } from "./components/equipment/EquipmentList";
import { EquipmentForm } from "./components/equipment/EquipmentForm";
import { EquipmentDetail } from "./components/equipment/EquipmentDetail";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Redirect root to app */}
          <Route path="/" element={<Navigate to="/app/equipments" replace />} />
          
          {/* Main application routes */}
          <Route path="/app" element={<MainLayout />}>
            {/* Redirect /app to /app/equipments */}
            <Route index element={<Navigate to="/app/equipments" replace />} />
            
            {/* Equipment routes */}
            <Route path="equipments">
              <Route index element={<EquipmentList />} />
              <Route path="new" element={<EquipmentForm />} />
              <Route path=":id" element={<EquipmentDetail />} />
              <Route path=":id/edit" element={<EquipmentForm />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
