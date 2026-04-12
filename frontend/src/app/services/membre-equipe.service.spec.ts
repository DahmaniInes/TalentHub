import { TestBed } from '@angular/core/testing';

import { MembreEquipeService } from './membre-equipe.service';

describe('MembreEquipeService', () => {
  let service: MembreEquipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembreEquipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
