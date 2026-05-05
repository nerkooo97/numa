import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@features/auth/AuthContext";
import { RequireAuth } from "@features/auth/RequireAuth";
import AppLayout from "@shared/components/AppLayout";

import LoginPage from "@features/auth/LoginPage";
import NotFound from "./pages/NotFound";
import { APP_ROUTES } from "@/config/navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {APP_ROUTES.map(({ path, component: Component, roles }) => (
              <Route
                key={path}
                element={<RequireAuth roles={roles} />}
              >
                <Route element={<AppLayout />}>
                  <Route path={path} element={<Component />} />
                </Route>
              </Route>
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
