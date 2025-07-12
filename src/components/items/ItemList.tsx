
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ItemForm } from './ItemForm';
import { useItems } from '@/hooks/useItems';

export const ItemList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { items, isLoading, deleteItem } = useItems();

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        await deleteItem(itemId);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (isLoading) {
    return <div>Memuat daftar item...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daftar Item</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Item
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit Item' : 'Tambah Item Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemForm 
              item={editingItem} 
              onClose={handleClose} 
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {items?.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p className="text-lg font-bold text-green-600">Rp {item.price.toLocaleString()}</p>
                    {item.category && (
                      <p className="text-sm text-muted-foreground">Kategori: {item.category}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Stok: {item.stock_quantity} {item.unit}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
