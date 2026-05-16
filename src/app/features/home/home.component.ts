import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { 
  LucideAngularModule, 
  Activity, Search, Calendar, Shield, Star, ArrowRight, ChevronRight,
  Stethoscope, CreditCard, FileText, Bell, Users, CheckCircle2 
} from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, LucideAngularModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  readonly Activity = Activity;
  readonly Search = Search;
  readonly Calendar = Calendar;
  readonly Shield = Shield;
  readonly Star = Star;
  readonly ArrowRight = ArrowRight;
  readonly ChevronRight = ChevronRight;
  readonly Stethoscope = Stethoscope;
  readonly CreditCard = CreditCard;
  readonly FileText = FileText;
  readonly Bell = Bell;
  readonly Users = Users;
  readonly CheckCircle2 = CheckCircle2;

  specializations = [
    'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology',
    'Pediatrics', 'Psychiatry', 'Gynecology', 'Ophthalmology',
  ];

  features = [
    { icon: Search, title: 'Find the Right Doctor', desc: 'Search by specialization, location, or name. Filter by rating and availability.', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { icon: Calendar, title: 'Real-Time Booking', desc: 'View live availability and book your slot instantly — no calls, no waiting.', bg: 'bg-teal-50', text: 'text-teal-600' },
    { icon: CreditCard, title: 'Secure Payments', desc: 'Pay online via card, UPI, or wallet. Refunds processed automatically.', bg: 'bg-rose-50', text: 'text-rose-600' },
    { icon: FileText, title: 'Digital Health Records', desc: 'Access your medical history and prescriptions from every visit.', bg: 'bg-amber-50', text: 'text-amber-600' },
    { icon: Bell, title: 'Smart Reminders', desc: 'Automated reminders 24h and 1h before your appointment.', bg: 'bg-green-50', text: 'text-green-600' },
    { icon: Shield, title: 'HIPAA Compliant', desc: 'Records encrypted at rest and in transit. Full audit trail maintained.', bg: 'bg-blue-50', text: 'text-blue-600' },
  ];

  stats = [
    { value: '50K+', label: 'Patients Served' },
    { value: '2,000+', label: 'Verified Providers' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '40+', label: 'Specializations' },
  ];

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}
