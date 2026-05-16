import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, getStatusColor } from '@core/utils/utils';
import { FilterByStatusPipe } from '@core/pipes/filter-by-status.pipe';
import { 
  LucideAngularModule, 
  CreditCard, RefreshCw, Star 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-patient-payments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule, FilterByStatusPipe],
  templateUrl: './patient-payments.component.html'
})
export class PatientPaymentsComponent implements OnInit {
  readonly CreditCard = CreditCard;
  readonly RefreshCw = RefreshCw;
  readonly Star = Star;

  payments = signal<any[]>([]);
  loading = signal(true);
  
  showReviewModal = signal(false);
  selectedPayment = signal<any>(null);
  reviewForm = { rating: 5, comment: '' };
  submittingReview = signal(false);

  totalPaid = computed(() => 
    this.payments()
      .filter(p => p.status?.toUpperCase() === 'PAID' || p.status?.toUpperCase() === 'COMPLETED')
      .reduce((s, p) => s + (p.amount || 0), 0)
  );

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
    this.fetchPayments();
  }

  fetchPayments() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<any[]>(`/payments/patient/${user.userId}`).subscribe({
      next: (res) => {
        this.payments.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  requestRefund(id: string) {
    this.api.put(`/payments/${id}/request-refund`, { notes: 'Patient requested refund from dashboard' }).subscribe({
      next: () => {
        this.toastr.success('Refund request sent');
        this.fetchPayments();
      }
    });
  }

  openReview(payment: any) {
    this.selectedPayment.set(payment);
    this.showReviewModal.set(true);
  }

  submitReview() {
    const p = this.selectedPayment();
    const user = this.auth.currentUser();
    if (!p || !user) return;

    this.submittingReview.set(true);
    this.api.post('/reviews', {
      appointmentId: p.appointmentId,
      patientId: user.userId,
      providerId: p.providerId,
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment
    }).subscribe({
      next: () => {
        this.toastr.success('Review submitted!');
        this.showReviewModal.set(false);
        this.reviewForm = { rating: 5, comment: '' };
        this.submittingReview.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to submit review');
        this.submittingReview.set(false);
      }
    });
  }

  formatDate(d: string) { return formatDate(d); }
  getStatusColor(s: string) { return getStatusColor(s); }
}
