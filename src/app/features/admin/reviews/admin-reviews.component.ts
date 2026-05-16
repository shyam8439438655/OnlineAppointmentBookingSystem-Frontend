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
  Star, 
  Trash2, 
  MessageSquare, 
  Flag, 
  Check 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './admin-reviews.component.html'
})
export class AdminReviewsComponent implements OnInit {
  readonly Star = Star;
  readonly Trash2 = Trash2;
  readonly MessageSquare = MessageSquare;
  readonly Flag = Flag;
  readonly Check = Check;

  reviews = signal<Review[]>([]);
  loading = signal(true);

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
    this.fetchReviews();
  }

  fetchReviews() {
    this.api.get<Review[]>('/reviews').subscribe({
      next: (res) => {
        this.reviews.set(res || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  deleteReview(id: string) {
    if (!confirm('Remove this review permanently?')) return;
    this.api.delete(`/reviews/${id}`).subscribe({
      next: () => {
        this.reviews.set(this.reviews().filter(r => r.reviewId !== id));
        this.toastr.success('Review removed');
      },
      error: () => this.toastr.error('Failed to remove review')
    });
  }

  handleDeleteAll() {
    if (confirm('WARNING: This will delete ALL reviews on the platform. Continue?')) {
      this.api.delete('/reviews/deleteAll').subscribe({
        next: () => {
          this.toastr.success('All reviews deleted');
          this.fetchReviews();
        },
        error: () => this.toastr.error('Mass delete failed')
      });
    }
  }

  formatDate(d: string) { return formatDate(d); }

  unflagReview(id: string) {
    this.api.put(`/reviews/${id}/unflag`, {}).subscribe({
      next: () => {
        this.toastr.success('Review flag dismissed');
        this.fetchReviews();
      },
      error: () => this.toastr.error('Failed to dismiss flag')
    });
  }
}
