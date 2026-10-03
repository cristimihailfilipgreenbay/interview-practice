import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { Topbar } from './core/layout/topbar/topbar';

@Component({
  imports: [RouterOutlet, Topbar, HlmToasterImports],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
