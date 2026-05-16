import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { 
  LucideAngularModule, 
  LayoutDashboard, Calendar, Users, Star, CreditCard, FileText,
  Bell, Settings, BarChart3, Shield,
  Stethoscope, Clock, UserCheck, MessageSquare, DollarSign
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  patientLinks = [
    { href: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/providers', label: 'Find Providers', icon: Stethoscope },
    { href: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { href: '/patient/records', label: 'Medical Records', icon: FileText },
    { href: '/patient/payments', label: 'Payments', icon: CreditCard },
    { href: '/patient/reviews', label: 'My Reviews', icon: Star },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/patient/profile', label: 'My Profile', icon: Settings },
  ];

  providerLinks = [
    { href: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/provider/appointments', label: 'Appointments', icon: Calendar },
    { href: '/provider/slots', label: 'Manage Slots', icon: Clock },
    { href: '/provider/records', label: 'Medical Records', icon: FileText },
    { href: '/provider/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/provider/reviews', label: 'Reviews', icon: Star },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/provider/settings', label: 'My Profile', icon: Settings },
  ];

  adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Manage Users', icon: Users },
    { href: '/admin/providers', label: 'Verify Providers', icon: UserCheck },
    { href: '/admin/appointments', label: 'All Appointments', icon: Calendar },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/reviews', label: 'Moderate Reviews', icon: MessageSquare },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/records', label: 'Medical Records', icon: Shield },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ];

  constructor(public auth: AuthService, private router: Router) {}

  get links() {
    const role = this.auth.currentUser()?.role;
    if (role === 'Provider') return this.providerLinks;
    if (role === 'Admin') return this.adminLinks;
    return this.patientLinks;
  }

  isActive(href: string): boolean {
    return this.router.url === href || this.router.url.startsWith(href + '/');
  }
}
