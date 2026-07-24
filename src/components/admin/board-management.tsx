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
import { Monitor, Plus, Trash2, Wifi, WifiOff, Wrench, MapPin } from 'lucide-react';
import { BOARD_STATUS_CONFIG } from '@/lib/constants';
import type { Board } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

function getHeartbeatStatus(board: Board) {
  const lastHB = new Date(board.lastHeartbeat).getTime();
  const now = Date.now();
  const diff = now - lastHB;
  if (diff < 60000) return { label: 'Online', color: 'text-green-600 bg-green-500/10 border-green-500', icon: <Wifi className="h-3 w-3" /> };
  if (diff < 300000) return { label: 'Delayed', color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500', icon: <WifiOff className="h-3 w-3" /> };
  return { label: 'Offline', color: 'text-red-600 bg-red-500/10 border-red-500', icon: <WifiOff className="h-3 w-3" /> };
}

export function BoardManagement() {
  const { boards, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [newBoard, setNewBoard] = useState({ boardName: '', latitude: '', longitude: '', address: '', radius: '500' });

  const loadBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/boards');
      const data = await res.json();
      setBoards(data.boards);
    } catch {
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBoards(); }, []);

  const handleAdd = async () => {
    if (!newBoard.boardName || !newBoard.latitude || !newBoard.longitude) {
      toast.error('Name, latitude, and longitude are required');
      return;
    }
    try {
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBoard, latitude: parseFloat(newBoard.latitude), longitude: parseFloat(newBoard.longitude), radius: parseInt(newBoard.radius) }),
      });
      toast.success('Board added successfully');
      setAddDialog(false);
      setNewBoard({ boardName: '', latitude: '', longitude: '', address: '', radius: '500' });
      loadBoards();
    } catch {
      toast.error('Failed to add board');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/boards', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('Board deleted');
      loadBoards();
    } catch {
      toast.error('Failed to delete board');
    }
  };

  const handleToggleStatus = async (board: Board, newStatus: string) => {
    try {
      await fetch('/api/boards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: board.id, status: newStatus }) });
      toast.success(`Board ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      loadBoards();
    } catch {
      toast.error('Failed to update board');
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Display Board Management</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage roadside digital display boards</p>
        </div>
        <Button onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Board</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(boards || []).map((board) => {
          const hbStatus = getHeartbeatStatus(board);
          const statusConfig = BOARD_STATUS_CONFIG[board.status];
          const isAlerting = !!board.displayMessage;

          return (
            <Card key={board.id} className={`overflow-hidden ${isAlerting ? 'emergency-flash border-destructive/30' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">{board.boardName}</h3>
                    {board.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{board.address}</p>}
                  </div>
                  <Badge variant="outline" className={`${statusConfig.color} text-[10px]`}>{statusConfig.label}</Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${hbStatus.color}`}>
                    {hbStatus.icon} {hbStatus.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">Last: {formatDistanceToNow(new Date(board.lastHeartbeat), { addSuffix: true })}</Badge>
                  <Badge variant="secondary" className="text-[10px]">Radius: {board.radius}m</Badge>
                </div>

                {isAlerting && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                    <p className="font-medium text-sm text-destructive">{board.displayMessage}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {board.eta && <span>ETA: {Math.floor(board.eta / 60)}:{(board.eta % 60).toString().padStart(2, '0')}</span>}
                      {board.direction && <span>Direction: {board.direction}</span>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {board.status === 'ACTIVE' ? (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleToggleStatus(board, 'INACTIVE')}>
                      <WifiOff className="h-3 w-3 mr-1" /> Deactivate
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleToggleStatus(board, 'ACTIVE')}>
                      <Wifi className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleDelete(board.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Board Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Display Board</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Board Name *</Label><Input placeholder="e.g., Thamel Crossing Board" value={newBoard.boardName} onChange={(e) => setNewBoard(p => ({ ...p, boardName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Latitude *</Label><Input placeholder="27.7172" value={newBoard.latitude} onChange={(e) => setNewBoard(p => ({ ...p, latitude: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Longitude *</Label><Input placeholder="85.324" value={newBoard.longitude} onChange={(e) => setNewBoard(p => ({ ...p, longitude: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input placeholder="Location description" value={newBoard.address} onChange={(e) => setNewBoard(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Radius (meters)</Label><Input placeholder="500" value={newBoard.radius} onChange={(e) => setNewBoard(p => ({ ...p, radius: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Board</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
