import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RECIPES, Recipe } from '../recipes'; 

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.scss']
})
export class RecipeListComponent {
  recipes: Recipe[] = RECIPES;  
}

