import React from 'react';
import { ShoppingBag, Package, Search } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = ShoppingBag, 
  title = 'No items found', 
  message = 'Try adjusting your search or filters',
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-purple-100 rounded-full p-6 mb-4">
        <Icon className="w-12 h-12 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">{message}</p>
      {action && action}
    </div>
  );
}