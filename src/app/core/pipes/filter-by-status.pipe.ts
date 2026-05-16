import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(items: any[] | null, status: string): number {
    if (!items) return 0;
    return items.filter(item => item.status?.toUpperCase() === status.toUpperCase()).length;
  }
}
