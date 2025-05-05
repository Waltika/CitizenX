import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { AnnotationList } from '@citizenx/shared';

// Extend Window interface
interface CitizenXWindow extends Window {
    __INITIAL_DATA__?: { annotations: any[]; profiles: Record<string, any> };
}

declare let window: CitizenXWindow;

const initialData = window.__INITIAL_DATA__ || { annotations: [], profiles: {} };

const container = document.querySelector('.annotations-container');
if (container) {
    hydrateRoot(
        container,
        <AnnotationList
            annotations={initialData.annotations}
            profiles={initialData.profiles}
            onDelete={async () => {}} // Placeholder
            onSaveComment={undefined} // Placeholder
        />
    );
}