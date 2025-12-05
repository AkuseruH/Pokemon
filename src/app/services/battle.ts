import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pokemon, PokemonMove } from './pokemon';

export interface BattleState {
  playerTeam: Pokemon[];
  cpuTeam: Pokemon[];
  playerActivePokemon: number;
  cpuActivePokemon: number;
  battleLog: string[];
  isPlayerTurn: boolean;
  battleStatus: 'ongoing' | 'player-won' | 'cpu-won' | 'not-started';
  waitingForSwitch: boolean; // Nuevo: indica si estamos esperando un cambio forzado
}

export interface TypeEffectiveness {
  [key: string]: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class BattleService {
  private battleState$ = new BehaviorSubject<BattleState>({
    playerTeam: [],
    cpuTeam: [],
    playerActivePokemon: 0,
    cpuActivePokemon: 0,
    battleLog: [],
    isPlayerTurn: true,
    battleStatus: 'not-started',
    waitingForSwitch: false
  });

  private processingAction = false; // Previene acciones simultáneas

  // Tabla de efectividad de tipos (simplificada)
  private typeChart: TypeEffectiveness = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
  };

  getBattleState(): Observable<BattleState> {
    return this.battleState$.asObservable();
  }

  initBattle(playerTeam: Pokemon[], cpuTeam: Pokemon[]): void {
    this.processingAction = false;
    this.battleState$.next({
      playerTeam,
      cpuTeam,
      playerActivePokemon: 0,
      cpuActivePokemon: 0,
      battleLog: ['¡La batalla ha comenzado!'],
      isPlayerTurn: true,
      battleStatus: 'ongoing',
      waitingForSwitch: false
    });
  }

  // Jugador ataca
  playerAttack(moveIndex: number): void {
    const state = this.battleState$.value;
    
    // Validaciones de estado
    if (this.processingAction) return;
    if (!state.isPlayerTurn || state.battleStatus !== 'ongoing') return;
    if (state.waitingForSwitch) return;

    const attacker = state.playerTeam[state.playerActivePokemon];
    const defender = state.cpuTeam[state.cpuActivePokemon];
    
    // Verificar que el pokémon atacante tenga vida
    if (attacker.currentHP <= 0) {
      this.addLog(`¡${attacker.name} está debilitado y no puede atacar!`);
      return;
    }

    const move = attacker.moves[moveIndex];

    if (move.currentPP <= 0) {
      this.addLog(`¡${attacker.name} no tiene PP para ${move.name}!`);
      return;
    }

    this.processingAction = true;
    move.currentPP--;
    this.executeAttack(attacker, defender, move, true);
  }

  // CPU ataca (IA mejorada)
  private cpuAttack(): void {
    setTimeout(() => {
      const state = this.battleState$.value;
      
      if (state.isPlayerTurn || state.battleStatus !== 'ongoing') {
        this.processingAction = false;
        return;
      }

      const attacker = state.cpuTeam[state.cpuActivePokemon];
      const defender = state.playerTeam[state.playerActivePokemon];

      // Verificar que el CPU tenga un pokémon activo con vida
      if (attacker.currentHP <= 0) {
        this.handleCPUSwitch();
        return;
      }

      // IA simple: elige un movimiento aleatorio con PP disponible
      const availableMoves = attacker.moves
        .map((move, index) => ({ move, index }))
        .filter(m => m.move.currentPP > 0);

      if (availableMoves.length === 0) {
        this.addLog(`¡${attacker.name} no tiene movimientos disponibles!`);
        this.switchTurn();
        return;
      }

      const selected = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      selected.move.currentPP--;
      this.executeAttack(attacker, defender, selected.move, false);
    }, 1500);
  }

  // Ejecuta un ataque
  private executeAttack(attacker: Pokemon, defender: Pokemon, move: PokemonMove, isPlayerAttacker: boolean): void {
    // Chequear precisión
    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      this.addLog(`¡${attacker.name} usó ${move.name} pero falló!`);
      this.processingAction = false;
      this.switchTurn();
      return;
    }

    // Calcular daño
    const damage = this.calculateDamage(attacker, defender, move);
    defender.currentHP = Math.max(0, defender.currentHP - damage);

    // Actualizar estado para reflejar el daño
    this.updateBattleState();

    const effectiveness = this.getEffectiveness(move.type, defender.types);
    let effectivenessText = '';
    if (effectiveness > 1) effectivenessText = ' ¡Es súper efectivo!';
    if (effectiveness < 1 && effectiveness > 0) effectivenessText = ' No es muy efectivo...';
    if (effectiveness === 0) effectivenessText = ' No afecta...';

    this.addLog(`¡${attacker.name} usó ${move.name}!${effectivenessText} (${damage} de daño)`);

