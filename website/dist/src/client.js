import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { AnnotationList } from '@citizenx/shared';
const initialData = window.__INITIAL_DATA__ || { annotations: [], profiles: {} };
const container = document.querySelector('.annotations-container');
if (container) {
    hydrateRoot(container, React.createElement(AnnotationList, { annotations: initialData.annotations, profiles: initialData.profiles, onDelete: async () => { }, onSaveComment: undefined }));
}
