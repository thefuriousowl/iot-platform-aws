import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: DashboardComponent,
  }
];
