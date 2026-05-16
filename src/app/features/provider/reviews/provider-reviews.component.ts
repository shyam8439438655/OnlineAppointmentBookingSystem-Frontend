import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { Review } from '@core/models/models';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Star, MessageSquare, Flag 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-provider-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './provider-reviews.component.html'
})
export class ProviderReviewsComponent implements OnInit {
  readonly Star = Star;
  readonly MessageSquare = MessageSquare;
  readonly Flag = Flag;

  reviews = signal<Review[]>([]);
  avgRating = signal<number>(0);
  loading = signal(true);

  ratingBreakdown = computed(() => {
    const counts = [0, 0, 0, 0, 0];
    const items = this.reviews();
    items.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    return counts.map((count, index) => ({
      rating: index + 1,
      count,
      pct: items.length > 0 ? (count / items.length) * 100 : 0
    })).reverse();
  });

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
      reviews: this.api.get<Review[]>(`/reviews/provider/${providerId}`).pipe(catchError(() => of([]))),
      avg: this.api.get<number>(`/reviews/provider/${providerId}/avg`).pipe(catchError(() => of(0)))
    }).subscribe({
      next: (res) => {
        const sorted = (res.reviews || []).sort((a, b) => 
          new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
        );
        this.reviews.set(sorted);
        
        let avg = typeof res.avg === 'number' ? res.avg : 0;
        if (avg === 0 && sorted.length > 0) {
          avg = sorted.reduce((acc, r) => acc + r.rating, 0) / sorted.length;
        }
        this.avgRating.set(avg);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatDate(d: string) { return formatDate(d); }
  round(n: number) { return Math.round(n); }

  flagReview(review: Review) {
    if (review.isFlagged) {
      this.toastr.info('This review is already flagged for moderation');
      return;
    }
    const reason = prompt('Why are you flagging this review as inappropriate?');
    if (!reason) return;

    this.api.put(`/reviews/${review.reviewId}/flag`, { reason }).subscribe({
      next: () => {
        this.toastr.success('Review flagged for moderation. Admin will review it.');
        this.fetchProvider();
      },
      error: () => this.toastr.error('Failed to flag review')
    });
  }
}
