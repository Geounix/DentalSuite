import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { StatusBadge } from './StatusBadge';
import { Shield, Search, Eye, TrendingDown, CheckCircle2, Plus, Edit, ArrowLeft, Trash2 } from 'lucide-react';
import { getInsurances, createInsurance, createPlan, updatePlan, createProcedure, updateProcedure, deleteProcedure } from '../lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface InsuranceCompany {
  id: number;
  name: string;
  plans: InsurancePlan[];
}

interface InsurancePlan {
  id: number;
  planName: string;
  type: string;
  procedures: Procedure[];
}

interface Procedure {
  id: number;
  name: string;
  coverageAmount: number;
  copayPercent: number;
}

export function InsuranceScreen() {
  const [view, setView] = useState<'companies' | 'company-detail' | 'plan-detail'>('companies');
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [isAddProcedureModalOpen, setIsAddProcedureModalOpen] = useState(false);
  const [isEditProcedureModalOpen, setIsEditProcedureModalOpen] = useState(false);
  
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPlanData, setNewPlanData] = useState({ planName: '', type: 'PPO' });
  const [editingPlan, setEditingPlan] = useState<InsurancePlan | null>(null);
  const [newProcedure, setNewProcedure] = useState({ name: '', coverageAmount: 0, copayPercent: 0 });
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await getInsurances();
      const list = res.insurances || res;
      setCompanies(list || []);
      return list || [];
    } catch (err) {
      console.error('load insurances', err);
      alert('Could not load insurance companies');
    } finally {
      setLoadingCompanies(false);
    }
    return [];
  };

  useEffect(() => { loadCompanies(); }, []);

  const planTypes = ['PPO', 'HMO', 'DHMO', 'Indemnity'];

  // Create Company
  const handleCreateCompany = async () => {
    if (!newCompanyName) return;
    try {
      await createInsurance({ name: newCompanyName });
      const list = await loadCompanies();
      // if we were viewing a company, keep selection stable
      if (selectedCompany) {
        const found = list.find((c: any) => c.id === selectedCompany.id);
        setSelectedCompany(found || null);
      }
      setIsCreateCompanyModalOpen(false);
      setNewCompanyName('');
    } catch (err: any) {
      console.error('create insurance', err);
      const msg = err?.body?.error || (err?.body ? JSON.stringify(err.body) : 'Could not create insurance');
      alert(msg);
    }
  };

  // Create Plan
  const handleCreatePlan = () => {
    if (!selectedCompany) return;
    (async () => {
      try {
        const created = await createPlan(selectedCompany.id, { planName: newPlanData.planName, type: newPlanData.type });
        const list = await loadCompanies();
        const updated = list.find((c: any) => c.id === selectedCompany.id) || null;
        setSelectedCompany(updated);
        // open the newly created plan if returned
        const newPlan = created && (created.plan || created);
        if (newPlan) setSelectedPlan(newPlan as any);
        setIsCreatePlanModalOpen(false);
        setNewPlanData({ planName: '', type: 'PPO' });
      } catch (err) {
        console.error('create plan', err);
        alert('Could not create plan');
      }
    })();
  };

  // Edit Plan
  const handleEditPlan = () => {
    if (!editingPlan || !selectedCompany) return;
    (async () => {
      try {
        await updatePlan(editingPlan.id, { planName: editingPlan.planName, type: editingPlan.type });
        const list = await loadCompanies();
        const updated = list.find((c: any) => c.id === selectedCompany.id) || null;
        setSelectedCompany(updated);
        if (updated) {
          const p = (updated.plans || []).find((pl: any) => pl.id === editingPlan.id) || null;
          if (p) setSelectedPlan(p);
        }
        setIsEditPlanModalOpen(false);
        setEditingPlan(null);
      } catch (err) {
        console.error('update plan', err);
        alert('Could not update plan');
      }
    })();
  };

  // Add Procedure
  const handleAddProcedure = () => {
    if (!selectedPlan || !selectedCompany) return;
    (async () => {
      try {
        const created = await createProcedure(selectedPlan.id, { name: newProcedure.name, coverageAmount: newProcedure.coverageAmount, copayPercent: newProcedure.copayPercent });
        const list = await loadCompanies();
        const updated = list.find((c: any) => c.id === selectedCompany.id) || null;
        setSelectedCompany(updated);
        if (updated) {
          const pl = (updated.plans || []).find((p: any) => p.id === selectedPlan.id) || null;
          if (pl) setSelectedPlan(pl);
        }
        setIsAddProcedureModalOpen(false);
        setNewProcedure({ name: '', coverageAmount: 0, copayPercent: 0 });
      } catch (err) {
        console.error('create procedure', err);
        alert('Could not create procedure');
      }
    })();
  };

  // Edit Procedure
  const handleEditProcedure = () => {
    if (!editingProcedure || !selectedPlan || !selectedCompany) return;
    (async () => {
      try {
        await updateProcedure(editingProcedure.id, { name: editingProcedure.name, coverageAmount: editingProcedure.coverageAmount, copayPercent: editingProcedure.copayPercent });
        const list = await loadCompanies();
        const updated = list.find((c: any) => c.id === selectedCompany.id) || null;
        setSelectedCompany(updated);
        if (updated) {
          const pl = (updated.plans || []).find((p: any) => p.id === selectedPlan.id) || null;
          if (pl) setSelectedPlan(pl);
        }
        setIsEditProcedureModalOpen(false);
        setEditingProcedure(null);
      } catch (err) {
        console.error('update procedure', err);
        alert('Could not update procedure');
      }
    })();
  };

  // Delete Procedure
  const handleDeleteProcedure = (procedureId: number) => {
    if (!selectedPlan || !selectedCompany) return;
    (async () => {
      try {
        await deleteProcedure(procedureId);
        const list = await loadCompanies();
        const updated = list.find((c: any) => c.id === selectedCompany.id) || null;
        setSelectedCompany(updated);
        if (updated) {
          const pl = (updated.plans || []).find((p: any) => p.id === selectedPlan.id) || null;
          if (pl) setSelectedPlan(pl);
        }
      } catch (err) {
        console.error('delete procedure', err);
        alert('Could not delete procedure');
      }
    })();
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlans = companies.reduce((sum, c) => sum + ((c.plans && Array.isArray(c.plans)) ? c.plans.length : 0), 0);

  // Companies List View
  if (view === 'companies') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insurance Management</h1>
            <p className="text-gray-600 mt-1">Manage insurance companies, plans, and coverage</p>
          </div>
          <Button onClick={() => setIsCreateCompanyModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Insurance Company
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Companies</CardTitle>
              <Shield className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{companies.length}</div>
              <p className="text-xs text-gray-500 mt-1">Insurance providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Plans</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{totalPlans}</div>
              <p className="text-xs text-gray-500 mt-1">Active insurance plans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Plans per Company</CardTitle>
              <TrendingDown className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {companies.length > 0 ? (totalPlans / companies.length).toFixed(1) : 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Plan diversity</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search insurance companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Insurance Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Companies ({filteredCompanies.length})</CardTitle>
            <CardDescription>Click on a company to view and manage their plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Number of Plans</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          {company.name}
                        </div>
                      </TableCell>
                        <TableCell className="text-gray-600">{(company.plans && Array.isArray(company.plans) ? company.plans.length : 0)} plans</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCompany(company);
                            setView('company-detail');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Company Modal */}
        <Dialog open={isCreateCompanyModalOpen} onOpenChange={setIsCreateCompanyModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Insurance Company</DialogTitle>
              <DialogDescription>Create a new insurance provider</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g., Guardian Dental"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCompanyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCompany}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newCompanyName}
              >
                Create Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Company Detail View (Shows Plans)
  if (view === 'company-detail' && selectedCompany) {
    const plans = selectedCompany.plans && Array.isArray(selectedCompany.plans) ? selectedCompany.plans : [];
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setView('companies');
                setSelectedCompany(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Companies
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedCompany.name}</h1>
              <p className="text-gray-600 mt-1">{plans.length} insurance plans</p>
            </div>
          </div>
          <Button onClick={() => setIsCreatePlanModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Button>
        </div>

        {/* Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Plans</CardTitle>
            <CardDescription>Click on a plan to manage procedures and coverage details</CardDescription>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No plans created yet</p>
                <Button onClick={() => setIsCreatePlanModalOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Plan
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Procedures Covered</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.planName}</TableCell>
                        <TableCell>
                          <StatusBadge status={plan.type} />
                        </TableCell>
                        <TableCell className="text-gray-600">{plan.procedures.length} procedures</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPlan(plan);
                                setView('plan-detail');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPlan(plan);
                                setIsEditPlanModalOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Plan Modal */}
        <Dialog open={isCreatePlanModalOpen} onOpenChange={setIsCreatePlanModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Insurance Plan</DialogTitle>
              <DialogDescription>Create a new plan for {selectedCompany.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={newPlanData.planName}
                  onChange={(e) => setNewPlanData({ ...newPlanData, planName: e.target.value })}
                  placeholder="e.g., PPO Premium, HMO Basic"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select
                  value={newPlanData.type}
                  onValueChange={(value) => setNewPlanData({ ...newPlanData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatePlanModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlan}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newPlanData.planName}
              >
                Create Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Modal */}
        <Dialog open={isEditPlanModalOpen} onOpenChange={setIsEditPlanModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Insurance Plan</DialogTitle>
              <DialogDescription>Update plan details</DialogDescription>
            </DialogHeader>
            {editingPlan && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input
                    value={editingPlan.planName}
                    onChange={(e) => setEditingPlan({ ...editingPlan, planName: e.target.value })}
                    placeholder="Enter plan name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <Select
                    value={editingPlan.type}
                    onValueChange={(value) => setEditingPlan({ ...editingPlan, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditPlan} className="bg-blue-600 hover:bg-blue-700">
                Update Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Plan Detail View (Shows Procedures)
  if (view === 'plan-detail' && selectedPlan && selectedCompany) {
    const procedures = selectedPlan.procedures && Array.isArray(selectedPlan.procedures) ? selectedPlan.procedures : [];
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setView('company-detail');
                setSelectedPlan(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{selectedPlan.planName}</h1>
                <StatusBadge status={selectedPlan.type} />
              </div>
              <p className="text-gray-600 mt-1">{selectedCompany.name}</p>
            </div>
          </div>
          <Button onClick={() => setIsAddProcedureModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Procedure
          </Button>
        </div>

        {/* Plan Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Procedures</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{procedures.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Coverage Amount</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${procedures.length > 0
                      ? Math.round(procedures.reduce((sum, p) => sum + p.coverageAmount, 0) / procedures.length)
                      : 0}
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Patient Copay</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {procedures.length > 0
                      ? Math.round(procedures.reduce((sum, p) => sum + p.copayPercent, 0) / procedures.length)
                      : 0}%
                  </p>
                </div>
                <Shield className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Procedures Table */}
        <Card>
          <CardHeader>
            <CardTitle>Covered Procedures</CardTitle>
            <CardDescription>Manage procedure coverage amounts and patient copay percentages</CardDescription>
          </CardHeader>
          <CardContent>
            {procedures.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No procedures added yet</p>
                <Button onClick={() => setIsAddProcedureModalOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Procedure
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure Name</TableHead>
                      <TableHead>Coverage Amount</TableHead>
                      <TableHead>Patient Copay %</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedures.map((procedure) => (
                      <TableRow key={procedure.id}>
                        <TableCell className="font-medium">{procedure.name}</TableCell>
                        <TableCell className="text-blue-600 font-semibold">${procedure.coverageAmount}</TableCell>
                        <TableCell className="text-gray-600">{procedure.copayPercent}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingProcedure(procedure);
                                setIsEditProcedureModalOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProcedure(procedure.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Procedure Modal */}
        <Dialog open={isAddProcedureModalOpen} onOpenChange={setIsAddProcedureModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Procedure Coverage</DialogTitle>
              <DialogDescription>Define coverage details for a dental procedure</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Procedure Name</Label>
                <Input
                  value={newProcedure.name}
                  onChange={(e) => setNewProcedure({ ...newProcedure, name: e.target.value })}
                  placeholder="e.g., Root Canal, Teeth Whitening"
                />
              </div>
              <div className="space-y-2">
                <Label>Coverage Amount ($)</Label>
                <Input
                  type="number"
                  value={newProcedure.coverageAmount}
                  onChange={(e) => setNewProcedure({ ...newProcedure, coverageAmount: Number(e.target.value) })}
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label>Patient Copay Percentage (%)</Label>
                <Input
                  type="number"
                  value={newProcedure.copayPercent}
                  onChange={(e) => setNewProcedure({ ...newProcedure, copayPercent: Number(e.target.value) })}
                  placeholder="e.g., 20"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddProcedureModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddProcedure}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newProcedure.name || newProcedure.coverageAmount <= 0}
              >
                Add Procedure
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Procedure Modal */}
        <Dialog open={isEditProcedureModalOpen} onOpenChange={setIsEditProcedureModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Procedure Coverage</DialogTitle>
              <DialogDescription>Update coverage details for this procedure</DialogDescription>
            </DialogHeader>
            {editingProcedure && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Procedure Name</Label>
                  <Input
                    value={editingProcedure.name}
                    onChange={(e) => setEditingProcedure({ ...editingProcedure, name: e.target.value })}
                    placeholder="Enter procedure name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coverage Amount ($)</Label>
                  <Input
                    type="number"
                    value={editingProcedure.coverageAmount}
                    onChange={(e) => setEditingProcedure({ ...editingProcedure, coverageAmount: Number(e.target.value) })}
                    placeholder="Enter coverage amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Patient Copay Percentage (%)</Label>
                  <Input
                    type="number"
                    value={editingProcedure.copayPercent}
                    onChange={(e) => setEditingProcedure({ ...editingProcedure, copayPercent: Number(e.target.value) })}
                    placeholder="Enter copay percentage"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditProcedureModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditProcedure} className="bg-blue-600 hover:bg-blue-700">
                Update Procedure
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
