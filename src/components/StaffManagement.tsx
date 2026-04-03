
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StaffList } from './staff/StaffList';
import { RoleManagement } from './staff/RoleManagement';
import { ActivityLog } from './staff/ActivityLog';
import { UserCog } from 'lucide-react';

export const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState('staff');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center">
          <UserCog className="w-6 h-6 text-on-secondary-fixed" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">Manajemen Staff & Peran</h1>
          <p className="text-on-surface-variant mt-0.5">Kelola staff, peran, dan aktivitas di klinik Anda</p>
        </div>
      </div>

      <Card className="bg-surface-container-lowest shadow-sm">
        <CardHeader className="pb-0">
          <TabsList className="grid w-full grid-cols-3 bg-surface-container-low">
            <TabsTrigger value="staff">Daftar Staff</TabsTrigger>
            <TabsTrigger value="roles">Manajemen Peran</TabsTrigger>
            <TabsTrigger value="activity">Log Aktivitas</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-4">
          <TabsContent value="staff" className="space-y-4">
            <StaffList />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
};
