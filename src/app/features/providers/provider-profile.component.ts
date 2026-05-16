import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { Provider, AvailabilitySlot, Review } from '@core/models/models';
import { formatDate, formatTime, getInitials } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  MapPin, Clock, Star, CheckCircle, Calendar, ArrowLeft, Stethoscope, MessageSquare 
} from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, LucideAngularModule],
  templateUrl: './provider-profile.component.html'
})
export class ProviderProfileComponent implements OnInit {
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly Star = Star;
  readonly CheckCircle = CheckCircle;
  readonly Calendar = Calendar;
  readonly ArrowLeft = ArrowLeft;
  readonly Stethoscope = Stethoscope;
  readonly MessageSquare = MessageSquare;

  provider = signal<Provider | null>(null);
  slots = signal<AvailabilitySlot[]>([]);
  reviews = signal<Review[]>([]);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  today = new Date().toISOString().split('T')[0];
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.fetchData(id);
      }
    });
  }

  fetchData(id: string) {
    forkJoin({
      provider: this.api.get<Provider>(`/providers/${id}`),
      reviews: this.api.get<Review[]>(`/reviews/provider/${id}`).pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        let p = res.provider;
        const revs = res.reviews || [];
        if (revs.length > 0) {
          const sum = revs.reduce((acc, r) => acc + r.rating, 0);
          p = { ...p, avgRating: sum / revs.length, reviewCount: revs.length };
        }
        this.provider.set(p);
        this.reviews.set(revs);
        this.fetchSlots();
      },
      error: () => {
        this.toastr.error('Provider not found');
        this.loading.set(false);
      }
    });
  }

  fetchSlots() {
    const p = this.provider();
    if (!p) return;
    this.api.get<AvailabilitySlot[]>(`/slots/available`, { providerId: p.providerId, date: this.selectedDate() }).subscribe({
      next: (data) => {
        const normalized = (data || []).map(s => ({
          ...s,
          isBooked: s.isBooked ?? (s as any).booked ?? false,
          isBlocked: s.isBlocked ?? (s as any).blocked ?? false
        }));
        this.slots.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.slots.set([]);
        this.loading.set(false);
      }
    });
  }

  onDateChange() {
    this.loading.set(true);
    this.fetchSlots();
  }

  handleBook(slot: AvailabilitySlot) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const p = this.provider();
    this.router.navigate(['/patient/book'], {
      queryParams: {
        providerId: p?.providerId,
        slotId: slot.slotId,
        date: this.selectedDate(),
        start: slot.startTime,
        end: slot.endTime
      }
    });
  }

  getInitials(name: string) { return getInitials(name); }
  formatDate(date: string) { return formatDate(date); }
  formatTime(time: string) { return formatTime(time); }
  getStars(rating: number) { return [1, 2, 3, 4, 5].map(i => i <= Math.round(rating)); }
}
