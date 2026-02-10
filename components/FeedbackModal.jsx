import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export const FeedbackModal = ({
  isOpen,
  onClose,
  type = 'success', // 'success' or 'error'
  title,
  message
}) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
            {isSuccess ? (
              <CheckCircle className={`h-8 w-8 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
            ) : (
              <XCircle className={`h-8 w-8 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
            )}
          </div>
          <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              {message}
            </p>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className={`inline-flex justify-center w-full rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${
                isSuccess 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};