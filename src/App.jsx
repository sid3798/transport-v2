import { BrowserRouter, Routes, Route } from "react-router-dom";
import Transport from "./pages/Transport";
import Ledger from "./pages/Ledger";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Transport />} />
        <Route path="/ledger" element={<Ledger />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;