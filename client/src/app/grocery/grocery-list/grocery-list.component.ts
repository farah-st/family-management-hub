import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroceryListService } from '../../services/grocery-list.service';

@Component({
  selector: 'app-grocery-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grocery-list.component.html'
})
export class GroceryListComponent {
  private svc = inject(GroceryListService);
  items = this.svc.list();

  remove(i: number) {
    this.svc.remove(i);
    this.items = this.svc.list();
  }

  clear() {
    this.svc.clear();
    this.items = [];
  }
}
