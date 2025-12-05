import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PokemonService, Pokemon } from '../services/pokemon';
import { BattleService, BattleState } from '../services/battle';
import { SupabaseService } from '../services/supabase';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './battle.html',
  styleUrl: './battle.css'
})
export class BattleComponent implements OnInit {
  private pokemonService = inject(PokemonService);
  private battleService = inject(BattleService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  battleState$!: Observable<BattleState>;
  isLoading = false;
  showTeamSelection = false;
  battleSaved = false;

  ngOnInit(): void {
    this.battleState$ = this.battleService.getBattleState();
    
    // Suscribirse a cambios de estado para guardar resultado
    this.battleState$.subscribe(async (state) => {
      // Guardar resultado cuando termina la batalla
      if ((state.battleStatus === 'player-won' || state.battleStatus === 'cpu-won') && !this.battleSaved) {
        this.battleSaved = true;
        await this.saveBattleResult(state);
      }

      // Abrir modal de selección automáticamente si es necesario
      if (state.waitingForSwitch && state.battleStatus === 'ongoing') {
        this.showTeamSelection = true;
      }
    });
  }

  async saveBattleResult(state: BattleState) {
    const myPokemon = state.playerTeam[0].name;
    const enemyPokemon = state.cpuTeam[0].name;
    const result = state.battleStatus === 'player-won' ? 'win' : 'lose';

    const saveResult = await this.supabaseService.saveBattleResult(
      myPokemon,
      enemyPokemon,
      result
    );

    if (!saveResult.success && saveResult.error) {
      console.error('Error saving battle:', saveResult.error);
    }
  }

  startBattle(): void {
    this.isLoading = true;
    this.battleSaved = false;
    
    this.pokemonService.generateRandomTeam().subscribe({
      next: (playerTeam) => {
        this.pokemonService.generateRandomTeam().subscribe({
          next: (cpuTeam) => {
            this.battleService.initBattle(playerTeam, cpuTeam);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading CPU team:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading player team:', error);
        this.isLoading = false;
      }
    });
  }

  useMove(moveIndex: number): void {
    this.battleService.playerAttack(moveIndex);
  }

  switchPokemon(index: number): void {
    this.battleService.switchPokemon(index);
    this.showTeamSelection = false;
  }

  toggleTeamSelection(): void {
    // No permitir cerrar el modal si se está esperando un cambio forzado
    const state = this.battleState$;
    state.subscribe(s => {
      if (!s.waitingForSwitch) {
        this.showTeamSelection = !this.showTeamSelection;
      }
    }).unsubscribe();
  }

  newBattle(): void {
    this.battleService.resetBattle();
    this.battleSaved = false;
    this.startBattle();
  }

  goToHome(): void {
    this.battleService.resetBattle();
    this.router.navigate(['/home']);
  }

  getHPPercentage(pokemon: Pokemon): number {
    return (pokemon.currentHP / pokemon.maxHP) * 100;
  }

  getHPColor(percentage: number): string {
    if (percentage > 50) return '#4ade80';
    if (percentage > 20) return '#fbbf24';
    return '#ef4444';
  }
}