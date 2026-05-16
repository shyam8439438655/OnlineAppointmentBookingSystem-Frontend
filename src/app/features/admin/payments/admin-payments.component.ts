import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  CreditCard, Search, Download, CheckCircle, Clock, XCircle, ArrowUpRight, Trash2, RefreshCw 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-payments.component.html'
})
export class AdminPaymentsComponent implements OnInit {
  readonly CreditCard = CreditCard;
  readonly Search = Search;
  readonly Download = Download;
  readonly CheckCircle = CheckCircle;
  readonly Clock = Clock;
  readonly XCircle = XCircle;
  readonly ArrowUpRight = ArrowUpRight;
  readonly Trash2 = Trash2;
  readonly RefreshCw = RefreshCw;

  payments = signal<any[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  filteredPayments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.payments().filter(p => 
      p.transactionId?.toLowerCase().includes(term) || 
      p.patientId?.toLowerCase().includes(term) ||
      p.appointmentId?.toLowerCase().includes(term)
    );
  });

  totalCollected = computed(() => 
    this.payments()
      .filter(p => p.status?.toUpperCase() === 'PAID')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn() || this.auth.currentUser()?.role !== 'Admin') {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchPayments();
  }

  fetchPayments() {
    this.api.get<any[]>('/payments').subscribe({
      next: (res) => {
        this.payments.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  handleDelete(id: string) {
    if (!confirm('Permanently delete this payment?')) return;
    this.api.delete(`/payments/${id}`).subscribe({
      next: () => {
        this.toastr.success('Payment deleted');
        this.fetchPayments();
      }
    });
  }

  handleDeleteAll() {
    if (confirm('WARNING: This will delete ALL payment records. Continue?')) {
      this.api.delete('/payments/deleteAll').subscribe({
        next: () => {
          this.toastr.success('All payment records deleted');
          this.fetchPayments();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }

  handleRefund(id: string) {
    if (!confirm('Process refund?')) return;
    this.api.put(`/payments/${id}/refund`, { reason: 'Admin initiated refund' }).subscribe({
      next: () => {
        this.toastr.success('Refund processed');
        this.fetchPayments();
      }
    });
  }

  handleApproveRefund(id: string) {
    this.api.put(`/payments/${id}/refund/approve`, { reason: 'Admin approved' }).subscribe({
      next: () => {
        this.toastr.success('Refund approved');
        this.fetchPayments();
      }
    });
  }

  handleRejectRefund(id: string) {
    this.api.put(`/payments/${id}/refund/reject`, { reason: 'Admin rejected' }).subscribe({
      next: () => {
        this.toastr.success('Refund rejected');
        this.fetchPayments();
      }
    });
  }

  handleUpdateStatus(id: string, status: string) {
    this.api.put(`/payments/${id}/status?status=${status}`, {}).subscribe({
      next: () => {
        this.toastr.success(`Status updated to ${status}`);
        this.fetchPayments();
      }
    });
  }

  downloadReport() {
    if (this.payments().length === 0) {
      this.toastr.warning('No records to download');
      return;
    }

    const headers = ['Transaction ID', 'Appointment ID', 'Patient ID', 'Amount', 'Status', 'Date'];
    const csvRows = [headers.join(',')];

    for (const p of this.payments()) {
      const row = [
        p.transactionId || 'CASH',
        p.appointmentId,
        p.patientId,
        p.amount,
        p.status,
        p.paidAt ? formatDate(p.paidAt) : ''
      ];
      csvRows.push(row.map(v => `"${v}"`).join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `MediBook_Revenue_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    this.toastr.success('Revenue report downloaded successfully');
  }

  formatDate(d: string) { return formatDate(d); }
}
