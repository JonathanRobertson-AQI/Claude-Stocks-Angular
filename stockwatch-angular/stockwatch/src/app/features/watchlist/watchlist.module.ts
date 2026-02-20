import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule }        from '@angular/material/card';
import { MatButtonModule }      from '@angular/material/button';
import { MatIconModule }        from '@angular/material/icon';
import { MatInputModule }       from '@angular/material/input';
import { MatFormFieldModule }   from '@angular/material/form-field';
import { MatChipsModule }       from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule }     from '@angular/material/tooltip';

// Components
import { WatchlistPageComponent } from './watchlist-page.component';
import { StockCardComponent }     from './stock-card.component';
import { SparklineComponent }     from '@shared/components/sparkline/sparkline.component';

const routes: Routes = [
  { path: '', component: WatchlistPageComponent }
];

@NgModule({
  declarations: [
    WatchlistPageComponent,
    StockCardComponent,
    SparklineComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule
  ]
})
export class WatchlistModule {}
