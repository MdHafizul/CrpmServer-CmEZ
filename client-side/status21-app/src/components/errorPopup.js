'use client';

export default function ErrorPopup({ error, onClose }) {
    if (!error) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <h2 className="text-lg font-bold text-red-600 mb-4">Error</h2>
                <p className="text-gray-800 mb-2">{error.message}</p>
                {error.details && (
                    <pre className="bg-gray-100 p-2 rounded text-sm text-gray-600 overflow-auto max-h-40">
                        {error.details}
                    </pre>
                )}
                <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Close
                </button>
            </div>
        </div>
    );
}