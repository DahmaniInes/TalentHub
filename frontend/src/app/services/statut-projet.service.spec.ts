import { TestBed } from '@angular/core/testing';

import { StatutProjetService } from './statut-projet.service';

describe('StatutProjetService', () => {
  let service: StatutProjetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatutProjetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
