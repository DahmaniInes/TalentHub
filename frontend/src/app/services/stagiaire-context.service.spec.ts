import { TestBed } from '@angular/core/testing';

import { StagiaireContextService } from './stagiaire-context.service';

describe('StagiaireContextService', () => {
  let service: StagiaireContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StagiaireContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
