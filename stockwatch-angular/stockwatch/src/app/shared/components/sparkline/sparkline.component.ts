import {
  Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalType } from '../../../core/models/stock.model';

@Component({
  selector: 'app-sparkline',
  standalone: false,
  template: `<canvas #canvas style="width:100%;height:50px;display:block;"></canvas>`
})
export class SparklineComponent implements OnChanges, AfterViewInit {
  @Input() history: number[] = [];
  @Input() signal: SignalType = 'hold';
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private drawn = false;

  ngAfterViewInit(): void {
    this.draw();
    this.drawn = true;
  }

  ngOnChanges(): void {
    if (this.drawn) this.draw();
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.history.length) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = canvas.offsetWidth || 280;
    canvas.height = 50;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...this.history);
    const max = Math.max(...this.history);
    const range = max - min || 1;
    const color = this.signal === 'buy' ? '#00e5a0' : this.signal === 'sell' ? '#ff4d6a' : '#4d9fff';

    ctx.beginPath();
    this.history.forEach((p, i) => {
      const x = i / (this.history.length - 1) * W;
      const y = H - (p - min) / range * H * 0.85 - H * 0.05;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '33');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
