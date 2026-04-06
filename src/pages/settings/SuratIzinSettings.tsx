import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuratIzinCreate } from '@/components/surat-izin/SuratIzinCreate';
import { SuratIzinList } from '@/components/surat-izin/SuratIzinList';

export const SuratIzinSettings = () => {
  const [tab, setTab] = useState<'list' | 'create'>('list');

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-surface-container-low">
          <TabsTrigger value="list" className="font-bold">Daftar Surat Izin</TabsTrigger>
          <TabsTrigger value="create" className="font-bold gap-1">
            <Plus className="w-3 h-3" /> Baru
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="bg-surface-container-lowest">
            <CardContent className="pt-4">
              <SuratIzinList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <SuratIzinCreate onSuccess={() => setTab('list')} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
