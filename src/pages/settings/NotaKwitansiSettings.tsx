import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotaKwitansiCreate } from '@/components/nota/NotaKwitansiCreate';
import { NotaKwitansiList } from '@/components/nota/NotaKwitansiList';

export const NotaKwitansiSettings = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'list' | 'create'>('list');

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-lowest border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-lg font-black font-headline text-primary">Nota / Kwitansi</h1>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-surface-container-low">
            <TabsTrigger value="list" className="font-bold">Daftar Nota</TabsTrigger>
            <TabsTrigger value="create" className="font-bold gap-1">
              <Plus className="w-3 h-3" /> Buat Baru
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <Card className="bg-[hsl(0,0%,100%)]">
              <CardContent className="pt-4">
                <NotaKwitansiList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <NotaKwitansiCreate onSuccess={() => setTab('list')} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
