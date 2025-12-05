import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth';
import { HomeComponent } from './home/home';
import { BattleComponent } from './battle/battle';

export const routes: Routes = [
  { 
    path: '', 
    component: AuthComponent  // 👈 Pantalla de Login/Registro
  },
  { 
    path: 'home',
    component: HomeComponent  // 👈 Menú principal
  },
  { 
    path: 'battle', 
    component: BattleComponent  // 👈 Batalla
  },
  { 
    path: '**', 
    redirectTo: ''
  }
];