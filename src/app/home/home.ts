
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService, UserProfile } from '../services/supabase';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  profile$!: Observable<UserProfile | null>;
  isGuest$!: Observable<boolean>;

  ngOnInit(): void {
    this.profile$ = this.supabaseService.getCurrentProfile();
    this.isGuest$ = this.supabaseService.getIsGuest();
  }

  goToBattle() {
    this.router.navigate(['/battle']);
  }

  async logout() {
    await this.supabaseService.signOut();
    this.router.navigate(['/']);
  }

  getExpPercentage(profile: UserProfile): number {
    const expInCurrentLevel = profile.experience % 500;
    return (expInCurrentLevel / 500) * 100;
  }

  getExpToNextLevel(profile: UserProfile): number {
    const expInCurrentLevel = profile.experience % 500;
    return 500 - expInCurrentLevel;
  }
}