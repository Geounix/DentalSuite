import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { getCatalogProcedures, createCatalogProcedure, updateCatalogProcedure, deleteCatalogProcedure } from '../lib/api';
import { PaginationControl } from './PaginationControl';

export function CatalogScreen() {
    const { t } = useTranslation();
    const [procedures, setProcedures] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', price: 0 });

    const loadData = async (searchTerm = '') => {
        setIsLoading(true);
        try {
            const res = await getCatalogProcedures({ search: searchTerm });
            setProcedures(res.catalog || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error('Failed to load catalog', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Debounced search
    useEffect(() => {
        const handler = setTimeout(() => {
            loadData(search);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(procedures.length / ITEMS_PER_PAGE);
    const paginatedProcedures = procedures.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleOpenModal = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, price: item.price });
        } else {
            setEditingItem(null);
            setFormData({ name: '', price: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingItem) {
                await updateCatalogProcedure(editingItem.id, formData);
            } else {
                await createCatalogProcedure(formData);
            }
            setIsModalOpen(false);
            loadData(search);
        } catch (err) {
            console.error('Failed to save procedure', err);
            alert('Error saving procedure');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este procedimiento?')) return;
        try {
            await deleteCatalogProcedure(id);
            loadData(search);
        } catch (err) {
            console.error('Failed to delete', err);
            alert('Error deleting procedure');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Catálogo de Tratamientos</h1>
                    <p className="text-gray-600 mt-1">Administra los procedimientos y sus precios base</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Procedimiento
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Procedimientos ({total})</CardTitle>
                    <CardDescription>
                        Estos tratamientos aparecerán como opciones en el Odontograma.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            placeholder="Buscar procedimiento por nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 max-w-md"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tratamiento</TableHead>
                                    <TableHead>Precio Base ($)</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8">Cargando...</TableCell></TableRow>
                                ) : procedures.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8">No se encontraron procedimientos</TableCell></TableRow>
                                ) : (
                                    paginatedProcedures.map((proc) => (
                                        <TableRow key={proc.id}>
                                            <TableCell className="font-medium">{proc.name}</TableCell>
                                            <TableCell>${proc.price?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(proc)}>
                                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(proc.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <PaginationControl currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}</DialogTitle>
                        <DialogDescription>
                            Ajusta el nombre y el precio base del tratamiento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Tratamiento</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Carilla de Porcelana"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Precio Base ($)</Label>
                            <Input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!formData.name.trim()}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
