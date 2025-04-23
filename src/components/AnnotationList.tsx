// src/components/AnnotationList.tsx
import React from 'react';
import { Annotation } from '../shared/types/annotation';
import { UserProfile } from '../shared/types/userProfile';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Map<string, UserProfile>;
    onDelete: (id: string) => Promise<void>;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete }) => {
    console.log('AnnotationList profiles:', Array.from(profiles.entries()));
    return (
        <div>
            {annotations.map((annotation) => {
                console.log(`Annotation DID: ${annotation.did}`);
                const creatorProfile = annotation.did ? profiles.get(annotation.did) : null;
                console.log(`Creator profile for DID ${annotation.did}:`, creatorProfile);
                return (
                    <div key={annotation._id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                            {creatorProfile?.profilePicture && (
                                <img
                                    src={creatorProfile.profilePicture}
                                    alt={creatorProfile.handle}
                                    style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', marginRight: '0.5rem' }}
                                />
                            )}
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>
                                {creatorProfile?.handle || (annotation.did ? `${annotation.did.slice(0, 6)}...${annotation.did.slice(-4)}` : 'Unknown')}
                            </span>
                        </div>
                        <p style={{ margin: '0', fontSize: '0.9rem', color: '#333', wordBreak: 'break-word' }}>{annotation.text}</p>
                        <button
                            onClick={() => onDelete(annotation._id)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                background: '#f97316',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                marginTop: '0.25rem',
                                fontSize: '0.8rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fb923c')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
                        >
                            Delete
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default AnnotationList;