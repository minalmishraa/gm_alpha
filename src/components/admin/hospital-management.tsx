'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Plus, Trash2, Phone, BedDouble, MapPin, Edit } from 'lucide-react';
import type { Hospital } from '@/lib/types';

export function HospitalManagement() {
  const { hospitals, setHospitals } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [editHospital, setEditHospital] = useState<Hospital | null>(null);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', beds: '', contact: '', address: '' });

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hospitals');
      const data = await res.json();
      setHospitals(data.hospitals);
    } catch {
      toast.error('Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHospitals(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error('Name, latitude, and longitude are required');
      return;
    }
    try {
      const body = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), beds: parseInt(form.beds) || 0 };
      if (editHospital) {
        await fetch('/api/hospitals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editHospital.id, ...body }) });
        toast.success('Hospital updated');
      } else {
        await fetch('/api/hospitals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        toast.success('Hospital added');
      }
      setAddDialog(false);
      setEditHospital(null);
      setForm({ name: '', latitude: '', longitude: '', beds: '', contact: '', address: '' });
      loadHospitals();
    } catch {
      toast.error('Failed to save hospital');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/hospitals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Hospital deleted');
      loadHospitals();
    } catch {
      toast.error('Failed to delete hospital');
    }
  };

  const openEdit = (hospital: Hospital) => {
    setForm({
      name: hospital.name,
      latitude: hospital.latitude.toString(),
      longitude: hospital.longitude.toString(),
      beds: hospital.beds.toString(),
      contact: hospital.contact || '',
      address: hospital.address || '',
    });
    setEditHospital(hospital);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Management</h1>
          <p className="text-sm text-muted-foreground">Manage hospital locations and information</p>
        </div>
        <Button onClick={() => { setAddDialog(true); setForm({ name: '', latitude: '', longitude: '', beds: '', contact: '', address: '' }); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Hospital
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(hospitals || []).map((hospital) => (
          <Card key={hospital.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{hospital.name}</h3>
                  </div>
                  {hospital.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{hospital.address}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px]"><BedDouble className="h-3 w-3 mr-1" />{hospital.beds} beds</Badge>
                {hospital.contact && (
                  <Badge variant="outline" className="text-[10px]"><Phone className="h-3 w-3 mr-1" />{hospital.contact}</Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {hospital.latitude.toFixed(3)}, {hospital.longitude.toFixed(3)}
                </Badge>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => openEdit(hospital)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleDelete(hospital.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialog || !!editHospital} onOpenChange={(open) => { setAddDialog(false); setEditHospital(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editHospital ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input placeholder="Hospital name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Latitude *</Label><Input placeholder="27.7172" value={form.latitude} onChange={(e) => setForm(p => ({ ...p, latitude: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Longitude *</Label><Input placeholder="85.324" value={form.longitude} onChange={(e) => setForm(p => ({ ...p, longitude: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Available Beds</Label><Input placeholder="100" type="number" value={form.beds} onChange={(e) => setForm(p => ({ ...p, beds: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Contact</Label><Input placeholder="+977-1-XXXXXXX" value={form.contact} onChange={(e) => setForm(p => ({ ...p, contact: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Address</Label><Input placeholder="Full address" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(false); setEditHospital(null); }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editHospital ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
