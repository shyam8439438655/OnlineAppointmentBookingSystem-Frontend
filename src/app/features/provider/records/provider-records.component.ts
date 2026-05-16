import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { MedicalRecord } from '@core/models/models';
import { formatDate } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  FileText, Pill, StickyNote, Calendar, ExternalLink, X, Pencil, Save, AlertCircle
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-provider-records',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, LucideAngularModule, FormsModule],
  templateUrl: './provider-records.component.html'
})
export class ProviderRecordsComponent implements OnInit {
  readonly FileText = FileText;
  readonly Pill = Pill;
  readonly StickyNote = StickyNote;
  readonly Calendar = Calendar;
  readonly ExternalLink = ExternalLink;
  readonly X = X;
  readonly Pencil = Pencil;
  readonly Save = Save;
  readonly AlertCircle = AlertCircle;

  records = signal<MedicalRecord[]>([]);
  loading = signal(true);
  selectedRecord = signal<MedicalRecord | null>(null);
  
  // Editing state
  isEditing = signal(false);
  editForm = { diagnosis: '', prescription: '', notes: '', followUpDate: '' };
  updating = signal(false);

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
        if (res?.providerId) {
          this.fetchRecords(res.providerId);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  fetchRecords(providerId: string) {
    this.api.get<MedicalRecord[]>(`/records/provider/${providerId}`).subscribe({
      next: (res) => {
        this.records.set((res || []).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatDate(d: string) { return formatDate(d); }

  startEdit(record: MedicalRecord) {
    this.selectedRecord.set(record);
    this.editForm = {
      diagnosis: record.diagnosis,
      prescription: record.prescription,
      notes: record.notes,
      followUpDate: record.followUpDate
    };
    this.isEditing.set(true);
  }

  updateRecord() {
    const record = this.selectedRecord();
    if (!record) return;

    this.updating.set(true);
    this.api.put(`/records/${record.recordId}`, this.editForm).subscribe({
      next: () => {
        this.toastr.success('Medical record updated! 🎉');
        this.fetchProvider();
        this.selectedRecord.set(null);
        this.isEditing.set(false);
        this.updating.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Update failed');
        this.updating.set(false);
      }
    });
  }

  canEdit(record: MedicalRecord): boolean {
    if (!record.createdAt) return true;
    const created = new Date(record.createdAt).getTime();
    const now = new Date().getTime();
    const diff = now - created;
    return diff < (24 * 60 * 60 * 1000); // 24 hours
  }

  getTimeRemaining(createdAt: string): string {
    const created = new Date(createdAt).getTime();
    const expiry = created + (24 * 60 * 60 * 1000);
    const remaining = expiry - new Date().getTime();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  }
}
