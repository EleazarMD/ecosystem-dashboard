/**
 * Absolute Minimal Panel - Zero custom imports
 */

import React from 'react';

console.log('📦 [ABSOLUTE-MINIMAL] Module loaded');

export default function AbsoluteMinimalPanel({ onClose, systemData }: { onClose: () => void; systemData?: any }) {
  console.log('🎨 [ABSOLUTE-MINIMAL] Component rendering');
  
  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '70px',
        height: 'calc(100vh - 70px)',
        width: '400px',
        backgroundColor: 'white',
        borderLeft: '1px solid #ddd',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          ✅ PANEL IS RENDERING!
        </h3>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          This is the absolute minimal panel with ZERO custom imports.
        </p>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          If you see this, the panel system works.
        </p>
        <p style={{ fontSize: '14px', color: 'red', fontWeight: 'bold' }}>
          The issue is in one of the imports from the modular panel system.
        </p>
      </div>
    </div>
  );
}
