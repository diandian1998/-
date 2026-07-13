import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UserChat from './pages/UserChat';
import Index from './pages/Index';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<UserChat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
