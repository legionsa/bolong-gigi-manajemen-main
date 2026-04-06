
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionDenied } from '@/components/PermissionDenied';
import type { Permission } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: string[];
}

const ProtectedRoute = ({ children, requiredPermission, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { can, role } = usePermissions();

  // Show minimal loading state while auth is checking
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, hsl(185, 100%, 16%) 0%, hsl(185, 100%, 22%) 100%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent 60%, black 61%)',
              mask: 'radial-gradient(farthest-side, transparent 60%, black 61%)',
            }}
          />
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <PermissionDenied />;
  }
  if (requiredRole && role && !requiredRole.includes(role)) {
    return <PermissionDenied />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;