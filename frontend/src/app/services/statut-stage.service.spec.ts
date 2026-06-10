import { TestBed } from '@angular/core/testing';

import { StatutStageService } from './statut-stage.service';

describe('StatutStageService', () => {
  let service: StatutStageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatutStageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
