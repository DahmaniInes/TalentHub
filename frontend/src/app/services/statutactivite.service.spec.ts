import { TestBed } from '@angular/core/testing';

import { StatutActiviteService } from './statutactivite.service';

describe('StatutactiviteService', () => {
  let service: StatutActiviteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatutActiviteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
