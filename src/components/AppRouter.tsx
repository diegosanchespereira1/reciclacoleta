import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import CollectionForm from './CollectionForm';
import CollectionPointForm from './CollectionPointForm';
import CollectionPointsList from './CollectionPointsList';
import { CircularProgress, Box } from '@mui/material';

type View = 'login' | 'register' | 'dashboard' | 'collection-form' | 'collection-point-form' | 'collection-points-list';

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('login');

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <CircularProgress size={60} sx={{ color: '#2e7d32' }} />
      </Box>
    );
  }

  if (!user) {
    if (currentView === 'login') {
      return <Login onSwitchToRegister={() => setCurrentView('register')} />;
    } else {
      return <Register onSwitchToLogin={() => setCurrentView('login')} />;
    }
  }

  // User is logged in
  switch (currentView) {
    case 'dashboard':
      return (
        <Dashboard 
          onNewCollection={() => setCurrentView('collection-form')}
          onCollectionPoints={() => setCurrentView('collection-points-list')}
        />
      );
    case 'collection-form':
      return <CollectionForm onBack={() => setCurrentView('dashboard')} />;
    case 'collection-point-form':
      return <CollectionPointForm onBack={() => setCurrentView('collection-points-list')} />;
    case 'collection-points-list':
      return (
        <CollectionPointsList 
          onBack={() => setCurrentView('dashboard')}
          onNewPoint={() => setCurrentView('collection-point-form')}
        />
      );
    default:
      return (
        <Dashboard 
          onNewCollection={() => setCurrentView('collection-form')}
          onCollectionPoints={() => setCurrentView('collection-points-list')}
        />
      );
  }
};

export default AppRouter;
