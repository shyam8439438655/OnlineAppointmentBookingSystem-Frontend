import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { MedicalRecord } from '@core/models/models';
import { formatDate, formatTime, getStatusColor } from '@core/utils/utils';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { 
  LucideAngularModule, 
  Calendar, Clock, CreditCard, Star, XCircle, FileText, Pill, StickyNote, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-angular';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './patient-appointments.component.html'
})
export class PatientAppointmentsComponent implements OnInit {
  readonly Clock = Clock;
  readonly CreditCard = CreditCard;
  readonly Star = Star;
  readonly XCircle = XCircle;
  readonly Calendar = Calendar;
  readonly FileText = FileText;
  readonly Pill = Pill;
  readonly StickyNote = StickyNote;
  readonly ExternalLink = ExternalLink;
  readonly AlertCircle = AlertCircle;
  readonly RefreshCw = RefreshCw;

  appointments = signal<any[]>([]);
  loading = signal(true);
  filter = signal('All');
  statusFilters = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No-Show'];

  // Review modal
  reviewAppt = signal<any | null>(null);
  reviewForm = { rating: 5, comment: '' };
  submittingReview = signal(false);

  // Reschedule modal
  rescheduleAppt = signal<any | null>(null);
  availableSlots = signal<any[]>([]);
  rescheduleDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedNewSlot = signal<any | null>(null);
  loadingSlots = signal(false);
  submittingReschedule = signal(false);

  // Record modal — inline on this page, no navigation needed
  selectedRecord = signal<MedicalRecord | null>(null);
  loadingRecord = signal(false);
  noRecord = signal(false);

  filteredAppointments = computed(() => {
    const f = this.filter();
    return this.appointments().filter(a =>
      f === 'All' || a.status?.toUpperCase() === f.toUpperCase()
    );
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
    this.fetchAppointments();
  }

  fetchAppointments() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.loading.set(true);
    this.api.get<any[]>(`/appointments/patient/${user.userId}`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (appts) => {
        const arr = Array.isArray(appts) ? appts : [];
        arr.sort((a, b) =>
          new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        );
        // Attach payment info inline
        this.api.get<any[]>(`/payments/patient/${user.userId}`).pipe(catchError(() => of([]))).subscribe((payments: any) => {
          const paymentsArray = Array.isArray(payments) ? payments : [];
          const withPayments = arr.map(a => ({
            ...a,
            payment: paymentsArray.find((p: any) => p.appointmentId === a.appointmentId) || null
          }));
          this.appointments.set(withPayments);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false)
    });
  }

  // Opens record modal directly — no page navigation
  viewRecord(appointmentId: string) {
    this.loadingRecord.set(true);
    this.noRecord.set(false);
    this.selectedRecord.set(null);
    this.api.get<any>(`/records/appointment/${appointmentId}`).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (res) => {
        const record = Array.isArray(res) ? res[0] : res;
        if (record) {
          this.selectedRecord.set(record);
          this.noRecord.set(false);
        } else {
          this.noRecord.set(true);
        }
        this.loadingRecord.set(false);
      },
      error: () => {
        this.noRecord.set(true);
        this.loadingRecord.set(false);
      }
    });
  }

  cancelAppointment(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    this.api.put(`/appointments/${id}/cancel`, {}).subscribe({
      next: () => {
        this.toastr.success('Appointment cancelled');
        this.fetchAppointments();
      },
      error: () => this.toastr.error('Failed to cancel')
    });
  }

  submitReview() {
    const appt = this.reviewAppt();
    if (!appt) return;
    const user = this.auth.currentUser();
    if (!user) return;
    if (this.reviewForm.rating < 1) { this.toastr.error('Please select a rating'); return; }
    this.submittingReview.set(true);
    this.api.post('/reviews', {
      appointmentId: appt.appointmentId,
      patientId: user.userId,
      providerId: appt.providerId,
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment,
      isAnonymous: false
    }).subscribe({
      next: () => {
        this.toastr.success('Review submitted!');
        this.reviewAppt.set(null);
        this.reviewForm = { rating: 5, comment: '' };
        this.submittingReview.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to submit review');
        this.submittingReview.set(false);
      }
    });
  }

  openRescheduleModal(appt: any) {
    this.rescheduleAppt.set(appt);
    this.selectedNewSlot.set(null);
    this.fetchAvailableSlots(appt.providerId, this.rescheduleDate());
  }

  fetchAvailableSlots(providerId: string, date: string) {
    this.loadingSlots.set(true);
    this.api.get<any[]>(`/slots/available?providerId=${providerId}&date=${date}`).subscribe({
      next: (res) => {
        this.availableSlots.set(res || []);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.toastr.error('Failed to load available slots');
        this.loadingSlots.set(false);
      }
    });
  }

  confirmReschedule() {
    const appt = this.rescheduleAppt();
    const slot = this.selectedNewSlot();
    if (!appt || !slot) return;

    this.submittingReschedule.set(true);
    const request = {
      slotId: slot.slotId,
      appointmentDate: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime
    };

    this.api.put(`/appointments/${appt.appointmentId}/reschedule`, request).subscribe({
      next: () => {
        this.toastr.success('Appointment rescheduled successfully! 🗓️');
        this.rescheduleAppt.set(null);
        this.fetchAppointments();
        this.submittingReschedule.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Reschedule failed');
        this.submittingReschedule.set(false);
      }
    });
  }

  formatDate(d: string) { return formatDate(d); }
  formatTime(t: string) { return formatTime(t); }
  getStatusColor(s: string) { return getStatusColor(s); }
}
