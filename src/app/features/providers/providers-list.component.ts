import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { Provider } from '@core/models/models';
import { 
  LucideAngularModule, 
  Search, Star, MapPin, Clock, CheckCircle, ChevronRight, Stethoscope 
} from 'lucide-angular';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-providers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, LucideAngularModule],
  templateUrl: './providers-list.component.html'
})
export class ProvidersListComponent implements OnInit {
  readonly Search = Search;
  readonly Star = Star;
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly ChevronRight = ChevronRight;
  readonly Stethoscope = Stethoscope;

  specializations = [
    'All', 'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology',
    'Pediatrics', 'Psychiatry', 'Gynecology', 'Ophthalmology', 'Dentistry', 'General Medicine',
  ];

  allProviders = signal<Provider[]>([]);
  searchQuery = signal('');
  selectedSpec = signal('All');
  minRating = signal(0);
  sortBy = signal('Default');
  loading = signal(true);

  filteredProviders = computed(() => {
    let list = this.allProviders();
    const spec = this.selectedSpec();
    const query = this.searchQuery().toLowerCase().trim();
    const rating = this.minRating();
    const sort = this.sortBy();

    if (spec !== 'All') {
      list = list.filter(p => p.specialization === spec);
    }

    if (rating > 0) {
      list = list.filter(p => (p.avgRating || 0) >= rating);
    }

    if (query) {
      list = list.filter(p => 
        p.fullName?.toLowerCase().includes(query) ||
        p.specialization?.toLowerCase().includes(query) ||
        p.clinicName?.toLowerCase().includes(query) ||
        p.clinicAddress?.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sort === 'Rating') {
      list = [...list].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    } else if (sort === 'Experience') {
      list = [...list].sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
    }

    return list;
  });

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['specialization']) {
        this.selectedSpec.set(params['specialization']);
      }
    });
    this.fetchProviders();
  }

  fetchProviders() {
    this.api.get<Provider[]>('/providers').subscribe({
      next: (data) => {
        const providers = data || [];
        this.allProviders.set(providers);
        
        // Fetch extra info (ratings) in parallel
        const extraReqs = providers.map(p => 
          forkJoin({
            avg: this.api.get<number>(`/reviews/provider/${p.providerId}/avg-rating`),
            count: this.api.get<number>(`/reviews/provider/${p.providerId}/count`)
          }).pipe(
            map(res => ({ ...p, avgRating: res.avg || 0, reviewCount: res.count || 0 }))
          )
        );

        if (extraReqs.length > 0) {
          forkJoin(extraReqs).subscribe(updated => {
            this.allProviders.set(updated);
            this.loading.set(false);
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  getStars(rating: number) {
    return [1, 2, 3, 4, 5].map(i => i <= Math.round(rating));
  }
}
