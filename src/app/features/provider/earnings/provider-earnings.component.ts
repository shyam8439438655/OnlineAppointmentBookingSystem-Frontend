import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, getStatusColor } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  DollarSign, TrendingUp, Clock, RefreshCw 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-provider-earnings',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './provider-earnings.component.html'
})
export class ProviderEarningsComponent implements OnInit {
  readonly DollarSign = DollarSign;
  readonly TrendingUp = TrendingUp;
  readonly Clock = Clock;
  readonly RefreshCw = RefreshCw;

  payments = signal<any[]>([]);
  totalRevenue = signal<number>(0);
  loading = signal(true);

  pendingAmount = computed(() => 
    this.payments()
      .filter(p => p.status?.toUpperCase() === 'PENDING' || p.status?.toUpperCase() === 'REFUND_REQUESTED')
      .reduce((s, p) => s + (p.amount || 0), 0)
  );

  refundedAmount = computed(() => 
    this.payments()
      .filter(p => p.status?.toUpperCase() === 'REFUNDED')
      .reduce((s, p) => s + (p.amount || 0), 0)
  );

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn() || this.auth.currentUser()?.role !== 'Provider') {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchProvider();
  }

  fetchProvider() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<any>(`/providers/user/${user.userId}`).subscribe({
      next: (res) => {
        if (res?.providerId) {
          this.fetchData(res.providerId);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  fetchData(providerId: string) {
    forkJoin({
      payments: this.api.get<any[]>(`/payments/provider/${providerId}`).pipe(catchError(() => of([]))),
      revenue: this.api.get<any>(`/payments/provider/${providerId}/revenue`).pipe(catchError(() => of(0))),
      appts: this.api.get<any[]>(`/appointments/provider/${providerId}`).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        const sortedPayments = (res.payments || []).sort((a, b) => {
          const timeA = new Date(a.paidAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.paidAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        this.payments.set(sortedPayments);

        let rev = typeof res.revenue === 'number' ? res.revenue : parseFloat(res.revenue) || 0;
        
        // Fallback calculations
        if (rev === 0 && sortedPayments.length > 0) {
          rev = sortedPayments
            .filter(p => p.status?.toUpperCase() === 'PAID' || p.status?.toUpperCase() === 'COMPLETED')
            .reduce((s, p) => s + (p.amount || 0), 0);
        }
        if (rev === 0 && res.appts.length > 0) {
          const completed = res.appts.filter(a => a.status?.toUpperCase() === 'COMPLETED');
          if (completed.length > 0) rev = completed.length * 500;
        }

        this.totalRevenue.set(rev);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  approveRefund(id: string) {
    this.api.put(`/payments/${id}/refund/approve`, { reason: 'Provider approved refund' }).subscribe({
      next: () => {
        this.toastr.success('Refund approved');
        this.fetchProvider();
      }
    });
  }

  rejectRefund(id: string) {
    this.api.put(`/payments/${id}/refund/reject`, { reason: 'Provider rejected refund' }).subscribe({
      next: () => {
        this.toastr.success('Refund rejected');
        this.fetchProvider();
      }
    });
  }

  initiateRefund(id: string) {
    if (confirm('Initiate refund?')) {
      this.api.put(`/payments/${id}/refund`, { reason: 'Provider initiated refund' }).subscribe({
        next: () => {
          this.toastr.success('Refund processed');
          this.fetchProvider();
        }
      });
    }
  }

  formatDate(d: string) { return formatDate(d); }
  getStatusColor(s: string) { return getStatusColor(s); }
}
