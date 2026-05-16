import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { AvailabilitySlot } from '@core/models/models';
import { formatDate, formatTime } from '@core/utils/utils';
import { 
  LucideAngularModule, 
  Clock, Plus, Trash2, Lock, Unlock 
} from 'lucide-angular';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-manage-slots',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent, SidebarComponent, LucideAngularModule],
  templateUrl: './manage-slots.component.html'
})
export class ManageSlotsComponent implements OnInit {
  readonly Clock = Clock;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Lock = Lock;
  readonly Unlock = Unlock;

  providerId = '';
  slots = signal<AvailabilitySlot[]>([]);
  loading = signal(true);
  showAddForm = signal(false);
  submitting = signal(false);
  today = new Date().toISOString().split('T')[0];

  form = {
    date: '',
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    recurrence: 'NONE'
  };

  sortedSlots = computed(() => {
    return [...this.slots()].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return a.startTime.localeCompare(b.startTime);
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
        this.fetchSlots();
      },
      error: () => this.loading.set(false)
    });
  }

  fetchSlots() {
    this.api.get<AvailabilitySlot[]>(`/slots/provider/${this.providerId}`).subscribe({
      next: (res) => {
        const normalized = (res || []).map(s => ({
          ...s,
          isBooked: s.isBooked ?? (s as any).booked ?? false,
          isBlocked: s.isBlocked ?? (s as any).blocked ?? false
        }));
        this.slots.set(normalized);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  addSlot() {
    if (!this.form.date || !this.form.startTime || !this.form.endTime) {
      this.toastr.error('Please fill all fields');
      return;
    }
    this.submitting.set(true);
    this.api.post('/slots', { ...this.form, providerId: this.providerId }).subscribe({
      next: () => {
        this.toastr.success('Slot added!');
        this.showAddForm.set(false);
        this.form = { date: '', startTime: '09:00', endTime: '09:30', durationMinutes: 30, recurrence: 'NONE' };
        this.fetchSlots();
        this.submitting.set(false);
      },
      error: () => {
        this.toastr.error('Failed to add slot');
        this.submitting.set(false);
      }
    });
  }

  toggleBlock(slot: AvailabilitySlot) {
    const newStatus = !slot.isBlocked;
    this.api.put(`/slots/${slot.slotId}/block`, { isBlocked: newStatus }).subscribe({
      next: () => {
        this.toastr.success(`Slot ${newStatus ? 'blocked' : 'unblocked'}`);
        this.fetchSlots();
      },
      error: () => this.toastr.error('Failed to update slot')
    });
  }

  deleteSlot(id: string) {
    if (confirm('Are you sure you want to delete this slot?')) {
      this.api.delete(`/slots/${id}`).subscribe({
        next: () => {
          this.toastr.success('Slot deleted');
          this.fetchSlots();
        },
        error: (err) => {
          console.error('Delete slot error:', err);
          this.toastr.error('Failed to delete slot');
        }
      });
    }
  }

  formatDate(d: string) { return formatDate(d); }
  formatTime(t: string) { return formatTime(t); }
}
