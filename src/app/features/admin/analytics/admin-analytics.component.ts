import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { 
  LucideAngularModule, 
  BarChart3, TrendingUp, Users, Calendar, Star, CheckCircle, Activity, Download, DollarSign 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-analytics.component.html'
})
export class AdminAnalyticsComponent implements OnInit {
  readonly BarChart3 = BarChart3;
  readonly TrendingUp = TrendingUp;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly Star = Star;
  readonly CheckCircle = CheckCircle;
  readonly Activity = Activity;
  readonly Download = Download;
  readonly DollarSign = DollarSign;

  data = signal<any>({});
  loading = signal(true);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn() || this.auth.currentUser()?.role !== 'Admin') {
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
      reviews: this.api.get<any[]>('/reviews').pipe(catchError(() => of([]))),
      payments: this.api.get<any[]>('/payments').pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        const users = Array.isArray(res.users) ? res.users : [];
        const providers = Array.isArray(res.providers) ? res.providers : [];
        const allAppts = Array.isArray(res.appts) ? res.appts : [];
        const allReviews = Array.isArray(res.reviews) ? res.reviews : [];
        const allPayments = Array.isArray(res.payments) ? res.payments : [];

        const appts = allAppts;
        const payments = allPayments;
        const reviews = allReviews;

        const specCounts: Record<string, number> = {};
        providers.forEach((p: any) => {
          if (p.specialization) specCounts[p.specialization] = (specCounts[p.specialization] || 0) + 1;
        });
        const topSpecs = Object.entries(specCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

        const statusCounts: Record<string, number> = {};
        appts.forEach((a: any) => {
          const status = a.status?.toUpperCase() || 'UNKNOWN';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const completionRate = appts.length > 0
          ? ((statusCounts['COMPLETED'] || 0) / appts.length * 100).toFixed(1)
          : '0';

        const totalRevenue = payments
          .filter((p: any) => p.status?.toUpperCase() === 'PAID')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        this.data.set({
          totalUsers: users.length,
          totalPatients: users.filter((u: any) => u.role === 'Patient').length,
          totalProviders: providers.length,
          verifiedProviders: providers.filter((p: any) => p.isVerified).length,
          totalAppointments: appts.length,
          totalReviews: reviews.length,
          completionRate,
          topSpecs,
          statusCounts,
          totalRevenue,
          payments
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  generateReport() {
    const d = this.data();
    if (!d.payments) return;
    const rows = [
      ['Payment ID', 'Amount', 'Currency', 'Mode', 'Status', 'Transaction ID', 'Paid At'],
      ...d.payments.map((p: any) => [
        p.paymentId, p.amount, 'INR', p.mode || 'Cash',
        p.status, p.transactionId || '', p.paidAt || ''
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medibook-revenue-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  calculatePercentage(value: any, total: any): number {
    const v = Number(value) || 0;
    const t = Number(total) || 1;
    return (v / t) * 100;
  }
}
