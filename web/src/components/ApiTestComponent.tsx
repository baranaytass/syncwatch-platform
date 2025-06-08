import React, { useState } from 'react';
import { apiService } from '../services/api.service';

export const ApiTestComponent: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Unknown');
  const [testing, setTesting] = useState<boolean>(false);

  const testHealthCheck = async (): Promise<void> => {
    setTesting(true);
    try {
      const isHealthy = await apiService.healthCheck();
      setHealthStatus(isHealthy ? 'Healthy ✅' : 'Unhealthy ❌');
    } catch (error) {
      setHealthStatus('Error ❌');
      console.error('Health check error:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(255,255,255,0.9)',
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      fontSize: '0.8rem'
    }}>
      <h4>API Test Panel</h4>
      <div>
        <strong>Backend Status:</strong> {healthStatus}
      </div>
      <button 
        onClick={testHealthCheck}
        disabled={testing}
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1rem',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: testing ? 'not-allowed' : 'pointer',
          opacity: testing ? 0.6 : 1
        }}
      >
        {testing ? 'Testing...' : 'Test Backend'}
      </button>
    </div>
  );
};

export default ApiTestComponent; 