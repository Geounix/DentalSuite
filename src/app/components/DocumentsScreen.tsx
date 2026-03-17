import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileText, Upload, Download, Eye, Trash2, Search, Image, FileCheck, File } from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument } from '../lib/api';
// StatusBadge removed; not used in this screen
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PaginationControl } from './PaginationControl';

interface DocumentItem {
  id: number;
  filename: string;
  key: string;
  type?: string | null;
  createdAt?: string;
  uploader?: { id?: number; name?: string } | null;
  patient?: { id?: number; name?: string } | null;
}

export function DocumentsScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const API_BASE = (import.meta as any).env.PROD ? '' : ((import.meta as any).env.VITE_API_URL || 'http://localhost:4000');

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`${API_BASE}/uploads/${doc.key}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || doc.key;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('download error', err);
      alert('Failed to download file');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const name = (doc.filename || '').toLowerCase();
    const patient = (doc.patient && doc.patient.name ? doc.patient.name : '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || patient.includes(searchQuery.toLowerCase());
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-8 h-8 text-red-600" />;
      case 'Image': return <Image className="w-8 h-8 text-blue-600" />;
      case 'Word': return <File className="w-8 h-8 text-blue-700" />;
      default: return <FileText className="w-8 h-8 text-gray-600" />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) handleFiles(files);
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await getDocuments();
      const list = (res.documents || res || []).filter(
        (d: any) => d.type !== 'consent-signature'
      );
      setDocuments(list || []);
    } catch (err) {
      console.error('load documents', err);
      alert('Could not load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleFiles = async (files: File[]) => {
    for (const f of files) {
      try {
        setUploading((s) => ({ ...s, [f.name]: true }));
        const res = await uploadDocument(f);
        await loadDocuments();
      } catch (err: any) {
        console.error('upload error', err);
        const msg = err?.body?.error || (err?.body ? JSON.stringify(err.body) : 'Upload failed');
        alert(msg);
      } finally {
        setUploading((s) => {
          const n = { ...s };
          delete n[f.name];
          return n;
        });
      }
    }
  };

  const handleBrowse = () => fileInputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) handleFiles(files);
    e.currentTarget.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error('delete error', err);
      alert('Could not delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('documents.title')}</h1>
        <p className="text-gray-600 mt-1">{t('documents.subtitle')}</p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('documents.upload.drop')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('documents.upload.orBrowse')}</p>
            <div>
              <input ref={fileInputRef} onChange={handleInputChange} type="file" className="hidden" multiple />
              <Button onClick={handleBrowse} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                {t('documents.upload.browseButton')}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">{t('documents.upload.supported')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('documents.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents View */}
      <Card>
          <CardHeader>
          <CardTitle>{t('documents.allTitle', { count: filteredDocuments.length })}</CardTitle>
          <CardDescription>{t('documents.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="grid" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="grid">{t('documents.tabs.grid')}</TabsTrigger>
              <TabsTrigger value="list">{t('documents.tabs.list')}</TabsTrigger>
            </TabsList>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {paginatedDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow group">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-3">
                          {getFileIcon((doc.type || '').toUpperCase())}
                        </div>
                        <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{doc.filename}</h4>
                        <p className="text-xs text-gray-600 mb-2">{doc.patient?.name || ''}</p>
                        <p className="text-xs text-gray-500">{t('documents.card.uploadedBy', { name: doc.uploader?.name || '—' })}</p>
                        <p className="text-xs text-gray-500">{doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ''}</p>

                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" onClick={() => window.open(`${API_BASE}/uploads/${doc.key}`, '_blank')}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <div className="space-y-2">
                {paginatedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      {getFileIcon((doc.type || '').toUpperCase())}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-600">{doc.patient?.name || ''}</p>
                        </div>
                      </div>
                        <div className="text-right mr-6">
                        <p className="text-sm text-gray-600">{doc.uploader?.name || ''}</p>
                        <p className="text-xs text-gray-500">{doc.createdAt ? new Date(doc.createdAt).toLocaleString() : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(`${API_BASE}/uploads/${doc.key}`, '_blank')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <PaginationControl currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  );
}
