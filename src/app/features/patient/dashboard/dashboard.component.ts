import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, getStatusColor } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Calendar, FileText, CreditCard, Bell, ArrowRight, Clock, CheckCircle, AlertCircle, XCircle, Activity 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './dashboard.component.html'
})
export class PatientDashboardComponent implements OnInit {
  readonly Calendar = Calendar;
  readonly FileText = FileText;
  readonly CreditCard = CreditCard;
  readonly Bell = Bell;
  readonly ArrowRight = ArrowRight;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly XCircle = XCircle;
  readonly Activity = Activity;

  appointments = signal<any[]>([]);
  notifications = signal<any[]>([]);
  loading = signal(true);

  typeConfig: any = {
    BOOKING: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    REMINDER: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    CANCELLATION: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
    PAYMENT: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    FOLLOWUP: { icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
  };

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchData();
  }

  fetchData() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.loading.set(true);
    console.log('Patient Dashboard Auth User:', user);
    console.log('Fetching for ID:', user?.userId);

    forkJoin({
      appointments: this.api.get<any[]>(`/appointments/patient/${user?.userId}`).pipe(
        catchError(err => {
          console.error('Dash appts error:', err);
          return of([]);
        })
      ),
      notifications: this.api.get<any[]>(`/notifications/recipient/${user?.userId}`).pipe(
        catchError(err => {
          console.error('Dash notifs error:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: (res) => {
        console.log('Patient Dashboard Data Received:', res);
        const appts = Array.isArray(res.appointments) ? res.appointments : [];
        appts.sort((a, b) => {
          const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
          const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
          return dateB - dateA;
        });
        this.appointments.set(appts);
        this.notifications.set((Array.isArray(res.notifications) ? res.notifications : []).slice(0, 5));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard fatal error:', err);
        this.loading.set(false);
      }
    });
  }

  get stats() {
    const appts = this.appointments();
    return [
      { label: 'Total Appointments', value: appts.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Completed', value: appts.filter(a => a.status?.toUpperCase() === 'COMPLETED').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Cancelled', value: appts.filter(a => a.status?.toUpperCase() === 'CANCELLED').length, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
      { label: 'Unread Alerts', value: this.notifications().filter(n => !n.isRead).length, icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];
  }

  get upcoming() {
    return this.appointments().filter(a => a.status?.toUpperCase() === 'SCHEDULED').slice(0, 3);
  }

  formatDate(date: string) { return formatDate(date); }
  getStatusColor(status: string) { return getStatusColor(status); }
  getNotifIcon(type: string) { return this.typeConfig[type]?.icon || Bell; }
  getNotifColors(type: string) { return this.typeConfig[type] || { color: 'text-indigo-600', bg: 'bg-indigo-50' }; }
}
