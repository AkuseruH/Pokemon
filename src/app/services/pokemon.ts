import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, of } from 'rxjs';

export interface PokemonMove {
  name: string;
  power: number;
  accuracy: number;
  type: string;
  pp: number;
  currentPP: number;
}

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves: PokemonMove[];
  currentHP: number;
  maxHP: number;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private http = inject(HttpClient);
  private apiUrl = 'https://pokeapi.co/api/v2';

  // Genera un equipo de 6 pokémon aleatorios
  generateRandomTeam(): Observable<Pokemon[]> {
    const pokemonIds = this.getRandomPokemonIds(6);
    const requests = pokemonIds.map(id => this.getPokemon(id));
    return forkJoin(requests);
  }

  // Obtiene un pokémon por ID
  private getPokemon(id: number): Observable<Pokemon> {
    return this.http.get<any>(`${this.apiUrl}/pokemon/${id}`).pipe(
      map((data: any) => {
        const hp = data.stats.find((s: any) => s.stat.name === 'hp').base_stat;

        // Generar movimientos aleatorios basados en el tipo del pokémon
        const pokemonTypes = data.types.map((t: any) => t.type.name);
        const moves = this.generateMovesForTypes(pokemonTypes);

        return {
          id: data.id,
          name: data.name,
          sprite: data.sprites.front_default,
          types: pokemonTypes,
          stats: {
            hp: hp,
            attack: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
            defense: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
            specialAttack: data.stats.find((s: any) => s.stat.name === 'special-attack').base_stat,
            specialDefense: data.stats.find((s: any) => s.stat.name === 'special-defense').base_stat,
            speed: data.stats.find((s: any) => s.stat.name === 'speed').base_stat
          },
          moves: moves,
          currentHP: hp,
          maxHP: hp
        };
      })
    );
  }

  // Genera movimientos basados en los tipos del pokémon
  private generateMovesForTypes(types: string[]): PokemonMove[] {
    const movePool: { [key: string]: PokemonMove[] } = {
      normal: [
        { name: 'tackle', power: 40, accuracy: 100, type: 'normal', pp: 35, currentPP: 35 },
        { name: 'body-slam', power: 85, accuracy: 100, type: 'normal', pp: 15, currentPP: 15 },
        { name: 'hyper-beam', power: 150, accuracy: 90, type: 'normal', pp: 5, currentPP: 5 }
      ],
      fire: [
        { name: 'ember', power: 40, accuracy: 100, type: 'fire', pp: 25, currentPP: 25 },
        { name: 'flamethrower', power: 90, accuracy: 100, type: 'fire', pp: 15, currentPP: 15 },
        { name: 'fire-blast', power: 110, accuracy: 85, type: 'fire', pp: 5, currentPP: 5 }
      ],
      water: [
        { name: 'water-gun', power: 40, accuracy: 100, type: 'water', pp: 25, currentPP: 25 },
        { name: 'surf', power: 90, accuracy: 100, type: 'water', pp: 15, currentPP: 15 },
        { name: 'hydro-pump', power: 110, accuracy: 80, type: 'water', pp: 5, currentPP: 5 }
      ],
      grass: [
        { name: 'vine-whip', power: 45, accuracy: 100, type: 'grass', pp: 25, currentPP: 25 },
        { name: 'razor-leaf', power: 55, accuracy: 95, type: 'grass', pp: 25, currentPP: 25 },
        { name: 'solar-beam', power: 120, accuracy: 100, type: 'grass', pp: 10, currentPP: 10 }
      ],
      electric: [
        { name: 'thunder-shock', power: 40, accuracy: 100, type: 'electric', pp: 30, currentPP: 30 },
        { name: 'thunderbolt', power: 90, accuracy: 100, type: 'electric', pp: 15, currentPP: 15 },
        { name: 'thunder', power: 110, accuracy: 70, type: 'electric', pp: 10, currentPP: 10 }
      ],
      ice: [
        { name: 'ice-beam', power: 90, accuracy: 100, type: 'ice', pp: 10, currentPP: 10 },
        { name: 'blizzard', power: 110, accuracy: 70, type: 'ice', pp: 5, currentPP: 5 }
      ],
      fighting: [
        { name: 'karate-chop', power: 50, accuracy: 100, type: 'fighting', pp: 25, currentPP: 25 },
        { name: 'brick-break', power: 75, accuracy: 100, type: 'fighting', pp: 15, currentPP: 15 },
        { name: 'close-combat', power: 120, accuracy: 100, type: 'fighting', pp: 5, currentPP: 5 }
      ],
      poison: [
        { name: 'poison-sting', power: 15, accuracy: 100, type: 'poison', pp: 35, currentPP: 35 },
        { name: 'sludge-bomb', power: 90, accuracy: 100, type: 'poison', pp: 10, currentPP: 10 }
      ],
      ground: [
        { name: 'dig', power: 80, accuracy: 100, type: 'ground', pp: 10, currentPP: 10 },
        { name: 'earthquake', power: 100, accuracy: 100, type: 'ground', pp: 10, currentPP: 10 }
      ],
      flying: [
        { name: 'wing-attack', power: 60, accuracy: 100, type: 'flying', pp: 35, currentPP: 35 },
        { name: 'aerial-ace', power: 60, accuracy: 100, type: 'flying', pp: 20, currentPP: 20 },
        { name: 'brave-bird', power: 120, accuracy: 100, type: 'flying', pp: 15, currentPP: 15 }
      ],
      psychic: [
        { name: 'confusion', power: 50, accuracy: 100, type: 'psychic', pp: 25, currentPP: 25 },
        { name: 'psychic', power: 90, accuracy: 100, type: 'psychic', pp: 10, currentPP: 10 }
      ],
      bug: [
        { name: 'bug-bite', power: 60, accuracy: 100, type: 'bug', pp: 20, currentPP: 20 },
        { name: 'x-scissor', power: 80, accuracy: 100, type: 'bug', pp: 15, currentPP: 15 }
      ],
      rock: [
        { name: 'rock-throw', power: 50, accuracy: 90, type: 'rock', pp: 15, currentPP: 15 },
        { name: 'rock-slide', power: 75, accuracy: 90, type: 'rock', pp: 10, currentPP: 10 },
        { name: 'stone-edge', power: 100, accuracy: 80, type: 'rock', pp: 5, currentPP: 5 }
      ],
      ghost: [
        { name: 'shadow-ball', power: 80, accuracy: 100, type: 'ghost', pp: 15, currentPP: 15 },
        { name: 'night-shade', power: 60, accuracy: 100, type: 'ghost', pp: 15, currentPP: 15 }
      ],
      dragon: [
        { name: 'dragon-claw', power: 80, accuracy: 100, type: 'dragon', pp: 15, currentPP: 15 },
        { name: 'dragon-pulse', power: 85, accuracy: 100, type: 'dragon', pp: 10, currentPP: 10 },
        { name: 'outrage', power: 120, accuracy: 100, type: 'dragon', pp: 10, currentPP: 10 }
      ],
      dark: [
        { name: 'bite', power: 60, accuracy: 100, type: 'dark', pp: 25, currentPP: 25 },
        { name: 'crunch', power: 80, accuracy: 100, type: 'dark', pp: 15, currentPP: 15 }
      ],
      steel: [
        { name: 'iron-tail', power: 100, accuracy: 75, type: 'steel', pp: 15, currentPP: 15 },
        { name: 'flash-cannon', power: 80, accuracy: 100, type: 'steel', pp: 10, currentPP: 10 }
      ],
      fairy: [
        { name: 'fairy-wind', power: 40, accuracy: 100, type: 'fairy', pp: 30, currentPP: 30 },
        { name: 'moonblast', power: 95, accuracy: 100, type: 'fairy', pp: 15, currentPP: 15 }
      ]
    };

    const selectedMoves: PokemonMove[] = [];
    
    // Seleccionar 3 movimientos del tipo principal
    const primaryType = types[0];
    if (movePool[primaryType]) {
      const typeMoves = [...movePool[primaryType]];
      for (let i = 0; i < Math.min(3, typeMoves.length); i++) {
        const randomIndex = Math.floor(Math.random() * typeMoves.length);
        selectedMoves.push({ ...typeMoves[randomIndex] });
        typeMoves.splice(randomIndex, 1);
      }
    }

    // Agregar un movimiento del segundo tipo o normal
    if (types.length > 1 && movePool[types[1]]) {
      const secondaryMoves = movePool[types[1]];
      const randomMove = secondaryMoves[Math.floor(Math.random() * secondaryMoves.length)];
      selectedMoves.push({ ...randomMove });
    } else if (selectedMoves.length < 4) {
      selectedMoves.push({ ...movePool['normal'][0] });
    }

    // Asegurar que siempre haya 4 movimientos
    while (selectedMoves.length < 4) {
      const normalMove = movePool['normal'][Math.floor(Math.random() * movePool['normal'].length)];
      selectedMoves.push({ ...normalMove });
    }

    return selectedMoves.slice(0, 4);
  }

  // Genera IDs aleatorios de pokémon (de la Gen 1-3, IDs 1-386)
  private getRandomPokemonIds(count: number): number[] {
    const ids: number[] = [];
    while (ids.length < count) {
      const id = Math.floor(Math.random() * 386) + 1;
      if (!ids.includes(id)) {
        ids.push(id);
      }
    }
    return ids;
  }
}