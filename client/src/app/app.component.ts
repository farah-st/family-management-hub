import { Component } from '@angular/core';
import { RecipeListComponent } from './recipes/recipe-list/recipe-list.component'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RecipeListComponent],   
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {}

