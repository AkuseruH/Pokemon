import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  experience: number;
  battles_won: number;
  created_at: string;
}

export interface BattleHistory {
  id: number;
  user_id: string;
  my_pokemon: string;
  enemy_pokemon: string;
  result: 'win' | 'lose';
  exp_gained: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private currentProfile$ = new BehaviorSubject<UserProfile | null>(null);
  private isGuest$ = new BehaviorSubject<boolean>(false);

  constructor() {
    // Reemplaza con tus credenciales de Supabase
    this.supabase = createClient(
      'https://lgbqhtzndatceyaiudsp.supabase.co', // 👈 Cambia esto
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYnFodHpuZGF0Y2V5YWl1ZHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTY2ODUsImV4cCI6MjA4MDI3MjY4NX0.p_InInrVnQeb1W3rgeiwDfVeAhqXq4TU2cCJ2Qq_NrA' // 👈 Cambia esto
    );

    // Log para verificar que se inicializó
    console.log('✅ Supabase Service inicializado');

    // Verificar sesión actual
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser$.next(session?.user ?? null);
      if (session?.user) {
        this.loadProfile(session.user.id);
      }
    });

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser$.next(session?.user ?? null);
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this.currentProfile$.next(null);
      }
    });
  }

  // Método de prueba de conexión
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Probando conexión a Supabase...');
      
      // Intentar hacer una query simple
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Error de conexión:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}` 
        };
      }

      console.log('✅ Conexión exitosa a Supabase');
      return { 
        success: true, 
        message: 'Conexión exitosa a Supabase' 
      };
    } catch (error: any) {
      console.error('❌ Error inesperado:', error);
      return { 
        success: false, 
        message: `Error inesperado: ${error.message}` 
      };
    }
  }

  // Observables
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  getCurrentProfile(): Observable<UserProfile | null> {
    return this.currentProfile$.asObservable();
  }

  getIsGuest(): Observable<boolean> {
    return this.isGuest$.asObservable();
  }

  // Autenticación
  async signUp(email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Registrar usuario
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Error al crear usuario' };
      }

      // 2. Crear perfil
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username,
          level: 1,
          experience: 0,
          battles_won: 0
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      await this.loadProfile(authData.user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await this.loadProfile(data.user.id);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUser$.next(null);
    this.currentProfile$.next(null);
    this.isGuest$.next(false);
  }

  async continueAsGuest(): Promise<void> {
    this.isGuest$.next(true);
    this.currentUser$.next(null);
    this.currentProfile$.next(null);
  }

  // Perfil
  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      this.currentProfile$.next(data as UserProfile);
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser$.value;
    if (!user) {
      return { success: false, error: 'No hay usuario autenticado' };
    }

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      await this.loadProfile(user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Batallas
  async saveBattleResult(
    myPokemon: string,
    enemyPokemon: string,
    result: 'win' | 'lose'
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser$.value;
    const profile = this.currentProfile$.value;

    // Si es invitado, no guardar nada
    if (this.isGuest$.value || !user || !profile) {
      return { success: true }; // Retornar success para no mostrar error
    }

    try {
      const expGained = result === 'win' ? 100 : 25;
      const newExp = profile.experience + expGained;
      const newLevel = Math.floor(newExp / 500) + 1;
      const newBattlesWon = result === 'win' ? profile.battles_won + 1 : profile.battles_won;

      // 1. Guardar historial de batalla
      const { error: battleError } = await this.supabase
        .from('battle_history')
        .insert({
          user_id: user.id,
          my_pokemon: myPokemon,
          enemy_pokemon: enemyPokemon,
          result: result,
          exp_gained: expGained
        });

      if (battleError) {
        return { success: false, error: battleError.message };
      }

      // 2. Actualizar perfil
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          experience: newExp,
          level: newLevel,
          battles_won: newBattlesWon
        })
        .eq('id', user.id);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      await this.loadProfile(user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getBattleHistory(limit: number = 10): Promise<BattleHistory[]> {
    const user = this.currentUser$.value;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('battle_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error loading battle history:', error);
      return [];
    }

    return data as BattleHistory[];
  }

  // Helpers
  isAuthenticated(): boolean {
    return this.currentUser$.value !== null;
  }

  isGuestMode(): boolean {
    return this.isGuest$.value;
  }

  getProfile(): UserProfile | null {
    return this.currentProfile$.value;
  }
}