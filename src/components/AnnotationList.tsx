// src/components/AnnotationList.tsx
import React from 'react';
import { Annotation } from '../shared/types/annotation';

interface AnnotationListProps {
    annotations: Annotation[];
    onDelete: (id: string) => void;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, onDelete }) => {
    if (annotations.length === 0) {
        return <p style={{ margin: 0, color: '#666' }}>No annotations yet.</p>;
    }

    return (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {annotations.map((note) => (
                <li
                    key={note._id}
                    style={{
                        padding: '5px 0',
                        borderBottom: '1px solid #eee',
                        wordBreak: 'break-word',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
          <span>
            {note.text} <small>({new Date(note.timestamp).toLocaleString()})</small>
          </span>
                    <button
                        onClick={() => onDelete(note._id)}
                        style={{
                            padding: '2px 5px',
                            background: '#ff0000',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                        }}
                    >
                        Delete
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default AnnotationList;