import React from 'react';
import { createRoot } from 'react-dom/client';

const App: React.FC = () => {
    return <div>CitizenX Annotation Extension</div>;
};

const root = createRoot(document.getElementById('citizenx-app')!);
root.render(<App />);