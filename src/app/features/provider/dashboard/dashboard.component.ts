import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, formatTime, getStatusColor } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Calendar, Clock, CheckCircle, ArrowRight, Star, TrendingUp 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './dashboard.component.html'
})
export class ProviderDashboardComponent implements OnInit {
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly ArrowRight = ArrowRight;
  readonly Star = Star;

  provider = signal<any>(null);
  appointments = signal<any[]>([]);
  slots = signal<any[]>([]);
  loading = signal(true);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
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

    this.api.get<any>(`/providers/user/${user.userId}`).pipe(
      catchError(() => of(null)),
      switchMap(p => {
        if (!p) return of({ provider: null, appointments: [], slots: [], earnings: 0 });
        this.provider.set(p);
        return forkJoin({
          provider: of(p),
          appointments: this.api.get<any[]>(`/appointments/provider/${p.providerId}`).pipe(catchError(() => of([]))),
          slots: this.api.get<any[]>(`/slots/provider/${p.providerId}`).pipe(catchError(() => of([]))),
          earnings: this.api.get<number>(`/payments/revenue/provider/${p.providerId}`).pipe(catchError(() => of(0)))
        });
      })
    ).subscribe({
      next: (res) => {
        // No longer filtering appts by users list to ensure resilience
        this.appointments.set(res.appointments || []);
        this.slots.set(res.slots || []);
        this.provider.update(p => ({ ...p, totalEarnings: res.earnings }));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  get stats() {
    const appts = this.appointments();
    const slts = this.slots();
    const today = new Date().toLocaleDateString('en-CA');
    const earnings = this.provider()?.totalEarnings || 0;
    
    return [
      { label: "Today's Appointments", value: appts.filter(a => a.appointmentDate?.split('T')[0] === today).length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Completed', value: appts.filter(a => a.status?.toUpperCase() === 'COMPLETED').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Available Slots', value: slts.filter(s => !s.isBooked && !s.isBlocked).length, icon: Star, color: 'text-teal-600', bg: 'bg-teal-50' },
      { label: 'Total Earnings', value: '₹' + earnings, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];
  }

  get todayAppts() {
    const today = new Date().toLocaleDateString('en-CA');
    return this.appointments().filter(a => a.appointmentDate?.split('T')[0] === today);
  }

  completeAppointment(id: string) {
    this.api.put(`/appointments/${id}/complete`, {}).subscribe({
      next: () => {
        this.toastr.success('Appointment marked as completed!');
        this.fetchData();
      },
      error: () => this.toastr.error('Failed to complete appointment')
    });
  }

  formatDate(date: string) { return formatDate(date); }
  formatTime(time: string) { return formatTime(time); }
  getStatusColor(status: string) { return getStatusColor(status); }
}
