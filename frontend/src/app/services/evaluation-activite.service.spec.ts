import { TestBed } from '@angular/core/testing';

import { EvaluationActiviteService } from './evaluation-activite.service';

describe('EvaluationActiviteService', () => {
  let service: EvaluationActiviteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvaluationActiviteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
