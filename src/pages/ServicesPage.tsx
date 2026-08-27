import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  Eye,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ServiceItem } from '../types';
import { ServiceIcon } from '../components/common/ServiceIcon';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const ServicesPage: React.FC = () => {
  const { isDirector } = useAuth();
  const { services, attendanceRecords, addService, updateService, deleteService, toggleServiceStatus } = useApp();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Sparkles');
  const [saving, setSaving] = useState(false);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setIcon('Sparkles');
    setIsAddingService(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description);
    setIcon(srv.icon || 'Sparkles');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await addService(name.trim(), description.trim(), icon);
      toast.success('Service Created', `${name.trim()} added to youth programs.`);
      setIsAddingService(false);
    } catch (err: any) {
      toast.error('Failed to create service', err?.message || 'Could not add service');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !name.trim()) return;
    setSaving(true);
    try {
      await updateService(editingService.id, {
        name: name.trim(),
        description: description.trim(),
        icon,
      });
      toast.success('Service Updated', `${name.trim()} changes saved.`);
      setEditingService(null);
    } catch (err: any) {
      toast.error('Failed to update service', err?.message || 'Could not update service');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (srv: ServiceItem) => {
    toggleServiceStatus(srv.id);
    const newStatus = srv.status === 'active' ? 'Deactivated' : 'Activated';
    toast.info(`Service ${newStatus}`, `${srv.name} is now ${newStatus.toLowerCase()}.`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;
    setSaving(true);
    try {
      const sName = deletingService.name;
      await deleteService(deletingService.id);
      toast.success('Service Deleted', `${sName} has been removed.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Could not delete service');
    } finally {
      setSaving(false);
      setDeletingService(null);
    }
  };

  const getServiceTotalVisits = (serviceId: string) => {
    return attendanceRecords.filter(r => r.serviceId === serviceId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Programs & Catalogs</span>
          <h1 className="text-2xl font-extrabold text-[#23285E]">Youth Services Catalogue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active programs and service activities offered to young people at Nyabihu Yego Center
          </p>
        </div>

        {isDirector && (
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4 text-[#E6E65A]" />}
          >
            Add New Service
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search youth services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none text-[#1F222C]"
        />
        <span className="text-xs text-slate-400 shrink-0 font-medium">
          {filteredServices.length} Services
        </span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((srv, index) => {
          const totalVisits = getServiceTotalVisits(srv.id);
          const isActive = srv.status === 'active';

          return (
            <div
              key={srv.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-slate-200 shadow-xs hover:border-[#3591C8]'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#3591C8] flex items-center justify-center shrink-0">
                    <ServiceIcon name={srv.name} iconName={srv.icon} size={20} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 font-bold">#0{index + 1}</span>
                <h3 className="text-sm font-bold text-[#23285E] mt-0.5">{srv.name}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{srv.description}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Visits:</span>
                  <p className="text-sm font-bold text-[#23285E] font-roboto">{totalVisits.toLocaleString()}</p>
                </div>

                {isDirector && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(srv)}
                      className="p-1.5 text-slate-500 hover:text-[#3591C8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Service"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(srv)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={isActive ? 'Deactivate Service' : 'Activate Service'}
                    >
                      {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeletingService(srv)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Service Modal */}
      {(isAddingService || editingService) && (
        <Modal
          isOpen={isAddingService || !!editingService}
          onClose={() => { setIsAddingService(false); setEditingService(null); }}
          title={isAddingService ? 'Add Youth Service' : 'Edit Youth Service'}
          subtitle="Define youth program details and activity descriptions"
        >
          <form onSubmit={isAddingService ? handleSaveAdd : handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Service Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Digital Media & Photography"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Service Description *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe program objectives, workshops, and youth support provided..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsAddingService(false); setEditingService(null); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {isAddingService ? 'Create Service' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Service Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingService}
        title="Delete Youth Service"
        message={`Are you sure you want to delete "${deletingService?.name}"? Existing attendance history records will retain the service name snapshot.`}
        confirmText="Delete Service"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingService(null)}
        variant="danger"
        loading={saving}
      />
    </div>
  );
};
