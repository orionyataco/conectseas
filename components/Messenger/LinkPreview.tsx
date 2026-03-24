import React, { useState, useEffect } from 'react';
import { getLinkPreview } from '../../services/api';
import { ExternalLink, Loader2 } from 'lucide-react';

interface LinkPreviewProps {
    url: string;
}

interface PreviewData {
    title: string;
    description: string;
    image: string;
    url: string;
    siteName: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        getLinkPreview(url)
            .then(data => {
                if (isMounted) {
                    setPreview(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [url]);

    if (loading) {
        return (
            <div className="mt-2 p-2 border border-slate-100 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-center min-h-[60px]">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !preview || (!preview.title && !preview.description)) {
        return null; // Don't show anything if fails or no metadata
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
        >
            {preview.image && (
                <div className="h-32 w-full overflow-hidden">
                    <img 
                        src={preview.image} 
                        alt={preview.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                </div>
            )}
            <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                    {preview.siteName && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {preview.siteName}
                        </span>
                    )}
                    <ExternalLink size={10} className="text-slate-400" />
                </div>
                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1">
                    {preview.title}
                </h5>
                {preview.description && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
};

export default LinkPreview;
