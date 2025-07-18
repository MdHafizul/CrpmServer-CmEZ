import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TNBLogo from '../../assets/images/TNB.png';

const Header: React.FC = () => {
  const location = useLocation();
  
  return (
    <header className="bg-white shadow-sm z-10 py-4 px-6">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img 
              className="h-6 w-auto" 
              src={TNBLogo} 
              alt="TNB Logo"
            />
            <span className="ml-2 text-base font-medium text-gray-900">
              TNB Collection System
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link 
              to="/"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Upload
            </Link>
            <Link 
              to="/dashboard"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/dashboard' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;