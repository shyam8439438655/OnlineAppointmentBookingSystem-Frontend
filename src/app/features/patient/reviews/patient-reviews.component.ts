import { Component, OnInit, signal } from '@angular/core';
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
  Star, MessageSquare, Trash2 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-patient-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './patient-reviews.component.html'
})
export class PatientReviewsComponent implements OnInit {
  readonly Star = Star;
  readonly MessageSquare = MessageSquare;
  readonly Trash2 = Trash2;

  reviews = signal<Review[]>([]);
  loading = signal(true);

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
    this.fetchReviews();
  }

  fetchReviews() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<Review[]>(`/reviews/patient/${user.userId}`).subscribe({
      next: (res) => {
        this.reviews.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  deleteReview(id: string) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    this.api.delete(`/reviews/${id}`).subscribe({
      next: () => {
        this.reviews.set(this.reviews().filter(r => r.reviewId !== id));
        this.toastr.success('Review deleted');
      },
      error: () => this.toastr.error('Failed to delete review')
    });
  }

  formatDate(d: string) { return formatDate(d); }
}
