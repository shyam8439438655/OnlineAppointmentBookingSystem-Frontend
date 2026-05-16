import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { 
  LucideAngularModule, 
  Users, UserCheck, Calendar, TrendingUp, Activity, Shield, ArrowRight 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  readonly Users = Users;
  readonly UserCheck = UserCheck;
  readonly Calendar = Calendar;
  readonly Shield = Shield;
  readonly ArrowRight = ArrowRight;
  readonly Activity = Activity;

  stats = signal({
    patients: 0,
    providers: 0,
    appointments: 0,
    pendingVerification: 0,
    totalRevenue: 0
  });
  recentAppts = signal<any[]>([]);
  loading = signal(true);

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
    forkJoin({
      users: this.api.get<any[]>('/auth/users').pipe(catchError(() => of([]))),
      providers: this.api.get<any[]>('/providers').pipe(catchError(() => of([]))),
      appts: this.api.get<any[]>('/appointments').pipe(catchError(() => of([]))),
      revenue: this.api.get<number>('/payments/revenue/total').pipe(catchError(() => of(0)))
    }).subscribe({
      next: (res) => {
        const users = Array.isArray(res.users) ? res.users : [];
        const providers = Array.isArray(res.providers) ? res.providers : [];
        const allAppts = Array.isArray(res.appts) ? res.appts : [];

        const validAppts = allAppts;

        const patients = users.filter(u => u.role === 'Patient').length;
        const pending = providers.filter(p => !p.isVerified).length;
        
        this.stats.set({
          patients,
          providers: providers.length,
          appointments: validAppts.length,
          pendingVerification: pending,
          totalRevenue: res.revenue
        });
        
        // Map names for recent VALID appointments
        const mapped = validAppts.slice(0, 5).map(a => {
          const pName = users.find(u => u.userId === a.patientId)?.fullName || 'Patient';
          const drName = providers.find(p => p.providerId === a.providerId)?.fullName || 'Doctor';
          return { ...a, patientName: pName, providerName: drName };
        });

        this.recentAppts.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  get statCards() {
    const s = this.stats();
    return [
      { label: 'Total Patients', value: s.patients, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/users' },
      { label: 'Total Providers', value: s.providers, icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', href: '/admin/providers' },
      { label: 'Total Appointments', value: s.appointments, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/appointments' },
      { label: 'Pending Verification', value: s.pendingVerification, icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50', href: '/admin/providers' },
      { label: 'Total Revenue', value: '₹' + s.totalRevenue, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/payments' },
    ];
  }
}
