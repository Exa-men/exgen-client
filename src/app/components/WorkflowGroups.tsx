import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface WorkflowGroup {
  id: string;
  name: string;
  published: boolean;
}

const initialGroups: WorkflowGroup[] = [
  { id: '1', name: 'Flow 1', published: false },
];

export default function WorkflowGroups({ onSelect, selectedGroupId }: {
  onSelect: (id: string) => void;
  selectedGroupId: string;
}) {
  const [groups, setGroups] = useState<WorkflowGroup[]>(initialGroups);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleAddGroup = () => {
    const newId = (Date.now() + Math.random()).toString();
    const newGroup = { id: newId, name: `Flow ${groups.length + 1}`, published: false };
    setGroups([...groups, newGroup]);
    onSelect(newId);
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditSave = (id: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, name: editValue } : g));
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
    // If the deleted group was selected, select the first group if any
    if (selectedGroupId === id && groups.length > 1) {
      const next = groups.find(g => g.id !== id);
      if (next) onSelect(next.id);
    }
  };

  return (
    <div style={{
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      padding: '0.5rem 0',
      margin: '2rem 0',
      scrollbarWidth: 'thin',
      WebkitOverflowScrolling: 'touch',
    }}>
      {groups.map(group => (
        <div
          key={group.id}
          style={{
            display: 'inline-flex',
            verticalAlign: 'top',
            marginRight: '1rem',
            border: selectedGroupId === group.id ? '2px solid #2563eb' : '1px solid #d1d5db',
            borderRadius: '0.5rem',
            padding: '1rem',
            minWidth: '120px',
            minHeight: '80px',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedGroupId === group.id ? '#eff6ff' : '#fff',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => onSelect(group.id)}
        >
          {/* Delete button, top-right corner, hidden when editing */}
          {editingId !== group.id && (
            <button
              onClick={e => { e.stopPropagation(); handleDelete(group.id); }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: '#ef4444',
              }}
              title="Delete workflow"
            >
              <TrashIcon style={{ width: 18, height: 18 }} />
            </button>
          )}
          {editingId === group.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                value={editValue}
                onChange={handleEditChange}
                style={{ fontSize: '1rem', padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              <button onClick={e => { e.stopPropagation(); handleEditSave(group.id); }}><CheckIcon style={{ width: 18 }} /></button>
              <button onClick={e => { e.stopPropagation(); handleEditCancel(); }}><XMarkIcon style={{ width: 18 }} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{group.name}</span>
              <button onClick={e => { e.stopPropagation(); handleEdit(group.id, group.name); }}><PencilIcon style={{ width: 16 }} /></button>
            </div>
          )}
          {/* Publish button removed as requested */}
        </div>
      ))}
      <div
        onClick={handleAddGroup}
        style={{
          display: 'inline-flex',
          verticalAlign: 'top',
          border: '2px dashed #d1d5db',
          borderRadius: '0.5rem',
          padding: '1rem',
          minWidth: '120px',
          minHeight: '80px',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          color: '#64748b',
          cursor: 'pointer',
        }}
      >
        <PlusIcon style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );
} 