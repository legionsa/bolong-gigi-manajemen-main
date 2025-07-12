
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffList } from './staff/StaffList';
import { RoleManagement } from './staff/RoleManagement';
import { ActivityLog } from './staff/ActivityLog';

export const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState('staff');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manajemen Staff & Peran</h1>
        <p className="text-muted-foreground">Kelola staff, peran, dan aktivitas di klinik Anda</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="staff">Daftar Staff</TabsTrigger>
          <TabsTrigger value="roles">Manajemen Peran</TabsTrigger>
          <TabsTrigger value="activity">Log Aktivitas</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <StaffList />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};
