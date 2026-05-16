import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { formatDate, formatTime } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Calendar, CheckCircle, ArrowLeft, CreditCard, Banknote 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

declare const Razorpay: any;

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, LucideAngularModule],
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit {
  readonly Calendar = Calendar;
  readonly CheckCircle = CheckCircle;
  readonly ArrowLeft = ArrowLeft;
  readonly CreditCard = CreditCard;
  readonly Banknote = Banknote;

  providerId = '';
  slotId = '';
  date = '';
  start = '';
  end = '';

  provider = signal<any>(null);
  form = {
    serviceType: 'General Consultation',
    modeOfConsultation: 'In-Person' as 'In-Person' | 'Teleconsultation',
    notes: '',
    paymentMode: 'Online' as 'Online' | 'Cash',
  };
  loading = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      this.providerId = params['providerId'] || '';
      this.slotId = params['slotId'] || '';
      this.date = params['date'] || '';
      this.start = params['start'] || '';
      this.end = params['end'] || '';

      if (this.providerId) this.fetchProvider();
    });
  }

  fetchProvider() {
    this.api.get<any>(`/providers/${this.providerId}`).subscribe({
      next: (data) => this.provider.set(data),
      error: () => this.toastr.error('Provider details not found')
    });
  }

  handleBookingClick() {
    if (this.form.paymentMode === 'Online') {
      this.handleRazorpayPayment();
    } else {
      this.processBooking('Pending');
    }
  }

  handleRazorpayPayment() {
    const user = this.auth.currentUser();
    const p = this.provider();
    if (!user || !p) return;

    this.loading.set(true);
    // 1. Create Appointment first
    this.api.post<any>('/appointments', {
      patientId: user.userId,
      providerId: this.providerId,
      slotId: this.slotId,
      appointmentDate: this.date,
      startTime: this.start,
      endTime: this.end,
      serviceType: this.form.serviceType,
      modeOfConsultation: this.form.modeOfConsultation,
      notes: this.form.notes,
      status: 'Scheduled',
    }).subscribe({
      next: (res) => {
        const appointmentId = res.appointmentId;
        const amount = this.provider()?.consultationFee || 500;

        // 2. Create Razorpay Order
        this.api.post<any>('/payments/create-order', { amount, currency: 'INR', appointmentId }).subscribe({
          next: (res) => {
            const orderId = res.orderId;
            const options = {
              key: 'rzp_test_SjgGSLrNwP4J9Q',
              amount: amount * 100,
              currency: 'INR',
              name: 'MediBook',
              description: `Appointment with ${p.fullName}`,
              order_id: orderId,
              handler: (response: any) => {
                this.verifyAndProcessPayment(response, appointmentId, amount);
              },
              prefill: {
                name: user.fullName,
                email: user.email,
              },
              theme: {
                color: '#4f46e5',
              },
              modal: {
                ondismiss: () => this.loading.set(false)
              }
            };
            const rzp = new Razorpay(options);
            rzp.open();
          },
          error: () => {
            this.toastr.error('Failed to initiate payment order');
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Booking failed');
        this.loading.set(false);
      }
    });
  }

  verifyAndProcessPayment(response: any, appointmentId: string, amount: number) {
    const user = this.auth.currentUser();
    const p = this.provider();
    if (!user || !p) return;

    this.api.post<boolean>('/payments/verify', {
      orderId: response.razorpay_order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature,
    }).subscribe({
      next: (verified) => {
        if (verified) {
          this.api.post('/payments', {
            appointmentId,
            patientId: user.userId,
            providerId: p.providerId,
            amount,
            status: 'PAID',
            mode: 'Online',
            transactionId: response.razorpay_payment_id,
            currency: 'INR',
            notes: `Razorpay Payment ID: ${response.razorpay_payment_id}`
          }).subscribe({
            next: () => {
              this.toastr.success('Payment successful & Appointment booked! 🎉');
              this.router.navigate(['/patient/appointments']);
            },
            error: () => this.toastr.error('Error recording payment')
          });
        } else {
          this.toastr.error('Payment verification failed');
          this.loading.set(false);
        }
      },
      error: () => {
        this.toastr.error('Error verifying payment');
        this.loading.set(false);
      }
    });
  }

  processBooking(paymentStatus: string) {
    const user = this.auth.currentUser();
    const p = this.provider();
    if (!user || !p) return;

    this.loading.set(true);
    this.api.post<any>('/appointments', {
      patientId: user.userId,
      providerId: this.providerId,
      slotId: this.slotId,
      appointmentDate: this.date,
      startTime: this.start,
      endTime: this.end,
      serviceType: this.form.serviceType,
      modeOfConsultation: this.form.modeOfConsultation,
      notes: this.form.notes,
      status: 'Scheduled',
    }).subscribe({
      next: (res) => {
        const appointmentId = res.appointmentId;
        this.api.post('/payments', {
          appointmentId,
          patientId: user.userId,
          providerId: p.providerId,
          amount: this.provider()?.consultationFee || 500.00,
          status: 'PENDING',
          mode: 'CASH',
          transactionId: null,
          currency: 'INR',
          notes: 'Pay at Clinic'
        }).subscribe({
          next: () => {
            this.toastr.success('Appointment booked successfully! 🎉');
            this.router.navigate(['/patient/appointments']);
          },
          error: () => this.toastr.error('Error recording booking')
        });
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Booking failed');
        this.loading.set(false);
      }
    });
  }

  formatDate(d: string) { return formatDate(d); }
  formatTime(t: string) { return formatTime(t); }
}
