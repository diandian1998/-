import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import UserChat from './pages/UserChat';
import Index from './pages/Index';

// 管理员路由包装器
function AdminRoute() {
  return <AdminDashboard />;
}

// 用户路由包装器
function UserRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/chat" element={<UserChat />} />
    </Routes>
  );
}

// 根据URL参数决定显示哪个界面
function App() {
  // 使用原生URLSearchParams，不需要BrowserRouter上下文
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

  return (
    <BrowserRouter>
      {isAdmin ? <AdminRoute /> : <UserRoutes />}
    </BrowserRouter>
  );
}

export default App;
