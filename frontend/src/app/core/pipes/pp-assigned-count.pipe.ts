import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ppAssignedCount'
})
export class PpAssignedCountPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
