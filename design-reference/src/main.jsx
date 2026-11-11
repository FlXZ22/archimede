import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import { Dashboard } from './Dashboard';
import './styles.css';

createRoot(document.getElementById('root')).render(<Dashboard />);
