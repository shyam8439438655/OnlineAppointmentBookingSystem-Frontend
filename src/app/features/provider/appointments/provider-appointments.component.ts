import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { formatDate, formatTime, getStatusColor } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Calendar, Clock, CheckCircle, FileText, Plus, X 
} from 'lucide-angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-provider-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './provider-appointments.component.html'
})
export class ProviderAppointmentsComponent implements OnInit {
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly FileText = FileText;
  readonly Plus = Plus;
  readonly X = X;

  providerId = '';
  appointments = signal<any[]>([]);
  loading = signal(true);
  filter = signal('All');

  // Record Modal
  recordModal = signal<any | null>(null);
  recordForm = { diagnosis: '', prescription: '', notes: '', followUpDate: '', attachmentUrl: '' };
  submittingRecord = signal(false);

  filteredAppointments = computed(() => {
    const f = this.filter();
    return this.appointments().filter(a => {
      if (f === 'All') return true;
      return a.status?.toUpperCase() === f.toUpperCase();
    });
  });

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
    this.fetchProvider();
  }

  fetchProvider() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<any>(`/providers/user/${user.userId}`).subscribe({
      next: (res) => {
        this.providerId = res.providerId;
        this.fetchAppointments();
      },
      error: () => this.loading.set(false)
    });
  }

  fetchAppointments() {
    this.api.get<any[]>(`/appointments/provider/${this.providerId}`).pipe(
      catchError((err: any) => {
        console.error('Provider appts error:', err);
        return of([]);
      })
    ).subscribe({
      next: (res) => {
        console.log('Provider Appts Response:', res);
        const apptsArray = Array.isArray(res) ? res : [];
        apptsArray.sort((a, b) => {
          const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
          const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
          return dateB - dateA;
        });
        this.appointments.set(apptsArray);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  completeAppointment(id: string) {
    this.api.put(`/appointments/${id}/complete`, {}).subscribe({
      next: () => {
        // Auto-update payment status if possible
        this.api.get<any>(`/payments/appointment/${id}`).subscribe({
          next: (payment) => {
            if (payment && payment.status !== 'PAID') {
              this.api.put(`/payments/${payment.paymentId}/status?status=PAID`, {}).subscribe();
            }
          }
        });
        this.toastr.success('Appointment completed & payment verified!');
        this.fetchAppointments();
      },
      error: () => this.toastr.error('Failed to complete appointment')
    });
  }

  submitRecord() {
    const appt = this.recordModal();
    if (!appt || !this.recordForm.diagnosis) {
      this.toastr.error('Diagnosis is required');
      return;
    }
    this.submittingRecord.set(true);
    this.api.post('/records', {
      appointmentId: appt.appointmentId,
      patientId: appt.patientId,
      providerId: this.providerId,
      ...this.recordForm
    }).subscribe({
      next: () => {
        this.toastr.success('Medical record created!');
        this.recordModal.set(null);
        this.recordForm = { diagnosis: '', prescription: '', notes: '', followUpDate: '', attachmentUrl: '' };
        this.submittingRecord.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to create record');
        this.submittingRecord.set(false);
      }
    });
  }

  formatDate(d: string) { return formatDate(d); }
  formatTime(t: string) { return formatTime(t); }
  getStatusColor(s: string) { return getStatusColor(s); }
}
