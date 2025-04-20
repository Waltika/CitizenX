// src/popup/components/History/List.tsx
import React, { useState, useEffect } from 'react';
import { historyService } from '../../../background/services/history';
import '../../styles/components/History.module.css';

export const HistoryList: React.FC = () => {
    const [visits, setVisits] = useState<Visit[]>([]);

    useEffect(() => {
        historyService.getVisits().then(setVisits);
    }, []);

    return (
        <div className="history-list">
            <h2>Visit History</h2>
            {visits.length === 0 ? (
                <p>No visits recorded.</p>
            ) : (
                <ul>
                    {visits.map((visit) => (
                        <li key={visit.normalizedUrl + visit.lastVisited}>
                            <a href={visit.url} target="_blank" rel="noopener noreferrer">
                                {visit.normalizedUrl}
                            </a>
                            <span> ({new Date(visit.lastVisited).toLocaleString()})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface Visit {
    url: string;
    normalizedUrl: string;
    lastVisited: number;
}