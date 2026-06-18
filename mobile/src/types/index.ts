export type UserRole = 'customer' | 'admin' | 'pickup_boy';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  total_earnings: number;
  total_pickups: number;
  commission_rate: number;
  pending_payout: number;
  vehicle_type?: string;
  is_active: boolean;
  is_blocked: boolean;
  is_clocked_in: boolean;
  notification_enabled: boolean;
}

export interface Rate {
  id: string;
  category: string;
  item_name: string;
  rate_per_kg: number;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  item_name: string;
  category: string;
  rate_per_kg: number;
  quantity?: number;
}

export interface Address {
  id?: string;
  label?: string;
  address_line: string;
  landmark?: string;
  gps_lat: number;
  gps_long: number;
  is_default?: boolean;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  assigned_boy_id?: string;
  boy_name?: string;
  items: OrderItem[];
  estimated_weight: number;
  actual_weight?: number;
  total_amount: number;
  payment_mode?: 'cash' | 'upi';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  customer_photo?: string;
  scale_photo?: string;
  vehicle_photo?: string;
  pickup_date: string;
  pickup_time_slot: string;
  address: Address;
  gps_lat: number;
  gps_long: number;
  flagged?: boolean;
  dispute_expires_at?: string;
  commission_amount?: number;
  created_at: string;
  completed_at?: string;
}

export interface ActivityLog {
  id: string;
  admin_name?: string;
  action: string;
  entity_type?: string;
  created_at: string;
}

export interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  active_boys: number;
  flagged_orders: Order[];
}

export interface Settlement {
  id: string;
  amount: number;
  payment_mode: string;
  notes?: string;
  created_at: string;
}