    // Verificar si el pokémon defensor fue derrotado
    if (defender.currentHP <= 0) {
      this.addLog(`¡${defender.name} fue debilitado!`);
      
      setTimeout(() => {
        this.handleFaintedPokemon(!isPlayerAttacker);
      }, 1000);
    } else {
      this.processingAction = false;
      this.switchTurn();
    }
  }

  // Calcula el daño
  private calculateDamage(attacker: Pokemon, defender: Pokemon, move: PokemonMove): number {
    const level = 50;
    const attack = attacker.stats.attack;
    const defense = defender.stats.defense;
    const power = move.power;

    // Fórmula simplificada de Pokémon
    const baseDamage = ((2 * level / 5 + 2) * power * attack / defense) / 50 + 2;
    
    // STAB (Same Type Attack Bonus)
    const stab = attacker.types.includes(move.type) ? 1.5 : 1;
    
    // Efectividad de tipo
    const effectiveness = this.getEffectiveness(move.type, defender.types);
    
    // Variación aleatoria (85-100%)
    const random = (Math.random() * 0.15 + 0.85);

    return Math.floor(baseDamage * stab * effectiveness * random);
  }

  // Obtiene la efectividad del tipo
  private getEffectiveness(attackType: string, defenderTypes: string[]): number {
    let effectiveness = 1;
    
    for (const defType of defenderTypes) {
      if (this.typeChart[attackType] && this.typeChart[attackType][defType] !== undefined) {
        effectiveness *= this.typeChart[attackType][defType];
      }
    }
    
    return effectiveness;
  }

  // Maneja pokémon debilitado
  private handleFaintedPokemon(isPlayerDefeated: boolean): void {
    const state = this.battleState$.value;
    const team = isPlayerDefeated ? state.playerTeam : state.cpuTeam;
    
    // Buscar próximo pokémon disponible
    const alivePokemon = team.filter(p => p.currentHP > 0);
    
    if (alivePokemon.length === 0) {
      // No hay más pokémon, fin de la batalla
      this.processingAction = false;
      this.endBattle(isPlayerDefeated ? 'cpu-won' : 'player-won');
    } else {
      if (isPlayerDefeated) {
        // El jugador debe elegir manualmente su siguiente pokémon
        this.addLog('¡Elige tu siguiente Pokémon!');
        const newState = { 
          ...state, 
          waitingForSwitch: true,
          isPlayerTurn: true
        };
        this.battleState$.next(newState);
        this.processingAction = false;
      } else {
        // La CPU elige automáticamente
        this.handleCPUSwitch();
      }
    }
  }

  // CPU cambia automáticamente de pokémon
  private handleCPUSwitch(): void {
    const state = this.battleState$.value;
    const nextPokemonIndex = state.cpuTeam.findIndex(p => p.currentHP > 0);
    
    if (nextPokemonIndex === -1) {
      this.processingAction = false;
      this.endBattle('player-won');
      return;
    }

    const newState = { 
      ...state, 
      cpuActivePokemon: nextPokemonIndex 
    };
    this.battleState$.next(newState);
    this.addLog(`¡El rival envía a ${state.cpuTeam[nextPokemonIndex].name}!`);
    
    setTimeout(() => {
      this.processingAction = false;
      this.switchTurn();
    }, 1000);
  }

  // Cambiar pokémon del jugador
  switchPokemon(index: number): void {
    const state = this.battleState$.value;
    
    if (this.processingAction && !state.waitingForSwitch) return;
    if (state.battleStatus !== 'ongoing') return;
    
    if (state.playerTeam[index].currentHP <= 0) {
      this.addLog('¡Ese Pokémon está debilitado!');
      return;
    }

    if (index === state.playerActivePokemon && !state.waitingForSwitch) {
      this.addLog('¡Ese Pokémon ya está en batalla!');
      return;
    }

    const newState = { 
      ...state, 
      playerActivePokemon: index,
      waitingForSwitch: false
    };
    this.battleState$.next(newState);
    this.addLog(`¡Adelante, ${state.playerTeam[index].name}!`);
    
    // Si era un cambio forzado (por derrota), el jugador no pierde turno
    if (state.waitingForSwitch) {
      setTimeout(() => {
        this.processingAction = false;
        // El turno pasa a la CPU
        const turnState = { ...this.battleState$.value, isPlayerTurn: false };
        this.battleState$.next(turnState);
        this.cpuAttack();
      }, 1000);
    } else {
      // Cambio voluntario, pierde el turno
      this.processingAction = false;
      this.switchTurn();
    }
  }

  // Cambia el turno
  private switchTurn(): void {
    const state = this.battleState$.value;
    const newState = { ...state, isPlayerTurn: !state.isPlayerTurn };
    this.battleState$.next(newState);

    if (!newState.isPlayerTurn) {
      this.cpuAttack();
    }
  }

  // Actualiza el estado de la batalla
  private updateBattleState(): void {
    const state = this.battleState$.value;
    this.battleState$.next({ ...state });
  }

  // Añade mensaje al log
  private addLog(message: string): void {
    const state = this.battleState$.value;
    const newLog = [...state.battleLog, message];
    this.battleState$.next({ ...state, battleLog: newLog });
  }

  // Finaliza la batalla
  private endBattle(result: 'player-won' | 'cpu-won'): void {
    const state = this.battleState$.value;
    const message = result === 'player-won' 
      ? '¡Ganaste la batalla!' 
      : '¡Perdiste la batalla!';
    
    this.addLog(message);
    this.battleState$.next({ ...state, battleStatus: result });
  }

  // Reinicia la batalla
  resetBattle(): void {
    this.processingAction = false;
    this.battleState$.next({
      playerTeam: [],
      cpuTeam: [],
      playerActivePokemon: 0,
      cpuActivePokemon: 0,
      battleLog: [],
      isPlayerTurn: true,
      battleStatus: 'not-started',
      waitingForSwitch: false
    });
  }
}