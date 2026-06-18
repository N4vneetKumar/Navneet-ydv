// Shared types mirror mobile/src/types — import in both packages as needed
export type UserRole = 'customer' | 'admin' | 'pickup_boy';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface OrderStatus {
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
}
