import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  isLoginMode = true;
  isLoading = false;
  errorMessage = '';
  connectionStatus = '';

  // Formulario Login
  loginEmail = '';
  loginPassword = '';

  // Formulario Registro
  registerEmail = '';
  registerPassword = '';
  registerUsername = '';
  registerConfirmPassword = '';

  async ngOnInit() {
    // Probar conexión al cargar
    console.log('🔍 Verificando conexión a Supabase...');
    const result = await this.supabaseService.testConnection();
    this.connectionStatus = result.message;
    console.log(result.message);
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  async login() {
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🔐 Intentando login con:', this.loginEmail);

    const result = await this.supabaseService.signIn(
      this.loginEmail,
      this.loginPassword
    );

    this.isLoading = false;

    console.log('Resultado del login:', result);

    if (result.success) {
      console.log('✅ Login exitoso, navegando a /home');
      this.router.navigate(['/home']);
    } else {
      console.error('❌ Error en login:', result.error);
      this.errorMessage = result.error || 'Error al iniciar sesión';
    }
  }

  async register() {
    if (!this.registerEmail || !this.registerPassword || !this.registerUsername) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    if (this.registerPassword !== this.registerConfirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.registerPassword.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.registerUsername.length < 3) {
      this.errorMessage = 'El nombre de usuario debe tener al menos 3 caracteres';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('📝 Intentando registro:', {
      email: this.registerEmail,
      username: this.registerUsername
    });

    const result = await this.supabaseService.signUp(
      this.registerEmail,
      this.registerPassword,
      this.registerUsername
    );

    this.isLoading = false;

    console.log('Resultado del registro:', result);

    if (result.success) {
      console.log('✅ Registro exitoso, navegando a /home');
      this.router.navigate(['/home']);
    } else {
      console.error('❌ Error en registro:', result.error);
      this.errorMessage = result.error || 'Error al registrarse';
    }
  }

  continueAsGuest() {
    console.log('👤 Continuando como invitado');
    this.supabaseService.continueAsGuest();
    this.router.navigate(['/home']);
  }

  async testConnection() {
    this.isLoading = true;
    const result = await this.supabaseService.testConnection();
    this.connectionStatus = result.message;
    alert(result.message);
    this.isLoading = false;
  }
}