import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { MedicalRecord } from '@core/models/models';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  FileText, Calendar, Pill, Microscope, StickyNote, ExternalLink 
} from 'lucide-angular';

@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './patient-records.component.html'
})
export class PatientRecordsComponent implements OnInit {
  readonly FileText = FileText;
  readonly Calendar = Calendar;
  readonly Pill = Pill;
  readonly Microscope = Microscope;
  readonly StickyNote = StickyNote;
  readonly ExternalLink = ExternalLink;

  records = signal<MedicalRecord[]>([]);
  loading = signal(true);
  selectedRecord = signal<MedicalRecord | null>(null);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchRecords();
  }

  fetchRecords() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.api.get<MedicalRecord[]>(`/records/patient/${user.userId}`).subscribe({
      next: (res) => {
        const sorted = (res || []).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.records.set(sorted);
        this.loading.set(false);

        // Auto-open the record matching the appointmentId query param
        const appointmentId = this.route.snapshot.queryParamMap.get('appointmentId');
        if (appointmentId) {
          const match = sorted.find(r => r.appointmentId === appointmentId);
          if (match) {
            this.selectedRecord.set(match);
          }
        }
      },
      error: () => this.loading.set(false)
    });
  }

  formatDate(d: string) { return formatDate(d); }
}
